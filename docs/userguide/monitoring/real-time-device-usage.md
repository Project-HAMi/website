---
title: Real-time device usage
---

## Real-time device usage endpoint

You can get the real-time device memory and core utilization by visiting `{GPU node node ip}:31992/metrics`, or add it to a prometheus endpoint, as the command below:

```
curl {GPU node ip}:31992/metrics
```

It contains the following metrics:

| Metrics  | Description | Example |
|----------|-------------|---------|
| Device_memory_desc_of_container | Container device meory real-time usage | `{context="0",ctrname="2-1-3-pod-1",data="0",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",module="0",offset="0",podname="2-1-3-pod-1",podnamespace="default",vdeviceid="0",zone="vGPU"}` 0 |
| Device_utilization_desc_of_container | Container device real-time utilization | `{ctrname="2-1-3-pod-1",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",podname="2-1-3-pod-1",podnamespace="default",vdeviceid="0",zone="vGPU"}` 0 |
| HostCoreUtilization | GPU real-time utilization on host | `{deviceidx="0",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",zone="vGPU"}` 0 |
| HostGPUMemoryUsage | GPU real-time device memory usage on host | `{deviceidx="0",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",zone="vGPU"}` 2.87244288e+08 |
| vGPU_device_memory_limit_in_bytes | device limit for a certain container | `{ctrname="2-1-3-pod-1",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",podname="2-1-3-pod-1",podnamespace="default",vdeviceid="0",zone="vGPU"}` 2.62144e+09 |
| vGPU_device_memory_usage_in_bytes | device usage for a certain container | `{ctrname="2-1-3-pod-1",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",podname="2-1-3-pod-1",podnamespace="default",vdeviceid="0",zone="vGPU"}` 0 |