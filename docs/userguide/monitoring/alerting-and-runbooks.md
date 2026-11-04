---
title: Alerting and runbooks
---

HAMi provides reference Prometheus alerting rules and a runbook for each alert. HAMi does not install the rules. Tune the rules for the backends, scheduling policy, and workloads of the cluster before applying them.

:::info Alert rules

- When using Prometheus Operator: [Download hami-alerts.yaml](pathname:///prometheus/hami-alerts.yaml)
- When not using Prometheus Operator: [Download hami-alerts.rules.yaml](pathname:///prometheus/hami-alerts.rules.yaml)

:::

## Compatibility

| Component  | Requirement                                                   |
| ---------- | ------------------------------------------------------------- |
| HAMi       | v2.11.0 or later                                              |
| Prometheus | Scrapes both the scheduler and vGPU monitor metrics endpoints |

## Alerts

| Alert | Fires when | Severity |
| --- | --- | --- |
| [`HAMiDeviceMemoryAllocationHigh`](#hamidevicememoryallocationhigh) | More than 95% of the memory of one device type stays allocated for 15 minutes | `warning` |
| [`HAMiDeviceCoreAllocationHigh`](#hamidevicecoreallocationhigh) | More than 95% of the cores of one device type stay allocated for 15 minutes | `warning` |
| [`HAMiQuotaAlmostFull`](#hamiquotaalmostfull) | A namespace stays above 90% and below 100% of an extended ResourceQuota for 15 minutes | `info` |
| [`HAMiQuotaFullyUsed`](#hamiquotafullyused) | A namespace stays at exactly 100% of an extended ResourceQuota for 15 minutes | `info` |
| [`HAMiQuotaExceeded`](#hamiquotaexceeded) | A namespace stays above 100% of an extended ResourceQuota for 15 minutes | `warning` |
| [`HAMiSchedulerDown`](#hamischedulerdown) | Prometheus has not seen a HAMi scheduler report itself as the leader for 15 minutes | `critical` |
| [`HAMiNodeDevicesNotRegistered`](#haminodedevicesnotregistered) | A vGPU monitor is healthy on a node, but the scheduler has no devices for that node for 15 minutes | `warning` |

## Add the rules

### Prometheus Operator

If Prometheus Operator is installed, enable the ServiceMonitors included in the HAMi Helm chart:

```bash
helm upgrade --install hami hami-charts/hami \
  --namespace kube-system \
  --values my-values.yaml \
  --set prometheus.enabled=true
```

`my-values.yaml` holds the custom Helm chart values of the current installation, so that future upgrades keep them.

Use `hami-alerts.yaml`, which is in the Prometheus Operator format. [Tune the rules](#tune-the-rules), then apply it:

```bash
kubectl apply -n monitoring -f hami-alerts.yaml
```

Verify that the Prometheus `ruleSelector` and rule namespace selector match this PrometheusRule.

### Prometheus without the Operator

Use `hami-alerts.rules.yaml`, which is in the rule file format that Prometheus reads. [Tune the rules](#tune-the-rules), then add the file to `rule_files` in the Prometheus configuration:

```yaml
rule_files:
  - /etc/prometheus/rules/hami-alerts.rules.yaml
```

[`HAMiNodeDevicesNotRegistered`](#haminodedevicesnotregistered) needs the vGPU monitor metrics while the device plugin Pod is not ready, so scrape the Pod IPs, not through the Service.

In both cases, open **Alerts** in the Prometheus UI and check that the HAMi alerts (in the `hami` group) are listed.

## Tune the rules

The thresholds, durations, and severities are starting values. HAMi supports many backends, scheduling policies, and workload patterns, so one set of values does not fit every cluster.

Each rule has three settings in `hami-alerts.yaml` or `hami-alerts.rules.yaml`:

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
- `HAMiSchedulerDown`: To alert sooner, lower `for`. Keep it longer than a leader failover.

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
    - (sum by (namespace, pod) (hami_vgpu_memory_used_bytes)
       or 0 * sum by (namespace, pod) (hami_vgpu_memory_allocated_bytes))
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

Check core allocation per node for the `device_type` in the alert (PromQL):

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
- Ask teams to delete idle Pods, or to recreate them with lower core requests.
- Share the device type between namespaces with [ResourceQuota](../nvidia-device/using-resourcequota.md).

### HAMiQuotaAlmostFull

#### Meaning

A namespace has used more than 90% and less than 100% of an extended ResourceQuota for 15 minutes.

#### Impact

The next Pod that does not fit the quota is rejected at creation, or stays `Pending` if it requests a whole device or a percentage of device memory.

#### Diagnosis

Check memory and core allocation per Pod in a specific namespace (PromQL):

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

If the team needs more, raise the `limits.*` value. Otherwise, ask the team to delete idle Pods or recreate them with lower requests. See [ResourceQuota](../nvidia-device/using-resourcequota.md).

### HAMiQuotaFullyUsed

#### Meaning

A namespace has used 100% of an extended ResourceQuota for 15 minutes.

#### Impact

New Pods in the namespace that request this resource are rejected at creation, or stay `Pending` if they request a whole device or a percentage of device memory.

#### Diagnosis

Check memory and core allocation per Pod in a specific namespace (PromQL):

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

If the team needs more, raise the `limits.*` value. Otherwise, ask the team to delete idle Pods or recreate them with lower requests. See [ResourceQuota](../nvidia-device/using-resourcequota.md).

### HAMiQuotaExceeded

#### Meaning

A namespace has used more than 100% of an extended ResourceQuota for 15 minutes.

#### Impact

New Pods in the namespace that request this resource are rejected at creation, or stay `Pending` if they request a whole device or a percentage of device memory.

#### Diagnosis

Usually this occurs when a quota is created or lowered while Pods are running in the namespace.

Check how many times the limit changed in the last 24 hours (PromQL):

```promql
changes(hami_resource_quota_limit{namespace="<namespace>", quota_name="<quota-name>"}[24h])
```

#### Mitigation

If the quota was lowered on purpose, delete Pods or wait for them to finish. If the limit is too low, raise it.

### HAMiSchedulerDown

#### Meaning

Prometheus has not seen a HAMi scheduler report itself as the leader for 15 minutes. Either no scheduler is the leader, or Prometheus cannot scrape the scheduler.

#### Impact

If no scheduler is the leader, HAMi cannot schedule new Pods that request devices.

#### Diagnosis

Check the status of the HAMi scheduler Pods:

- If no HAMi scheduler Pod is `Running`, the scheduler has crashed or cannot start. Check the Pod events and logs.
- If the `vgpu-scheduler-extender` container of every running HAMi scheduler Pod keeps logging `Scheduler extender has not become leader yet`, no Pod is the leader. Check the logs of the `kube-scheduler` container.

#### Mitigation

Fix the error found in the Pod events or logs. For a `forbidden` error in the `kube-scheduler` logs, grant the missing permissions to the HAMi scheduler ServiceAccount. See [ACK](../../installation/ack-installation.md#grant-dra-access).

### HAMiNodeDevicesNotRegistered

#### Meaning

The vGPU monitor on a node is healthy, but the scheduler has had no devices for that node for 15 minutes. Usually the `device-plugin` container in the same Pod has failed. This alert covers NVIDIA nodes only, because the vGPU monitor runs only in the NVIDIA device plugin Pod.

#### Impact

HAMi places no new Pods that request devices on the node.

#### Diagnosis

- Check the `device-plugin` container in the device plugin Pod on the node. If it is crashing, check its logs for the error.
- Check the allocatable devices of the node. Empty or `0` means the device plugin is not registered with kubelet.

#### Mitigation

Fix the error in the device plugin logs.
