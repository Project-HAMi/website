---
title: 集群设备分配端点
sidebar_label: 集群设备分配
translated: true
---

import FeatureSupport from '@site/src/components/FeatureSupport';

<FeatureSupport features="allocationMetrics" />

分配指标反映调度器给每张卡、每个工作负载分出去了多少，不是实际用了多少；实际用量见[实时设备使用](./real-time-device-usage)。不同模式下，指标从不同的地方取：

| 模式 | 由谁暴露 | 访问方式 | 粒度 |
| --- | --- | --- | --- |
| HAMi | `hami-scheduler`，端口 9395 | Service 端口 `31993`；v2.10.0 为 NodePort，master 为 `ClusterIP` | 卡、Pod、配额 |
| HAMi-DRA | `hami-dra-monitor` Deployment，端口 8080 | `ClusterIP` Service，端口 8080 | 卡、Pod |
| Volcano vGPU | Volcano 调度器，端口 8080 | `ClusterIP` Service `volcano-scheduler-service`，端口 8080 | 卡、Pod |
| KAI Scheduler | 队列控制器，端口 8080 | `ClusterIP` Service `queue-controller`，端口 8080 | 仅队列 |

## HAMi

从 `hami-scheduler` Service 的 `31993` 端口抓取，或者在 HAMi chart 中设置 `prometheus.enabled=true` 创建 ServiceMonitor。集群中需已有 Prometheus Operator 的 ServiceMonitor CRD，否则 chart 不会创建。

v2.10.0 中该 Service 为 NodePort：

```bash
curl {节点 IP}:31993/metrics
```

master 分支的 chart 中为 `ClusterIP`，需要端口转发：

```bash
kubectl port-forward svc/hami-scheduler 31993:31993 -n kube-system
curl localhost:31993/metrics
```

它包含以下指标：

| 指标 | 描述 | 示例 |
| --- | --- | --- |
| hami_gpu_core_limit_ratio | GPU 设备核心限制 | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 100 |
| hami_gpu_memory_limit_bytes | GPU 设备显存限制 | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 3.4359738368e+10 |
| hami_gpu_core_allocated_ratio | 分配给某个 GPU 的设备核心 | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 45 |
| hami_gpu_memory_allocated_bytes | 分配给某个 GPU 的设备显存 | `{device_cores="0",device_index="0",device_uuid="aio-node74-arm-Ascend310P-0",node="aio-node74-arm",zone="vGPU"}` 3.221225472e+09 |
| hami_gpu_shared_count | 共享此 GPU 的容器数量 | `{device_index="0",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 1 |
| hami_node_gpu_memory_allocated_ratio | GPU 已分配显存占总显存的比例（0-1） | `{device_index="0",device_type="NVIDIA-Tesla V100-PCIE-32GB",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 0.3125 |
| hami_node_gpu_overview | 单个 GPU 的汇总信息。标签包含容量和设备信息，指标值为已分配显存（字节） | `{device_cores="100",device_index="0",device_memory_limit="32768",device_type="NVIDIA-Tesla V100-PCIE-32GB",device_uuid="GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec",node="aio-node67",zone="vGPU"}` 1.073741824e+10 |
| hami_vgpu_core_allocated_ratio | 分配给某个容器的 vGPU 核心数量 | `{container_index="Ascend310P",device_uuid="aio-node74-arm-Ascend310P-0",node="aio-node74-arm",pod="ascend310p-pod",namespace="default",zone="vGPU"}` 50 |
| hami_vgpu_memory_allocated_bytes | 分配给某个容器的 vGPU 显存 | `{container_index="Ascend310P",device_uuid="aio-node74-arm-Ascend310P-0",node="aio-node74-arm",pod="ascend310p-pod",namespace="default",zone="vGPU"}` 3.221225472e+09 |
| hami_resource_quota_used | resourcequota 的使用情况。`limit` 标签已在 v2.11.0 中弃用，将在 v2.12.0 中移除，请改用 `hami_resource_quota_limit`。 | `{quota_name="nvidia.com/gpucores", namespace="default",limit="200",zone="vGPU"}` 100 |
| hami_resource_quota_limit | resourcequota 的限额（仅在配额设置了限额时暴露） | `{quota_name="nvidia.com/gpucores", namespace="default",zone="vGPU"}` 200 |

## HAMi-DRA

[HAMi-DRA](../../installation/how-to-use-hami-dra) 的 monitor 默认开启，通过 `ClusterIP` Service 暴露，Service 名随 Helm release 而定，release 名为 `hami-dra` 时是 `hami-dra-monitor`。可以用端口转发访问，或者设置 `monitor.service.type=NodePort`：

```bash
kubectl port-forward svc/hami-dra-monitor 8080:8080 -n <namespace>
curl localhost:8080/metrics
```

显存单位为 MiB，算力为百分比：

| 指标 | 描述 | 示例 |
| --- | --- | --- |
| GPUDeviceCoreLimit | GPU 设备核心限制 | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-1",deviceproductname="Tesla P4",deviceuuid="GPU-3ab1-179d-d6dd",nodeid="k8s-node01"}` 100 |
| GPUDeviceMemoryLimit | GPU 设备显存限制 | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-1",deviceproductname="Tesla P4",deviceuuid="GPU-3ab1-179d-d6dd",nodeid="k8s-node01"}` 8192 |
| GPUDeviceCoreAllocated | 分配给某个 GPU 的设备核心 | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-1",deviceproductname="Tesla P4",deviceuuid="GPU-3ab1-179d-d6dd",nodeid="k8s-node01"}` 0 |
| GPUDeviceMemoryAllocated | 分配给某个 GPU 的设备显存 | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-1",deviceproductname="Tesla P4",deviceuuid="GPU-3ab1-179d-d6dd",nodeid="k8s-node01"}` 0 |
| vGPUDeviceCoreAllocated | 分配给某个 Pod 的 vGPU 核心数量 | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-0",deviceproductname="Tesla P4",deviceuuid="GPU-82be-83fe-3068",nodeid="k8s-node01",podname="pod-0",podnamespace="default"}` 100 |
| vGPUDeviceMemoryAllocated | 分配给某个 Pod 的 vGPU 显存 | `{devicebrand="Tesla",deviceidx="0",devicename="hami-gpu-0",deviceproductname="Tesla P4",deviceuuid="GPU-82be-83fe-3068",nodeid="k8s-node01",podname="pod-0",podnamespace="default"}` 4000 |

## Volcano vGPU

Volcano 调度器按卡、按 Pod 暴露 `volcano_vgpu_device_*` 指标。Helm chart 和安装 YAML 默认开启指标，Service 上带有 `prometheus.io/scrape` 注解，按注解发现目标的 Prometheus 会自动抓取。指标列表见[监控 Volcano vGPU](../volcano-vgpu/nvidia-gpu/monitor)。

```bash
curl {volcano-scheduler-service ip}:8080/metrics
```

## KAI Scheduler

KAI 只按队列统计 GPU 分配，例如队列控制器的 `kai_queue_allocated_gpus` 和 `kai_queue_deserved_gpus`，没有按卡或按 Pod 的分配指标。安装 KAI 时设置 `prometheus.enabled=true`，如果集群中已有 Prometheus Operator 的 CRD，operator 会为队列控制器创建 ServiceMonitor。未设置 `prometheus.externalPrometheusUrl` 时，它还会为 KAI 部署一个 Prometheus。详见 [KAI 指标说明](https://github.com/kai-scheduler/KAI-Scheduler/blob/main/docs/metrics/METRICS.md)。
