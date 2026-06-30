---
title: 实时设备使用端点
sidebar_label: 实时设备使用
translated: true
---

你可以通过访问 `{GPU 节点 IP}:31992/metrics` 获取实时设备显存和核心使用情况，或者将其添加到 Prometheus 端点，如下命令所示：

```bash
curl {GPU 节点 IP}:31992/metrics
```

它包含以下指标：

| 指标 | 描述 | 示例 |
| --- | --- | --- |
| hami_host_gpu_utilization_ratio | 主机上的 GPU 实时利用率 | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",zone="vGPU"}` 0 |
| hami_host_gpu_memory_used_bytes | 主机上的 GPU 实时设备显存使用情况 | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",zone="vGPU"}` 2.87244288e+08 |
