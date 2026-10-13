---
title: Enable AMD GPU Sharing
sidebar_label: GPU Sharing
---

## Introduction

HAMi shares AMD GPUs (Radeon and Instinct) between pods with the following resources:

- `amd.com/gpu`: number of GPUs
- `amd.com/gpumem`: device memory in MiB per GPU
- `amd.com/gpumem-percentage`: device memory per GPU as a percentage of its VRAM (1-100); `amd.com/gpumem` wins if both are set
- `amd.com/gpucores`: compute units per GPU as a percentage (1-100)

A pod that asks for no memory or cores gets the whole GPU. A pod that sets only `amd.com/gpumem-percentage` gets one GPU added by the webhook.

:::note

HAMi v2.10.0 has the memory, core, type and UUID features. These need a newer HAMi release and are marked where they appear below: `amd.com/gpumem-percentage`, whole-WGP rounding of core requests on RDNA, the namespace ResourceQuota check, node health from allocatable GPUs, `amd.com/numa-bind`, `amd.com/link-bind`, the `topology-aware` policy for AMD, and `devices.amd.runtimeClassName`.

:::

### Prerequisites

- Linux amd64 nodes with ROCm-supported AMD GPUs, the `amdgpu` kernel driver, `/dev/kfd` and `/dev/dri`. See the [ROCm installation guide](https://rocm.docs.amd.com/projects/install-on-linux/en/latest/) for the driver.
- Kubernetes with the HAMi scheduler. If the cluster has no NVIDIA GPUs, install HAMi without its own device plugin:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm install hami hami-charts/hami -n kube-system --set devicePlugin.enabled=false
```

- No other plugin may register `amd.com/gpu` on the same nodes, such as the upstream ROCm device plugin. Kubelet cannot serve one resource from two plugins: it refuses the second registration (`device plugin already connected`) and the plugin that registered first keeps serving.

### Deploy

1. Install the HAMi chart as above. It registers the AMD resources with the scheduler (`devices.amd.*` in `values.yaml`). To set a runtime class on every pod that requests an AMD GPU, set `devices.amd.runtimeClassName`; a pod that sets its own `runtimeClassName` keeps it, and a pod without a GPU is left alone (needs a HAMi release newer than v2.10.0, [Project-HAMi/HAMi#3194](https://github.com/Project-HAMi/HAMi/pull/3194)).
2. Install [amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin) on the AMD nodes. It publishes each GPU in the node annotation `hami.io/node-amd-register`, hands out CU slices and memory limits to the pods, and marks a GPU unhealthy when its DRM device cannot be opened or the AMD Device Metrics Exporter reports it unhealthy. From a checkout of the plugin release you want (the latest is v0.0.3):

```bash
helm upgrade --install amd-gpu ./helm/amd-gpu --namespace kube-system --create-namespace
```

Then check that the plugin runs and that the node reports the GPUs:

```bash
kubectl -n kube-system get pods -l name=amd-gpu-dp-ds
kubectl get node <node> -o jsonpath='{.status.allocatable.amd\.com/gpu}'
kubectl get node <node> -o jsonpath='{.metadata.annotations.hami\.io/node-amd-register}'
```

`amd.com/gpu` is the number of GPUs times their share count (see [Things to know](#things-to-know)). The annotation lists each GPU's UUID, product name, VRAM and CU count, plus the PCI address, `cuPerWGP`, and on GPUs linked over XGMI the `xgmiPeers`. A GPU that the exporter reports unhealthy is published without `health`, and the scheduler refuses it with `CardNotHealth`.

Memory limits are enforced by [amd-hami-core](https://github.com/Project-HAMi/amd-hami-core) (`libamvgpu`, injected by the plugin) and, where the node has the `dmem` cgroup controller and the systemd cgroup driver, by the kernel as well.

Prerequisites and limits of the memory limit:

- The hook needs glibc 2.34 or newer in the workload image. On musl, statically linked or older-glibc images it is not loaded and the pod runs without the in-process cap; the plugin's `dp.muslFailClosed.enabled` setting (off by default, experimental) refuses such a pod instead.
- The kernel cap needs cgroup v2 with the `dmem` controller (kernel 6.14 or newer) and the systemd cgroup driver; otherwise only the hook enforces the limit.
- The hook works inside the process, so a process that drops `LD_AUDIT` can bypass it. A whole-GPU request gets neither the hook nor the `dmem` cap.
- The example pods run as the image's default user (root) with privilege escalation off. A non-root pod also needs `runAsUser` and `supplementalGroups` for the `video` and `render` groups of the node, whose ids differ per node.
- Use an amd-device-plugin release from the same chart version as the image; a chart from `main` needs an image built from `main`.

### Run AMD jobs

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-gpu-cores
spec:
  containers:
    - name: rocm
      image: rocm/dev-ubuntu-24.04:7.2.4
      command: ["bash", "-c", "sleep infinity"]
      resources:
        limits:
          amd.com/gpu: 1
          amd.com/gpumem: 4096 # MiB
          amd.com/gpucores: 25 # percent of the GPU's compute units
```

More examples:

- [Allocate a whole GPU](./examples/default-use.md)
- [Allocate device memory](./examples/use-memory.md) and [by percentage](./examples/use-memory-percentage.md)
- [Allocate device cores and memory](./examples/allocate-core-and-memory.md)
- Pick or avoid a GPU type with `amd.com/use-gputype` and `amd.com/nouse-gputype`: [use](./examples/specify-card-type-to-use.md), [avoid](./examples/specify-card-type-not-use.md)
- Pick or avoid a GPU by UUID with `amd.com/use-gpu-uuid` and `amd.com/nouse-gpu-uuid`: [use](./examples/specify-uuid-to-use.md), [avoid](./examples/specify-uuid-not-use.md)
- Keep the GPUs of one pod on a NUMA node or on XGMI-linked GPUs: [numa-bind](./examples/numa-bind.md), [link-bind](./examples/link-bind.md)
- Pick how GPUs are chosen on a node: [scheduling policy](./examples/scheduler-policy.md)
- Give a pod a queue priority: [task priority](./examples/task-priority.md)

### Scheduling behavior

- **Multi-GPU pods.** Set `amd.com/numa-bind: "true"` to keep every GPU on one NUMA node, or `amd.com/link-bind: "true"` to require that all GPUs are linked to each other over XGMI. The `topology-aware` policy picks the group with the most XGMI links without making it a hard requirement. These need a HAMi release newer than v2.10.0. The `mutex` policy, which only uses idle GPUs, is in v2.10.0.
- **Namespace quota.** The scheduler checks a namespace `ResourceQuota` on `limits.amd.com/gpumem` before it places a pod, including memory that comes from a whole-GPU or percentage request. A pod over the quota stays `Pending` with `ResourceQuotaNotFit`; other namespaces are not affected (needs a HAMi release newer than v2.10.0).
- **Node health.** While the allocatable `amd.com/gpu` of a node is 0, the scheduler keeps a new pod `Pending`, and the pod runs once the plugin reports GPUs again (needs a HAMi release newer than v2.10.0).

### Things to know

- **Cores are CU masks.** `amd.com/gpucores` becomes an `HSA_CU_MASK`. On RDNA GPUs a request is rounded up to whole WGPs (2 CUs), and the plugin publishes the granularity as `cuPerWGP`. The mask is enforced by the ROCm runtime and pinned by `libamvgpu`; a child process started without the `LD_AUDIT` hook is not covered.
- **Share count.** The plugin publishes each GPU several times: 2 on RDNA4 (gfx12), whose throughput falls when more processes share it, 10 elsewhere. `dp.splitCount` in the plugin chart overrides it.
- **Whole-GPU pods** get neither a CU mask nor a memory limit and do not load `libamvgpu`.
- **A request without `amd.com/gpucores` gets all CUs.** The scheduler books the whole compute range of the GPU for it, so a pod that sets only `amd.com/gpumem` blocks the compute of that GPU and the next such pod waits until it ends. Set `amd.com/gpucores` on every pod that should share a GPU.
- **Memory oversubscription.** `dp.deviceMemoryScaling` above 1 in the plugin chart registers more VRAM than the GPU has. Pods then get `HIP_OVERSUBSCRIBE=true` and `hipMalloc` is served from managed memory, which needs XNACK on CDNA.
- **Compute partitions.** On Instinct GPUs that can be split into compute partitions (`spx`, `dpx`, `qpx`, `cpx`), `dp.operatingMode=partition` registers hard partitions instead of CU slices, and `-resource_naming_strategy=mixed` names them after their mode. Drain the node before you change the mode. See [Configuration](./configuration.md#operating-modes).
- **Monitoring.** `monitor.enabled=true` in the plugin chart runs `k8s-vgpu-monitor`, which serves `hami_vgpu_memory_used_bytes` and `hami_vgpu_memory_limit_bytes` per container and `hami_host_gpu_memory_used_bytes`, `hami_host_gpu_utilization_ratio`, `hami_host_gpu_temperature_celsius` and `hami_host_gpu_power_usage_watts` per GPU on port 9394, under the metric names of the NVIDIA monitor. Per-container utilization is not reported: the kernel does not account compute time per process.
- **Metrics from the scheduler** report AMD cores as a percentage of the GPU.

### Tested configurations and known gaps

The plugin and the AMD changes in HAMi were run on a real AMD Instinct MI325X (a single GPU, seen as a virtual function) with k3s, on kernels 6.8 and 7.0, ROCm 6.2 and 7.2, and the PyTorch, TensorFlow, JAX and vLLM example pods. Memory limits, CU masks, the queue priority, the namespace quota and the example manifests in this guide were checked on that GPU. Several GPUs with XGMI and NUMA, compute partitions on bare-metal MI300, MI325 and MI355, RDNA cards and a real hardware fault were not run on hardware. [AMD GPU test status](./verification-status.md) has the details.

### Learn more

- [How AMD GPU sharing works](./how-it-works.md): the request flow, the node registration and the memory library.
- [Configure the AMD device plugin](./configuration.md): every chart value, operating modes and compute partitions, `dmem`, CDI and metrics.
- [Troubleshoot AMD GPU sharing](./troubleshooting.md): symptoms, causes and a glossary.
- [AMD GPU test status](./verification-status.md): what was verified on a real GPU and what was not.
