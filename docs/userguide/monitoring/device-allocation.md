---
title: Cluster device allocation
---

## Cluster device allocation endpoint

You can get the overview of cluster device allocation and limit by visiting `{scheduler node ip}:31993/metrics`, or add it to a prometheus endpoint, as the command below:

```
curl {scheduler node ip}:31993/metrics
```

It contains the following metrics:

| Metrics  | Description | Example |
|----------|-------------|---------|
| GPUDeviceCoreLimit | GPUDeviceCoreLimit Device memory core limit for a certain GPU | `{deviceidx="0",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",nodeid="aio-node67",zone="vGPU"}` 100 |
| GPUDeviceMemoryLimit | GPUDeviceMemoryLimit Device memory limit for a certain GPU | `{deviceidx="0",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",nodeid="aio-node67",zone="vGPU"}` 3.4359738368e+10 |
| GPUDeviceCoreAllocated | Device core allocated for a certain GPU | `{deviceidx="0",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",nodeid="aio-node67",zone="vGPU"}` 45 |
| GPUDeviceMemoryAllocated | Device memory allocated for a certain GPU | `{devicecores="0",deviceidx="0",deviceuuid="aio-node74-arm-Ascend310P-0",nodeid="aio-node74-arm",zone="vGPU"}` 3.221225472e+09 |
| GPUDeviceSharedNum | Number of containers sharing this GPU | `{deviceidx="0",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",nodeid="aio-node67",zone="vGPU"}` 1 |
| vGPUCoreAllocated | vGPU core allocated from a container | `{containeridx="Ascend310P",deviceuuid="aio-node74-arm-Ascend310P-0",nodename="aio-node74-arm",podname="ascend310p-pod",podnamespace="default",zone="vGPU"}` 50 |
| vGPUMemoryAllocated | vGPU memory allocated from a container | `{containeridx="Ascend310P",deviceuuid="aio-node74-arm-Ascend310P-0",nodename="aio-node74-arm",podname="ascend310p-pod",podnamespace="default",zone="vGPU"}` 3.221225472e+09 |
| QuotaUsed | resourcequota usage for a certain device | `{quotaName="nvidia.com/gpucores", quotanamespace="default",limit="200",zone="vGPU"}` 100 |
| vGPUPodsDeviceAllocated | vGPU Allocated from pods (This metric will be deprecated in v2.8.0, use vGPUMemoryAllocated and vGPUCoreAllocated instead.)| `{containeridx="Ascend310P",deviceusedcore="0",deviceuuid="aio-node74-arm-Ascend310P-0",nodename="aio-node74-arm",podname="ascend310p-pod",podnamespace="default",zone="vGPU"}` 3.221225472e+09 |

> **Note** Please note that, this is the overview about device allocation, it is NOT device real-time usage metrics. For that part, see real-time device usage.