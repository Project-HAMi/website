---
id: scheduling-policy
title: 调度策略
translated: true
sidebar_label: Scheduling Policies
---

HAMi 支持多种 GPU 调度策略，以应对复杂的工作负载场景。Pod 可以通过 pod 注解（annotation）来选择调度策略。

## 可用策略

| 策略         | 范围 | 效果                                                  |
| ------------ | ---- | ----------------------------------------------------- |
| `binpack`    | Node | 尽量将任务分配到**同一个 GPU 节点**上                 |
| `spread`     | Node | 尽量将任务分配到**不同的 GPU 节点**上                 |
| `numa-first` | GPU  | 对于多 GPU 分配，优先选择**同一个 NUMA 节点**上的 GPU |

## 默认策略

默认的节点调度策略为 `binpack`，默认的 GPU 调度策略为 `spread`。可以通过 Helm 在全局范围内修改这些策略：

```bash
helm install hami hami-charts/hami \
  --set scheduler.defaultSchedulerPolicy.nodeSchedulerPolicy=binpack \
  --set scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy=spread
```

## 通过注解为 Pod 单独指定策略

单个 Pod 可以在 `.metadata.annotations` 中指定调度策略，从而覆盖默认值。

### 示例：binpack 策略

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    hami.io/node-scheduler-policy: "binpack"
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2
          nvidia.com/gpumem: 4000
```

### 示例：spread 策略

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    hami.io/node-scheduler-policy: "spread"
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2
          nvidia.com/gpumem: 4000
```

## 注意事项

- 注解 `hami.io/node-scheduler-policy` 用于控制 Pod 被调度到哪个节点。
- 只有节点级别的策略（`binpack`、`spread`）可以通过注解按 Pod 覆盖。节点内的 GPU 级别策略通过 `scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy` 在全局进行配置。
- `numa-first`（NUMA 亲和性）尚未实现，作为待办事项记录在 [Roadmap](/docs/contributor/roadmap) 中。
- 有关 scheduler 配置选项的完整列表，请参见[配置 HAMi](/docs/userguide/configure)。
