---
id: opentelemetry-tracing-design
title: "Design: OpenTelemetry Tracing for GPU Pod Placement"
sidebar_label: OpenTelemetry Tracing Design
---

## Summary

A GPU pod goes through four HAMi steps before it runs: the admission webhook, the scheduler extender's Filter and Bind, and `Allocate` in the device plugin on the chosen node. The steps run in two components, the scheduler and the device plugin on the node the pod was placed on, and can be hours apart while the pod waits for a free GPU. When one pod is slow or fails, an operator has to match log lines from the scheduler and from the device plugin by hand.

This design adds OpenTelemetry tracing to these four steps. For a sampled pod, Filter, Bind and Allocate form one trace that shows how long each step took and which node and GPUs were picked. Admission and failed Filter attempts are separate small traces linked to it. The trace context travels on the pod in one annotation, written only inside patches HAMi already sends. Tracing is off by default, is configured with the standard `OTEL_*` environment variables, and exports over OTLP.

Tracking issue: [#3426](https://github.com/Project-HAMi/HAMi/issues/3426). Umbrella issue: [#2126](https://github.com/Project-HAMi/HAMi/issues/2126).

## Motivation

### The path of a GPU pod

| Step | Called by | Runs in | What it does |
| --- | --- | --- | --- |
| Admission | kube-apiserver | `vgpu-scheduler-extender` container in the `hami-scheduler` Pod (`/webhook`) | sets `schedulerName`, checks quota |
| Filter | kube-scheduler | same container (`/filter`) | picks a node and GPUs, writes them to the pod |
| Bind | kube-scheduler | same container (`/bind`) | locks the node, marks the pod `allocating`, binds it |
| Allocate | kubelet | `device-plugin` container in the device plugin Pod on the chosen node | gives the container its GPUs and limits |

No step calls the next one, so no request ID connects them. Between admission and a successful Filter, kube-scheduler retries the pod until a GPU is free.

### What today's signals answer

- **Metrics** count outcomes. `hami_scheduler_allocation_failures_total` counts failures by step (`phase`) and reason (`failure_reason`). It shows how many pods failed and why, not which pod, node or GPU.
- **Logs** of one pod are in two places. Admission, Filter and Bind log in the `hami-scheduler` Pod; Allocate logs in the device plugin Pod on the node the pod was placed on. Following one pod means searching the scheduler log for its name, finding its node, opening the device plugin log on that node, and matching the two by timestamp.
- **pprof** (`--profiling`) shows why the scheduler process is busy, not where one pod's time went.

A question none of them answers directly: _pod `train-1` started 40 minutes after it was created. Was it waiting for a free GPU, or was it placed early and then slow in Bind or Allocate?_

### Why tracing, not only histograms or duration logs

Tracing adds three things that metrics and logs cannot give:

1. One pod's path across the scheduler and the device plugin on another node, under one ID.
2. The retry history of a pending pod, with the reason for each rejection.
3. Sampling by outcome: an OpenTelemetry Collector can keep only slow or failed placements (tail sampling) and drop the rest.

### An earlier attempt

[#2555](https://github.com/Project-HAMi/HAMi/pull/2555) (closed) added OpenTelemetry spans to Bind only, behind a new `--enable-tracing` flag, and printed the spans to stdout as JSON. Reviewers asked for a design discussion before adding the OpenTelemetry SDK, and questioned the maintenance cost of a new flag, a `Bind` signature change and stdout export. They also found four problems: failed spans had no Error status and no pod, node or UID; the global TracerProvider was replaced even when tracing was off; the scheduler does not handle SIGTERM, so spans waiting for export are lost; and passing the request context to the kube-apiserver Bind call could cancel a write mid-flight. This design addresses each point, starting with this document.

### Prior art

- Kubernetes traces kube-apiserver and kubelet ([KEP-647](https://github.com/kubernetes/enhancements/blob/72907deaa85eae6e208bc95c5f74dd27c1911345/keps/sig-instrumentation/647-apiserver-tracing/README.md) and [KEP-2831](https://github.com/kubernetes/enhancements/blob/72907deaa85eae6e208bc95c5f74dd27c1911345/keps/sig-instrumentation/2831-kubelet-tracing/README.md), both GA in v1.34): off by default, OTLP, parent-based sampling. HAMi uses the same defaults.
- Tekton [stores the span context in a `PipelineRun` annotation](https://github.com/tektoncd/pipeline/blob/0471357113635b9751b99ab0049abe5077d487d9/pkg/reconciler/pipelinerun/tracing.go#L57-L66), so later reconciles continue the same trace. HAMi carries the context on the pod the same way, but links each Filter attempt instead of adding it as a child span, so a long wait does not make a long trace.

## Goals

- For one sampled pod: the duration of each step, the node and GPUs chosen, and why earlier attempts were rejected.
- No extra API calls, no writes when Filter fails, and no change to scheduling results or to when API calls are cancelled.
- A small maintenance surface: one package, standard environment variables, four OpenTelemetry modules, no change to the `Filter` and `Bind` signatures.

## Proposal

### Trace shape

Example: `train-1` is rejected for lack of GPU memory while all GPUs are busy, then placed on `gpu-7`.

Each time kube-scheduler tries to place the pod, it calls Filter once. A failed try is a small trace on its own (Trace B). The try that succeeds starts the trace that Bind and Allocate join (Trace C).

```text
Trace A: admission (the pod is created)

Trace B: filter, failed. 12 nodes rejected: not enough GPU memory. Linked to trace A.
    The next 35 attempts fail for the same reason and are not recorded.

Trace C: filter, succeeded. Node gpu-7, GPU-1a2b. Linked to trace A.
    bind
        lock node
        patch pod
        bind pod
    allocate (device plugin on gpu-7)
```

A pod's history is split across several traces, so every span carries the pod's UID (`k8s.pod.uid`). Searching for the UID in the trace backend returns traces B and C, and their links lead to trace A. Trace A has no UID, because the pod gets its UID only after the webhook has run.

Why this shape:

- Child spans across the whole wait would make one trace as long as the pod is pending, with a span per attempt. A Collector keeps a trace in memory for seconds or minutes before tail sampling it, so such traces could not be sampled by duration.
- Links for every step would lose the single waterfall of the placement itself, which is the part an operator reads.

### Trace context on the pod

One annotation, `hami.io/traceparent`, in [W3C Trace Context](https://www.w3.org/TR/trace-context/#trace-context-http-headers-format) format:

```yaml
hami.io/traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

| Step | Writes | Reads |
| --- | --- | --- |
| Webhook, pod CREATE | its own context, in the patch it already returns | — |
| Filter, success | its own context, in the patch that already writes the node and devices | admission context, for the link |
| Filter, failure | nothing | admission context, for the link |
| Bind | nothing | Filter context: from memory first, then the annotation |
| Allocate | nothing | Filter context, from the pod it already fetches |

Filter never writes on failure. When an extender rejects a pod, [kube-scheduler requeues it on any cluster event](https://github.com/kubernetes/kubernetes/blob/eb24fe4e932bf95877653f89b4720fbdc8429353/pkg/scheduler/framework/runtime/framework.go#L427-L433), including an update to the pod itself. A write on each failed Filter would make kube-scheduler retry the pod after every backoff instead of waiting for a real change.

Bind reads the pod from the informer cache ([scheduler.go:1288](https://github.com/Project-HAMi/HAMi/blob/5265e52d7ac0132c4aab5e165940fc0f410c2b89/pkg/scheduler/scheduler.go#L1288)), which may not have Filter's patch yet. Filter and Bind run in the same process: Filter already stores the chosen node and devices in an in-memory map keyed by pod UID ([scheduler.go:1531](https://github.com/Project-HAMi/HAMi/blob/5265e52d7ac0132c4aab5e165940fc0f410c2b89/pkg/scheduler/scheduler.go#L1531)), and Bind already reads that map ([scheduler.go:1347](https://github.com/Project-HAMi/HAMi/blob/5265e52d7ac0132c4aab5e165940fc0f410c2b89/pkg/scheduler/scheduler.go#L1347)). The trace context is stored in the same entry, and Bind falls back to the annotation when the entry is missing.

Allocate reads the context from the pod it already gets from kube-apiserver ([util.go:113](https://github.com/Project-HAMi/HAMi/blob/5265e52d7ac0132c4aab5e165940fc0f410c2b89/pkg/util/util.go#L113)), so it needs no extra read.

### Sampling

The decision is made once per pod, at admission:

- The webhook uses the configured sampler. If kube-apiserver sends a `traceparent` header, the default parent-based sampler follows its decision.
- The webhook writes the annotation for every pod it handles, sampled (`-01`) or not (`-00`). It writes unsampled ones too, so that Filter can tell "not sampled" from "no webhook": the webhook can be unreachable under `failurePolicy: Ignore`, or not installed.
- Filter starts a new trace with a link, and the SDK's samplers ignore links. A small HAMi sampler follows the sampled flag of the HAMi link, and falls back to the configured sampler when the pod has no annotation.
- Bind and Allocate are child spans, so the parent-based sampler follows Filter.

As a result a pod is traced from admission to Allocate, or not at all. With the standard samplers, which ignore links, admission and Filter would each decide on their own: at 1%, only 1 pod in 10,000 would have both traced.

### Configuration

No new command-line flags. Both processes read the standard OpenTelemetry variables:

| Variable | Effect |
| --- | --- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` or `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | tracing is on only when one of them is set |
| `OTEL_SDK_DISABLED=true` | tracing off, even with an endpoint |
| `OTEL_TRACES_SAMPLER`, `OTEL_TRACES_SAMPLER_ARG` | sampling, for example `parentbased_traceidratio` and `0.1` |
| `OTEL_SERVICE_NAME` | defaults to `hami-scheduler` and `hami-device-plugin` |
| `OTEL_EXPORTER_OTLP_CERTIFICATE` and related | TLS to the Collector |

With only an endpoint set, every GPU pod is traced (the SDK default, `parentbased_always_on`). Large clusters can set a ratio.

The HAMi Helm chart gets one block that sets these variables on the scheduler Deployment and the device plugin DaemonSet:

```yaml
tracing:
  # Empty: tracing is off.
  otlpEndpoint: ""
  # Other OTEL_* variables, for example OTEL_TRACES_SAMPLER_ARG.
  extraEnvs: []
```

At startup each process logs one line with the effective endpoint, sampler and service name, and logs an error for a value it cannot parse, so a typo does not turn tracing off silently.

## Design details

### Package

A new package, `pkg/tracing`, holds everything that touches the OpenTelemetry SDK: setup from the environment (including `OTEL_SDK_DISABLED`, which the Go SDK does not read itself), shutdown, the annotation carrier, the link-aware sampler and the attribute keys. Other packages call it and use only the `go.opentelemetry.io/otel/trace` API. When tracing is off, the package hands out a no-op tracer and never sets the global TracerProvider.

New modules: `go.opentelemetry.io/otel`, `otel/trace`, `otel/sdk` and `otel/exporters/otlp/otlptrace/otlptracegrpc`. gRPC and protobuf are already in `go.mod`. A Dependabot group for `go.opentelemetry.io/*`, like the existing `golang.org/x/*` and `k8s.io` groups ([dependabot.yml:14-26](https://github.com/Project-HAMi/HAMi/blob/5265e52d7ac0132c4aab5e165940fc0f410c2b89/.github/dependabot.yml#L14-L26)), updates the four modules in one PR.

### Webhook

- Traces only CREATE requests for pods that request HAMi devices, the pods the webhook already mutates. UPDATE requests and other pods get no span.
- Span `admission`. Its parent is the `traceparent` header of the admission request when kube-apiserver tracing is on; otherwise it is a root span.
- Replaces any `hami.io/traceparent` the pod arrives with, then adds its own to the patch it already returns ([webhook.go:172](https://github.com/Project-HAMi/HAMi/blob/5265e52d7ac0132c4aab5e165940fc0f410c2b89/pkg/scheduler/webhook.go#L172)). It overwrites instead of denying, so a stale trace context never becomes a reason to reject a pod.
- Attributes: the pod's namespace and name, or the `generateName` prefix when the pod has no name yet. No UID: kube-apiserver sets the UID, and the full name of a `generateName` pod, only after the webhook has run.
- A denied pod gets a span with status Error and the reason, and no annotation.
- On UPDATE, `hami.io/traceparent` joins the keys that only HAMi components may change ([webhook.go:196-211](https://github.com/Project-HAMi/HAMi/blob/5265e52d7ac0132c4aab5e165940fc0f410c2b89/pkg/scheduler/webhook.go#L196-L211)). Filter's patch already changes other keys in that list, so the check still runs once per patch.

### Filter

- Span `filter`: a new trace, linked to the admission context on the pod.
- Attributes: the number of candidate nodes and of rejected nodes. Rejections become one span event per reason with a node count, from the grouping HAMi already builds for Kubernetes events ([score.go:479](https://github.com/Project-HAMi/HAMi/blob/5265e52d7ac0132c4aab5e165940fc0f410c2b89/pkg/scheduler/score.go#L479)). No span per node.
- Success: the node, device UUIDs, device type and requested amounts as attributes. The span's context goes into the annotation map that the existing patch writes ([scheduler.go:1535](https://github.com/Project-HAMi/HAMi/blob/5265e52d7ac0132c4aab5e165940fc0f410c2b89/pkg/scheduler/scheduler.go#L1535)) and into the in-memory pod record.
- Failure: status Error and the reason; nothing is written to the pod.
- A pending pod is retried many times with the same result. The scheduler keeps the last rejection summary per pod in memory and records a failed attempt only when the summary changes. The next recorded span carries the number of attempts skipped. The entry is removed when Filter succeeds or the pod is deleted.

### Bind

- Span `bind`, a child of the Filter span. Child spans: `lock node`, `patch pod` (sets `hami.io/bind-phase: allocating`) and `bind pod` (the kube-apiserver Bind call).
- On failure: status Error, the same bounded `failure_reason` values the metrics use, and an event when the reservation is released.
- The kube-apiserver Bind call keeps its current context, which is never cancelled ([scheduler.go:1366](https://github.com/Project-HAMi/HAMi/blob/5265e52d7ac0132c4aab5e165940fc0f410c2b89/pkg/scheduler/scheduler.go#L1366)). The span is attached without adding a deadline or cancellation, so tracing cannot change when a write is cut off (ref: [#2555 review](https://github.com/Project-HAMi/HAMi/pull/2555#discussion_r3756129314)).

### Allocate

- Span `allocate` in the NVIDIA device plugin, a child of the Filter span. The context comes from the pod that `getPendingPod` already fetches ([server.go:1423](https://github.com/Project-HAMi/HAMi/blob/5265e52d7ac0132c4aab5e165940fc0f410c2b89/pkg/device-plugin/nvidiadevice/nvinternal/plugin/server.go#L1423)).
- kubelet calls `Allocate` once per container, so a pod with two GPU containers gets two `allocate` spans.
- Attributes: the pod, node and device UUIDs. Each failure branch sets status Error with the reason.
- Device plugins in other repositories can follow the same contract: read `hami.io/traceparent` and start a child span.
- The device plugin exports from the GPU node, so the node needs a route to the Collector, or a Collector agent on the node.

### Span attributes

| Key | Example | Spans |
| --- | --- | --- |
| `k8s.pod.uid` | `6f1c2a…` | all except admission |
| `k8s.pod.name`, `k8s.namespace.name` | `train-1`, `ml` | all |
| `k8s.node.name` | `gpu-7` | filter (success), bind, allocate |
| `hami.device.type` | `NVIDIA` | filter, bind, allocate |
| `hami.device.uuids` | `GPU-1a2b…` | filter (success), allocate |
| `hami.request.memory`, `hami.request.cores` | `20000`, `50` | filter |
| `hami.filter.nodes`, `hami.filter.rejected_nodes` | `12`, `12` | filter |
| `hami.failure_reason` | `no_fit`, `lock`, `bind` | failed spans |

Attribute names follow the OpenTelemetry semantic conventions, the shared list of names that tracing tools understand. The `k8s.*` names are [Stable](https://github.com/open-telemetry/semantic-conventions/blob/d0d920083f7c6b35a26488610bd28bdce1714302/model/k8s/registry.yaml#L122-L124), so they will not be renamed. The GPU names there (`hw.*`) are still in development and may change, so HAMi uses its own `hami.*` names for GPU values.

The SDK does not limit the length of attribute values by default. When `OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT` is not set, HAMi sets it to 1024 characters, so a long error message cannot make a span very large.

### Logs

The existing log line that ends each step gets a `traceID` key when the span is sampled, so a log line leads to its trace.

### Shutdown

The scheduler does not handle SIGTERM today: `start()` returns only when a server fails ([main.go:244](https://github.com/Project-HAMi/HAMi/blob/5265e52d7ac0132c4aab5e165940fc0f410c2b89/cmd/scheduler/main.go#L244)), so deferred cleanup does not run when the Pod stops, and spans waiting for export are lost. The scheduler gets `signal.NotifyContext` and calls the tracer provider's `Shutdown` with a 5-second timeout. The device plugin already handles signals and calls the same shutdown on its exit path.

## Failure behavior

| Situation | Result |
| --- | --- |
| No endpoint, or `OTEL_SDK_DISABLED=true` | no-op tracer, no annotation, nothing exported |
| Collector down or slow | spans are dropped when the export queue is full; scheduling never waits |
| Webhook unreachable (`failurePolicy: Ignore`) or not installed | no annotation; Filter starts a trace with the configured sampler and no link |
| Annotation malformed | ignored, handled as missing |
| Informer has not seen Filter's patch when Bind runs | Bind uses the in-memory context |
| Device plugin has tracing off | the trace ends at Bind |
| Scheduler Pod stopped | shutdown exports queued spans for up to 5 seconds |
| Pod deleted while pending | its in-memory entry is removed; no span |

## Overhead

- **Tracing off:** a no-op tracer. Attributes are built only when `span.IsRecording()` is true, and no span is started in the per-node scoring loop.
- **Tracing on:** spans are recorded in memory and exported in the background in batches. With the OpenTelemetry Go defaults ([a queue of 2048 spans, batches of 512](https://github.com/open-telemetry/opentelemetry-go/blob/v1.47.0/sdk/trace/batch_span_processor.go#L23-L38)), the queue holds a few MB at most.
- **Spans per placed pod:** about 7 for a one-container pod (admission, filter, bind with 3 children, allocate), plus one per recorded failed attempt.
- **API:** no extra calls. The annotation adds under 100 bytes to pods that request HAMi devices, inside patches HAMi already sends.

## Compatibility

- During an upgrade, the scheduler and the device plugins run different versions for a while.
  - Old device plugin, new scheduler: the device plugin ignores the annotation. The trace has `filter` and `bind` but no `allocate`.
  - New device plugin, old scheduler: the pod has no annotation, so `allocate` starts a new trace on its own, with the configured sampler. The same happens for a pod that was placed before tracing was turned on.
- No API or CRD change. The new annotation key uses the `hami.io/` prefix and is read only by HAMi.

## Security considerations

- Users cannot forge a context or force sampling: the webhook overwrites the key at CREATE, and only HAMi components may change it on UPDATE.
- The `traceparent` header from kube-apiserver at admission is accepted. A client can only affect pods it is already allowed to create, each pod adds a handful of spans, and the export queue is bounded.
- Exporter: OTLP over gRPC, with TLS through the standard variables. No Baggage propagator, and no resource detectors that read host files or run commands. OpenTelemetry Go v1.43 or later, which has the fixes for the 2026 advisories.
- Spans hold IDs, names, node and device identifiers, amounts and reasons, never environment values or container arguments. Pod and namespace names can reveal tenant names, so access to the trace backend should be restricted like access to logs.

## Implementation plan

Each step is a small PR that works on its own:

1. **Scheduler shutdown:** handle SIGTERM and stop the servers cleanly. Useful even without tracing.
2. **`pkg/tracing`:** setup from `OTEL_*` variables, shutdown, annotation carrier, link-aware sampler, and unit tests with the SDK's in-memory exporter (`tracetest`). New modules in `go.mod` and the Dependabot group.
3. **Filter and Bind:** spans, the annotation in Filter's patch, the in-memory context for Bind, and the UPDATE check. Tests for each path: success, failed Filter, Bind rollback, pod deleted, no annotation.
4. **Webhook:** the admission span, the link from Filter, and sampling decided at admission.
5. **Device plugin:** the `allocate` span.
6. **Helm and docs:** the `tracing` values block and a user guide (turning it on, a Jaeger or Tempo example, searching by pod UID). The feature is marked alpha.

## Rollout and rollback

Rollout: set the endpoint on the scheduler and check that traces arrive, then set it on the device plugin. Rollback: remove the endpoint, or set `OTEL_SDK_DISABLED=true`, and restart. Annotations left on existing pods are ignored.

## Future work

- HAMi-core: pass the context to the container as `HAMI_TRACEPARENT` for a CUDA initialization span. Not `TRACEPARENT`, which the application's own OpenTelemetry SDK would take as its parent.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Child spans for every step, as Tekton does | a trace lasts as long as the pod is pending |
| Links for every step | no single waterfall for the placement |
| Each step samples on its own | most traces miss steps |
| Write the context on every Filter | kube-scheduler retries the pod after each write |
| `otelhttp` and `otelgrpc` contrib packages | more dependencies for a few manual spans |
| A build tag such as `//go:build otel` | a runtime switch that is off by default is enough (ref: [#2555 review](https://github.com/Project-HAMi/HAMi/pull/2555#issuecomment-5272488275)) |
| A new `--enable-tracing` flag | the standard variables cover it, with one less flag to maintain |
| Exporting each span synchronously | every request would wait for the Collector |
