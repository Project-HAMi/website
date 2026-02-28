---
title: 集群设备分配
translated: true
---

## 集群设备分配端点

您可以通过访问 `{scheduler node ip}:31993/metrics` 获取集群设备分配和限制的概览，或者将其添加到 Prometheus 端点，如下命令所示：

```bash
curl {scheduler node ip}:31993/metrics
```

它包含以下指标：

| 指标  | 描述 | 示例 |
|----------|-------------|---------|
| GPUDeviceCoreLimit | GPU 设备核心限制 | `{deviceidx="0",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",nodeid="aio-node67",zone="vGPU"}` 100 |
| GPUDeviceMemoryLimit | GPU 设备显存限制 | `{deviceidx="0",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",nodeid="aio-node67",zone="vGPU"}` 3.4359738368e+10 |
| GPUDeviceCoreAllocated | 分配给某个 GPU 的设备核心 | `{deviceidx="0",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",nodeid="aio-node67",zone="vGPU"}` 45 |
| GPUDeviceMemoryAllocated | 分配给某个 GPU 的设备显存 | `{devicecores="0",deviceidx="0",deviceuuid="aio-node74-arm-Ascend310P-0",nodeid="aio-node74-arm",zone="vGPU"}` 3.221225472e+09 |
| GPUDeviceSharedNum | 共享此 GPU 的容器数量 | `{deviceidx="0",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",nodeid="aio-node67",zone="vGPU"}` 1 |
| vGPUPodsDeviceAllocated | 从 Pod 分配的 vGPU | `{containeridx="Ascend310P",deviceusedcore="0",deviceuuid="aio-node74-arm-Ascend310P-0",nodename="aio-node74-arm",podname="ascend310p-pod",podnamespace="default",zone="vGPU"}` 3.221225472e+09 |

> **注意** 请注意，这只是关于设备分配的概览，并不是设备的实时使用指标。有关实时使用情况，请参见实时设备使用。