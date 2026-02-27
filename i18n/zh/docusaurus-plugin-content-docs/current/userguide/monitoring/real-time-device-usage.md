---
title: 实时设备使用
translated: true
---

## 实时设备使用端点

您可以通过访问 `{GPU 节点 IP}:31992/metrics` 获取实时设备显存和核心使用情况，或者将其添加到 Prometheus 端点，如下命令所示：

```bash
curl {GPU 节点 IP}:31992/metrics
```

它包含以下指标：

| 指标  | 描述 | 示例 |
|----------|-------------|---------|
| Device_memory_desc_of_container | 容器设备显存实时使用情况 | `{context="0",ctrname="2-1-3-pod-1",data="0",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",module="0",offset="0",podname="2-1-3-pod-1",podnamespace="default",vdeviceid="0",zone="vGPU"}` 0 |
| Device_utilization_desc_of_container | 容器设备实时利用率 | `{ctrname="2-1-3-pod-1",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",podname="2-1-3-pod-1",podnamespace="default",vdeviceid="0",zone="vGPU"}` 0 |
| HostCoreUtilization | 主机上的 GPU 实时利用率 | `{deviceidx="0",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",zone="vGPU"}` 0 |
| HostGPUMemoryUsage | 主机上的 GPU 实时设备显存使用情况 | `{deviceidx="0",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",zone="vGPU"}` 2.87244288e+08 |
| vGPU_device_memory_limit_in_bytes | 某个容器的设备限制 | `{ctrname="2-1-3-pod-1",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",podname="2-1-3-pod-1",podnamespace="default",vdeviceid="0",zone="vGPU"}` 2.62144e+09 |
| vGPU_device_memory_usage_in_bytes | 某个容器的设备使用情况 | `{ctrname="2-1-3-pod-1",deviceuuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",podname="2-1-3-pod-1",podnamespace="default",vdeviceid="0",zone="vGPU"}` 0 |