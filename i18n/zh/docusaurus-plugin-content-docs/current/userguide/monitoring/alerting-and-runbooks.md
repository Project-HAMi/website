---
title: 告警与运行手册
sidebar_label: 告警与运行手册
translated: true
---

HAMi 提供 Prometheus 告警规则参考示例，并为每条告警提供运行手册。HAMi 不会安装这些规则。应用前，请根据集群的后端、调度策略和工作负载调整规则。

:::info 告警规则

- 使用 Prometheus Operator 时：[下载 hami-alerts.yaml](/prometheus/hami-alerts.yaml)
- 不使用 Prometheus Operator 时：[下载 hami-alerts.rules.yaml](/prometheus/hami-alerts.rules.yaml)

:::

## 兼容性

| 组件       | 要求                                        |
| ---------- | ------------------------------------------- |
| HAMi       | 基于 master 构建的 Chart                    |
| Prometheus | 同时采集 scheduler 和 vGPU monitor 指标端点 |

## 告警列表

| 告警 | 触发条件 | 严重级别 | 后端 |
| --- | --- | --- | --- |
| [`HAMiDeviceMemoryAllocationHigh`](#hamidevicememoryallocationhigh) | 某一设备类型超过 95% 的显存处于已分配状态，持续 15 分钟 | `warning` | 全部 |
| [`HAMiDeviceCoreAllocationHigh`](#hamidevicecoreallocationhigh) | 某一设备类型超过 95% 的核心处于已分配状态，持续 15 分钟 | `warning` | 全部 |
| [`HAMiQuotaAlmostFull`](#hamiquotaalmostfull) | 命名空间对某个扩展 ResourceQuota 的使用率高于 90% 且低于 100%，持续 15 分钟 | `info` | 全部 |
| [`HAMiQuotaFullyUsed`](#hamiquotafullyused) | 命名空间对某个扩展 ResourceQuota 的使用率恰好为 100%，持续 15 分钟 | `info` | 全部 |
| [`HAMiQuotaExceeded`](#hamiquotaexceeded) | 命名空间对某个扩展 ResourceQuota 的使用率高于 100%，持续 15 分钟 | `warning` | 全部 |
| [`HAMiSchedulerDown`](#hamischedulerdown) | 连续 15 分钟没有 HAMi 调度器成为 leader | `critical` | 全部 |
| [`HAMiNodeDevicesNotRegistered`](#haminodedevicesnotregistered) | 节点上的 vGPU monitor 运行正常，但调度器连续 15 分钟没有该节点的设备 | `warning` | NVIDIA |

## 添加规则

### Prometheus Operator

集群已安装 Prometheus Operator 时，启用 HAMi Helm Chart 自带的 ServiceMonitor：

```bash
helm upgrade --install hami hami-charts/hami \
  --namespace kube-system \
  --set prometheus.enabled=true
```

使用 Prometheus Operator 格式的 [hami-alerts.yaml](/prometheus/hami-alerts.yaml)。先[调整规则](#tune-the-rules)，然后应用：

```bash
kubectl apply -n monitoring -f hami-alerts.yaml
```

### 不使用 Prometheus Operator

使用 Prometheus 可读取的规则文件格式 [hami-alerts.rules.yaml](/prometheus/hami-alerts.rules.yaml)。先[调整规则](#tune-the-rules)，然后将该文件添加到 Prometheus 配置的 `rule_files` 中：

```yaml
rule_files:
  - /etc/prometheus/rules/hami-alerts.rules.yaml
```

[`HAMiNodeDevicesNotRegistered`](#haminodedevicesnotregistered) 需要在 Pod 未就绪时仍能获取 vGPU monitor 指标，因此请直接采集 Pod，不要通过 Service 采集。

无论使用哪种方式，都请在 Prometheus UI 中打开 **Alerts**，确认已列出 HAMi 告警（位于 `hami` 组中）。

## 调整规则 {#tune-the-rules}

阈值、持续时间和严重级别都只是初始值。HAMi 支持多种后端、调度策略和工作负载模式，一组取值无法适用于所有集群。

每条规则在 [hami-alerts.yaml](/prometheus/hami-alerts.yaml) 或 [hami-alerts.rules.yaml](/prometheus/hami-alerts.rules.yaml) 中都有三项设置：

```yaml
- alert: HAMiQuotaAlmostFull
  # 阈值
  expr: |
    max by (namespace, quota_name) (hami_resource_quota_used)
      / max by (namespace, quota_name) (hami_resource_quota_limit > 0)
      > 0.9 < 1
  # 条件需要持续多久才会触发告警
  for: 15m
  labels:
    # 告警的紧急程度
    severity: info
```

部分场景需要调整特定告警：

- `HAMiDeviceMemoryAllocationHigh` 和 `HAMiDeviceCoreAllocationHigh`：如果集群有意满载运行，可将 `severity` 设为 `info` 或调大 `for`。如果某一设备类型的设备很少，几个各占用一整个设备的 Pod 就能使其达到 100%。此时请在规则中排除该 `device_type`。
- `HAMiSchedulerDown`：要更早告警，可调小 `for`，但要保持大于 leader 故障切换所需的时间。

## 运行手册

### HAMiDeviceMemoryAllocationHigh

#### 含义

某一设备类型超过 95% 的显存已分配，并持续了 15 分钟。分配量统计的是 Pod 申请的资源，而不是实际用量，因此某一设备类型可能已 100% 分配，而其设备却处于空闲状态。

#### 影响

申请该设备类型的新 Pod 可能一直处于 `Pending` 状态。

#### 诊断

按节点查看告警中 `device_type` 的显存分配情况（PromQL）：

```promql
sum by (node) (hami_gpu_memory_allocated_bytes{device_type="<device-type>"})
  / sum by (node) (hami_gpu_memory_limit_bytes{device_type="<device-type>"})
```

查看已分配显存最多的 Pod（PromQL）：

```promql
topk(10, sum by (namespace, pod) (hami_vgpu_memory_allocated_bytes))
```

查看 Pod 已占用但未使用的显存（PromQL，仅限 NVIDIA 节点）：

```promql
topk(10,
  sum by (namespace, pod) (hami_vgpu_memory_allocated_bytes)
    - sum by (namespace, pod) (hami_vgpu_memory_used_bytes)
)
```

#### 缓解措施

- 增加该设备类型的节点，或对可以恢复使用的节点执行 uncordon。
- 请相关团队删除空闲 Pod，或以更低的显存请求重新创建。
- 通过 [ResourceQuota](../nvidia-device/using-resourcequota.md) 在命名空间之间共享该设备类型。

### HAMiDeviceCoreAllocationHigh

#### 含义

某一设备类型超过 95% 的核心已分配，并持续了 15 分钟。分配量统计的是 Pod 申请的资源，而不是实际用量，因此某一设备类型可能已 100% 分配，而其设备却处于空闲状态。

#### 影响

申请该设备类型的新 Pod 可能一直处于 `Pending` 状态。

#### 诊断

按节点查看告警中 `device_type` 的核心分配情况（PromQL）：

```promql
sum by (node) (hami_gpu_core_allocated_ratio{device_type="<device-type>"})
  / sum by (node) (hami_gpu_core_limit_ratio{device_type="<device-type>"})
```

查看已分配核心最多的 Pod（PromQL）：

```promql
topk(10, sum by (namespace, pod) (hami_vgpu_core_allocated_ratio))
```

#### 缓解措施

- 增加该设备类型的节点，或对可以恢复使用的节点执行 uncordon。
- 请相关团队删除空闲 Pod，或以更低的核心请求重新创建。
- 通过 [ResourceQuota](../nvidia-device/using-resourcequota.md) 在命名空间之间共享该设备类型。

### HAMiQuotaAlmostFull

#### 含义

命名空间对某个扩展 ResourceQuota 的使用率高于 90% 且低于 100%，并持续了 15 分钟。

#### 影响

下一个超出配额的 Pod 在创建时会被拒绝。

#### 诊断

查看指定命名空间中每个 Pod 的显存和核心用量（PromQL）：

```promql
sum by (pod) (hami_vgpu_memory_allocated_bytes{namespace="<namespace>"})
```

```promql
sum by (pod) (hami_vgpu_core_allocated_ratio{namespace="<namespace>"})
```

查看配额上限：

```bash
kubectl get resourcequota -n <namespace> -o yaml
```

#### 缓解措施

如果团队需要更多资源，请调大 `limits.*` 的值。否则，请团队删除空闲 Pod，或以更低的请求重新创建。参见 [ResourceQuota](../nvidia-device/using-resourcequota.md)。

### HAMiQuotaFullyUsed

#### 含义

命名空间已用满某个扩展 ResourceQuota 的 100%，并持续了 15 分钟。

#### 影响

该命名空间中申请此资源的新 Pod 在创建时会被拒绝。

#### 诊断

查看指定命名空间中每个 Pod 的显存和核心用量（PromQL）：

```promql
sum by (pod) (hami_vgpu_memory_allocated_bytes{namespace="<namespace>"})
```

```promql
sum by (pod) (hami_vgpu_core_allocated_ratio{namespace="<namespace>"})
```

查看配额上限：

```bash
kubectl get resourcequota -n <namespace> -o yaml
```

#### 缓解措施

如果团队需要更多资源，请调大 `limits.*` 的值。否则，请团队删除空闲 Pod，或以更低的请求重新创建。参见 [ResourceQuota](../nvidia-device/using-resourcequota.md)。

### HAMiQuotaExceeded

#### 含义

命名空间对某个扩展 ResourceQuota 的使用率高于 100%，并持续了 15 分钟。

#### 影响

该命名空间中申请此资源的新 Pod 在创建时会被拒绝。

#### 诊断

这通常发生在命名空间中有 Pod 运行时创建或调低配额的情况下。

查看过去 24 小时内上限变化的次数（PromQL）：

```promql
changes(hami_resource_quota_limit{namespace="<namespace>", quota_name="<quota-name>"}[24h])
```

#### 缓解措施

如果配额是有意调低的，请删除 Pod 或等待其运行结束。如果上限过低，请调大上限。

### HAMiSchedulerDown

#### 含义

连续 15 分钟没有 HAMi 调度器成为 leader。

#### 影响

HAMi 无法调度申请设备的新 Pod。

#### 诊断

检查 HAMi 调度器 Pod 的状态：

- 如果没有 HAMi 调度器 Pod 处于 `Running` 状态，说明调度器已崩溃或无法启动。请检查 Pod 事件和日志。
- 如果 HAMi 调度器 Pod 处于 `Running` 状态，但其 `vgpu-scheduler-extender` 容器反复输出 `Scheduler extender has not become leader yet`，说明没有 Pod 成为 leader。请检查 `kube-scheduler` 容器的日志。

#### 缓解措施

修复 Pod 事件或日志中发现的错误。如果 `kube-scheduler` 日志中出现 `forbidden` 错误，请为 HAMi 调度器的 ServiceAccount 授予缺失的权限。参见 [ACK](../../installation/ack-installation.md#grant-dra-access)。

### HAMiNodeDevicesNotRegistered

#### 含义

节点上的 vGPU monitor 运行正常，但调度器已连续 15 分钟没有该节点的设备。通常是同一 Pod 中的 `device-plugin` 容器发生了故障。

#### 影响

HAMi 不会将申请设备的新 Pod 调度到该节点。

#### 诊断

- 检查该节点上 device plugin Pod 中的 `device-plugin` 容器。如果容器崩溃，请查看其日志中的错误。
- 检查该节点的可分配设备。为空或为 `0` 表示 device plugin 未向 kubelet 注册。

#### 缓解措施

修复 device plugin 日志中的错误。
