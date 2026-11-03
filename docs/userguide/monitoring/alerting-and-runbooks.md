---
title: Alerting and runbooks
---

HAMi provides reference Prometheus alerting rules and a runbook for each alert. HAMi does not install the rules. Tune the rules for the backends, scheduling policy, and workloads of the cluster before applying them.

:::info Alert rules

[Download hami-alerts.yaml](/prometheus/hami-alerts.yaml)

:::

## Compatibility

| Component  | Requirement                                                   |
| ---------- | ------------------------------------------------------------- |
| HAMi       | Charts built from master                                      |
| Prometheus | Scrapes both the scheduler and vGPU monitor metrics endpoints |

## Alerts

| Alert | Fires when | Severity | Backends |
| --- | --- | --- | --- |
| [`HAMiDeviceAllocationHigh`](#hamideviceallocationhigh) | More than 95% of the memory or cores of one device type stays allocated for 15 minutes | `warning` | All |
| [`HAMiQuotaAlmostFull`](#hamiquotaalmostfull) | A namespace stays above 90% and below 100% of a HAMi quota for 15 minutes | `info` | All |
| [`HAMiQuotaFullyUsed`](#hamiquotafullyused) | A namespace stays at exactly 100% of a HAMi quota for 15 minutes | `info` | All |
| [`HAMiQuotaExceeded`](#hamiquotaexceeded) | A namespace stays above 100% of a HAMi quota for 15 minutes | `warning` | All |
| [`HAMiSchedulerDown`](#hamischedulerdown) | No scraped scheduler reports itself as the leader for 15 minutes | `critical` | All |
| [`HAMiVGPUMonitorCollectFailing`](#hamivgpumonitorcollectfailing) | A vGPU monitor keeps failing metrics collection for 15 minutes | `warning` | NVIDIA |
| [`HAMiNodeDevicesNotRegistered`](#haminodedevicesnotregistered) | A vGPU monitor is healthy on a node, but the scheduler has no devices for that node for 15 minutes | `warning` | NVIDIA |

## Add the rules

### Prometheus Operator

If Prometheus Operator is installed, enable the ServiceMonitors included in the HAMi Helm chart:

```bash
helm upgrade --install hami hami-charts/hami \
  --namespace kube-system \
  --set prometheus.enabled=true
```

Use [hami-alerts.yaml](/prometheus/hami-alerts.yaml), which is in the Prometheus Operator format. [Tune the rules](#tune-the-rules), then apply it:

```bash
kubectl apply -n monitoring -f hami-alerts.yaml
```

### Prometheus without the Operator

Use [hami-alerts.rules.yaml](/prometheus/hami-alerts.rules.yaml), which is in the rule file format that Prometheus reads. [Tune the rules](#tune-the-rules), then add the file to `rule_files` in the Prometheus configuration:

```yaml
rule_files:
  - /etc/prometheus/rules/hami-alerts.rules.yaml
```

In both cases, open **Alerts** in the Prometheus UI and check that the HAMi alerts (in the `hami` group) are listed.

## Tune the rules

The thresholds, durations, and severities are starting values. HAMi supports many backends, scheduling policies, and workload patterns, so one set of values does not fit every cluster.

Each rule has three settings in [hami-alerts.yaml](/prometheus/hami-alerts.yaml) or [hami-alerts.rules.yaml](/prometheus/hami-alerts.rules.yaml):

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

- `HAMiDeviceAllocationHigh`: If the cluster runs full on purpose, set `severity` to `info` or raise `for`. If a device type has very few devices, a few Pods that each take a whole device fill it to 100%. Exclude that `device_type` from the rule.
- `HAMiSchedulerDown`: To alert sooner, lower `for`. Keep it longer than a leader failover.
- `HAMiVGPUMonitorCollectFailing`: If intermittent failures are missed, use a longer range than `5m` in the rule. If occasional failures fire the alert, use a shorter one.
- `HAMiNodeDevicesNotRegistered`: For a remote node, exclude it in the rule, for example `hami_vgpumonitor_collect_success{node!="<node-name>"} == 1`.

## Runbooks

The examples assume that HAMi is installed in `kube-system`.

### HAMiDeviceAllocationHigh

#### Meaning

More than 95% of the memory or cores of a device type has been allocated for 15 minutes. Allocation counts what Pods requested, not what they actually use, so a device type can be 100% allocated while its devices sit idle.

#### Impact

New Pods that request this device type may stay `Pending`.

#### Diagnosis

Check memory allocation per node for the `device_type` in the alert (with label `resource="memory"`):

```promql
sum by (node) (hami_gpu_memory_allocated_bytes{device_type="<device-type>"})
  / sum by (node) (hami_gpu_memory_limit_bytes{device_type="<device-type>"})
```

For a cores allocation alert (with label `resource="cores"`), use `hami_gpu_core_allocated_ratio` and `hami_gpu_core_limit_ratio` instead.

Check the Pods with the most allocated memory:

```promql
topk(10, sum by (namespace, pod) (hami_vgpu_memory_allocated_bytes))
```

Check memory that Pods hold but do not use (NVIDIA nodes only):

```promql
topk(10,
  sum by (namespace, pod) (hami_vgpu_memory_allocated_bytes)
    - sum by (namespace, pod) (hami_vgpu_memory_used_bytes)
)
```

#### Mitigation

- Add nodes of this device type, or uncordon nodes that are ready to return.
- Ask teams to delete idle Pods, or to recreate them with lower memory and cores requests.
- Share the device type between namespaces with [ResourceQuota](../nvidia-device/using-resourcequota.md).

### HAMiQuotaAlmostFull

#### Meaning

A namespace has used more than 90% and less than 100% of a HAMi quota for 15 minutes.

#### Impact

The next Pod that does not fit the quota is rejected at creation.

#### Diagnosis

Check memory and cores usage per Pod in a specific namespace:

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

A namespace has used 100% of a HAMi quota for 15 minutes.

#### Impact

New Pods in the namespace that request this resource are rejected at creation.

#### Diagnosis

Check memory and cores usage per Pod in a specific namespace:

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

A namespace has used more than 100% of a HAMi quota for 15 minutes.

#### Impact

New Pods in the namespace that request this resource are rejected.

#### Diagnosis

Usually this occurs when a quota is created or lowered while Pods are running in the namespace.

Check if the limit changed recently:

```promql
changes(hami_resource_quota_limit{namespace="<namespace>", quota_name="<quota-name>"}[24h])
```

#### Mitigation

If the quota was lowered on purpose, delete Pods or wait for them to finish. If the limit is too low, raise it.

### HAMiSchedulerDown

#### Meaning

No HAMi scheduler has been the leader for 15 minutes.

#### Impact

HAMi cannot schedule new Pods that request devices.

#### Diagnosis

Check the `hami_scheduler_is_leader` metric on each scheduler Pod:

- No Pod is `Running`: the scheduler cannot start.
- The metric is `0` on every Pod: no Pod is the leader.

Check the logs of both scheduler containers for the error.

#### Mitigation

- Fix the error in the logs, or delete a stuck Pod.
- If the metric is `0` on every Pod, check that the `kube-scheduler` container can reach the API server.
- For failover, set `scheduler.replicas` to `2` with `scheduler.leaderElect: true` in the Helm values.

### HAMiVGPUMonitorCollectFailing

#### Meaning

The vGPU monitor on a node has kept failing to collect metrics for 15 minutes.

#### Impact

Usage metrics for the node are incomplete. Dashboards can show gaps.

#### Diagnosis

Check the logs of the `vgpu-monitor` container in the device plugin Pod on the node:

- `Failed to collect GPU info`: NVML init or the device count call failed. Run `nvidia-smi` in the container to check the driver.
- `Failed to collect Pod and Container info`: the monitor cannot create a metric for a container, which likely means a HAMi bug. A separate log line names the container.
- `Failed to collect Pod and Container Mig info`: a Pod has a malformed MIG allocation annotation, likely edited by hand or written by a different HAMi version. A separate log line names the Pod.

#### Mitigation

- Fix the driver or NVML problem.

### HAMiNodeDevicesNotRegistered

#### Meaning

The vGPU monitor on a node is healthy, but the scheduler has had no devices for that node for 15 minutes. Usually the `device-plugin` container in the same Pod has failed.

#### Impact

HAMi places no new Pods that request devices on the node. Pods can stay Pending when other nodes are full.

#### Diagnosis

- Check the allocatable devices of the node. Empty or `0` means the device plugin is not registered with kubelet. The scheduler can log `Device is unhealthy, cleaning up node` in this case.
- Check the `hami.io/node-nvidia-register` annotation of the node. Empty means the device plugin has not reported its devices. Check the logs of the `device-plugin` container.
- Check the node labels. If `scheduler.nodeLabelSelector` is set, the scheduler ignores nodes that do not have all of those labels.
- A node with the `hami.io/lupine-server` label serves its devices over the network, so the scheduler has no local devices for it. The alert fires by design. See [Tune the rules](#tune-the-rules).

#### Mitigation

- Fix the error in the device plugin logs.
- Add missing selector labels to the node, or fix `scheduler.nodeLabelSelector`.
