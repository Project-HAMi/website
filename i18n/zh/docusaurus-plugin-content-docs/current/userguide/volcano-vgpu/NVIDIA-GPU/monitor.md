---
title: 监控 Volcano vGPU
translated: true
---

## 监控

volcano-scheduler-metrics 记录每个 GPU 的使用情况和限制，访问以下地址获取这些指标。

```bash
curl {volcano scheduler cluster ip}:8080/metrics
```

它包含以下指标：

| 指标  | 描述 | 示例 |
|----------|-------------|---------|
| volcano_vgpu_device_allocated_cores | 此卡中分配的 GPU 计算核心的百分比 | `{NodeName="aio-node67",devID="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec"}` 0 |
| volcano_vgpu_device_allocated_memory | 此卡中分配的 vGPU 显存 | `{NodeName="aio-node67",devID="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec"}` 32768 |
| volcano_vgpu_device_core_allocation_for_a_vertain_pod | 为某个 Pod 分配的 vGPU 设备核心 | `{NodeName="aio-node67",devID="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",podName="resnet101-deployment-7b487d974d-jjc8p"}` 0|
| volcano_vgpu_device_memory_allocation_for_a_certain_pod | 为某个 Pod 分配的 vGPU 设备显存 | `{NodeName="aio-node67",devID="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",podName="resnet101-deployment-7b487d974d-jjc8p"}` 16384 |
| volcano_vgpu_device_memory_limit | 此卡中设备显存的总数 | `{NodeName="m5-cloudinfra-online01",devID="GPU-a88b5d0e-eb85-924b-b3cd-c6cad732f745"}` 32768 |
| volcano_vgpu_device_shared_number | 共享此卡的 vGPU 任务数量 | `{NodeName="aio-node67",devID="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec"}` 2 |
