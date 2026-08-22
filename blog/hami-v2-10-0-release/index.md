---
title: "HAMi v2.10.0 Release: Flexible MIG, Composable Scheduling, and an Expanded Accelerator Ecosystem"
date: "2026-08-21"
description: "HAMi v2.10.0 is officially released. This release brings dynamic Flexible MIG, a new mutex scheduling policy, a NUMA-aware sort fix with composable scheduler policies, gang-scheduling (PodGroup) support, AMD MI300X and Biren device support, deeper Ascend management with heterogeneous vNPU/HAMi-core mode and monitoring, and a KAI Scheduler + HAMi-core integration."
tags: ["Release", "GPU", "Kubernetes", "Scheduling"]
authors: [hami_community]
---

The HAMi community is proud to announce the official release of **HAMi v2.10.0**. This release advances HAMi on three fronts: **more flexible scheduling policies, broader heterogeneous accelerator coverage, and a richer scheduler ecosystem**.

v2.10.0 introduces dynamic **Flexible MIG**, a new **mutex** scheduling policy, a long-requested **NUMA-aware sort fix**, **composable scheduler policies**, **gang-scheduling (PodGroup)** support, and correct **init-container** resource accounting. On the device side it adds **AMD MI300X** and **Biren** support, **heterogeneous Ascend management** that lets template-based vNPU and HAMi-core nodes coexist in one cluster, and **vNPU HAMi-core monitoring**. It also debuts a **KAI Scheduler + HAMi-core** integration through the new KAI Resource Isolator companion project.

This article walks through the major updates in v2.10.0.

<!-- truncate -->

## Scheduling: More Flexible, More Composable

### Flexible MIG: Dynamic MIG Without Draining the Node

Historically, using NVIDIA MIG (Multi-Instance GPU) with HAMi meant leaning on static MIG geometry and tools like `nvidia-mig-parted`, often requiring a node to be drained or cordoned before changing profiles. v2.10.0 replaces that workflow with **Flexible MIG**, which performs dynamic MIG instance allocation and deallocation on demand ([#2378](https://github.com/Project-HAMi/HAMi/pull/2378), [@FouoF](https://github.com/FouoF)).

Highlights:

- **No drain required**: MIG instances are created and torn down as workloads come and go, without cordoning the node.
- **NVML dynamic discovery**: profiles are discovered dynamically via NVML, with topology-aware reservations and a profile allowlist to constrain what can be carved out.
- **State preserved across restarts**: MIG reservations and runtime identities (native GI/CI state) survive device-plugin recovery and node restarts, recorded via Pod annotations.
- **Safer startup**: the device plugin avoids resetting GPUs that already have active workloads.
- **Modernized MIG metrics**: DCGM-style metrics expose MIG UUIDs, profiles, instance IDs, and placement coordinates.

> **Known limitations**: CDI mode is not yet supported together with MIG, and multi-device MIG cases still need validation. We recommend testing your specific topology before production rollout.

### Mutex Scheduling Policy and the NUMA Sort Fix

v2.10.0 adds a new **`mutex`** GPU scheduling policy ([#2011](https://github.com/Project-HAMi/HAMi/pull/2011), [@mesutoezdil](https://github.com/mesutoezdil)). A Pod annotated with `hami.io/gpu-scheduler-policy: mutex` is placed **only on GPUs that have no existing users**, guaranteeing exclusive device access for that workload. This is useful for latency-sensitive inference or workloads that must not share a die.

The same change also fixes a long-standing sort bug that affected `binpack` and `spread`. Previously the scheduler used **NUMA node as the primary sort key**, which pinned workloads to a fixed NUMA node regardless of actual load ([#1806](https://github.com/Project-HAMi/HAMi/issues/1806)). With this release, **device utilization Score becomes the primary sort key, and NUMA is used only as a tiebreaker**, so `binpack` and `spread` now behave as expected across multi-NUMA topologies ([#2011](https://github.com/Project-HAMi/HAMi/pull/2011)).

```yaml
# Request an exclusively-allocated GPU
metadata:
  annotations:
    hami.io/gpu-scheduler-policy: "mutex"
```

### Composable Scheduler Policies

Individual policies are useful on their own, but real clusters usually want several behaviors at once: pack tightly, but keep NUMA locality, and keep a few GPUs exclusive. v2.10.0 lets `hami.io/gpu-scheduler-policy` take an **ordered, comma-separated list** so filter-style and sort-style policies compose ([#2621](https://github.com/Project-HAMi/HAMi/pull/2621), [@mesutoezdil](https://github.com/mesutoezdil), closes [#2010](https://github.com/Project-HAMi/HAMi/issues/2010)):

- `binpack`, `spread`, and `numa` act as **sort keys, applied in the order written**: `binpack,numa` sorts by binpack first and uses NUMA as the tiebreaker.
- `mutex` (and `topology-aware` on NVIDIA) act as **filters**, pruning candidates before sorting.
- Candidates that compare equal get deterministic device-index ordering, and filter-only chains fall back to `spread`.
- Whitespace around commas is trimmed, and **single values keep working exactly as before**.

```yaml
# Exclusive GPUs only, then pack tightly with NUMA as tiebreaker
metadata:
  annotations:
    hami.io/gpu-scheduler-policy: "mutex,binpack,numa"
```

With this change, v2.10.0 closes out the scheduler-policy combination work tracked in the v2.10 roadmap: the policies (`mutex`, `numa`, `topology-aware`, `binpack`, `spread`) can now be used individually or chained in any order.

### PodGroup (Gang-Scheduling) Support

For distributed training and other all-or-nothing workloads, v2.10.0 adds **PodGroup support** so that members of a PodGroup bind cleanly without tearing each other down on node-lock contention ([#2066](https://github.com/Project-HAMi/HAMi/pull/2066), [@lin121291](https://github.com/lin121291), issue [#1832](https://github.com/Project-HAMi/HAMi/issues/1832)).

When multiple members of the same PodGroup bind concurrently to one node, they previously contended on the `hami.io/mutex.lock` annotation; the loser failed immediately and fell back to kube-scheduler backoff. v2.10.0 adds a **retry loop in `Bind`** for PodGroup members (detected via the `scheduling.x-k8s.io/pod-group` label), with a new `--node-lock-retry-timeout` flag (default 28s, deliberately below the 30s extender timeout). Non-PodGroup Pod behavior is unchanged.

### Correct Init-Container Resource Accounting

Pods that use init containers to download weights or prepare data were previously over-counted: the scheduler summed _all_ container requests, treating init containers as if they ran in parallel. v2.10.0 aligns HAMi with standard Kubernetes semantics: the effective request is now `max(Σ app containers, max(init container))` ([#1773](https://github.com/Project-HAMi/HAMi/pull/1773), [@maishivamhoo123](https://github.com/maishivamhoo123)). This eliminates false "node full" failures and incorrect quota denials for Pods that rely on init containers.

## Expanded Heterogeneous Accelerator Support

### AMD Instinct MI300X vGPU

v2.10.0 adds **software vGPU support for AMD Instinct accelerators**, validated against the **MI300X** on ROCm 7.0.2 ([#2290](https://github.com/Project-HAMi/HAMi/pull/2290), [@FouoF](https://github.com/FouoF), [@kenji-mido](https://github.com/kenji-mido)).

Rather than relying on hardware SR-IOV, HAMi injects a userspace hook (`libamvgpu.so`) via glibc `LD_AUDIT` and enforces limits through `HIP_DEVICE_MEMORY_LIMIT`. This delivers hard per-GPU isolation for both memory and compute:

| Dimension | How it's requested | Behavior |
| :-- | :-- | :-- |
| Memory isolation | `amd.com/gpumem` (MiB) | Hard per-GPU limit; usage cannot exceed allocation |
| Compute isolation | `amd.com/gpucores` (0-100, CU%) | Limits compute-unit percentage (e.g. `25` ≈ 76 CUs on a 304-CU device) |
| Device count | `amd.com/gpu` | Number of GPUs |

```yaml
resources:
  limits:
    amd.com/gpu: "1" # 1 GPU
    amd.com/gpumem: "49152" # 48 GiB memory
    amd.com/gpucores: "30" # 30% of compute units
```

AMD support ships as a dedicated [`amd-device-plugin`](https://github.com/Project-HAMi/amd-device-plugin) component (`0.0.1`) that installs `libamvgpu.so` via a `postStart` hook. **Do not use the upstream ROCm `k8s-device-plugin` together with it.**

:::warning[Requirements and limitations]

- Workload images must be **glibc-based with GLIBC 2.34 or newer** (e.g. a recent `rocm/pytorch` tag). **Alpine/musl, Ubuntu 20.04, and RHEL 8 are not supported yet** ([#2265](https://github.com/Project-HAMi/HAMi/issues/2265)).
- **No RDNA/WGP-based devices** yet.
- Multi-GPU-per-Pod cases are not yet validated for lack of hardware.
- If you use the AMD GPU Operator for drivers, disable its built-in device plugin first.

:::

### Biren Device Support

v2.10.0 adds management support for **Biren** accelerators (verified model: `Biren166M`), contributed by [@DSFans2014](https://github.com/DSFans2014) ([#1711](https://github.com/Project-HAMi/HAMi/pull/1711)). It offers two allocation modes:

- **Full-card mode**: each Pod exclusively occupies an entire GPU.
- **SVI partitioning**: split a card into a fixed **2 or 4 partitions**, with device UUID selection/exclusion via annotations.

```yaml
# Label the node first: kubectl label node <node-name> biren=on
resources:
  limits:
    birentech.com/gpu: "1"
```

> **Note**: Unlike NVIDIA/AMD, you do **not** specify a memory or core size per Pod for Biren; you get a full card or an SVI partition (2- or 4-way). The `biren-device-plugin` DaemonSet is deployed into the `biren-gpu` namespace.

With AMD and Biren joining the lineup, HAMi now covers an even broader range of accelerators including NVIDIA, Huawei Ascend, Cambricon, Hygon DCU, Biren, Enflame, MetaX, Kunlunxin, Iluvatar, AWS Neuron, and Vastai Technologies.

## More Flexible Ascend Management

### Heterogeneous Ascend Mode: vNPU and HAMi-core in One Cluster

HAMi v2.9.0 introduced HAMi-core mode for Ascend (software-based memory and compute partitioning). A practical limitation remained: a Pod had to explicitly opt into a mode, so cluster operators effectively maintained two sets of workload configurations.

v2.10.0 makes Ascend workloads **mode-agnostic**. A Pod without a `huawei.com/vnpu-mode` annotation now follows whatever the node it lands on supports within the same cluster: **template-based hard partitioning (vNPU)** on template nodes, and **HAMi-core soft partitioning** on HAMi-core nodes ([HAMi #2035](https://github.com/Project-HAMi/HAMi/pull/2035) and [ascend-device-plugin #106](https://github.com/Project-HAMi/ascend-device-plugin/pull/106), [@ouyangluwei163](https://github.com/ouyangluwei163)). Pods that carry an explicit `huawei.com/vnpu-mode: hami-core` annotation stay pinned to that mode. The scheduler only rejects a hami-core request on a node that genuinely lacks hami-core support.

This reduces the complexity of running mixed Ascend fleets: you no longer need to duplicate workload manifests for the two partitioning styles.

### vNPU HAMi-core Monitoring

Soft-partitioned Ascend resources can now be **observed**, not just allocated. v2.10.0 turns on an embedded Prometheus metrics server for vNPU HAMi-core mode, exposing per-container and per-device visibility:

- **A `metrics` server on port 9395**, started only when `hami-vnpu-core` mode is enabled ([ascend-device-plugin #93](https://github.com/Project-HAMi/ascend-device-plugin/pull/93), [@maverick123123](https://github.com/maverick123123)).
- **Per-container AICore utilization** via `hami_container_device_utilization_ratio` (correctly mapped per device UUID rather than falling back to the first device).
- **Per-device memory** via `hami_host_gpu_memory_used_bytes`, aggregated from per-container usage for accuracy under sharing.
- **Process-level HBM tracking** through DCMI, with per-container shared-memory accounting that also supports multi-device (TP>1) inference ([ascend-device-plugin #87](https://github.com/Project-HAMi/ascend-device-plugin/pull/87); [hami-vnpu-core #10](https://github.com/Project-HAMi/hami-vnpu-core/pull/10)).
- **Helm-deployable** monitoring via the ascend-device-plugin chart ([#108](https://github.com/Project-HAMi/ascend-device-plugin/pull/108), [@DSFans2014](https://github.com/DSFans2014)).

This takes soft-partitioned Ascend from "allocatable" to "observable and operable."

## Scheduler Ecosystem

### KAI Scheduler + HAMi-core via the KAI Resource Isolator

v2.10.0 debuts an integration that lets **KAI Scheduler** handle GPU-sharing scheduling while **HAMi-core** enforces runtime isolation inside the container, connected by a new companion project: the [KAI Resource Isolator](https://github.com/Project-HAMi/KAI-resource-isolator) (v1.1.0, [@archlitchi](https://github.com/archlitchi); monitoring by [@dttung2905](https://github.com/dttung2905)).

The division of responsibility is clean:

- **KAI Scheduler** decides _which_ Pod gets _what fraction_ of a GPU.
- The **KAI Resource Isolator** makes that decision _stick_: a DaemonSet (`libsync`) ships HAMi-core's `libvgpu.so` to GPU nodes, and a **mutating webhook** injects the library into shared Pods and patches `/etc/ld.so.preload` so that `libvgpu.so` intercepts CUDA memory-allocation calls and enforces the hard VRAM limit KAI Scheduler established via `CUDA_DEVICE_MEMORY_LIMIT`.
- The integration **reuses HAMi's monitoring metrics** and stays compatible with the existing HAMi Grafana dashboard.

KAI Scheduler **≥ 0.17.0** is required, with `global.gpuSharing=true` and `binder.plugins.hamicore.enabled=true`.

:::note[Actively maturing]

The KAI + HAMi-core architecture is in place and the isolator is released, but two hardening PRs are still in flight and worth tracking before production hard-isolation use: fraction-based VRAM enforcement ([#6](https://github.com/Project-HAMi/KAI-resource-isolator/pull/6)) and non-root-container directory permissions ([#22](https://github.com/Project-HAMi/KAI-resource-isolator/pull/22)). We recommend validating that memory limits actually take effect in your KAI GPU-sharing Pods. Related HAMi-side CRD work ([#2014](https://github.com/Project-HAMi/HAMi/pull/2014)) is also still in draft. See our earlier deep-dive on [GPU memory hard isolation with KAI Scheduler](/blog/kai-scheduler-hami-gpu-memory-hard-isolation).

:::

### Volcano vNPU Support for Ascend Soft Partitioning

Volcano can now combine with the Ascend device plugin and `hami-vnpu-core` to schedule and run Ascend soft-partitioning workloads, bringing Volcano's batch-scheduling strength together with HAMi's runtime isolation. Volcano exposes Ascend vNPU through its `deviceshare` plugin (`AscendHAMiVNPUEnable: true`), supporting heterogeneous Ascend clusters including 910A, 910B2, 910B3, and 310P.

Requirements worth noting: **Volcano ≥ 1.14** is needed, with **≥ 1.16 required for `hami-core` soft slicing**, and soft slicing is **ARM-only**. See the [ascend-device-plugin Volcano guide](https://github.com/Project-HAMi/ascend-device-plugin/blob/main/docs/volcano.md) for details.

## Chart, Build, and Operational Improvements

- **DRA moved to its own chart** ([#2038](https://github.com/Project-HAMi/HAMi/pull/2038), [@archlitchi](https://github.com/archlitchi)): DRA components are removed from the main HAMi Helm chart. DRA now lives in its [own dedicated chart/repo](https://github.com/Project-HAMi/HAMi-dra), so clusters not using DRA no longer pull those components.
- **Handshake annotation optimization** ([#2052](https://github.com/Project-HAMi/HAMi/pull/2052), [@archlitchi](https://github.com/archlitchi)): node cleanup now fully removes handshake annotation keys instead of writing timestamped `Deleted_*` markers, keeping health/reset reporting consistent.
- **ubi8 compile image** ([#1958](https://github.com/Project-HAMi/HAMi/pull/1958), [@spencercjh](https://github.com/spencercjh)): the HAMi and HAMi-core build stages moved to `nvidia/cuda:13.3.0-cudnn-devel-ubi8`, broadening GLIBC compatibility so built artifacts run across a wider range of target distributions.
- **mock-device-plugin NPU templates** ([mock-device-plugin #18](https://github.com/Project-HAMi/mock-device-plugin/pull/18), [@Wangmin362](https://github.com/Wangmin362)): the mock plugin now supports both new nested and legacy flat `vnpus` config formats and registers Ascend AI-core and Hygon DCU cores resources, enabling hardware-less testing of NPU vNPU scheduling.

## Contributors

v2.10.0 is the result of contributions across the HAMi main repo and the broader Project-HAMi org (ascend-device-plugin, KAI-resource-isolator, mock-device-plugin, hami-vnpu-core, amd-device-plugin). Representative feature owners this cycle:

- [@archlitchi](https://github.com/archlitchi): release coordination, KAI Resource Isolator, DRA chart separation, handshake optimization
- [@mesutoezdil](https://github.com/mesutoezdil): mutex scheduling policy, NUMA sort fix, composable policy chains
- [@maverick123123](https://github.com/maverick123123): Ascend vNPU HAMi-core monitoring
- [@ouyangluwei163](https://github.com/ouyangluwei163): heterogeneous Ascend mode (vNPU + HAMi-core)
- [@FouoF](https://github.com/FouoF), [@kenji-mido](https://github.com/kenji-mido): AMD MI300X vGPU, Flexible MIG
- [@DSFans2014](https://github.com/DSFans2014): Biren device support, vNPU monitor Helm chart
- [@lin121291](https://github.com/lin121291): PodGroup gang-scheduling support
- [@maishivamhoo123](https://github.com/maishivamhoo123): init-container resource accounting
- [@Wangmin362](https://github.com/Wangmin362): mock-device-plugin NPU templates
- [@spencercjh](https://github.com/spencercjh): ubi8 compile image
- [@dttung2905](https://github.com/dttung2905): KAI vGPU monitor and non-root workload fixes

Thank you to every contributor, and to every user who reported issues, tested release candidates, and shared production feedback. The full contributor list is reflected in the [v2.10.0 release notes](https://github.com/Project-HAMi/HAMi/releases/tag/v2.10.0).

## Upgrade Guide

Upgrade to v2.10.0 via Helm:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
helm upgrade hami hami-charts/hami -n kube-system
```

For complete installation documentation, refer to: [/docs/installation/online-installation](/docs/installation/online-installation)

:::warning[Upgrade notes]

- **DRA users**: DRA is no longer installed from the main chart. If you rely on HAMi-DRA, follow the [HAMi-dra](https://github.com/Project-HAMi/HAMi-dra) chart installation.
- **AMD users**: deploy the dedicated [`amd-device-plugin`](https://github.com/Project-HAMi/amd-device-plugin) and ensure workload images meet the GLIBC 2.34 requirement.
- **Ascend users**: vNPU HAMi-core monitoring requires enabling `hami-core` mode; verify your Volcano version (≥ 1.16 for soft slicing, ARM-only).
- We recommend verifying compatibility in a test environment before upgrading.

:::

## Summary

HAMi v2.10.0 is a release focused on **scheduling flexibility, accelerator breadth, and ecosystem depth**. With Flexible MIG, composable scheduling policies (mutex, the NUMA sort fix, and comma-separated policy chains), gang-scheduling support, AMD and Biren devices, deeper Ascend management and observability, and a KAI Scheduler + HAMi-core integration, HAMi keeps expanding what a unified heterogeneous-compute scheduling platform can do.

We sincerely welcome more developers, users, and ecosystem partners to join the HAMi community and help advance GPU virtualization and heterogeneous-compute scheduling.

---

**Related links:**

- GitHub Release: [https://github.com/Project-HAMi/HAMi/releases/tag/v2.10.0](https://github.com/Project-HAMi/HAMi/releases/tag/v2.10.0)
- KAI Resource Isolator: [https://github.com/Project-HAMi/KAI-resource-isolator](https://github.com/Project-HAMi/KAI-resource-isolator)
- Ascend Device Plugin: [https://github.com/Project-HAMi/ascend-device-plugin](https://github.com/Project-HAMi/ascend-device-plugin)
- AMD Device Plugin: [https://github.com/Project-HAMi/amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin)
- Documentation: [/docs/](/docs/)
- Community Discord (recommended): [https://discord.gg/Amhy7XmbNq](https://discord.gg/Amhy7XmbNq)
- Community CNCF Slack: [https://cloud-native.slack.com/archives/C07T10BU4R2](https://cloud-native.slack.com/archives/C07T10BU4R2)
