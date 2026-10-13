---
title: How AMD GPU sharing works
sidebar_label: How it works
---

HAMi shares AMD GPUs with three parts. The HAMi scheduler and webhook decide which pod gets which share of which GPU. [amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin) runs on each AMD node, publishes the GPUs and limits the container when kubelet starts it. [amd-hami-core](https://github.com/Project-HAMi/amd-hami-core) provides `libamvgpu.so`, the library that enforces the memory limit inside the container. Everything is pre-1.0 (`0.0.x`) and licensed under Apache 2.0. The plugin started from AMD's ROCm device plugin.

## What limits a pod

- **Compute units.** The plugin sets `HSA_CU_MASK`, and the ROCm runtime enforces it. On RDNA a slice is made of whole WGPs (pairs of CUs).
- **VRAM.** The `libamvgpu.so` hook, loaded with `LD_AUDIT`, and, on kernel 6.14 or newer, a hard cap through the `dmem` cgroup controller.
- **Whole-GPU requests** get no hook and no CU limit, so any image works for them.

The plugin ships three binaries: `k8s-device-plugin` (the plugin), `k8s-vgpu-monitor` (optional Prometheus metrics) and `k8s-node-labeller` (optional `amd.com/gpu.*` node labels, from the upstream project).

## How a pod gets its GPU

1. **Webhook (HAMi).** Checks that `amd.com/gpucores` is between 1 and 100 and sends the pod to the HAMi scheduler.
2. **Scheduler (HAMi).** Reads the node annotation, picks the node and the GPUs, and writes `hami.io/amd-devices-to-allocate` and `hami.io/amd-devices-allocated` on the pod. There is one slot per container, init containers first and then app containers. The plugin maps each slot back to its container, so a pod with an init container gets its slice limits on the right container.
3. **Bind (HAMi).** Takes the node lock (`hami.io/mutex.lock`) and sets `hami.io/bind-phase=allocating`.
4. **Kubelet** calls the plugin's `Allocate`.
5. **Plugin `Allocate`.** Finds the pod and turns the allocation into the device nodes (`/dev/kfd`, `/dev/dri/*`, or CDI names), `ROCR_VISIBLE_DEVICES`, `HIP_VISIBLE_DEVICES` and `HSA_CU_MASK`. For a slice it also adds `HIP_DEVICE_MEMORY_LIMIT_<i>`, `LD_AUDIT` and a read-only mount of the hook, records the CU bits in the pod annotation `hami.io/amd-cu-allocated`, and starts the `dmem` cap. Then it sets `bind-phase=success` and releases the lock (`failed` on an error).
6. If no HAMi-tracked pod is pending, as for a pod that HAMi did not schedule, the plugin serves the ids kubelet passed as whole GPUs.

Every 30 seconds the plugin publishes the node annotation again, and every `-pulse` seconds it sends the device health to kubelet again.

## Resources

| Resource | Meaning | Enforced by |
| --- | --- | --- |
| `amd.com/gpu` | Number of GPUs. Kubelet sees one device per share, so allocatable is GPUs times the share count (10, or 2 on gfx12). | HAMi `Fit`, then the plugin |
| `amd.com/gpucores` | Percent of each GPU's CUs, 1 to 100. Omitted means 100. | HAMi books it, the plugin sets `HSA_CU_MASK` |
| `amd.com/gpumem` | VRAM per GPU in MiB. Omitted means all of it. | HAMi books it, the hook and the `dmem` cap enforce it |
| `amd.com/gpumem-percentage` | Share of the GPU's memory, up to 100 (HAMi turns it into MiB). | HAMi |

A request with only `amd.com/gpumem` still books 100 percent of the cores, so only one such pod runs on a GPU at a time. Set `amd.com/gpucores` on every pod that should share a GPU. A request with only `amd.com/gpumem-percentage` gets one GPU added by the webhook.

The HAMi scheduler also honors these pod annotations: `amd.com/use-gputype`, `amd.com/nouse-gputype`, `amd.com/use-gpu-uuid`, `amd.com/nouse-gpu-uuid`, `amd.com/numa-bind`, `amd.com/link-bind` and `hami.io/gpu-scheduler-policy`.

Do not put whole-GPU pods and slices on one card when VRAM isolation matters: a whole-GPU pod gets no `dmem` cap and no hook.

## What the plugin publishes

The node annotation `hami.io/node-amd-register` is a JSON list with one entry per GPU:

| Field | Value |
| --- | --- |
| `id` | AMD SMI UUID, or `GPU-<unique_id>` for an XCP partition. The same in both operating modes. |
| `index`, `numa`, `type`, `health` | DRM card minor, NUMA node, market name, and false if the DRM node cannot be opened or the exporter reports the GPU unhealthy. |
| `count` | Share count: `-split_count`, otherwise 2 on gfx12 and 10 elsewhere. |
| `devmem`, `devcore` | VRAM in MiB (multiplied by `-device_memory_scaling`) and the active CUs. |
| `custominfo` | `pciBDF`, `cuPerWGP` (2 on RDNA), `computeQueues`, `xgmiPeers` (the PCI addresses of the GPUs reachable over XGMI) and the partition profiles. |

Other node annotations are `hami.io/amd-operating-mode` and `hami.io/amd-compute-partition`, which override `OPERATING_MODE` and `COMPUTE_PARTITION` for one node.

The plugin sends the node events `AMDGPUUnhealthy`, `AMDGPUMissing`, `AMDGPURecovered` and `AMDGPUModeChangedInUse`. With `-report_node_capacity` the node also gets `amd.com/gpumem` and `amd.com/gpucores` as capacity. When no GPU is left to serve, the plugin clears the annotation.

## The memory library

`libamvgpu.so` comes from amd-hami-core and is loaded with `LD_AUDIT`:

- It wraps the HIP allocation calls (`hipMalloc`, `hipMallocAsync`, `hipMalloc3D`, arrays, pools, virtual memory and more) and returns out-of-memory past the limit. `hipMemGetInfo` and the device properties report the limit as the total.
- Accounting is shared between processes through a memory-mapped file (`/tmp/hipdevshr.cache`). A reservation is made before the real allocation, so concurrent allocations cannot all pass.
- It does not mask CUs. It pins `HSA_CU_MASK`, `AMD_TASK_PRIORITY` and `HIP_OVERSUBSCRIBE` to the values in the pod spec (read from `/proc/1/environ`), so a process cannot widen its slice with `setenv`.

| Variable | Meaning |
| --- | --- |
| `LD_AUDIT` | Loads the hook. Set by the plugin for slices. |
| `HIP_DEVICE_MEMORY_LIMIT_<i>` | Memory limit of GPU `i`, for example `4096m`. |
| `HIP_OVERSUBSCRIBE` | Serve `hipMalloc` from managed memory. Set when `-device_memory_scaling` is above 1. |
| `AMD_TASK_PRIORITY` | Queue priority. 0 is the high class and higher values are low. Set by the user in the pod spec. |
| `LIBHIP_LOG_LEVEL` | Hook log level, 1 (error) to 4 (debug). |
| `HIP_DEVICE_MEMORY_SHARED_CACHE`, `ACTIVE_OOM_KILLER` | Further hook settings, described in the amd-hami-core repository. |

Limits of the hook:

- A process that loses `LD_AUDIT` (for example with `env -i`), static binaries and musl images run without the hook. The `dmem` cap still holds there, but a `hipMallocAsync` above it aborts the process in the ROCm runtime.
- The build baseline is glibc 2.34. `hipMallocMipmappedArray` is not intercepted.
- There is room for at most 64 devices and 1024 processes per container.
- A child process that starts without `LD_AUDIT` is not covered by the CU mask either.
