---
title: Cluster device allocation endpoint
sidebar_label: Cluster device allocation
---

import FeatureSupport from '@site/src/components/FeatureSupport';

<FeatureSupport features="allocationMetrics" />

Allocation metrics show what the scheduler has handed out to each GPU and each workload, not what is in use; for that, see [real-time device usage](./real-time-device-usage). Where they come from depends on the setup:

| Setup | Exported by | How to reach it | Granularity |
| --- | --- | --- | --- |
| HAMi | `hami-scheduler`, port 9395 | Service port `31993`; a NodePort in v2.10.0, `ClusterIP` on master | GPU, Pod, quota |
| HAMi-DRA | `hami-dra-monitor` Deployment, port 8080 | `ClusterIP` Service on 8080 | GPU, Pod |
| Volcano vGPU | Volcano scheduler, port 8080 | `ClusterIP` Service `volcano-scheduler-service` on 8080 | GPU, Pod |
| KAI Scheduler | Queue controller, port 8080 | `ClusterIP` Service `queue-controller` on 8080 | Queue only |

## HAMi

Scrape the `hami-scheduler` Service on `31993`, or set `prometheus.enabled=true` in the HAMi chart to create a ServiceMonitor. The ServiceMonitor CRD from Prometheus Operator must already exist, or the chart skips it.

In v2.10.0 the Service is a NodePort:

```bash
curl <node-ip>:31993/metrics
```

In charts built from master it is `ClusterIP`, so port-forward it:

```bash
kubectl port-forward svc/hami-scheduler 31993:31993 -n kube-system
curl localhost:31993/metrics
```

It contains the following metrics:

| Metrics | Description | Example |
| --- | --- | --- |
| hami_gpu_core_limit_ratio | Device core limit for a certain GPU | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 100 |
| hami_gpu_memory_limit_bytes | Device memory limit for a certain GPU | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 3.4359738368e+10 |
| hami_gpu_core_allocated_ratio | Device core allocated for a certain GPU | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 45 |
| hami_gpu_memory_allocated_bytes | Device memory allocated for a certain GPU | `{device_cores="0",device_index="0",device_uuid="aio-node74-arm-Ascend310P-0",node="aio-node74-arm",zone="vGPU"}` 3.221225472e+09 |
| hami_gpu_shared_count | Number of containers sharing this GPU | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 1 |
| hami_node_gpu_memory_allocated_ratio | Ratio of allocated to total device memory (0-1) | `{device_index="0",device_type="NVIDIA-Tesla V100-PCIE-32GB",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 0.3125 |
| hami_node_gpu_overview | Per-device overview. Labels contain capacity and device metadata; the sample value is allocated memory in bytes | `{device_cores="100",device_index="0",device_memory_limit="32768",device_type="NVIDIA-Tesla V100-PCIE-32GB",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 1.073741824e+10 |
| hami_vgpu_core_allocated_ratio | vGPU core allocated from a container | `{container_index="Ascend310P",device_uuid="aio-node74-arm-Ascend310P-0",node="aio-node74-arm",pod="ascend310p-pod",namespace="default",zone="vGPU"}` 50 |
| hami_vgpu_memory_allocated_bytes | vGPU memory allocated from a container | `{container_index="Ascend310P",device_uuid="aio-node74-arm-Ascend310P-0",node="aio-node74-arm",pod="ascend310p-pod",namespace="default",zone="vGPU"}` 3.221225472e+09 |
| hami_resource_quota_used | resourcequota usage for a certain device (the `limit` label is deprecated in v2.11.0, removed in v2.12.0; use `hami_resource_quota_limit` instead) | `{quota_name="nvidia.com/gpucores", namespace="default",limit="200",zone="vGPU"}` 100 |
| hami_resource_quota_limit | resourcequota limit for a certain device (only emitted when a quota limit is set) | `{quota_name="nvidia.com/gpucores", namespace="default",zone="vGPU"}` 200 |

## HAMi-DRA

The [HAMi-DRA](../../installation/how-to-use-hami-dra) monitor is on by default, behind a `ClusterIP` Service named after the Helm release, `hami-dra-monitor` for a release named `hami-dra`. Port-forward it, or set `monitor.service.type=NodePort`:

```bash
kubectl port-forward svc/hami-dra-monitor 8080:8080 -n <namespace>
curl localhost:8080/metrics
```

Memory is in MiB and cores in percent:

| Metrics | Description | Example |
| --- | --- | --- |
| GPUDeviceCoreLimit | Device core limit for a certain GPU | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-1",deviceproductname="Tesla P4",deviceuuid="GPU-3ab1-179d-d6dd",nodeid="k8s-node01"}` 100 |
| GPUDeviceMemoryLimit | Device memory limit for a certain GPU | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-1",deviceproductname="Tesla P4",deviceuuid="GPU-3ab1-179d-d6dd",nodeid="k8s-node01"}` 8192 |
| GPUDeviceCoreAllocated | Device core allocated for a certain GPU | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-1",deviceproductname="Tesla P4",deviceuuid="GPU-3ab1-179d-d6dd",nodeid="k8s-node01"}` 0 |
| GPUDeviceMemoryAllocated | Device memory allocated for a certain GPU | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-1",deviceproductname="Tesla P4",deviceuuid="GPU-3ab1-179d-d6dd",nodeid="k8s-node01"}` 0 |
| vGPUDeviceCoreAllocated | vGPU core allocated to a Pod | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-0",deviceproductname="Tesla P4",deviceuuid="GPU-82be-83fe-3068",nodeid="k8s-node01",podname="pod-0",podnamespace="default"}` 100 |
| vGPUDeviceMemoryAllocated | vGPU memory allocated to a Pod | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-0",deviceproductname="Tesla P4",deviceuuid="GPU-82be-83fe-3068",nodeid="k8s-node01",podname="pod-0",podnamespace="default"}` 4000 |

## Volcano vGPU

The Volcano scheduler exports `volcano_vgpu_device_*` metrics for each GPU and each Pod. The Helm chart and install YAML turn metrics on, and the Service carries `prometheus.io/scrape` annotations for annotation-based scraping. See [Monitor volcano-vgpu](../volcano-vgpu/nvidia-gpu/monitor) for the list.

```bash
curl <volcano-scheduler-service-ip>:8080/metrics
```

## KAI Scheduler

KAI reports GPU allocation per queue only, for example `kai_queue_allocated_gpus` and `kai_queue_deserved_gpus` from the queue controller. It has no per-GPU or per-Pod allocation metric. Install KAI with `prometheus.enabled=true` and, if the Prometheus Operator CRDs exist, the operator creates a ServiceMonitor for the queue controller. It also deploys a Prometheus for KAI unless `prometheus.externalPrometheusUrl` is set. See the [KAI metrics reference](https://github.com/kai-scheduler/KAI-Scheduler/blob/main/docs/metrics/METRICS.md).
