---
title: 可观测性
description: HAMi 的分配指标和使用指标从哪里来，以及两者为什么不同。
translated: true
---

HAMi 为每张 GPU 提供两种视图。分配视图显示调度器已经分出去多少，使用视图显示容器实际用了多少。两者都以 Prometheus 指标的形式提供。

![HAMi 的分配指标和使用指标从哪里来](/img/docs/zh/core-concepts/observability.svg)

## 分配视图

HAMi 调度器在 `<scheduler-ip>:31993/metrics` 提供分配指标。这些数据来自调度器自己的分配记录：每个 Pod 分到了哪张卡、多少份额。

| 指标                               | 含义                 |
| ---------------------------------- | -------------------- |
| `hami_gpu_memory_allocated_bytes`  | 每张卡上已分配的显存 |
| `hami_gpu_core_allocated_ratio`    | 每张卡上已分配的算力 |
| `hami_gpu_shared_count`            | 共享每张卡的容器数量 |
| `hami_vgpu_memory_allocated_bytes` | 分配给每个容器的显存 |

## 使用视图

HAMi-Core 把每个容器的显存和算力用量记录在节点上的共享缓存文件中。`hami-device-plugin` Pod 里的 vGPU monitor 读取这些文件，在 `<gpu-node-ip>:31992/metrics` 提供使用指标。

| 指标                                      | 含义                         |
| ----------------------------------------- | ---------------------------- |
| `hami_vgpu_memory_used_bytes`             | 每个容器在一张卡上使用的显存 |
| `hami_container_device_utilization_ratio` | 每个容器使用的算力           |
| `hami_host_gpu_utilization_ratio`         | 整台主机上每张卡的算力使用率 |
| `hami_host_gpu_memory_used_bytes`         | 整台主机上每张卡已使用的显存 |

DCGM Exporter 可以和 HAMi 一起运行，补充温度、功耗等物理计数器。

## 两种视图为什么不一样

一个 Pod 申请了 8192 MiB，加载的模型较小，实际可能只用 2100 MiB。分配视图记为 8192 MiB，使用视图显示 2100 MiB。差距大，说明这个 Pod 申请得比需要的多，这张卡还能放下更多 Pod。

差距也可能反过来。设置了 `CUDA_DISABLE_CONTROL=true` 的容器不加载 HAMi-Core，不受份额约束。这时主机级指标可能显示，一张卡上使用的显存比调度器分配的还多。

## 面板

- [Grafana 仪表盘](../userguide/monitoring/grafana-dashboard.md)：整个集群的容量、分配和使用情况
- [HAMi WebUI](../userguide/hami-webui-user-guide.md)：从 Prometheus 读取同一批指标的 Web 控制台

## 了解更多

- [集群设备分配端点](../userguide/monitoring/device-allocation.md)和[实时设备使用端点](../userguide/monitoring/real-time-device-usage.md)：完整的指标列表
- [GPU 利用率指标](../developers/gpu-utilization-metrics.md)：使用数据的计算方法
