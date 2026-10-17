---
title: Real-time device usage endpoint
sidebar_label: Real-time device usage
---

import FeatureSupport from '@site/src/components/FeatureSupport';

<FeatureSupport features="usageMetrics" />

Real-time usage metrics come from each GPU node: HAMi-core records what every container uses, and NVML reports each GPU. Where to read them depends on the setup:

| Setup | Exported by | How to reach it |
| --- | --- | --- |
| HAMi | vGPU monitor in the device plugin DaemonSet, port 9394 | NodePort `31992` |
| HAMi-DRA | Not available | — |
| Volcano vGPU | `volcano-vgpu-monitor` in the device plugin DaemonSet, port 9394 | No Service; use the Pod IP |
| KAI Scheduler | `kai-vgpu-monitor` from kai-resource-isolator, port 9394 | Off by default; see [KAI Scheduler](#kai-scheduler) |

## HAMi

You can get the real-time device memory and core utilization by visiting `<GPU-node-ip>:31992/metrics`, or add it to a prometheus endpoint, as the command below:

```bash
curl <GPU-node-ip>:31992/metrics
```

It contains the following host-level metrics:

| Metrics | Description | Example |
| --- | --- | --- |
| hami_host_gpu_utilization_ratio | GPU core utilization ratio on host (0-100) | `{device_index="0",device_type="NVIDIA H200",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="gpu-node-1",zone="vGPU"}` 0 |
| hami_host_gpu_memory_used_bytes | GPU real-time device memory usage on host | `{device_index="0",device_type="NVIDIA H200",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="gpu-node-1",zone="vGPU"}` 2.87244288e+08 |
| hami_host_gpu_memory_controller_utilization_ratio | GPU memory controller utilization ratio on host (0-100) | `{device_index="0",device_type="NVIDIA H200",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",zone="vGPU"}` 0 |

These are example values. The collector adds the `zone` label. The memory controller metric has no `node` label; the other two host metrics include it. Memory controller utilization measures memory read/write activity, not the proportion of memory allocated.

It also exposes per-container and per-vGPU metrics for each scheduled task:

| Metrics | Description | Example |
| --- | --- | --- |
| hami_container_device_utilization_ratio | Container device SM utilization ratio | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |
| hami_container_device_memory_bytes | Container device memory usage in bytes | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |
| hami_container_last_kernel_elapsed_seconds | Seconds since last kernel execution in container | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 3664 |
| hami_vgpu_memory_used_bytes | vGPU device memory usage in bytes | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |
| hami_vgpu_memory_limit_bytes | vGPU device memory limit in bytes | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 2.097152e+10 |
| hami_vgpu_memory_buffer_bytes | Container device memory buffer size in bytes | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 6.83935744e+08 |
| hami_vgpu_memory_context_bytes | Container device memory context size in bytes | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |
| hami_vgpu_memory_module_bytes | Container device memory module size in bytes | `{container="cuda",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",namespace="default",pod="vgpu-share",vdevice_index="0",zone="vGPU"}` 0 |

:::note

In v2.10.0, `hami_container_device_memory_bytes` no longer includes the `context_size`, `module_size`, `buffer_size`, and `offset` labels. Context, module, and buffer memory are exposed through `hami_vgpu_memory_context_bytes`, `hami_vgpu_memory_module_bytes`, and `hami_vgpu_memory_buffer_bytes`.

:::

## Volcano vGPU

The monitor exports the older metric names, such as `HostCoreUtilization` and `vGPU_device_memory_usage_in_bytes`. See the [device plugin README](https://github.com/Project-HAMi/volcano-vgpu-device-plugin#monitor) for the list.

```bash
curl <volcano-device-plugin-pod-ip>:9394/metrics
```

## KAI Scheduler

Enable the monitor when installing kai-resource-isolator. It exports the same `hami_*` container metrics as above; on the host it reports only GPU utilization and memory used.

```bash
helm upgrade --install kai-resource-isolator oci://docker.io/projecthami/kai-resource-isolator \
  --namespace kai-resource-isolator --create-namespace \
  --version 1.0.0-chart \
  --set monitor.enabled=true \
  --set monitor.serviceMonitor.enabled=true
```
