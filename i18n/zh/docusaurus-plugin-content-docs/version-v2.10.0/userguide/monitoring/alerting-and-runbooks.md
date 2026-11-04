---
title: 告警与运行手册
sidebar_label: 告警与运行手册
translated: true
---

HAMi 提供 Prometheus 告警规则参考示例，并为每条告警提供运行手册。HAMi 不会安装这些规则。应用前，请根据集群的后端、调度策略和工作负载调整规则。

:::info 告警规则

- 使用 Prometheus Operator 时：[下载 hami-alerts-v2.10.0.yaml](pathname:///prometheus/hami-alerts-v2.10.0.yaml)
- 不使用 Prometheus Operator 时：[下载 hami-alerts-v2.10.0.rules.yaml](pathname:///prometheus/hami-alerts-v2.10.0.rules.yaml)

:::

## 兼容性

| 组件 | 要求 |
| --- | --- |
| HAMi | v2.10.0 |
| Prometheus | 同时采集 scheduler 和 vGPU monitor 指标端点 |

## 告警列表

| 告警 | 触发条件 | 严重级别 |
| --- | --- | --- |
| [`HAMiDeviceMemoryAllocationHigh`](#hamidevicememoryallocationhigh) | 某一设备类型超过 95% 的显存处于已分配状态，持续 15 分钟 | `warning` |
| [`HAMiDeviceCoreAllocationHigh`](#hamidevicecoreallocationhigh) | 某一设备类型超过 95% 的核心处于已分配状态，持续 15 分钟 | `warning` |
| [`HAMiQuotaAlmostFull`](#hamiquotaalmostfull) | 命名空间对某个扩展 ResourceQuota 的使用率高于 90% 且低于 100%，持续 15 分钟 | `info` |
| [`HAMiQuotaFullyUsed`](#hamiquotafullyused) | 命名空间对某个扩展 ResourceQuota 的使用率恰好为 100%，持续 15 分钟 | `info` |
| [`HAMiQuotaExceeded`](#hamiquotaexceeded) | 命名空间对某个扩展 ResourceQuota 的使用率高于 100%，持续 15 分钟 | `warning` |

## 添加规则

### Prometheus Operator

集群已安装 Prometheus Operator 时，启用 HAMi Helm Chart 自带的 ServiceMonitor：

```bash
helm upgrade --install hami hami-charts/hami \
  --namespace kube-system \
  --version 2.10.0 \
  --values my-values.yaml \
  --set prometheus.enabled=true
```

`my-values.yaml` 保存当前安装自定义的 Helm Chart values，以便后续升级时保留这些设置。

在 v2.10.0 中，这些 ServiceMonitor 未设置 `honorLabels`，因此配额告警会将所有命名空间都归到 HAMi 所在的命名空间下。请在两个 ServiceMonitor 的 endpoints 上设置 `honorLabels: true`，并在每次执行 `helm upgrade` 后重新设置。

使用 Prometheus Operator 格式的 `hami-alerts-v2.10.0.yaml`。先[调整规则](#tune-the-rules)，然后应用：

```bash
kubectl apply -n monitoring -f hami-alerts-v2.10.0.yaml
```

确认 Prometheus 的 `ruleSelector` 和规则 namespace selector 能够匹配该 PrometheusRule。

### 不使用 Prometheus Operator

使用 `hami-alerts-v2.10.0.rules.yaml`，该文件采用 Prometheus 可读取的规则文件格式。先[调整规则](#tune-the-rules)，然后将其添加到 Prometheus 配置的 `rule_files` 中：

```yaml
rule_files:
  - /etc/prometheus/rules/hami-alerts-v2.10.0.rules.yaml
```

无论使用哪种方式，都请在 Prometheus UI 中打开 **Alerts**，确认已列出 HAMi 告警（位于 `hami` 组中）。

## 调整规则 {#tune-the-rules}

阈值、持续时间和严重级别都只是初始值。HAMi 支持多种后端、调度策略和工作负载模式，一组取值无法适用于所有集群。

每条规则在 `hami-alerts-v2.10.0.yaml` 或 `hami-alerts-v2.10.0.rules.yaml` 中都有三项设置：

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
- `HAMiQuotaAlmostFull`、`HAMiQuotaFullyUsed` 和 `HAMiQuotaExceeded`：在 v2.10.0 中，`hami_resource_quota_limit` 未按 `memoryFactor` 缩放，因此当 `memoryFactor` 设置为大于 1 时，显存配额告警会不准确；Cambricon、Iluvatar、Mthreads 和 MetaX 使用固定系数，显存配额告警始终不准确。对于这些场景，请仅对显存对应的 `quota_name` 将 `hami_resource_quota_used` 除以该系数，或在规则中排除该 `quota_name`。核心配额不受 `memoryFactor` 影响。

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

查看告警中 `device_type` 上已分配显存最多的 Pod（PromQL）：

```promql
topk(10, sum by (namespace, pod) (
  hami_vgpu_memory_allocated_bytes
    and on (device_uuid) hami_gpu_memory_limit_bytes{device_type="<device-type>"}
))
```

查看告警中 `device_type` 上 Pod 已占用但未使用的显存（PromQL，仅限 NVIDIA 节点）：

```promql
topk(10,
  sum by (namespace, pod) (
    hami_vgpu_memory_allocated_bytes
      and on (device_uuid) hami_gpu_memory_limit_bytes{device_type="<device-type>"}
  )
    - (sum by (namespace, pod) (
         hami_vgpu_memory_used_bytes
           and on (device_uuid) hami_gpu_memory_limit_bytes{device_type="<device-type>"}
       )
       or 0 * sum by (namespace, pod) (hami_vgpu_memory_allocated_bytes))
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

查看告警中 `device_type` 上已分配核心最多的 Pod（PromQL）：

```promql
topk(10, sum by (namespace, pod) (
  hami_vgpu_core_allocated_ratio
    and on (device_uuid) hami_gpu_core_limit_ratio{device_type="<device-type>"}
))
```

#### 缓解措施

- 增加该设备类型的节点，或对可以恢复使用的节点执行 uncordon。
- 请相关团队删除空闲 Pod，或以更低的核心请求重新创建。
- 通过 [ResourceQuota](../nvidia-device/using-resourcequota.md) 在命名空间之间共享该设备类型。

### HAMiQuotaAlmostFull

#### 含义

命名空间对某个扩展 ResourceQuota 的使用率高于 90% 且低于 100%，并持续了 15 分钟。

#### 影响

下一个超出配额的 Pod 在创建时会被拒绝；如果它申请整个设备或按百分比申请显存，则会一直处于 `Pending` 状态。

#### 诊断

查看指定命名空间中每个 Pod 的显存和核心分配量（PromQL）：

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

- 如果 `memoryFactor` 大于 1（由用户设置或由后端固定），请修正显存配额规则。参见[调整规则](#tune-the-rules)。
- 如果团队需要更多资源，请调大 `limits.*` 的值。否则，请团队删除空闲 Pod，或以更低的请求重新创建。参见 [ResourceQuota](../nvidia-device/using-resourcequota.md)。

### HAMiQuotaFullyUsed

#### 含义

命名空间已用满某个扩展 ResourceQuota 的 100%，并持续了 15 分钟。

#### 影响

该命名空间中申请此资源的新 Pod 在创建时会被拒绝；如果申请整个设备或按百分比申请显存，则会一直处于 `Pending` 状态。

#### 诊断

查看指定命名空间中每个 Pod 的显存和核心分配量（PromQL）：

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

- 如果 `memoryFactor` 大于 1（由用户设置或由后端固定），请修正显存配额规则。参见[调整规则](#tune-the-rules)。
- 如果团队需要更多资源，请调大 `limits.*` 的值。否则，请团队删除空闲 Pod，或以更低的请求重新创建。参见 [ResourceQuota](../nvidia-device/using-resourcequota.md)。

### HAMiQuotaExceeded

#### 含义

命名空间对某个扩展 ResourceQuota 的使用率高于 100%，并持续了 15 分钟。

#### 影响

该命名空间中申请此资源的新 Pod 在创建时会被拒绝；如果申请整个设备或按百分比申请显存，则会一直处于 `Pending` 状态。

#### 诊断

这通常发生在命名空间中有 Pod 运行时创建或调低配额的情况下。在 v2.10.0 中，`memoryFactor` 大于 1 的显存配额也会触发误报。

查看过去 24 小时内上限变化的次数（PromQL）：

```promql
changes(hami_resource_quota_limit{namespace="<namespace>", quota_name="<quota-name>"}[24h])
```

#### 缓解措施

- 如果 `memoryFactor` 大于 1（由用户设置或由后端固定），请修正显存配额规则。参见[调整规则](#tune-the-rules)。
- 如果配额是有意调低的，请删除 Pod 或等待其运行结束。如果上限过低，请调大上限。
