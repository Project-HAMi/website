---
title: 实时设备使用端点
sidebar_label: 实时设备使用
translated: true
---

你可以通过访问 `{GPU 节点 IP}:31992/metrics` 获取实时设备显存和核心使用情况，或者将其添加到 Prometheus 端点，如下命令所示：

```bash
curl {GPU 节点 IP}:31992/metrics
```

它包含以下主机级指标：

| 指标 | 描述 | 示例 |
| --- | --- | --- |
| hami_host_gpu_utilization_ratio | 主机上的 GPU 核心利用率（0-100） | `{device_index="0",device_type="NVIDIA-NVIDIA H200",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",zone="vGPU"}` 0 |
| hami_host_gpu_memory_used_bytes | 主机上的 GPU 实时设备显存使用情况 | `{device_index="0",device_type="NVIDIA-NVIDIA H200",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",zone="vGPU"}` 2.87244288e+08 |

它还为每个调度的任务暴露每容器和每 vGPU 的指标：

| 指标 | 描述 | 示例 |
| --- | --- | --- |
| hami_container_device_utilization_ratio | 容器设备 SM 利用率 | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |
| hami_container_device_memory_bytes | 容器设备显存使用明细（字节） | `{buffer_size="0",container="cuda",context_size="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",module_size="0",namespace="default",offset="0",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |
| hami_container_last_kernel_elapsed_seconds | 容器中自上次 kernel 执行以来经过的秒数 | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 3664 |
| hami_vgpu_memory_used_bytes | vGPU 设备显存使用量（字节） | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |
| hami_vgpu_memory_limit_bytes | vGPU 设备显存上限（字节） | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 2.097152e+10 |
| hami_vgpu_memory_buffer_bytes | 容器设备显存 buffer 大小（字节） | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 6.83935744e+08 |
| hami_vgpu_memory_context_bytes | 容器设备显存 context 大小（字节） | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |
| hami_vgpu_memory_module_bytes | 容器设备显存 module 大小（字节） | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |

:::note

`hami_container_device_memory_bytes` 上的 `context_size`、`module_size`、`buffer_size` 和 `offset` 标签将在 v2.10.0 中弃用，请改用 `hami_vgpu_memory_context_bytes`、`hami_vgpu_memory_module_bytes` 和 `hami_vgpu_memory_buffer_bytes`。

:::
