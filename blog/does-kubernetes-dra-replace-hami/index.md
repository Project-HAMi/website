---
title: "Does Kubernetes DRA Replace HAMi?"
date: "2026-08-20"
description: "DRA absorbs the request-and-scheduling half of GPU sharing, HAMi keeps the runtime enforcement half. How the two fit together, what the DRA stack requires today, and how to choose in mid-2026."
authors: [mesut_oezdil]
tags: ["HAMi", "DRA", "GPU Sharing", "Kubernetes", "Scheduling", "Cloud Native"]
---

:::note

This article was originally published on the [CNCF blog](https://www.cncf.io/blog/2026/08/07/does-kubernetes-dra-replace-hami/) on August 7, 2026.

:::

Projects that want to share a GPU on Kubernetes have to work around an API instead of with it. The device plugin interface could count devices, and that was the whole vocabulary: `nvidia.com/gpu: 1`. It meant one whole card, take it or leave it. HAMi, which the CNCF Technical Oversight Committee (TOC) accepted as an incubating project on July 15, 2026, built its entire pipeline (mutating webhook, scheduler extender, annotations, in-container enforcement) to express what that vocabulary couldn't: "give this pod 8,000 MiB and 10% of a GPU, and make the limit stick."

Then, the vocabulary changed. Dynamic Resource Allocation (DRA) reached general availability in Kubernetes v1.34 and is enabled by default since v1.35. With the consumable capacity feature, a pod can now ask the scheduler itself for a slice of a device's memory, natively, with no annotations involved.

So the question I keep seeing in the HAMi communication channels is: does DRA make HAMi obsolete? The short answer is no, but the complete answer depends on which of HAMi's jobs you're talking about. One of them, encoding fractional requests where the scheduler can see them, is exactly what DRA absorbs. The other, enforcing those fractions inside the container at CUDA-call granularity, is a job DRA was never designed to do. HAMi's response has been to split accordingly: keep the enforcement, and rebuild the encoding on top of DRA across 3 repositories. Let's walk through both halves, then look at what running the DRA stack takes today.

<!-- truncate -->

## How GPU sharing worked when the API couldn't help

To see what DRA changes, it helps to be precise about the machinery it replaces: which parts of HAMi's pipeline exist only because the device plugin API was too narrow.

A HAMi user writes 3 extended resources:

```yaml
resources:
  limits:
    nvidia.com/gpu: 1 # device IDs from 1 physical card
    nvidia.com/gpumem: 8000 # MiB of that card's VRAM
    nvidia.com/gpucores: 10 # 10% of compute, in 1% steps
```

None of these mean anything to the default scheduler. Extended resources are opaque integers to Kubernetes: it can subtract them from a node total, and that's all. It doesn't know that `gpumem` and `gpucores` must land on the same physical card, or that 2 pods with 8,000 MiB each fit on a 24 GiB card while a third asking for 12,000 MiB doesn't (HAMi's scheduler rejects that third pod at filter time with a `CardInsufficientMemory` event). So HAMi routes the pod through a mutating webhook to its own scheduler extender, which filters nodes, scores cards, picks a specific device UUID, and records the decision where the API has room for it: an annotation.

```text
hami.io/vgpu-devices-allocated: GPU-<device-uuid>,NVIDIA,8000,10:
```

The device plugin on the node later reads that annotation inside `Allocate()`, injects `CUDA_DEVICE_MEMORY_LIMIT_0=8000m` and `CUDA_DEVICE_SM_LIMIT=10` into the container, and preloads `libvgpu.so` so the limits get enforced. It works, and it's been proven at scale (DaoCloud runs 10,000+ GPUs across 10+ data centers on it). Notice how much of the design is a workaround: the webhook exists because the scheduler can't parse the request, the annotation exists because the API has no field for "which card and how much," and the whole agreement between scheduler and kubelet rides on a string format that only HAMi's components understand.

Every fractional-GPU project of that era made the same trade, each with its own private annotation dialect. That's the situation DRA was built to end.

## What DRA changes underneath

DRA replaces integer counting with a claims model, deliberately shaped like PersistentVolumeClaims (PVC). Four objects in the `resource.k8s.io/v1` API group carry the flow, and each one has a different owner:

- **ResourceSlice.** Published by the device driver. Describes actual hardware per node with structured attributes (model, memory, architecture), so the scheduler sees devices instead of a bare count.
- **DeviceClass.** Written by the cluster admin. Defines categories of devices, filtered with Common Expression Language (CEL) expressions over those attributes.
- **ResourceClaim and ResourceClaimTemplate.** Written by the workload owner. A claim requests devices by class, selector, and constraint; a template stamps out one claim per pod so each replica gets its own allocation.

The scheduler allocates a concrete device to a claim before binding the pod, and the result lives in the claim's status as a typed API object. Compare that to the annotation string above: the "which card and how much" decision now has a first-class home that kubectl can read, RBAC can guard, and other controllers can build on.

The timeline matters for planning. Core DRA went GA in Kubernetes v1.34 and is locked on since v1.35. Extensions are still graduating at their own pace: prioritized device lists (ask for a large card, fall back to 2 small ones) went stable in v1.36, while partitionable devices and consumable capacity are beta as of v1.36 and aren't stable yet as of this writing (July 2026).

## Consumable capacity is the piece that matters here

Core DRA alone doesn't give you HAMi-style sharing. Its baseline sharing model is multiple pods referencing one ResourceClaim, which means they share the same allocation rather than each getting an accounted slice. The piece that maps onto HAMi's model is consumable capacity, introduced as alpha in v1.34 behind the `DRAConsumableCapacity` feature gate, beta and on by default since v1.36.

It adds 2 things. A driver can mark a device with `allowMultipleAllocations`, declaring that independent claims, even from different namespaces, may land on it simultaneously. And a claim can carry a capacity request, asking for a specific quantity of a named resource on the device instead of claiming the device in full. The scheduler then does for GPU memory what it has always done for node memory: bookkeeping, guaranteeing that the sum of granted capacity never exceeds what the device advertised.

Line those up against HAMi's extended resources and the mapping is almost mechanical. `nvidia.com/gpumem: 8000` becomes a capacity request for memory; `nvidia.com/gpucores: 10` becomes a capacity request for compute; HAMi's scheduler-extender filter step ("does this card still have 8,000 MiB unpromised?") becomes the upstream scheduler's own math. The rejection HAMi users know as `CardInsufficientMemory` turns into a standard unschedulable claim. This is why HAMi's maintainers treat DRA as convergence rather than competition: upstream Kubernetes adopted the same model the workaround had been implementing all along, and the project's 2026 roadmap names complete DRA standard adaptation as a goal.

## Scheduling is still only half the problem

Here's the boundary that decides whether you still need HAMi at all. DRA, consumable capacity included, is a promise tracker. It guarantees the scheduler never promises more than a device has. It does nothing about a container that breaks the promise at runtime, and with GPUs that's the failure mode that actually hurts: CUDA doesn't care what a ResourceClaim says, and one greedy `cudaMalloc()` loop will happily take VRAM a neighbor was counting on.

Enforcement is HAMi's second job, and it lives in [HAMi-core](https://github.com/Project-HAMi/HAMi-core), a C library (`libvgpu.so`) preloaded into the container that intercepts CUDA and NVIDIA Management Library (NVML) calls and applies the granted limits from user space. The behavior is easy to verify on any shared card: give 2 pods 8,000 MiB grants each, then have one deliberately allocate past its limit. The offender gets a CUDA out-of-memory at exactly its 8,000 MiB boundary while the neighbor keeps running untouched, even if the physical card still has free VRAM. The quota is the limiter, per container, which is precisely what a shared multi-team cluster needs.

I'll be equally honest about the ceiling: this is software enforcement via library interposition. A workload that bypasses the preload (static linking against the driver, `CUDA_DISABLE_CONTROL`, containers-in-containers) escapes it. For adversarial multi-tenancy you want hardware partitioning (NVIDIA Multi-Instance GPU (MIG), which HAMi can also schedule dynamically); for cooperative teams sharing expensive cards, interception is the granularity winner: 1 MiB memory steps and 1% compute steps against MIG's fixed profiles.

Nothing in DRA replaces this layer. The DRA driver's job ends at the Container Device Interface (CDI): telling the runtime which device nodes to mount and which environment to set. What happens after the process starts calling CUDA is out of scope by design. So the realistic architecture pairs the two: DRA as the request-and-scheduling language, HAMi-core as the runtime muscle, and a driver in between translating one into the other.

## The DRA stack HAMi ships today

That driver exists, and the work is spread across 3 repositories worth knowing individually, because they solve different operational problems.

[k8s-dra-driver](https://github.com/Project-HAMi/k8s-dra-driver) is the foundation: a DRA driver that publishes each GPU's memory and compute as consumable capacity in ResourceSlices, runs the kubelet plugin that resolves allocations on the node, and wires containers up through CDI with HAMi-core enforcement attached. The project describes it as the first open source DRA driver for NVIDIA GPUs with consumable capacity enabled.

[HAMi-DRA](https://github.com/Project-HAMi/HAMi-DRA) answers the question every platform team asks next: what about the hundreds of manifests already written against `nvidia.com/gpu` and `nvidia.com/gpumem`? It's a mutating admission webhook that strips the classic extended resources out of incoming pods and generates the equivalent ResourceClaims on the fly, preserving the familiar UUID and device-type annotations for targeting. The resource names it translates are configurable (`resourceName`, `resourceMem`, `resourceCores` in the chart values), so renamed or vendor-specific resources keep working. If the pattern sounds familiar, it should: HAMi's traditional pipeline also begins with a mutating webhook. There's a deeper payoff than backward compatibility. Because the webhook emits a standard ResourceClaim and leaves scheduling to whoever owns it, HAMi-DRA drops into clusters running Volcano, KAI Scheduler, or any other scheduler without patching them. The traditional pipeline had to inject its own extender into the scheduling path, which meant every third-party scheduler needed HAMi-specific integration. DRA removes that coupling: the request is an object any DRA-aware scheduler already understands, so HAMi no longer has to modify upstream at all. The interception point survived the migration; only what gets written into the pod changed. With HAMi v2.9, HAMi-DRA v0.2.0 was declared production-ready, and the release line has since moved to v0.2.1. Its platform list grew past NVIDIA to Ascend and Enflame, with Hygon DCU documented through Hygon's own k8s-dcu-dra-driver.

HAMi itself documents [DRA mode as an installation option](/docs/installation/how-to-use-hami-dra) since v2.8, and the observability story carries over: the DRA monitor component is enabled by default and exposes per-container device metrics over Prometheus (port 31995), so dashboards built against HAMi's exporters survive the switch. The incubation announcement commits the team to monitoring DRA consumption as a first-class concern.

Leaving scheduling to the cluster's own scheduler has a cost worth naming. HAMi-DRA ships no scheduler of its own, so it can't make topology-aware placement decisions. If two GPUs on a node are linked by NVLink (say GPU0 reaches GPU1 and GPU2 at high bandwidth, but not GPU3), a claim for two GPUs should prefer an NVLink-connected pair and avoid splitting across the slow path. The webhook can't express that. It hands the scheduler a count and a capacity, not a topology constraint. For workloads where inter-GPU bandwidth matters, you either stay on a scheduler that models topology or accept that placement is bandwidth-blind.

Installing the webhook and driver is 1 Helm release, with cert-manager in place first for the webhook's serving certificate (or bring your own via `certs.custom.crt` and `certs.custom.key`):

```bash
helm repo add hami-dra https://project-hami.github.io/HAMi-DRA
helm repo update
helm install hami-dra hami-dra/hami-dra
# add --set drivers.nvidia.containerDriver=false if the NVIDIA driver
# is installed on the host rather than through GPU Operator
```

If the GPU Operator manages your drivers, install it with `devicePlugin.enabled=false` first, because the DRA stack replaces the device plugin's job. After the release settles you should see 3 pods: the kubelet plugin, the webhook, and the monitor. `kubectl get resourceslice` confirms the driver is publishing GPU capacity, and once a workload lands, `kubectl get resourceclaim` shows the allocation the scheduler made, in the API instead of an annotation.

The prerequisites are stricter than traditional mode, and each one is a real gate:

- **Kubernetes v1.34 or newer, with `DRAConsumableCapacity` enabled.** On v1.34 and v1.35 the gate is alpha and off by default, so it needs to be set on the control plane, which rules out managed clusters that don't expose API server flags. The gate graduated to beta and turned on by default in v1.36, which quietly removes the biggest adoption blocker.
- **A CDI-capable runtime.** containerd or CRI-O with CDI enabled, plus NVIDIA driver 440 or newer.
- **A DRA driver for your silicon.** NVIDIA is the mature path; Ascend, Enflame, and Hygon DCU are arriving. HAMi's traditional mode covers a much longer list (12+ device families as of v2.9, including Cambricon MLUs, Iluvatar, MetaX, Moore Threads, Kunlunxin, AWS Neuron, and Vastai) through per-vendor device plugins. Until the driver list catches up, heterogeneous clusters stay on the device plugin path.

:::warning Important note

DRA mode and traditional device-plugin mode must not run in the same cluster simultaneously. The documentation states it flatly, and the reason follows from everything above: two bookkeepers, the scheduler extender and the DRA scheduler, would each believe they own the same VRAM, and neither sees the other's promises. Pick one mode per cluster.

:::

## The same GPU slice, old way and new

The convergence is easiest to see in YAML, with both examples taken from the current [HAMi DRA documentation](/docs/installation/how-to-use-hami-dra).

Start with what HAMi users have written for years. Ask for one card, 10 GiB of its memory, and half its compute:

```yaml
resources:
  limits:
    nvidia.com/gpu: 1
    nvidia.com/gpumem: 10240
    nvidia.com/gpucores: 50
```

This still works unchanged in DRA mode. The webhook rewrites it at admission into the native form below, so no manifest has to change.

Here is that same request written natively, as a ResourceClaim against HAMi's DeviceClass:

```yaml
apiVersion: resource.k8s.io/v1
kind: ResourceClaim
metadata:
  name: gpu-half-claim
spec:
  devices:
    requests:
      - name: gpu
        exactly:
          deviceClassName: hami-core-gpu.project-hami.io
          allocationMode: ExactCount
          count: 1
          capacity:
            requests:
              cores: 50
              memory: "10Gi"
```

The pod references the claim instead of listing resource limits:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test-dra-native
spec:
  containers:
    - name: cuda
      image: nvidia/cuda:13.0.1-base-ubi9
      command: ["sleep", "3600"]
      resources:
        claims:
          - name: gpu
  resourceClaims:
    - name: gpu
      resourceClaimName: gpu-half-claim
  restartPolicy: Never
```

The mapping is direct: `nvidia.com/gpu` becomes the device count, `gpumem` becomes the memory capacity request, `gpucores` becomes `cores`. The native form is longer, but that verbosity is the point. The old three-line block was opaque to the scheduler, which is why HAMi needed a webhook, an extender, and an annotation to act on it. The ResourceClaim says the same thing in a shape the upstream scheduler reads, RBAC guards, and kubectl shows, no private annotation dialect required.

Either way, `nvidia-smi` inside the running container reports 10,240 MiB, the granted slice rather than the physical card, because HAMi-core is doing the same interception it always did. The request language changed; the runtime contract didn't.

Before the decision tree, here's the whole comparison in one view:

|  | Device plugin mode | DRA mode |
| --- | --- | --- |
| Request language | Extended resources, opaque integers | ResourceClaim capacity requests, typed API |
| Scheduling decision | HAMi scheduler extender | Default kube-scheduler |
| Allocation record | Annotation string only HAMi reads | ResourceClaim status, kubectl and RBAC visible |
| Admission webhook | Required, routes pod to extender | Optional, HAMi-DRA translates legacy YAML |
| Kubernetes version | Any supported release | v1.34+ with feature gate; default-on since v1.36 |
| Runtime prerequisites | Standard container runtime | CDI-capable containerd or CRI-O, NVIDIA driver 440+ |
| Vendor coverage | 12+ device families | NVIDIA mature; Ascend, Enflame, Hygon DCU arriving |
| Enforcement | HAMi-core (`libvgpu.so`) | Same HAMi-core, unchanged |
| Observability | HAMi exporters | DRA monitor, Prometheus port 31995 |
| Production mileage | 16 releases, 10,000+ GPUs at DaoCloud | HAMi-DRA v0.2.1, production-ready since v2.9 |
| Coexistence | Never both modes in the same cluster | Same constraint |

## How to choose, mid-2026

My read, as someone who runs the traditional pipeline and has been tracking the DRA work:

- **Managed Kubernetes without feature-gate access on v1.34 or v1.35, or anything older:** traditional mode, no hesitation. It's the path with years of production mileage, 16 releases, and independent case studies reporting 3x utilization gains behind it.
- **Mixed-vendor accelerator fleets:** traditional mode, until DRA drivers exist for your silicon. This is HAMi's widest moat and the part DRA touches last.
- **NVIDIA clusters on v1.34+ where you control the control plane, and anyone on v1.36:** stand up DRA mode in staging now. Start with the HAMi-DRA webhook so no manifests change, watch `kubectl get resourceclaim` against your real workload mix, and let the results decide your production timeline. You end up on an API the upstream scheduler understands natively, which compounds as extensions like prioritized lists stabilize.

Three honest caveats remain: consumable capacity hasn't reached stable upstream, the k8s-dra-driver's own Helm chart is still marked work in progress, and DRA-side vendor coverage is a fraction of traditional mode's. None of that is hidden; all of it is fixable with time, and the direction of travel is set on both sides, with the HAMi 2026 roadmap naming complete DRA standard adaptation as a goal.

GPU sharing on Kubernetes was built in the gaps of an API that could only count. DRA closed the gap, HAMi kept the muscle, and for the first time the request, the schedule, and the enforcement all speak the same language.

Thanks to the following colleagues for their valuable feedback during the final reading: Mengxuan Li (HAMi), Jimmy Song (HAMi), Sarah Christoff (Linkerd).

## Sources

- [Kubernetes documentation, Dynamic Resource Allocation](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)
- [Kubernetes documentation, Feature Gates reference](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/)
- [Kubernetes documentation, Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes blog, Kubernetes v1.34: DRA has graduated to GA](https://kubernetes.io/blog/2025/09/01/kubernetes-v1-34-dra-updates/)
- [Kubernetes blog, Kubernetes v1.34: DRA Consumable Capacity](https://kubernetes.io/blog/2025/09/18/kubernetes-v1-34-dra-consumable-capacity/)
- [CNCF blog, HAMi becomes a CNCF incubating project](https://www.cncf.io/blog/2026/07/15/hami-becomes-a-cncf-incubating-project/)
- [Project HAMi, HAMi repository](https://github.com/Project-HAMi/HAMi)
- [Project HAMi, HAMi-core repository](https://github.com/Project-HAMi/HAMi-core)
- [Project HAMi, HAMi-DRA repository](https://github.com/Project-HAMi/HAMi-DRA)
- [Project HAMi, k8s-dra-driver repository](https://github.com/Project-HAMi/k8s-dra-driver)
- [HAMi documentation, How to use HAMi DRA](/docs/installation/how-to-use-hami-dra)
