---
title: 使用 HAMi GPU Descheduler 整理 GPU 资源碎片
sidebar_label: GPU 碎片整理
id: hami-gpu-descheduler
---

## 什么是 HAMi GPU Descheduler

[HAMi GPU Descheduler](https://github.com/Project-HAMi/gpu-descheduler) 是专为 HAMi 虚拟化集群设计的 GPU 碎片整理工具。它通过 Mutating Admission Webhook 和自定义资源定义（CRD），对 HAMi 节点上的 GPU 工作负载实现精细化的调度控制。

在长时间运行的集群中，GPU 资源可能因为频繁创建和删除 Pod 而变得碎片化。HAMi GPU Descheduler 能够帮助你将分散在不同节点上的 vGPU 工作负载进行整合，从而提升集群的整体资源利用率。

## 核心能力

HAMi GPU Descheduler 围绕 GPU 资源的整理与优化，提供以下核心能力。

### 精确绑定

支持将 Pod 精确调度到指定的节点和特定的 GPU 设备上。通过 `HamiPodPlacement` CRD，你可以明确指定目标节点（`nodeName`）和 GPU 设备编号（`gpuDevices`），实现精细的放置控制。

### 主动驱逐

支持主动驱逐正在运行的 Pod，并将其重新调度到目标节点。

主动驱逐会终止正在运行的 Pod，可能暂时降低可用性。使用前，你必须确保该工作负载由控制器（如 Deployment 或 StatefulSet）管理，以便自动重建被驱逐的 Pod。Descheduler 会等待替代 Pod 出现，但不会重建独立的裸 Pod。此外，请检查工作负载的就绪状态和中断保护配置，以免造成意外的服务中断。

## 前置条件

在部署 HAMi GPU Descheduler 之前，请确保你的环境满足以下要求：

| 组件               | 版本/状态要求                   |
| ------------------ | ------------------------------- |
| **HAMi Scheduler** | v2.10.0 或更高版本              |
| **Kubernetes**     | v1.24 或更高版本（推荐 v1.28+） |
| **Helm**           | v3.8 或更高版本                 |

## 部署 HAMi GPU Descheduler

推荐使用 Helm 进行部署。在项目根目录下执行以下命令：

```bash
helm install gpu-descheduler ./chart --namespace kube-system --create-namespace
```

**常用参数说明**：

| 参数                 | 描述                               |
| -------------------- | ---------------------------------- |
| `--namespace`        | 指定部署的目标命名空间             |
| `--create-namespace` | 如果目标命名空间不存在，则自动创建 |
| `-f values.yaml`     | 使用自定义的配置文件（可选）       |
| `--debug`            | 输出详细的调试信息                 |

## 验证部署状态

部署完成后，通过以下命令验证 Webhook 服务是否正常运行：

```bash
kubectl get pods -n kube-system -l app=gpu-descheduler-webhook -w
```

当 Pod 状态显示为 Running 时，表示部署成功。

你还可以通过 Webhook 服务提供的 REST API 查看集群状态：

```bash

# 在容器内执行，查看集群节点、GPU 设备及健康状态
curl -s http://localhost:8083/api/v1/cluster-info

# 查看当前 Placement CRD 的缓存及分配记录
curl -s http://localhost:8083/api/v1/placements
```

## 配置 HamiPodPlacement CRD

`HamiPodPlacement` 是指导 Descheduler 进行精确调度的核心 CRD。一个`HamiPodPlacement` 资源仅被一个 Pod 消费。

### 关键要求

- 目标 Pod 必须使用 `schedulerName: hami-scheduler`。
- 目标 Pod 的标签需要与 `HamiPodPlacement` 中定义的 `podSelector` 匹配。

### 示例

```yaml
apiVersion: scheduling.hami.placement.com/v1
kind: HamiPodPlacement
metadata:
  name: pin-gpu0
  namespace: default
spec:
  reqID: "pin-gpu0-001"
  podSelector:
    matchLabels:
      app: my-job
  nodeName: gpu-node-1
  gpuDevices:
    - gpu-0
  # evictPod: my-job-6cd5964877-zdb5z
```

> **注意**：如果你希望主动驱逐现有的 Pod 并将其移动到此目标，可以添加 `evictPod` 字段（例如 `evictPod: my-job-6cd5964877-zdb5z`）。但在添加该字段前，你必须先验证 `nodeName` 和 `gpuDevices` 指向的是有效目标。确认无误后再启用驱逐，以免在目标验证完成前错误地驱逐了现有 Pod。

应用 CRD 并查看状态：

```bash

kubectl apply -f hami-pod-placement.yaml
kubectl get hamipodplacements -A
```

与 HAMi 的关系

HAMi GPU Descheduler 是 HAMi 生态中的调度优化组件：

- **HAMi Scheduler**：负责 GPU 资源的虚拟化、调度与隔离。
- **HAMi GPU Descheduler**：负责在 HAMi 调度基础上，对已分配的资源进行整理、绑定与优化。

两者结合，可以实现从“资源分配”到“资源布局优化”的完整闭环，帮助集群管理员在动态变化的业务负载下，持续保持 GPU 资源的高效利用。

## 总结

HAMi GPU Descheduler 为 HAMi 虚拟化集群提供了主动的 GPU 资源碎片整理能力。通过 Webhook 和 CRD 的组合，它使你能够：

- 整合分散的 GPU 负载，提升集群利用率。
- 将 Pod 精确绑定到指定的节点和 GPU 设备。
- 主动驱逐并重新调度 Pod，优化资源布局。

在长期运行的生产环境中，该组件能够有效降低 GPU 资源碎片化带来的运维负担。
