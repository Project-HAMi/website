---
title: 集群设备分配端点
sidebar_label: 集群设备分配
translated: true
---

你可以通过访问 `{scheduler node ip}:31993/metrics` 获取集群设备分配和限制的概览，或者将其添加到 Prometheus 端点，如下命令所示：

```bash
curl {scheduler node ip}:31993/metrics
```

它包含以下指标：

| 指标 | 描述 | 示例 |
| --- | --- | --- |
| hami_gpu_core_limit_ratio | GPU 设备核心限制 | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 100 |
| hami_gpu_memory_limit_bytes | GPU 设备显存限制 | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 3.4359738368e+10 |
| hami_gpu_core_allocated_ratio | 分配给某个 GPU 的设备核心 | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 45 |
| hami_gpu_memory_allocated_bytes | 分配给某个 GPU 的设备显存 | `{device_cores="0",device_index="0",device_uuid="aio-node74-arm-Ascend310P-0",node="aio-node74-arm",zone="vGPU"}` 3.221225472e+09 |
| hami_gpu_shared_count | 共享此 GPU 的容器数量 | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 1 |
| hami_vgpu_core_allocated_ratio | 分配给某个容器的 vGPU 核心数量 | `{container_index="Ascend310P",device_uuid="aio-node74-arm-Ascend310P-0",node="aio-node74-arm",pod="ascend310p-pod",namespace="default",zone="vGPU"}` 50 |
| hami_vgpu_memory_allocated_bytes | 分配给某个容器的 vGPU 显存 | `{container_index="Ascend310P",device_uuid="aio-node74-arm-Ascend310P-0",node="aio-node74-arm",pod="ascend310p-pod",namespace="default",zone="vGPU"}` 3.221225472e+09 |
| hami_resource_quota_used | resourcequota 的使用情况 | `{quota_name="nvidia.com/gpucores", namespace="default",limit="200",zone="vGPU"}` 100 |

如果你在使用 [HAMi DRA](../../installation/how-to-use-hami-dra), 它将暴露如下指标 :

| 指标 | 描述 | 示例 |
| --- | --- | --- |
| GPUDeviceCoreLimit | GPU 设备核心限制 | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-1",deviceproductname="Tesla P4",deviceuuid="GPU-3ab1-179d-d6dd",nodeid="k8s-node01"}` 100 |
| GPUDeviceMemoryLimit | GPU 设备显存限制 | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-1",deviceproductname="Tesla P4",deviceuuid="GPU-3ab1-179d-d6dd",nodeid="k8s-node01"}` 8192 |
| GPUDeviceCoreAllocated | 分配给某个 GPU 的设备核心 | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-1",deviceproductname="Tesla P4",deviceuuid="GPU-3ab1-179d-d6dd",nodeid="k8s-node01"}` 0 |
| GPUDeviceMemoryAllocated | 分配给某个 GPU 的设备显存 | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-1",deviceproductname="Tesla P4",deviceuuid="GPU-3ab1-179d-d6dd",nodeid="k8s-node01"}` 0 |
| vGPUDeviceCoreAllocated | 分配给某个容器的 vGPU 核心数量 | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-0",deviceproductname="Tesla P4",deviceuuid="GPU-82be-83fe-3068",nodeid="k8s-node01",podname="pod-0",podnamespace="default"}` 100 |
| vGPUDeviceMemoryAllocated | 分配给某个容器的 vGPU 显存 | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-0",deviceproductname="Tesla P4",deviceuuid="GPU-82be-83fe-3068",nodeid="k8s-node01",podname="pod-0",podnamespace="default"}` 4000 |

:::note

请注意，这只是关于设备分配的概览，并不是设备的实时使用指标。有关实时使用情况，参见实时设备使用。

:::
