---
title: Real-time device usage endpoint
sidebar_label: Real-time device usage
---

You can get the real-time device memory and core utilization by visiting `{GPU node ip}:31992/metrics`, or add it to a prometheus endpoint, as the command below:

```bash
curl {GPU node ip}:31992/metrics
```

It contains the following metrics:

| Metrics | Description | Example |
| --- | --- | --- |
| hami_host_gpu_utilization_ratio | GPU real-time utilization on host | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",zone="vGPU"}` 0 |
| hami_host_gpu_memory_used_bytes | GPU real-time device memory usage on host | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",zone="vGPU"}` 2.87244288e+08 |
