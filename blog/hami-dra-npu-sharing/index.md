---
title: "From HAMi to HAMi-DRA: The Evolution of Heterogeneous Compute Management"
date: "2026-10-09"
description: "What HAMi DRA is, why HAMi needs it, and how it is designed: the four bottlenecks of the Device Plugin era (quota accounting, preemption compatibility, scheduling performance, deadlocks), the HAMi-DRA webhook conversion, the DRA driver ecosystem timeline, the role HAMi-core keeps, and adoption guidance with real-cluster examples."
authors: [rootsongjc]
tags: ["HAMi", "DRA", "Ascend", "NPU Sharing", "Kubernetes"]
---

On September 15, 2026, the HAMi community released [HAMi DRA](https://github.com/Project-HAMi/HAMi-DRA) 0.2.3. The version itself is a routine iteration, but the timing is worth noting: the HAMi 2.9 release webinar declared HAMi-DRA production-ready, with NPU DRA support planned for 2.10. For anyone tracking heterogeneous compute scheduling, HAMi DRA has moved from "experimental direction" to "an option worth evaluating seriously".

The discussion around it has not stopped either. Ever since Kubernetes 1.34 took DRA (Dynamic Resource Allocation) to GA, "does DRA make HAMi obsolete?" has been a frequent question in the community channels; the answer given in [Does Kubernetes DRA Replace HAMi?](/blog/does-kubernetes-dra-replace-hami) is that DRA absorbs the request-and-scheduling half, while the enforce-inside-the-container half was never something DRA set out to do, and that is exactly where HAMi stays.

HAMi DRA is the community's engineering answer to that debate: a migration layer that automatically converts the HAMi-style resource requests in existing workloads into native ResourceClaims, hands scheduling and accounting back to kube-scheduler, keeps runtime isolation with HAMi-core, and leaves the business side without a single line to change. The current 0.2.3 release covers NVIDIA GPUs; with the Ascend DRA driver, the chain has been verified end to end on a real 310P3 cluster, and the community shipped the companion [Lab 20: Ascend NPU Sharing with HAMi DRA](/tutorials/labs/ascend-hami-dra) with commands and real captured output. This post is a systematic introduction to HAMi DRA: its motivation, design, usage, and current boundaries.

<!-- truncate -->

## What HAMi solved, and where it hit the ceiling

The problem HAMi solves is direct: the Device Plugin's extended resources can only express whole cards (`nvidia.com/gpu: 1`, `huawei.com/Ascend310P: 1`), while sharing means "part of one card's memory plus part of its compute":

```yaml
# Device Plugin can only ask for a whole card, no slicing
resources:
  limits:
    nvidia.com/gpu: 1

# Sharing actually needs this (HAMi syntax):
resources:
  limits:
    huawei.com/Ascend310P: 1
    huawei.com/Ascend310P-memory: "8192" # 8 GiB of memory
    huawei.com/Ascend310P-core: "50" # 50% of the compute
```

To deliver that, HAMi built a complete stack on the old API: a mutating webhook rewrites Pods, a scheduler extender does shared scheduling, device plugins report and mount, and HAMi-core (`libvgpu` / `libvnpu`) enforces quotas inside containers. The stack has held up in production: SF Express saved up to 57% of its GPUs, SNOW cut costs by 55%, and China Merchants Bank reached 100% hardware pool utilization with topology-aware scheduling.

But every one of these components is a patch on the old API, and the more patches stack up, the more visible the structural problems become. The four pains HAMi users run into most often:

| Pain | In plain words |
| :-- | :-- |
| Quota does not bite | native ResourceQuota can count `huawei.com/*` extended-resource requests, but only as flat totals per namespace; it cannot see the per-device memory-and-core slicing HAMi does, so limiting real usage per team means building a separate quota system |
| Preemption does not apply | preemption and other scheduler features do not recognize decisions made by an out-of-tree scheduler, so a high-priority task cannot bump a low-priority one out of the way |
| Slower when busy | several Pods scheduled to the same node are processed one by one (the node lock); the busier the cluster, the slower Pod creation gets |
| Occasional stalls | one failed request can leave a whole node locked for 5 minutes, and every new Pod on that node waits |

None of these are bugs in the code; they are the road itself: simulating fine-grained slicing on a "whole cards per node" allocation model cannot avoid these costs.

![Where HAMi gets stuck on Device Plugin](/img/hami-dra-npu-sharing/where-hami-stuck.png)

The left side of the figure is the whole chain HAMi had to build itself to deliver sharing: every layer between the Pod and the accelerator is HAMi's own. The dashed lines show where each bottleneck lives: number 1 sits in the resource declaration itself (extended resources enter native quotas only as flat card counts, not the fine-grained slicing HAMi performs), while numbers 2, 3, and 4 all sit in the Scheduler Extender stage: preemption is limited because HAMi does not implement the optional preempt verb that the extender API defines, the node lock serializes concurrent scheduling, and a failed request can lock a node for 5 minutes.

## What DRA changed

Kubernetes 1.34 took the DRA (Dynamic Resource Allocation) core APIs to GA, and cluster device management moved from a node-centric allocation model to a declarative model centered on resource objects. Four new objects:

- **ResourceSlice**: the device inventory. Each accelerator is one device with attributes (uuid, model, PCIe, and so on) and capacity (memory, compute).
- **ResourceClaim**: the Pod's device demand, expressed and constrained before the Pod is created.
- **DeviceClass**: filtering and configuration templates for devices.
- **ResourceClaimTemplate**: lets controllers such as StatefulSet generate claims in bulk.

The key enabler for shared scheduling is **Consumable Capacity** (KEP-5075): devices publish capacity along two independent dimensions (memory and a compute percentage), `allowMultipleAllocations` lets several claims consume one device, and kube-scheduler reconciles consumed capacity dimension by dimension, with each allocation carrying an independent shareID. "Multiple workloads fairly consuming parts of one accelerator" becomes a native scheduler capability for the first time, with no out-of-tree component simulating it. Note the feature gate needs manual enabling on 1.34/1.35 and is on by default from 1.36.

What the device and the allocation look like in a real cluster (abridged):

```yaml
# ResourceSlice: one device per 310P3, capacity in two dimensions
devices:
  - name: npu-0-0
    attributes:
      productName: { string: 310P3 }
      uuid: { string: 68496E64-20E05477-92C31323-6E78030A-BD003019 }
    capacity:
      cores: { value: "100" }
      memory: { value: 21525Mi }
    allowMultipleAllocations: true

# ResourceClaim: asking for a part of it
capacity:
  requests:
    cores: "50"
    memory: "8589934592"
```

![The DRA object model and per-dimension accounting](/img/hami-dra-npu-sharing/dra-model.png)

In the figure, Claim A and Claim B each ask for a part of the same device (npu-0-0), and kube-scheduler keeps the books against the ResourceSlice, dimension by dimension; once the capacity is fully consumed, Claim C stays pending until a Pod releases its share.

The traditional Device Plugin interface can only expose simple capacity, and the scheduler discovers "not enough resource" only after landing on a node; with DRA, device attributes are matched precisely at scheduling time. The migration logic here is straightforward: the bottleneck was never HAMi's scheduling algorithm, but the API layer beneath it.

## The design of HAMi DRA

HAMi DRA does not start over; it replaces only the upper part: scheduling and accounting move to the Kubernetes-native implementation, and runtime isolation stays with HAMi-core.

![The HAMi DRA request path, from YAML to accelerator](/img/hami-dra-npu-sharing/hami-dra-design.png)

The whole journey starts from a single YAML. A compatible-mode user keeps writing resource names like `huawei.com/Ascend310P`, and HAMi DRA's mutating webhook converts them into a ResourceClaim at admission; a native-mode user submits the ResourceClaim directly and skips that step. From there, kube-scheduler schedules and accounts against the ResourceSlice and binds the Pod to a node. On the node, kubelet calls the DRA driver's Prepare interface, which writes a CDI spec; containerd then creates the container from the spec, with HAMi-core (`libvgpu` / `libvnpu`) injected inside to enforce the quotas. The workload finally runs on GPUs, NPUs, DCUs, and the other supported accelerators, and the numbers ① through ⑧ in the figure follow that order.

Three components, three responsibilities: the **HAMi-DRA Webhook** decides "how the request is declared", the **DRA driver** decides "how a device is allocated", and **HAMi-core** decides "how a device is shared".

The **webhook** does two things. First, automatic multi-dimensional resource conversion: it turns HAMi's multi-dimensional resource names (for example `huawei.com/Ascend310P` plus `-memory` plus `-core`, or on the NVIDIA side `nvidia.com/gpu` plus `gpumem` plus `gpucores`) into the ResourceClaim's `count` and `capacity.requests`, and HAMi's card-selection annotations (`use-*-uuid` and friends) into CEL selectors. Second, ResourceClaim lifecycle management: claims are created bound to the Pod and cleaned up when the Pod is deleted. Notably, HAMi-DRA itself no longer contains a scheduler component and works with the native kube-scheduler as well as Volcano and others.

The **DRA driver** is the node-side implementation: it discovers devices and publishes the ResourceSlice (attributes plus capacity), handles kubelet's `NodePrepareResources` to inject environment variables and create shared directories, and uses `UnprepareResourceClaims` to clean up HAMi-core's temporary files at the right moment, which is part of why device lifecycle management is more complete than in the Device Plugin era. Device injection reaches containerd through the standard CDI interface.

**HAMi-core** stays as it is: DRA only addresses the request-and-scheduling half; the enforce-inside-the-container half (memory quotas, compute time slices) remains with `libvgpu` / `libvnpu`. That is exactly where the conclusion of [Does Kubernetes DRA Replace HAMi?](/blog/does-kubernetes-dra-replace-hami) lands architecturally.

The scheduling-performance gain comes from the same replacement: by riding DRA's own scheduling, HAMi-DRA avoids the node-lock performance decay; when several Pods land on the same node concurrently, the original approach's Pod creation time degrades roughly linearly as concurrency grows, while HAMi-DRA stays clearly lower in internal community testing. This owes mainly to DRA's resource pre-binding: the allocation is settled at scheduling time, which removes scheduling conflicts and retries. The overall change summarizes as four mappings: NodeLock to No Locks, ResourceName to ResourceClaim, Device Plugin to DRA Driver, and Annotation to Attributes.

Another easily underrated change is observability. In the traditional model, resource information comes from Nodes and usage from Pods, and a complete resource view has to be assembled by inference; in the DRA model, ResourceSlice describes the device inventory and ResourceClaim the allocations, so the resource view is itself a first-class citizen. Observability moves from "inferring" to "directly modeling": operators can read from a ResourceClaim who occupies which accelerator, how much memory was allocated, and how much is left, instead of reverse-engineering it from node status and Pod specs.

## Two usage modes

One cost of DRA's capability upgrade is often overlooked: the writing complexity, the often-mentioned "UX regression". The Device Plugin style is one line:

```yaml
resources:
  limits:
    nvidia.com/gpu: 1
```

The native DRA style is a separate ResourceClaim object with nested `count` and `capacity.requests`, plus a CEL selector filtering by device attributes:

```yaml
spec:
  devices:
    requests:
      - exactly:
          allocationMode: ExactCount
          count: 1
          capacity:
            requests:
              memory: 4194304k
```

For an enterprise already on Device Plugin, the migration cost is not just rewriting YAML; the whole team has to learn a new resource-declaration paradigm. HAMi-DRA's answer is two submission styles with the same scheduling and slicing underneath:

- **DRA native mode**: create the ResourceClaim by hand declaring memory and compute, and reference it from the Pod via `resourceClaims`. Suited to new workloads; CEL selectors express device-attribute constraints directly (topology awareness, NUMA affinity; the same mechanism extends to NICs and other resources, and `firstAvailable` expresses multiple candidate allocation plans).
- **DevicePlugin-compatible mode**: keep the traditional `nvidia.com/gpu` / `huawei.com/Ascend310P` resource syntax; the webhook intercepts and converts it into a ResourceClaim. Existing workloads migrate with zero changes, which is where "seamless migration" comes from: the design turns DRA from an "expert interface" into an "ordinary user interface".

In compatible mode the conversion happens at admission:

![Compatible mode: the webhook converts HAMi syntax at admission](/img/hami-dra-npu-sharing/webhook-conversion.png)

The webhook turns the three HAMi resource entries into the ResourceClaim's `count`, `capacity.requests` (8192 MiB converted to bytes), and CEL selectors; the claim's lifecycle is bound to the Pod and is reclaimed when the Pod is deleted.

For a Pod submitted to a real Ascend 310P cluster, the three `huawei.com/*` entries in `resources.limits` are replaced by `resources.claims` and `spec.resourceClaims`, and in the generated ResourceClaim HAMi semantics enter DRA semantics field by field:

| ResourceClaim field | Comes from | Conversion |
| :-- | :-- | :-- |
| `count: 1` | `Ascend310P: 1` | integer passed through |
| `capacity.requests.memory: 8589934592` | `-memory: 8192` (MiB) | MiB to bytes (8192 × 1024 × 1024) |
| `capacity.requests.cores: "50"` | `-core: 50` | percent passed through |
| CEL selectors | `use-Ascend310P-uuid` annotation | `uuid in ["..."]`, the value taken from the ResourceSlice |

When two Pods each request 8192 MiB plus 50 cores against the same card, both claims land on the same device with independent shareIDs, and the scheduler debits the first one's consumption before allocating the second. Once capacity is fully debited, the next request is refused by the scheduler itself (the claim stays pending); when a Pod is deleted, its claim is reclaimed automatically and the accounting recovers. In-container enforcement is still HAMi-core: `libvnpu.so` intercepts over-quota memory requests and turns them into an in-container OOM, and the device as seen from the container is virtualized to the requested 8 GiB rather than the card's 21 GiB. The full walkthrough is [Lab 20](/tutorials/labs/ascend-hami-dra).

## The device support timeline, and "why now"

What HAMi DRA can do is bounded by each vendor's DRA driver progress:

- 2025.09: NVIDIA DRA driver, Consumable Capacity ready
- 2026.03: Hygon DCU DRA driver integrated with HAMi DRA
- 2026.04: Enflame DRA driver, integration under way

The Ascend path extends HAMi DRA's reach to NPUs: [Lab 20](/tutorials/labs/ascend-hami-dra) has already run the complete chain from HAMi request to NPU sharing on a 310P3 server with the official [Project-HAMi/ascend-dra-driver](https://github.com/Project-HAMi/ascend-dra-driver) at chart 0.1.1 (the lab used the development build fixing uuid generation; behavior may change before an official release). HAMi 2.10.0 was released in August 2026 and its release notes now point the community to the Ascend DRA driver repository; the driver itself is still pre-release, so the window for trying it and giving feedback remains open.

## The practical constraints before adoption

The adoption friction groups into four:

- **High version dependency**: Consumable Capacity requires Kubernetes 1.34+, other DRA features possibly higher, and driving a production upgrade is not easy.
- **Limited vendor support**: few ready-to-use DRA drivers exist, and the set of supported heterogeneous devices is still small.
- **Missing scoring**: DRA lacks scoring at the device-scheduling layer, limiting support for specialized scheduling requirements.
- **Learning cost**: DRA's new concepts carry a threshold for the people deploying and maintaining clusters; the HAMi community's countermeasure is precisely the webhook-compatible mode keeping that cost out of the user's sight.

On choosing between them, the community's guidance: for standardized clusters chasing the best scheduling outcome (topology-aware scheduling, for example), plain HAMi is recommended; for highly customized clusters (already running their own scheduler) or plug-and-play device reuse, HAMi DRA is recommended. Two operational facts are also worth remembering: DRA mode and the traditional mode are two different paths for the same request, and one request must not go through both; when HAMi core is still installed, the webhook exemptions used in Lab 20 let the two coexist in one cluster. And DRA mode still goes through HAMi-core.

## Outlook

On the HAMi-DRA roadmap: more heterogeneous devices (MetaX, Iluvatar CoreX), more DRA feature adoption (List Attributes, Partitionable Devices), compatibility with the Kubernetes-standard device attribute `resource.kubernetes.io/pcieRoot`, and scheduler integrations with Volcano and Kueue.

Zooming out: Kubernetes is evolving into the control plane of AI infrastructure, and HAMi's position is the accelerator resource layer for Kubernetes, adapting heterogeneous devices downward, supporting training, inference, and agentic workloads upward, and providing scheduling, virtualization, and resource abstraction in between. HAMi-DRA is the step that aligns this resource layer with the Kubernetes-native model: HAMi's value converges onto runtime enforcement and heterogeneous ecosystem adaptation, while resource expression and scheduling move to the native model. If you are evaluating a migration from the Device Plugin model to DRA, or looking for a unified resource layer over a heterogeneous cluster, try HAMi DRA and tell the community what you find.

## Further reading

- HAMi DRA 0.2.3 release: [Release hami-dra-0.2.3](https://github.com/Project-HAMi/HAMi-DRA/releases/tag/hami-dra-0.2.3)
- Yang Shouren at AICon Shenzhen 2026: [From HAMi to HAMi-DRA (talk, in Chinese)](https://aicon.infoq.cn/2026/shenzhen/presentation/7168)
- Wang Jifei and James Deng at KCD Beijing 2026: [From Device Plugin to DRA: GPU Scheduling Paradigm Shift and HAMi-DRA in Practice (recap, in Chinese)](https://dynamia.ai/zh/blog/kcd-beijing-2026-dra-gpu-scheduling)
- HAMi 2.9 release webinar recap by Li Mengxuan (in Chinese): [HAMi 2.9 Ascend soft slicing and DRA in depth](https://dynamia.ai/zh/blog/hami-2.9-webinar-recap)
- Community getting-started guide (in Chinese): [HAMi meets Kubernetes DRA: a practical guide](https://dynamia.ai/zh/blog/hami-dra-quickstart)
- Mesut Oezdil: [Does Kubernetes DRA Replace HAMi?](/blog/does-kubernetes-dra-replace-hami) ([CNCF blog original](https://www.cncf.io/blog/2026/08/07/does-kubernetes-dra-replace-hami/))
- User guide: [How to use HAMi DRA](/docs/installation/how-to-use-hami-dra); hands-on: [Lab 20: Ascend NPU Sharing with HAMi DRA](/tutorials/labs/ascend-hami-dra) and [Lab 4: GPU Slicing with Dynamic Resource Allocation](/tutorials/labs/hami-dra)
- Components: [Project-HAMi/HAMi-DRA](https://github.com/Project-HAMi/HAMi-DRA) · [Project-HAMi/ascend-dra-driver](https://github.com/Project-HAMi/ascend-dra-driver) · [Project-HAMi/hami-vnpu-core](https://github.com/Project-HAMi/hami-vnpu-core)
