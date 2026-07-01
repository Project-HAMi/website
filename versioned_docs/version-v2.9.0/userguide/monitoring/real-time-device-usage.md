---
title: Real-time device usage endpoint
sidebar_label: Real-time device usage
---

You can get the real-time device memory and core utilization by visiting `{GPU node ip}:31992/metrics`, or add it to a prometheus endpoint, as the command below:

```bash
curl {GPU node ip}:31992/metrics
```

It contains the following host-level metrics:

| Metrics | Description | Example |
| --- | --- | --- |
| hami_host_gpu_utilization_ratio | GPU core utilization ratio on host (0-100) | `{device_index="0",device_type="NVIDIA-NVIDIA H200",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",zone="vGPU"}` 0 |
| hami_host_gpu_memory_used_bytes | GPU real-time device memory usage on host | `{device_index="0",device_type="NVIDIA-NVIDIA H200",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",zone="vGPU"}` 2.87244288e+08 |

It also exposes per-container and per-vGPU metrics for each scheduled task:

| Metrics | Description | Example |
| --- | --- | --- |
| hami_container_device_utilization_ratio | Container device SM utilization ratio | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |
| hami_container_device_memory_bytes | Container device memory usage breakdown in bytes | `{buffer_size="0",container="cuda",context_size="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",module_size="0",namespace="default",offset="0",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |
| hami_container_last_kernel_elapsed_seconds | Seconds since last kernel execution in container | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 3664 |
| hami_vgpu_memory_used_bytes | vGPU device memory usage in bytes | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |
| hami_vgpu_memory_limit_bytes | vGPU device memory limit in bytes | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 2.097152e+10 |
| hami_vgpu_memory_buffer_bytes | Container device memory buffer size in bytes | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 6.83935744e+08 |
| hami_vgpu_memory_context_bytes | Container device memory context size in bytes | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |
| hami_vgpu_memory_module_bytes | Container device memory module size in bytes | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |

:::note

The `context_size`, `module_size`, `buffer_size` and `offset` labels on `hami_container_device_memory_bytes` will be deprecated in v2.10.0. Use `hami_vgpu_memory_context_bytes`, `hami_vgpu_memory_module_bytes` and `hami_vgpu_memory_buffer_bytes` instead.

:::
