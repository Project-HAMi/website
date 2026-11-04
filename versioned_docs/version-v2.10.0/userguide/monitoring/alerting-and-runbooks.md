---
title: Alerting and runbooks
---

HAMi provides reference Prometheus alerting rules and a runbook for each alert. HAMi does not install the rules. Tune the rules for the backends, scheduling policy, and workloads of the cluster before applying them.

:::info Alert rules

- When using Prometheus Operator: [Download hami-alerts-v2.10.0.yaml](/prometheus/hami-alerts-v2.10.0.yaml)
- When not using Prometheus Operator: [Download hami-alerts-v2.10.0.rules.yaml](/prometheus/hami-alerts-v2.10.0.rules.yaml)

:::

## Compatibility

| Component  | Requirement                                                   |
| ---------- | ------------------------------------------------------------- |
| HAMi       | v2.10.0                                                       |
| Prometheus | Scrapes both the scheduler and vGPU monitor metrics endpoints |

## Alerts

| Alert | Fires when | Severity | Backends |
| --- | --- | --- | --- |
| [`HAMiDeviceMemoryAllocationHigh`](#hamidevicememoryallocationhigh) | More than 95% of the memory of one device type stays allocated for 15 minutes | `warning` | All |
| [`HAMiDeviceCoreAllocationHigh`](#hamidevicecoreallocationhigh) | More than 95% of the cores of one device type stay allocated for 15 minutes | `warning` | All |
| [`HAMiQuotaAlmostFull`](#hamiquotaalmostfull) | A namespace stays above 90% and below 100% of an extended ResourceQuota for 15 minutes | `info` | All |
| [`HAMiQuotaFullyUsed`](#hamiquotafullyused) | A namespace stays at exactly 100% of an extended ResourceQuota for 15 minutes | `info` | All |
| [`HAMiQuotaExceeded`](#hamiquotaexceeded) | A namespace stays above 100% of an extended ResourceQuota for 15 minutes | `warning` | All |

## Add the rules

### Prometheus Operator

If Prometheus Operator is installed, enable the ServiceMonitors included in the HAMi Helm chart:

```bash
helm upgrade --install hami hami-charts/hami \
  --namespace kube-system \
  --set prometheus.enabled=true
```

In v2.10.0, these ServiceMonitors do not set `honorLabels`, so the quota alerts group all namespaces under the HAMi namespace. Set `honorLabels: true` on the endpoints of both ServiceMonitors, and repeat this after each `helm upgrade`.

Use [hami-alerts-v2.10.0.yaml](/prometheus/hami-alerts-v2.10.0.yaml), which is in the Prometheus Operator format. [Tune the rules](#tune-the-rules), then apply it:

```bash
kubectl apply -n monitoring -f hami-alerts-v2.10.0.yaml
```

### Prometheus without the Operator

Use [hami-alerts-v2.10.0.rules.yaml](/prometheus/hami-alerts-v2.10.0.rules.yaml), which is in the rule file format that Prometheus reads. [Tune the rules](#tune-the-rules), then add the file to `rule_files` in the Prometheus configuration:

```yaml
rule_files:
  - /etc/prometheus/rules/hami-alerts-v2.10.0.rules.yaml
```

In both cases, open **Alerts** in the Prometheus UI and check that the HAMi alerts (in the `hami` group) are listed.

## Tune the rules

The thresholds, durations, and severities are starting values. HAMi supports many backends, scheduling policies, and workload patterns, so one set of values does not fit every cluster.

Each rule has three settings in [hami-alerts-v2.10.0.yaml](/prometheus/hami-alerts-v2.10.0.yaml) or [hami-alerts-v2.10.0.rules.yaml](/prometheus/hami-alerts-v2.10.0.rules.yaml):

```yaml
- alert: HAMiQuotaAlmostFull
  # threshold
  expr: |
    max by (namespace, quota_name) (hami_resource_quota_used)
      / max by (namespace, quota_name) (hami_resource_quota_limit > 0)
      > 0.9 < 1
  # how long the condition must hold before the alert fires
  for: 15m
  labels:
    # how urgent the alert is
    severity: info
```

Some setups need changes to specific alerts:

- `HAMiDeviceMemoryAllocationHigh` and `HAMiDeviceCoreAllocationHigh`: If the cluster runs full on purpose, set `severity` to `info` or raise `for`. If a device type has very few devices, a few Pods that each take a whole device fill it to 100%. Exclude that `device_type` from the rule.
- `HAMiQuotaAlmostFull`, `HAMiQuotaFullyUsed`, and `HAMiQuotaExceeded`: In v2.10.0, `hami_resource_quota_limit` is not scaled by `memoryFactor`, so the memory quota alerts are wrong when `memoryFactor` is set above 1, and always on Cambricon, Iluvatar, Mthreads, and Metax, which use a fixed factor. For those setups, divide `hami_resource_quota_used` by the factor in the rule, or exclude the memory `quota_name`. Cores quotas are not affected.

## Runbooks

### HAMiDeviceMemoryAllocationHigh

#### Meaning

More than 95% of the memory of a device type has been allocated for 15 minutes. Allocation counts what Pods requested, not what they actually use, so a device type can be 100% allocated while its devices sit idle.

#### Impact

New Pods that request this device type may stay `Pending`.

#### Diagnosis

Check memory allocation per node for the `device_type` in the alert (PromQL):

```promql
sum by (node) (hami_gpu_memory_allocated_bytes{device_type="<device-type>"})
  / sum by (node) (hami_gpu_memory_limit_bytes{device_type="<device-type>"})
```

Check the Pods with the most allocated memory (PromQL):

```promql
topk(10, sum by (namespace, pod) (hami_vgpu_memory_allocated_bytes))
```

Check memory that Pods hold but do not use (PromQL, NVIDIA nodes only):

```promql
topk(10,
  sum by (namespace, pod) (hami_vgpu_memory_allocated_bytes)
    - sum by (namespace, pod) (hami_vgpu_memory_used_bytes)
)
```

#### Mitigation

- Add nodes of this device type, or uncordon nodes that are ready to return.
- Ask teams to delete idle Pods, or to recreate them with lower memory requests.
- Share the device type between namespaces with [ResourceQuota](../nvidia-device/using-resourcequota.md).

### HAMiDeviceCoreAllocationHigh

#### Meaning

More than 95% of the cores of a device type have been allocated for 15 minutes. Allocation counts what Pods requested, not what they actually use, so a device type can be 100% allocated while its devices sit idle.

#### Impact

New Pods that request this device type may stay `Pending`.

#### Diagnosis

Check cores allocation per node for the `device_type` in the alert (PromQL):

```promql
sum by (node) (hami_gpu_core_allocated_ratio{device_type="<device-type>"})
  / sum by (node) (hami_gpu_core_limit_ratio{device_type="<device-type>"})
```

Check the Pods with the most allocated cores (PromQL):

```promql
topk(10, sum by (namespace, pod) (hami_vgpu_core_allocated_ratio))
```

#### Mitigation

- Add nodes of this device type, or uncordon nodes that are ready to return.
- Ask teams to delete idle Pods, or to recreate them with lower cores requests.
- Share the device type between namespaces with [ResourceQuota](../nvidia-device/using-resourcequota.md).

### HAMiQuotaAlmostFull

#### Meaning

A namespace has used more than 90% and less than 100% of an extended ResourceQuota for 15 minutes.

#### Impact

The next Pod that does not fit the quota is rejected at creation.

#### Diagnosis

Check memory and cores usage per Pod in a specific namespace (PromQL):

```promql
sum by (pod) (hami_vgpu_memory_allocated_bytes{namespace="<namespace>"})
```

```promql
sum by (pod) (hami_vgpu_core_allocated_ratio{namespace="<namespace>"})
```

Check the limits:

```bash
kubectl get resourcequota -n <namespace> -o yaml
```

#### Mitigation

- If `memoryFactor` is above 1 (set or fixed by the backend), fix the memory quota rule. See [Tune the rules](#tune-the-rules).
- If the team needs more, raise the `limits.*` value. Otherwise, ask the team to delete idle Pods or recreate them with lower requests. See [ResourceQuota](../nvidia-device/using-resourcequota.md).

### HAMiQuotaFullyUsed

#### Meaning

A namespace has used 100% of an extended ResourceQuota for 15 minutes.

#### Impact

New Pods in the namespace that request this resource are rejected at creation.

#### Diagnosis

Check memory and cores usage per Pod in a specific namespace (PromQL):

```promql
sum by (pod) (hami_vgpu_memory_allocated_bytes{namespace="<namespace>"})
```

```promql
sum by (pod) (hami_vgpu_core_allocated_ratio{namespace="<namespace>"})
```

Check the limits:

```bash
kubectl get resourcequota -n <namespace> -o yaml
```

#### Mitigation

- If `memoryFactor` is above 1 (set or fixed by the backend), fix the memory quota rule. See [Tune the rules](#tune-the-rules).
- If the team needs more, raise the `limits.*` value. Otherwise, ask the team to delete idle Pods or recreate them with lower requests. See [ResourceQuota](../nvidia-device/using-resourcequota.md).

### HAMiQuotaExceeded

#### Meaning

A namespace has used more than 100% of an extended ResourceQuota for 15 minutes.

#### Impact

New Pods in the namespace that request this resource are rejected at creation.

#### Diagnosis

Usually this occurs when a quota is created or lowered while Pods are running in the namespace. In v2.10.0, a memory quota with `memoryFactor` above 1 also triggers a false alarm.

Check how many times the limit changed in the last 24 hours (PromQL):

```promql
changes(hami_resource_quota_limit{namespace="<namespace>", quota_name="<quota-name>"}[24h])
```

#### Mitigation

- If `memoryFactor` is above 1 (set or fixed by the backend), fix the memory quota rule. See [Tune the rules](#tune-the-rules).
- If the quota was lowered on purpose, delete Pods or wait for them to finish. If the limit is too low, raise it.
