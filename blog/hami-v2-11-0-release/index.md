---
title: "HAMi v2.11.0 Release: Remote GPU Scheduling, Ascend ENPU, NUMA Refit, and Flexible MIG at Scale"
date: "2026-11-04"
description: "HAMi v2.11.0 is officially released. This release introduces Remote GPU scheduling through Lupine, Ascend ENPU mode with policy isolation, a scheduler NUMA refit that aligns CPU and GPU allocations, major Flexible MIG maturation including CDI support, scheduler security hardening, OpenShift and SELinux support, and a reworked Helm chart."
tags: ["Release", "GPU", "Kubernetes", "Scheduling"]
authors: [hami_community]
---

The HAMi community is proud to announce the official release of **HAMi v2.11.0**.

Highlights of this release:

- **Remote GPU**: run CUDA and vLLM Pods on GPU-less, driver-less client nodes, using GPUs served over the network by [Lupine](https://github.com/lupinemachines) GPU servers.
- **Ascend ENPU mode**: policy-based isolation (`fixed-share`, `elastic`, `best-effort`) as a third partitioning mode alongside templates and hami-core, plus a major `hami-vnpu-core` performance overhaul.
- **NUMA refit**: kubelet's Topology Manager and HAMi's scheduler now agree, so CPU affinity and GPU placement land on the same NUMA node.
- **Flexible MIG grows up**: CDI injection for dynamic MIG devices, placement scoring with backtracking, and per-Pod profile preferences.
- **A harder scheduler**: security-audit-driven hardening of the scheduler extender and webhook, plus Filter-path performance gains.
- **Platform and chart**: OpenShift and SELinux support, a restructured `devices.VENDOR` chart, and node capacity resource reporting.
- **Website overhaul**: reorganized information architecture, a redrawn Concepts section, `llms.txt`, and restructured installation and upgrade guides.

In total, v2.11.0 merges more than 220 pull requests from over 50 contributors, including **29 first-time contributors**.

This article walks through the major updates in v2.11.0.

<!-- truncate -->

## Remote GPU: Run CUDA Anywhere

Not every node needs a GPU, and not every GPU node should run workloads. With Remote GPU ([#3004](https://github.com/Project-HAMi/HAMi/pull/3004), [@moezdil](https://github.com/moezdil); design from the [Lupine](https://github.com/lupinemachines) project), HAMi now schedules Pods onto GPUs served over the network by a Lupine GPU server:

- **Driver-less client nodes**: the client node needs no GPU and no NVIDIA driver. HAMi places the Pod on a separate client node, delivers the Lupine client libraries plus `nvidia-smi` through an init container, and injects the `LUPINE_SERVER` environment variable pointing at the chosen server ([@archlitchi](https://github.com/archlitchi)).
- **GPU nodes become Lupine servers**: a node configured with `operatingmode: remote` runs its GPUs for Lupine instead of advertising them as local devices, and is labeled `hami.io/lupine-server` ([#3013](https://github.com/Project-HAMi/HAMi/pull/3013), [@moezdil](https://github.com/moezdil)).
- **Pool selection**: Lupine servers can be grouped into pools by Node label, and a Pod can request a pool through the `hami.io/remote-server` annotation ([#3195](https://github.com/Project-HAMi/HAMi/pull/3195), [@asadjan4611](https://github.com/asadjan4611)). NotReady servers are excluded from placement.
- **Whole-server reservation with per-GPU memory limits**: `nvidia.com/remote-gpu` reserves an entire server (with at least the requested GPU count), while the optional `nvidia.com/remote-gpu-memory` sets a per-GPU memory cap enforced by an injected HAMi-core library. Multi-container Pods are kept on a single server ([@sanket-jadhav-cse](https://github.com/sanket-jadhav-cse)).
- **Operational safety**: Pods waiting for a Lupine fleet change are requeued instead of failing, the Lupine server ships with a configurable securityContext, and an optional session relay lets users `kubectl port-forward` to a fleet without direct rights in the server namespace. Remote mode was further hardened by [@FouoF](https://github.com/FouoF).

![Remote GPU (Lupine) architecture](/img/blog/hami-v2-11-0-release/en/remote-gpu-architecture.svg#light-only) ![Remote GPU (Lupine) architecture](/img/blog/hami-v2-11-0-release/en/remote-gpu-architecture-dark.svg#dark-only)

**Enabling it** takes two chart values and one node configuration:

```yaml
devices:
  remotegpu:
    enabled: true
    defaultPort: 14833
    resourceCountName: "nvidia.com/remote-gpu"
    resourceMemoryName: "nvidia.com/remote-gpu-memory"

devicePlugin:
  nodeConfiguration:
    config: |
      {
        "nodeconfig": [
          {
            "nodelabelselector": { "matchLabels": { "role": "lupine-server" } },
            "operatingmode": "remote"
          }
        ]
      }
```

Then a vLLM Deployment on a GPU-less node looks like any other HAMi workload (see the full [remote-gpu examples](https://github.com/Project-HAMi/HAMi/tree/master/examples/remotegpu)):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-remote-gpu
spec:
  selector:
    matchLabels:
      app: vllm-remote-gpu
  template:
    metadata:
      labels:
        app: vllm-remote-gpu
    spec:
      containers:
        - name: vllm
          image: vllm/vllm-openai:v0.25.1-ubuntu2404
          command: ["vllm", "serve", "Qwen/Qwen3-8B"]
          resources:
            limits:
              memory: 32Gi
              nvidia.com/remote-gpu: 2
              nvidia.com/remote-gpu-memory: 20480 # 20 GiB per GPU
```

Current constraints worth knowing: client nodes must be separate from server nodes, supported workload images are CUDA and vLLM 0.19-0.26, and a workload reserves the entire server.

## Deeper Ascend Partitioning: ENPU Mode and a Faster HAMi-core

### ENPU: Policy-Based Isolation for Ascend

v2.11.0 adds a third Ascend partitioning mode: **ENPU** ([#3110](https://github.com/Project-HAMi/HAMi/pull/3110), [@maverick-woo](https://github.com/maverick-woo), with the companion [ascend-device-plugin](https://github.com/Project-HAMi/ascend-device-plugin) update). Pods annotated with `huawei.com/vnpu-mode: enpu` use the existing Ascend count, memory, and core resources and are placed only on ENPU-capable nodes:

- **Three isolation policies**: `fixed-share`, `elastic`, and `best-effort` (selected via `huawei.com/enpu-policy` or the chart default `devices.ascend.enpuPolicy`), persisted at admission so a later default change never reclassifies existing tenants.
- **DIE isolation**: tenants with incompatible ENPU policies, and hami-core/ENPU tenants, are kept off the same physical DIE, including legacy hami-core Pods without a mode annotation. Single-DIE ENPU requests are preserved on A3-class hardware while SuperPod behavior is retained for other modes.
- **No template rounding**: memory and core quotas are passed through without hardware-template rounding, and `devices.ascend.deviceSplitCount` now controls the virtual-device slots per NPU for both `hami-core` and `enpu` modes ([@spencercjh](https://github.com/spencercjh)).

```yaml
devices:
  ascend:
    hamiVnpuMode: "enpu" # template | hami-core | enpu
    enpuPolicy: "elastic" # fixed-share | elastic | best-effort
```

The global mode is selected with `devices.ascend.hamiVnpuMode`; node capability annotations from the Ascend device plugin still take precedence. Also new for Ascend: slot capacity is exposed in the chart for hami-core mode, and Ascend950DT 9582 whole-card scheduling is supported.

### HAMi-core (libvNPU) Performance Overhaul

Under the LFX Mentorship 2026 Term 3 umbrella, [@maverick-woo](https://github.com/maverick-woo) rebuilt significant parts of [hami-vnpu-core](https://github.com/Project-HAMi/hami-vnpu-core) (with fixes from [@xrwang8](https://github.com/xrwang8)):

- **Reduced initialization lock contention**: a fork-aware per-process client, a same-stream worker read-lock fast path, and bounded scheduler turns.
- **Cooperative spatial compute policy and a refillable overdraft policy** for fine-grained compute and memory control.
- **Per-NPU resource limits** covering both cached and runtime HBM allocation paths, with ACL `HostArgs` eager launches accounted for.

These changes target 910C multichip slicing scenarios and make soft-partitioned Ascend meaningfully faster under concurrent inference.

## NUMA Refit: When CPU and GPU Scheduling Finally Agree

Kubernetes CPU Manager and the Topology Manager make NUMA-local decisions, but they happen **after** HAMi's scheduler has already picked a GPU. When kubelet restricts an allocation to a GPU the scheduler did not choose, the Pod either falls back or runs misaligned. v2.11.0 closes this gap with the **NUMA refit** ([#2731](https://github.com/Project-HAMi/HAMi/pull/2731), [@saiyam1814](https://github.com/saiyam1814), fixes [#2080](https://github.com/Project-HAMi/HAMi/issues/2080)):

![NUMA refit flow](/img/blog/hami-v2-11-0-release/en/numa-refit-flow.svg#light-only) ![NUMA refit flow](/img/blog/hami-v2-11-0-release/en/numa-refit-flow-dark.svg#dark-only)

The scheduler stays in charge: it re-runs its normal fit restricted to kubelet's allowed devices, updates both allocation annotations in one patch, and moves the in-memory reservation so runtime and accounting agree. Device pins such as `nvidia.com/use-gpuuuid` are honored. The feature is off by default and opt-in per Pod:

```yaml
metadata:
  annotations:
    hami.io/numa-alignment: "strict" # or best-effort
```

with `devicePlugin.numaRefit.enabled=true` in the chart plus `enableNumaTopology` and `enablegetpreferredallocation` on the node. `strict` fails the allocation when the refit cannot satisfy the topology constraint; `best-effort` keeps today's fallback.

The feature was validated on real hardware (8x NVIDIA RTX PRO 6000 Blackwell Server Edition, driver 610.43.02, Kubernetes v1.35.6, CPU Manager `static`, Topology Manager `single-numa-node`): annotated Pods received a `NumaRefitSucceed` event and ended with cpuset, runtime GPU, and annotations on the same NUMA node. Follow-up hardening landed within the same cycle from [@asadjan4611](https://github.com/asadjan4611) and [@AyushSrivastava1818](https://github.com/AyushSrivastava1818) (phase-aware accounting, quota validation, and caller authentication on `/refit`), plus an allocLock fix during Pod removal from [@saiyam1814](https://github.com/saiyam1814). See the [NUMA alignment guide](/docs/userguide/nvidia-device/numa-alignment) for details.

## Flexible MIG Grows Up

Flexible MIG (dynamic MIG instance allocation and deallocation) shipped in v2.10.0 with known limitations: no CDI support, and unvalidated multi-device cases. v2.11.0 closes those gaps:

- **CDI support for dynamic MIG devices** ([#3070](https://github.com/Project-HAMi/HAMi/pull/3070), [@asadjan4611](https://github.com/asadjan4611)): after HAMi creates a MIG GI/CI, it publishes an atomic per-MIG CDI spec and returns the CDI device name to CDI-capable runtimes. Startup recovery reconciles live MIG instances before the device plugin serves allocations, and allocation failures roll back both MIG and CDI resources. The v2.10.0 CDI limitation is gone.
- **Placement scoring with backtracking** ([#2855](https://github.com/Project-HAMi/HAMi/pull/2855), [@maishivamhoo123](https://github.com/maishivamhoo123)): MIG placements are now scored, with a backtracking fallback when the greedy choice does not fit, and duplicate MIG candidates in topology scheduling are collapsed.
- **Per-Pod profile preference** ([#3014](https://github.com/Project-HAMi/HAMi/pull/3014), [@maishivamhoo123](https://github.com/maishivamhoo123)): a Pod can name a preferred MIG profile through the `nvidia.com/mig-profile-preference` annotation. The scheduler tries that profile first and falls back to the normal selection rules (memory request, allowlisted profiles, placement constraints) when it cannot be allocated.
- **Lifecycle and monitoring**: the dynamic MIG instance lifecycle is optimized ([#3128](https://github.com/Project-HAMi/HAMi/pull/3128), [@asadjan4611](https://github.com/asadjan4611)), MIG monitoring now covers Pods using dynamic MIG, the vGPU monitor discovers MIG instances correctly, and allocations are checked against registered profiles with the allowlist using real NVML names (contributions from [@tsingst](https://github.com/tsingst), [@FouoF](https://github.com/FouoF), [@archlitchi](https://github.com/archlitchi), [@moezdil](https://github.com/moezdil), and [@usr-bin-ksh](https://github.com/usr-bin-ksh)).
- **Reliability**: all replicas and MIG slices on a GPU are marked unhealthy on XID errors, and MIG is automatically disabled on hami-core nodes to avoid conflicting lifecycle control.

[@FouoF](https://github.com/FouoF) also contributed automatic `nvidiaDriverRoot` detection (now the default, with GPU Operator driver-ready contract support) and NVML session pairing fixes.

## A Harder Scheduler

v2.11.0 lands the first wave of the security-audit-driven hardening of the scheduler extender and webhook (largely by [@moezdil](https://github.com/moezdil)):

- The extender HTTP endpoints (`/filter` and `/bind`) are served on **loopback only** (`127.0.0.1:9444`), not on the cluster-facing port.
- The extender **verifies Pod identity** before acting on a request.
- Pods created with **forged scheduler-owned allocation annotations are denied** at admission and guarded on update.
- The node-lock path serves **only the Pod the lock names**, expired-lock recovery is serialized, and malformed device allocation annotations are rejected.
- The chart now requires **Kubernetes 1.23+**, guards the PSP, and pins images by digest.

Scheduler performance also improved: whole-Pod deep copies were removed from the usage snapshot ([@togettoyou](https://github.com/togettoyou)), snapshots are built only for candidate nodes with benchmark regression tracking in CI ([@im-Toqeer-506](https://github.com/im-Toqeer-506)), and preferred `nodeAffinity` is honored in node scoring ([@falconlee236](https://github.com/falconlee236)).

## Platform, Chart, and More Devices

- **OpenShift and SELinux support** ([#2208](https://github.com/Project-HAMi/HAMi/pull/2208), [@spencercjh](https://github.com/spencercjh)): `platform.openshift=true` creates the required SCC, and `selinux.enabled` relabels host directories for SELinux-enforcing clusters.
- **Node capacity reporting** ([#2874](https://github.com/Project-HAMi/HAMi/pull/2874), [@shkatara](https://github.com/shkatara)): GPU memory and core resources can be reported in Node `capacity`/`allocatable`, so cluster autoscalers and dashboards see real GPU fractions.
- **Chart overhaul** ([@spencercjh](https://github.com/spencercjh)): all vendor configs moved under `devices.VENDOR` with a complete helm-docs pass, `global.imageSource` switches between upstream and CN mirrors, and node configs can be selected by label selector ([@usr-bin-ksh](https://github.com/usr-bin-ksh)). This is a **breaking change** for custom `values.yaml` files.
- **AMD maturation** ([@moezdil](https://github.com/moezdil)): `gpumem-percentage` requests, `amd.com/numa-bind` for multi-GPU Pods, topology-aware placement by XGMI links and NUMA, whole-WGP core rounding, namespace ResourceQuota checks, configurable `runtimeClassName`, and a dedicated AMD e2e suite.
- **More devices**: all four NeuronCores on AWS Inferentia1 ([@asadjan4611](https://github.com/asadjan4611)), model-aware scheduling restored for Cambricon MLU, Mthreads S5000 per-card memory units ([@wjluo](https://github.com/wjluo)), and Hygon DCU resources renamed to **HCU** across charts and docs ([@kinglong08](https://github.com/kinglong08)).
- **Monitoring**: whole-GPU Pods can bypass the HAMi hook and be monitored via direct NVML, and Pods with `CUDA_DISABLE_CONTROL` or dynamic MIG are covered ([@vesta-mlp](https://github.com/vesta-mlp)); hardware health and error metrics are exposed ([@Gurkaran18](https://github.com/Gurkaran18)), an unknown-GPU-process counter was added ([@heuristicwave](https://github.com/heuristicwave)), and the scheduler exposes leader-election and cache-sync metrics ([@KunwarSidhu47](https://github.com/KunwarSidhu47)).
- **Native sidecar containers** are now accounted for in GPU resource calculations ([@maishivamhoo123](https://github.com/maishivamhoo123)), and Pod/container-level environment overrides are supported ([@peachest](https://github.com/peachest)).

## A Reorganized, Redrawn Website

Alongside the code release, [project-hami.io](https://project-hami.io/) went through its largest reorganization since launch:

- **New information architecture** ([@moezdil](https://github.com/moezdil)): the docs sidebar is now grouped into a guided path, the devices matrix became the single vendor index (replacing per-category listings), and every vendor guide got its own sidebar. All in-repo HAMi documentation was consolidated into the website, and the internal design documents were ported into a public Developer section, with a Chinese translation following. Four legacy internal-only pages were removed along the way.
- **A redrawn Concepts section** ([@togettoyou](https://github.com/togettoyou)): the old Introduction pages were replaced by a Concepts category that explains device plugins and DRA background, rewrites the Architecture page around the journey of a Pod, and covers the device-sharing resource model and how HAMi-core isolates memory and compute, all illustrated with newly drawn SVG diagrams. A diagram brand guide with dark-mode tokens and Mermaid styling keeps every new diagram visually consistent.
- **`llms.txt` for LLM-friendly documentation** ([@spencercjh](https://github.com/spencercjh)): the site now publishes `llms.txt`, making the full documentation set efficiently consumable by coding agents and LLM tooling.
- **Restructured installation and upgrade guides**: a dedicated [Upgrade guide](/docs/next/installation/upgrade) was rebuilt around a step-by-step flow with breaking-change callouts, the offline installation instructions were refactored ([@spencercjh](https://github.com/spencercjh)), the user-guide configuration pages were reorganized, and the NVIDIA guide gained a matrix showing exactly which setup supports each feature.
- **Platform installation guides**: new step-by-step guides for OpenShift, GKE, and K3s by [@spencercjh](https://github.com/spencercjh), and for the Chinese clouds TKE, ACK, and CCE plus the hands-on HAMi Workshop by [@togettoyou](https://github.com/togettoyou).
- **Grafana dashboards consolidated** ([@togettoyou](https://github.com/togettoyou)), with new MIG inventory and in-use-by-profile panels, a resource-quota used-vs-limit table, and a vGPU cores panel ([@loiht2](https://github.com/loiht2)).
- **New stories on the site**: a Seres case study, CETC Cloud joining the contributors list, ZYT joining the adopters, and a community ambassadors program.

## Community Activities Since v2.10.0

The weeks between v2.10.0 and v2.11.0 were some of the busiest in the project's history:

- **[KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China 2026](https://www.lfopensource.cn/kubecon-cloudnativecon-openinfra-summit-pytorch-conference-china/)** (Shanghai, September): HAMi's first KubeCon China as a CNCF Incubating project, with two keynotes, a lightning talk, a 10,000-GPU production session, and a case study award for China Merchants Bank announced from the keynote stage. Read the [recap](/blog/kubecon-china-2026-recap).
- **LFX Mentorship 2026 Term 3** (September to November): four mentee projects covering HAMi-core lock contention, GPU memory isolation, observability, and documentation. Results of this cycle are already landing in v2.11.0, including the HAMi-core performance work above. See the [program overview](/blog/lfx-mentorship-2026-term-3).
- **ContainerDays & AI Context Singapore 2026** (October 27-28): HAMi appeared in five sessions including a hands-on GPU scheduling workshop by [@rootsongjc](https://github.com/rootsongjc) and [@fishman](https://github.com/fishman). Read the [recap](/blog/containerdays-singapore-2026-recap).
- **DRA NPU sharing**: the community published a deep dive on [HAMi-DRA NPU sharing](/blog/hami-dra-npu-sharing), extending the DRA story to Ascend NPUs.

## Contributors

v2.11.0 is the result of contributions across the HAMi main repo and the Project-HAMi org (ascend-device-plugin, hami-vnpu-core, HAMi-dra, and more). Representative feature owners this cycle:

- [@moezdil](https://github.com/moezdil): Remote GPU scheduler backend and device-plugin integration, the AMD feature wave, scheduler security hardening, release engineering, and the website information-architecture reorganization
- [@archlitchi](https://github.com/archlitchi): release coordination, vNPU templates, remote client tooling, monitor fixes
- [@maverick-woo](https://github.com/maverick-woo): Ascend ENPU scheduling, hami-vnpu-core performance overhaul (spatial compute policy, per-NPU limits, lock contention reduction)
- [@saiyam1814](https://github.com/saiyam1814): NUMA refit (CPU and GPU scheduling alignment)
- [@FouoF](https://github.com/FouoF): Flexible MIG enhancements, remote mode enhancements, automatic driver root detection
- [@asadjan4611](https://github.com/asadjan4611): CDI for dynamic MIG, Lupine server pools, Inferentia and Cambricon fixes, NUMA refit hardening
- [@spencercjh](https://github.com/spencercjh): OpenShift and SELinux support, chart restructure to `devices.VENDOR` with full helm-docs coverage, `deviceSplitCount` for hami-core/ENPU, `llms.txt`, offline-installation and user-guide documentation refactors, OpenShift/GKE/K3s installation guides, DCU-to-HCU docs migration
- [@maishivamhoo123](https://github.com/maishivamhoo123): MIG placement scoring and profile preference, native sidecar accounting
- [@sanket-jadhav-cse](https://github.com/sanket-jadhav-cse): multi-container Lupine allocation fixes
- [@shkatara](https://github.com/shkatara): node capacity resource reporting
- [@im-Toqeer-506](https://github.com/im-Toqeer-506): scheduler performance and benchmarks, PodDisruptionBudget, diagnostics bundle
- [@togettoyou](https://github.com/togettoyou): scheduler deep-copy elimination and chart documentation on the HAMi side; on the website, the redrawn Concepts section with SVG diagrams, the consolidated Grafana dashboard, the HAMi Workshop tutorials, and the TKE/ACK/CCE installation guides
- [@vesta-mlp](https://github.com/vesta-mlp): whole-GPU monitoring bypass
- [@xrwang8](https://github.com/xrwang8): hami-vnpu-core quota and scheduler fixes
- [@panpan0000](https://github.com/panpan0000): Ascend950DT whole-card scheduling
- [@kinglong08](https://github.com/kinglong08): Hygon DCU to HCU rename
- [@wjluo](https://github.com/wjluo): Mthreads S5000 support
- [@usr-bin-ksh](https://github.com/usr-bin-ksh): nodeconfig label selectors, MIG allowlist

29 contributors made their first contribution in this release, including [@Kevindua26](https://github.com/Kevindua26), [@im-Toqeer-506](https://github.com/im-Toqeer-506), [@togettoyou](https://github.com/togettoyou), [@Woolgathererer](https://github.com/Woolgathererer), [@curry30000](https://github.com/curry30000), [@sanket-jadhav-cse](https://github.com/sanket-jadhav-cse), [@usr-bin-ksh](https://github.com/usr-bin-ksh), [@vesta-mlp](https://github.com/vesta-mlp), [@tsingst](https://github.com/tsingst), [@loiht2](https://github.com/loiht2), [@falconlee236](https://github.com/falconlee236), and [@heuristicwave](https://github.com/heuristicwave). Thank you all, and to every user who reported issues and tested release candidates. The full list is in the [v2.11.0 release notes](https://github.com/Project-HAMi/HAMi/releases/tag/v2.11.0).

## Upgrade Guide

Upgrade to v2.11.0 via Helm:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
helm upgrade hami hami-charts/hami -n kube-system --version 2.11.0

# If your values.yaml customizes per-vendor settings, migrate it to the new
# devices.VENDOR layout first, then apply it explicitly. --reset-values discards
# the values stored in the release, so include every override in my-values.yaml.
helm upgrade hami hami-charts/hami -n kube-system --version 2.11.0 \
  --reset-values --values my-values.yaml
```

For a step-by-step upgrade walkthrough with breaking-change callouts, see the dedicated [Upgrade guide](/docs/next/installation/upgrade). For complete installation documentation, refer to: [/docs/installation/online-installation](/docs/installation/online-installation)

:::warning[Upgrade notes]

- **Breaking chart change**: vendor settings moved under `devices.VENDOR`. If your `values.yaml` customizes per-vendor device config, migrate it before upgrading; the chart now fails rendering when it finds the old, moved field paths.
- **Kubernetes 1.23+** is required by the chart.
- **MIG + hami-core**: MIG is now automatically disabled on hami-core nodes; verify your node configs if you relied on both.
- **Hygon users**: DCU resources are renamed to HCU across charts and docs.
- **Metric deprecations**: `hami_container_device_memory_bytes` and the `limit` label of `hami_resource_quota_used` are deprecated; update dashboards and alerts that depend on them.
- Remote GPU, ENPU, and NUMA refit are all **disabled by default**; enable them explicitly.
- We recommend verifying compatibility in a test environment before upgrading.

:::

## Summary

HAMi v2.11.0 is a release about **removing boundaries**: between local and remote GPUs (Remote GPU via Lupine), between CPU and GPU scheduling (NUMA refit), between partitioning styles on Ascend (ENPU with policy isolation), and between dynamic MIG and modern runtimes (CDI support). Combined with a security-hardened scheduler, OpenShift/SELinux support, a restructured chart, and a reorganized and redrawn website, HAMi keeps expanding what a unified heterogeneous-compute scheduling platform can do.

We sincerely welcome more developers, users, and ecosystem partners to join the HAMi community and help advance GPU virtualization and heterogeneous-compute scheduling.

---

**Related links:**

- GitHub Release: [https://github.com/Project-HAMi/HAMi/releases/tag/v2.11.0](https://github.com/Project-HAMi/HAMi/releases/tag/v2.11.0)
- Remote GPU examples: [https://github.com/Project-HAMi/HAMi/tree/master/examples/remotegpu](https://github.com/Project-HAMi/HAMi/tree/master/examples/remotegpu)
- Lupine: [https://github.com/lupinemachines](https://github.com/lupinemachines)
- hami-vnpu-core: [https://github.com/Project-HAMi/hami-vnpu-core](https://github.com/Project-HAMi/hami-vnpu-core)
- Documentation: [/docs/](/docs/)
- Community Discord (recommended): [https://discord.gg/Amhy7XmbNq](https://discord.gg/Amhy7XmbNq)
- Community CNCF Slack: [https://cloud-native.slack.com/archives/C07T10BU4R2](https://cloud-native.slack.com/archives/C07T10BU4R2)
