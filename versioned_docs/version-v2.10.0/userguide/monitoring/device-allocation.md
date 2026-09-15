---
title: Cluster device allocation endpoint
sidebar_label: Cluster device allocation
---

You can get the overview of cluster device allocation and limit by visiting `<scheduler-ip>:31993/metrics`, or add it to a prometheus endpoint, as the command below:

```bash
curl <scheduler-ip>:31993/metrics
```

It contains the following metrics:

| Metrics | Description | Example |
| --- | --- | --- |
| hami_gpu_core_limit_ratio | Device core limit for a certain GPU | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 100 |
| hami_gpu_memory_limit_bytes | Device memory limit for a certain GPU | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 3.4359738368e+10 |
| hami_gpu_core_allocated_ratio | Device core allocated for a certain GPU | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 45 |
| hami_gpu_memory_allocated_bytes | Device memory allocated for a certain GPU | `{device_cores="0",device_index="0",device_uuid="aio-node74-arm-Ascend310P-0",node="aio-node74-arm",zone="vGPU"}` 3.221225472e+09 |
| hami_gpu_shared_count | Number of containers sharing this GPU | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 1 |
| hami_vgpu_core_allocated_ratio | vGPU core allocated from a container | `{container_index="Ascend310P",device_uuid="aio-node74-arm-Ascend310P-0",node="aio-node74-arm",pod="ascend310p-pod",namespace="default",zone="vGPU"}` 50 |
| hami_vgpu_memory_allocated_bytes | vGPU memory allocated from a container | `{container_index="Ascend310P",device_uuid="aio-node74-arm-Ascend310P-0",node="aio-node74-arm",pod="ascend310p-pod",namespace="default",zone="vGPU"}` 3.221225472e+09 |
| hami_resource_quota_used | resourcequota usage for a certain device | `{quota_name="nvidia.com/gpucores", namespace="default",limit="200",zone="vGPU"}` 100 |

If you are using [HAMi DRA](../../installation/how-to-use-hami-dra), the metrics will be:

| Metrics | Description | Example |
| --- | --- | --- |
| GPUDeviceCoreLimit | GPUDeviceCoreLimit Device memory core limit for a certain GPU | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-1",deviceproductname="Tesla P4",deviceuuid="GPU-3ab1-179d-d6dd",nodeid="k8s-node01"}` 100 |
| GPUDeviceMemoryLimit | GPUDeviceMemoryLimit Device memory limit for a certain GPU | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-1",deviceproductname="Tesla P4",deviceuuid="GPU-3ab1-179d-d6dd",nodeid="k8s-node01"}` 8192 |
| GPUDeviceCoreAllocated | Device core allocated for a certain GPU | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-1",deviceproductname="Tesla P4",deviceuuid="GPU-3ab1-179d-d6dd",nodeid="k8s-node01"}` 0 |
| GPUDeviceMemoryAllocated | Device memory allocated for a certain GPU | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-1",deviceproductname="Tesla P4",deviceuuid="GPU-3ab1-179d-d6dd",nodeid="k8s-node01"}` 0 |
| vGPUDeviceCoreAllocated | vGPU core allocated from a container | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-0",deviceproductname="Tesla P4",deviceuuid="GPU-82be-83fe-3068",nodeid="k8s-node01",podname="pod-0",podnamespace="default"}` 100 |
| vGPUDeviceMemoryAllocated | vGPU memory allocated from a container | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-0",deviceproductname="Tesla P4",deviceuuid="GPU-82be-83fe-3068",nodeid="k8s-node01",podname="pod-0",podnamespace="default"}` 4000 |

:::note

This is the overview of device allocation, it is NOT device real-time usage metrics. For that part, see real-time device usage.

:::
