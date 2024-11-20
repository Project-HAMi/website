---
title: Monitor volcano-vgpu
---

### Monitor

volcano-scheduler-metrics records every GPU usage and limitation, visit the following address to get these metrics.

```
curl {volcano scheduler cluster ip}:8080/metrics
```

It contains the following metrics:

| Metrics  | Description | Example |
|----------|-------------|---------|
| volcano_vgpu_device_allocated_cores | The percentage of gpu compute cores allocated in this card | `{NodeName="aio-node67",devID="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec"}` 0 |
| volcano_vgpu_device_allocated_memory | Vgpu memory allocated in this card | `{NodeName="aio-node67",devID="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec"}` 32768|
| volcano_vgpu_device_core_allocation_for_a_vertain_pod| The vgpu device core allocated for a certain pod | `{NodeName="aio-node67",devID="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",podName="resnet101-deployment-7b487d974d-jjc8p"}` 0|
| volcano_vgpu_device_memory_allocation_for_a_certain_pod |  The vgpu device memory allocated for a certain pod | `{NodeName="aio-node67",devID="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",podName="resnet101-deployment-7b487d974d-jjc8p"}` 16384 |
| volcano_vgpu_device_memory_limit | The number of total device memory in this card | `{NodeName="m5-cloudinfra-online01",devID="GPU-a88b5d0e-eb85-924b-b3cd-c6cad732f745"}` 32768 |
| volcano_vgpu_device_shared_number | The number of vgpu tasks sharing this card |  `{NodeName="aio-node67",devID="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec"}` 2|