---
title: Configure the AMD device plugin
sidebar_label: Configuration
---

The plugin chart passes its values to the plugin as flags. The [chart README](https://github.com/Project-HAMi/amd-device-plugin/blob/main/helm/amd-gpu/README.md) lists every value. The chart and the image have to come from the same commit or release: the image tag defaults to the chart `appVersion`, a published release, and a chart from `main` passes flags that a published image does not know, so its pod stops with a usage message. To run `main`, build the image from the same checkout and set `dp.image.repository` and `dp.image.tag`.

The plugin needs `NODE_NAME` and RBAC to patch nodes, `nodes/status` and pods and to create events. The chart grants both. The node labeller needs `DS_NODE_NAME`.

## Values and parameters

HAMi and `amd-device-plugin` use separate Charts and values files:

- HAMi: use `devices.amd.*` for scheduler resource names and defaults. See the [HAMi Chart values reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md).
- AMD plugin: use `dp.*` for the plugin and `monitor.*` for its monitor. See the [plugin Chart values reference](https://github.com/Project-HAMi/amd-device-plugin/blob/main/helm/amd-gpu/README.md) for complete defaults, flags, and environment variables.

Common plugin settings are `dp.splitCount` (sharing limit), `dp.operatingMode` (operating mode), and `monitor.enabled` (metrics). Keep the remaining defaults unless the deployment requires an override. Mode changes and optional features have the prerequisites described below.

## Operating modes

The plugin registers AMD GPUs in one of two modes:

- **`cu` (default).** Each whole GPU registers as a soft device (the default share count, empty `Mode`) and is sliced by CU and memory.
- **`partition`.** Devices register as hard compute partitions with `Mode` set to the partition type (`spx`, `qpx`) and `Count: 1`. The device ID is the same as in `cu` mode, so pods allocated before a mode switch keep their accounting. Only the hard entries are published to kubelet. Whole GPUs with `amdgpu_xcp_*` partitions in the KFD topology are replaced by them, and any other partitioned GPU registers as one hard device. GPUs without a compute partition type, and GPUs that cannot change it (SR-IOV virtual functions have no `available_compute_partition` file), stay soft.

The mode is resolved from the lowest to the highest precedence: `cu` by default, then the `OPERATING_MODE` variable (the chart value `dp.operatingMode`), then the `hami.io/amd-operating-mode` node annotation. The annotation is read once at plugin start, so changing it needs a restart of the plugin pod. The log shows the result as `operating mode: <mode>`.

### Change the operating mode

Drain the node first. Pods placed under one mode keep that mode's share count and CU layout, so switching while GPU pods run can leave the scheduler and the node disagreeing about what is free. If a GPU switches while pods still use it, the plugin logs a warning and records a node Warning event, `AMDGPUModeChangedInUse`, which names the pods. It does not stop them.

1. Cordon and drain the node, or delete every pod that requests `amd.com/gpu`.
2. Set `hami.io/amd-operating-mode` on the node, or the `dp.operatingMode` chart value.
3. Restart the plugin pod: `kubectl -n kube-system rollout restart ds/amd-gpu-device-plugin-daemonset`.
4. Check the log for `operating mode: <mode>`, and that `amd.com/gpu` in `kubectl get node <node> -o jsonpath='{.status.allocatable}'` matches the new mode.
5. Uncordon the node.

Partition counts are per GPU: `amd-smi set -g <id> --compute-partition qpx` flips a single GPU, and a node can mix `spx` and `qpx` GPUs. The same drain applies when you upgrade from a build older than the [device ID fix](https://github.com/Project-HAMi/amd-device-plugin/pull/159) that ran in `partition` mode, because pods allocated by that build are recorded under an ID that the new build does not recognize.

### MI355X partitions

| Profile | Partitions per GPU | CUs per partition | `Mode` |
| ------- | ------------------ | ----------------- | ------ |
| `spx`   | 1                  | 256               | `spx`  |
| `dpx`   | 2                  | 128               | `dpx`  |
| `qpx`   | 4                  | 64                | `qpx`  |
| `cpx`   | 8                  | 32                | `cpx`  |

An MI355X has 256 CUs and 294896 MiB of VRAM (288 GB) per GPU. Whether the plugin registers whole GPUs or `amdgpu_xcp_*` partitions depends on the kernel's KFD topology, not on the plugin. On a kernel that lists XCP render minors, each partition registers with an even share of VRAM and CUs (`qpx`: 4 devices of 73728 MiB and 64 CUs per GPU). On kernel 6.8.0-136 the topology lacks them, so a `qpx` node registers one hard whole-GPU entry per GPU, and the partitions of one GPU share a single ROCr `unique_id`. See [MI355X partitioning](https://github.com/Project-HAMi/amd-device-plugin/blob/main/docs/user-guide/mi355x-partitioning.md) for the checks to run on a node.

## The `dmem` VRAM cap

The memory hook limits VRAM inside the process, so it needs glibc 2.34 or newer and can be bypassed. The `dmem` cap is enforced by the kernel. It is on by default, and the plugin turns it off at startup, with one log line, unless the node has all of:

- cgroup v2 with the `dmem` controller (kernel 6.14 or newer, listed in `/sys/fs/cgroup/cgroup.controllers`; kernel 6.8 has none),
- the systemd cgroup driver (`/sys/fs/cgroup/kubepods.slice` exists).

For each sliced GPU, the plugin writes `drm/<bdf>/vram <bytes>` to the pod cgroup's `dmem.max`, in the background shortly after the container starts. Lowering `dmem.max` below the current usage does not reclaim VRAM, so memory that a workload allocates before the cap lands stays allocated. A whole-GPU pod gets no `dmem` cap.

## musl fail-closed

`dp.muslFailClosed.enabled=true` makes the plugin inspect a sliced pod's image with `ctr` before it starts. If the image is musl-based, statically linked, or uses glibc older than 2.34, the memory hook would not load, so the pod is refused, unless `dmem` caps its VRAM anyway, in which case the plugin leaves the hook out. The containerd socket and data directory must be mounted with `mountPropagation: HostToContainer`. This is experimental.

The chart defaults for `dp.muslFailClosed.ctrPath` and `dp.muslFailClosed.containerdDataDir` are RKE2 paths. On k3s set `ctrPath` to `/var/lib/rancher/k3s/data/current/bin/ctr` and `containerdDataDir` to `/var/lib/rancher/k3s/agent/containerd`. Override `containerdSocketDir` and `containerdSocket` for other distributions.

Kubelet calls the plugin when it admits the pod, before it pulls the image. If the image is not on the node yet, the plugin starts pulling it in the background and refuses that first pod with `image is not on the node yet`. A retry (a Deployment recreates the pod) finds the image and starts.

## CDI

With `dp.cdi.enabled=true` the plugin writes an `amd.com/gpu` CDI spec to `dp.cdi.specDir`, with one device per DRM card plus `/dev/kfd`, and returns CDI device names instead of device nodes. The container runtime must have CDI enabled and read that directory (containerd 2.x and CRI-O do by default). CDI device responses from a device plugin need Kubernetes 1.28 or newer (the `DevicePluginCDIDevices` feature gate, on by default since 1.29). Turning CDI off does not delete the spec: `amd.com-gpu.json` stays in `dp.cdi.specDir`, which is harmless because pods get device nodes again, until you remove it or the node reboots.

## Resource naming strategy

This only matters for Instinct GPUs that are split into compute partitions, for example `cpx`:

- **`single`** (default): every GPU and partition is `amd.com/gpu`. Use it when all GPUs on a node use the same partition mode.
- **`mixed`**: partitions are named after their mode, for example `amd.com/cpx_nps4`, and unpartitioned GPUs stay `amd.com/gpu`. GPUs that cannot change their partition (SR-IOV virtual functions) count as unpartitioned. Use it when a node mixes partition modes.

## Optional components

- **GPU health from the AMD Device Metrics Exporter.** Install the [exporter](https://github.com/ROCm/device-metrics-exporter) with its gRPC socket enabled at `/var/lib/amd-metrics-exporter/`. The plugin then also uses the per-GPU health that the exporter reports, for example after ECC errors. Without it, the plugin still checks that each GPU's device node can be opened.
- **GPU metrics.** `monitor.enabled=true` runs `k8s-vgpu-monitor` on each GPU node. It serves Prometheus metrics on port 9394 under the names of the HAMi NVIDIA vGPU monitor: `hami_vgpu_memory_used_bytes` and `hami_vgpu_memory_limit_bytes` per container, and `hami_host_gpu_memory_used_bytes`, `hami_host_gpu_memory_total_bytes`, `hami_host_gpu_utilization_ratio`, `hami_host_gpu_temperature_celsius` and `hami_host_gpu_power_usage_watts` per GPU, plus `hami_vgpumonitor_collect_success` per node (1 when the last collection fully succeeded, 0 when any part failed). Container memory comes from the `dmem` cgroup controller, so it needs the systemd cgroup driver and a kernel with the controller. Per-container utilization is not reported, because the kernel does not account compute time per process.
- **Node labeller.** `k8s-ds-amdgpu-labeller.yaml` deploys the upstream labeller, which adds `amd.com/gpu.*` node labels such as VRAM, CU count, device ID and family:

```bash
kubectl apply -f k8s-ds-amdgpu-labeller.yaml
```
