---
title: Device resource isolation
description: How HAMi-Core enforces memory and compute limits inside the container, and its known limitations.
---

A simple demonstration for device isolation: A task with the following resources.

```yaml
resources:
  limits:
    nvidia.com/gpu: 1 # requesting 1 vGPU
    nvidia.com/gpumem: 3000 # Each vGPU contains 3000 MiB device memory
    nvidia.com/gpucores: 30 # Each vGPU uses 30% of the device compute
```

will see only 3000 MiB device memory inside container

## How it works

HAMi-Core (`libvgpu.so`) enforces this task's 3000 MiB memory and 30% compute limits from inside the container, with no changes to the application. The diagram below shows how:

![How HAMi-Core enforces memory and compute limits inside a container](/img/docs/en/core-concepts/resource-isolation.svg)

## How HAMi-Core gets into the container

When a Pod starts, the device plugin mounts `libvgpu.so` and `/etc/ld.so.preload` into the container. It also passes the limits as environment variables: `CUDA_DEVICE_MEMORY_LIMIT_<index>` for memory and `CUDA_DEVICE_SM_LIMIT` for compute.

The dynamic linker reads `/etc/ld.so.preload` whenever a process starts. Every process in the container loads HAMi-Core before the CUDA libraries, and HAMi-Core intercepts the CUDA and NVML calls in its hook table.

## Memory

- Before each allocation, such as `cuMemAlloc`, HAMi-Core adds the request to what the container already uses. If the total goes past the limit, the call returns `CUDA_ERROR_OUT_OF_MEMORY`. Only this container sees the error. Other Pods on the card keep running.
- Memory queries through NVML return the limit, so `nvidia-smi` inside the container shows the share as the total memory.

![Memory isolation: HAMi-Core checks each allocation against the limit](/img/docs/en/core-concepts/memory-isolation.svg)

## Compute

- Before each kernel launch, HAMi-Core takes tokens from a counter. When the counter is empty, the launch waits.
- A background thread samples the GPU's utilization and refills the counter. It refills more while the container is below its share and less while it is above.
- With `gpucores` at 0 or 100, HAMi-Core does not throttle kernels.

![Compute limit while throttling is on: kernels take tokens, wait when they run out, continue after a refill](/img/docs/en/core-concepts/compute-isolation.svg)

Throttling has three modes. Set the mode for the cluster with the Helm value `devices.nvidia.gpuCorePolicy`, or for one container with the `GPU_CORE_UTILIZATION_POLICY` environment variable. See [Global config](../userguide/configure.md).

| Mode | Behavior |
| --- | --- |
| `default` | Throttling turns on only while another container on the same card, with the same or a higher `nvidia.com/priority`, is running kernels. A container alone on a card runs at full speed. |
| `force` | Always throttles to `gpucores`. |
| `disable` | Never throttles. |

HAMi does not reserve streaming multiprocessors for a Pod, so isolation from busy neighbors is best effort.

## Known limitations

- Enforcement happens in software at the CUDA API level. When a workload needs hardware isolation, use MIG. The FAQ compares the two in [How does HAMi vGPU differ from NVIDIA MIG?](../faq/faq.md#how-does-hami-vgpu-differ-from-nvidia-mig-when-should-i-use-each).
- Containers that set `CUDA_DISABLE_CONTROL=true`, and inner containers in Docker-in-Docker, run without the preload mount, so no limits apply.
- The webhook rejects privileged containers that request HAMi resources.
- Setting `devicePlugin.disablecorelimit` to `true` turns off the compute limit for all Pods.

If a limit does not hold, see [GPU memory limit not enforced](../troubleshooting/troubleshooting.md#gpu-memory-limit-not-enforced).

## Learn more

- [GPU virtualization principles](../core-concepts/gpu-virtualization.md): the injection and interception steps in detail
- [HAMi-core](https://github.com/Project-HAMi/HAMi-core) source code
