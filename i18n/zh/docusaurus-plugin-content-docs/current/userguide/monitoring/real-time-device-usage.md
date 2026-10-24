---
title: 实时设备使用端点
sidebar_label: 实时设备使用
translated: true
---

import FeatureSupport from '@site/src/components/FeatureSupport';

<FeatureSupport features="usageMetrics" />

实时用量指标来自各 GPU 节点：HAMi-core 记录每个容器的实际用量，NVML 提供整卡数据。不同模式下，从不同的地方读取：

| 模式 | 由谁暴露 | 访问方式 |
| --- | --- | --- |
| HAMi | 设备插件 DaemonSet 中的 vGPU monitor，端口 9394 | NodePort `31992` |
| HAMi-DRA | 暂不提供 | — |
| Volcano vGPU | 设备插件 DaemonSet 中的 `volcano-vgpu-monitor`，端口 9394 | 没有 Service，需访问 Pod IP |
| KAI Scheduler | kai-resource-isolator 的 `kai-vgpu-monitor`，端口 9394 | 默认关闭，见 [KAI Scheduler](#kai-scheduler) |

## HAMi

你可以通过访问 `{GPU 节点 IP}:31992/metrics` 获取实时设备显存和核心使用情况，或者将其添加到 Prometheus 端点，如下命令所示：

```bash
curl {GPU 节点 IP}:31992/metrics
```

它包含以下主机级指标：

| 指标 | 描述 | 示例 |
| --- | --- | --- |
| hami_host_gpu_utilization_ratio | 主机上的 GPU 核心利用率（0-100） | `{device_index="0",device_type="NVIDIA H200",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="gpu-node-1",zone="vGPU"}` 0 |
| hami_host_gpu_memory_used_bytes | 主机上的 GPU 实时设备显存使用情况 | `{device_index="0",device_type="NVIDIA H200",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="gpu-node-1",zone="vGPU"}` 2.87244288e+08 |
| hami_host_gpu_memory_controller_utilization_ratio | 主机上的 GPU 显存控制器利用率（0-100） | `{device_index="0",device_type="NVIDIA H200",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",zone="vGPU"}` 0 |

以上为示例值。`zone` 标签由指标收集器添加。显存控制器利用率指标没有 `node` 标签，而另外两个主机级指标包含该标签。显存控制器利用率反映显存读写活动，不表示已分配显存的比例。

它还为每个调度的任务暴露每容器和每 vGPU 的指标：

| 指标 | 描述 | 示例 |
| --- | --- | --- |
| hami_container_device_utilization_ratio | 容器设备 SM 利用率 | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |
| hami_container_device_memory_bytes | 容器设备显存使用量（字节） | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |
| hami_container_last_kernel_elapsed_seconds | 容器中自上次 kernel 执行以来经过的秒数 | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 3664 |
| hami_vgpu_memory_used_bytes | vGPU 设备显存使用量（字节） | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |
| hami_vgpu_memory_limit_bytes | vGPU 设备显存上限（字节） | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 2.097152e+10 |
| hami_vgpu_memory_buffer_bytes | 容器设备显存 buffer 大小（字节） | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 6.83935744e+08 |
| hami_vgpu_memory_context_bytes | 容器设备显存 context 大小（字节） | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |
| hami_vgpu_memory_module_bytes | 容器设备显存 module 大小（字节） | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |

:::note

在 v2.10.0 中，`hami_container_device_memory_bytes` 不再包含 `context_size`、`module_size`、`buffer_size` 和 `offset` 标签。context、module 和 buffer 显存分别通过 `hami_vgpu_memory_context_bytes`、`hami_vgpu_memory_module_bytes` 和 `hami_vgpu_memory_buffer_bytes` 指标提供。

:::

## Volcano vGPU

该 monitor 使用旧的指标名，例如 `HostCoreUtilization` 和 `vGPU_device_memory_usage_in_bytes`。指标列表见[设备插件 README](https://github.com/Project-HAMi/volcano-vgpu-device-plugin#monitor)。

```bash
curl {volcano 设备插件 Pod IP}:9394/metrics
```

## KAI Scheduler

安装 kai-resource-isolator 时开启 monitor。它暴露与上文相同的 `hami_*` 容器指标；整卡指标只有 GPU 利用率和已用显存。

```bash
helm upgrade --install kai-resource-isolator oci://docker.io/projecthami/kai-resource-isolator \
  --namespace kai-resource-isolator --create-namespace \
  --version 1.0.0-chart \
  --set monitor.enabled=true \
  --set monitor.serviceMonitor.enabled=true
```
