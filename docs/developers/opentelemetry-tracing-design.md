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
