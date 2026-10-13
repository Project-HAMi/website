---
title: Troubleshoot AMD GPU sharing
sidebar_label: Troubleshooting
---

## Symptoms and causes

| Symptom | Likely cause |
| --- | --- |
| A pod stays `Pending` with `CardInsufficientCore` or `CardInsufficientMemory`. | Another pod holds the cores or memory. A pod without `amd.com/gpucores` books 100 percent of the cores. |
| A pod stays `Pending` with `NodeInsufficientDevice`. | Allocatable `amd.com/gpu` is 0 (the plugin is down or the GPU is unhealthy), or the request needs more distinct GPUs than the node has. |
| A pod stays `Pending` with `CardNotHealth`. | The plugin published the GPU as unhealthy: its DRM node cannot be opened, or the AMD Device Metrics Exporter reports a fault. Look for the `AMDGPUUnhealthy` node event. |
| A pod stays `Pending` with `CardTypeMismatch` or `CardUuidMismatch`. | No GPU matches `amd.com/use-gputype` or `amd.com/use-gpu-uuid`, or every match is excluded by the `nouse` annotations. |
| A pod stays `Pending` with `ResourceQuotaNotFit`. | The namespace `ResourceQuota` on `limits.amd.com/gpumem` is used up. |
| A pod stays `Pending` with `ExclusiveDeviceAllocateConflict`. | The pod uses the `mutex` policy and every GPU is held by another pod. |
| A pod fails with `no binding pod found`. | An older plugin received a pod that HAMi did not schedule. Current versions serve whole GPUs for such pods. |
| A sliced pod with an init container gets the whole GPU (the log says `annotation allocation unavailable`). | The plugin predates the fix that maps the annotation slots past init containers. Upgrade the plugin. |
| A sliced pod fails with `UnexpectedAdmissionError`. | The GPU has no free CUs for the request, often because slices are rounded up to whole WGPs on RDNA. A HAMi scheduler that reads `cuPerWGP` keeps such pods `Pending` instead. |
| The plugin pod stops with a usage message. | The chart and the image come from different releases. |
| Allocatable `amd.com/gpu` is 0 right after a restart. | Wait one registration (30 seconds). Check that no other plugin owns `amd.com/gpu`. |
| `kubelet` logs `device plugin already connected`. | Two plugins register `amd.com/gpu`, for example the upstream ROCm plugin. Remove one. |
| A slice runs without a memory limit. | The image cannot load the hook (musl, static, or glibc older than 2.34). With `muslFailClosed` it is refused instead. |
| A pod that uses `hipMallocAsync` aborts above the limit. | Without the hook only the `dmem` cap applies, and the ROCm runtime aborts the process. |
| A pod that sets only `amd.com/gpumem` blocks the GPU's compute. | A request without `amd.com/gpucores` books all CUs. Set `amd.com/gpucores`. |
| `hami.io/mutex.lock` stays on the node. | A bind did not finish. The lock expires after the HAMi lock timeout (5 minutes by default). |
| A non-root pod cannot open `/dev/kfd`. | Set `runAsUser` and `supplementalGroups` for the `video` and `render` groups of the node. The ids differ per node. |

## Commands

```bash
# the plugin pods
kubectl -n kube-system get pods -l name=amd-gpu-dp-ds
# the plugin log
kubectl -n kube-system logs ds/amd-gpu-device-plugin-daemonset
# the GPUs the node registered
kubectl get node <node> -o jsonpath='{.metadata.annotations.hami\.io/node-amd-register}'
# the allocation of a pod
kubectl get pod <pod> -o jsonpath='{.metadata.annotations.hami\.io/amd-devices-allocated}'
```

Check that `/dev/kfd` and `/dev/dri` exist on the host. Raise the log level with `dp.logVerbosity` (4 adds topology parsing, 5 adds annotation decoding).

## Glossary

- **CU**: compute unit. **WGP**: workgroup processor, a pair of CUs on RDNA.
- **CDNA, RDNA**: AMD's datacenter (Instinct) and consumer GPU families. **gfx**: the ISA name, for example gfx942 (MI300 family) or gfx12 (RDNA4).
- **SPX, DPX, QPX, CPX**: compute partition modes with 1, 2, 4 and 8 partitions. **NPS**: the memory partition mode. **XCP, XCC**: a partition and its compute die.
- **XGMI**: the GPU-to-GPU link. **VF**: an SR-IOV virtual function, which cannot change its partition.
- **`dmem`**: the kernel cgroup controller that caps VRAM per cgroup. **CDI**: Container Device Interface.
- **HAMi**: the scheduler and webhook that book the shares. **Hook**: `libamvgpu.so`.
