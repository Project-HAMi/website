---
title: SLIs and SLOs
---

HAMi provides reference Prometheus recording rules for service level indicators (SLIs), which cover only what HAMi controls and use only HAMi metrics. HAMi does not install the rules or set service level objectives (SLOs). Choose the SLOs for the cluster after watching the SLIs.

:::info Recording rules

- When using Prometheus Operator: [Download hami-slis.yaml](pathname:///prometheus/hami-slis.yaml)
- When not using Prometheus Operator: [Download hami-slis.rules.yaml](pathname:///prometheus/hami-slis.rules.yaml)

:::

## Compatibility

| Component | Requirement |
| --- | --- |
| HAMi | v2.12.0 or later |
| Prometheus | Scrapes the scheduler and vGPU monitor metrics endpoints, and the remote GPU monitor endpoint when remote GPUs are used (see [Monitor remote GPU workloads](../nvidia-device/remote-gpu.md#monitor-remote-gpu-workloads)) |

## SLIs

Each SLI is the proportion of good events out of all events. The SLIs cover three parts of HAMi: the scheduler state, device allocation, and the devices.

| SLI | Definition | Series |
| --- | --- | --- |
| [Availability](#availability) | The proportion of time when a scheduler leader has synced its node/device cache | `hami_scheduler_state:availability7d` |
| [Freshness](#freshness) | The proportion of time when the node/device cache of the scheduler leader is fresh (synced less than 60 seconds ago by default) | `hami_scheduler_state:freshness7d` |
| [Reliability](#reliability) | The proportion of device allocation attempts that succeed | `hami_scheduler_allocation:reliability7d` |
| [Latency](#latency) | The proportion of successful device allocations that finish within 10 seconds by default | `hami_scheduler_allocation:latency7d` |
| [Correctness](#correctness) (NVIDIA only) | The proportion of vGPU containers whose Pod's GPU memory limits fit the GPU memory allocated to the Pod | `hami_vgpu_memory_limit:correctness7d` |
| [Completeness](#completeness) (NVIDIA only) | The proportion of GPUs that both the scheduler and their GPU monitor (the vGPU monitor or the remote GPU monitor) see | `hami_gpu:completeness7d` |

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

Use `hami-slis.yaml`, which is in the Prometheus Operator format. [Tune the rules](#tune-the-rules), then apply it:

```bash
kubectl apply -n monitoring -f hami-slis.yaml
```

Verify that the Prometheus `ruleSelector` and rule namespace selector match this PrometheusRule.

### Prometheus without the Operator

Use `hami-slis.rules.yaml`, which is in the rule file format that Prometheus reads. [Tune the rules](#tune-the-rules), then add the file to `rule_files` in the Prometheus configuration:

```yaml
rule_files:
  - /etc/prometheus/rules/hami-slis.rules.yaml
```

If the scrape configs of the scheduler, the vGPU monitor, and the remote GPU monitor add their own `namespace`, `pod`, or `node` labels, set `honor_labels: true`, as the ServiceMonitors in the HAMi Helm chart do. Otherwise Prometheus renames these labels of the metrics, for example `pod` to `exported_pod`, and [Correctness](#correctness) and [Completeness](#completeness) match the wrong Pods and nodes.

[Completeness](#completeness) needs the vGPU monitor metrics while the device plugin Pod is not ready, so scrape the Pod IPs, not through the Service.

## Tune the rules

The thresholds are starting values. HAMi supports many backends, scheduling policies, and workload patterns, so one set of values does not fit every cluster.

Both `hami-slis.yaml` and `hami-slis.rules.yaml` contain two rule groups:

- `hami-slis` records values such as scheduler states and allocation counts at each rule evaluation.
- `hami-slis-7d` uses these recorded values to calculate SLIs over the last 7 days. It runs every 3 minutes.

For example, the 10-second Latency threshold is defined in this rule in `hami-slis-7d`:

```yaml
- record: hami_scheduler_allocation:latency7d
  # threshold: allocations that succeed within 10 seconds
  expr: |
    sum by (device_type) (sum_over_time(device_type_le:hami_scheduler_allocation_duration_seconds_bucket:increase1h{le=~"10(\\.0)?"}[7d]))
    /
    sum by (device_type) (sum_over_time(device_type_le:hami_scheduler_allocation_duration_seconds_bucket:increase1h{le="+Inf"}[7d]))
```

Some setups need changes to specific SLIs:

- Latency: Set the threshold in `hami_scheduler_allocation:latency7d`.
  - Use a bucket value as the threshold: 1, 2, 3, 4, 5, 6, 8, 10, 20, 30, 45, 60, 120, 180, 240, or 300 seconds. Other values match no series, and the SLI has no data.
  - Change only the number in `le=~"10(\\.0)?"`. Prometheus 2 stores this bucket as `le="10"` and Prometheus 3 as `le="10.0"`. The `(\\.0)?` part matches both.
  - `hami.io/bind-time` keeps only whole seconds, so a measured duration can be up to 1 second longer than the real one. This matters most for the 1-second and 2-second thresholds.
- Freshness: Set the threshold in `:hami_scheduler_sync_fresh:bool`. The scheduler syncs its node/device cache every 15 seconds. Keep the threshold well above that.
- Completeness: To exclude GPUs that should not count, such as devices in `filterdevices`, add `{device_uuid!~"(.+/)?(<uuid-1>|<uuid-2>)"}` to each metric in `:hami_gpus_seen_by_both:count` and `:hami_gpus_seen_by_either:count`. The `(.+/)?` part also matches remote GPUs, which the scheduler reports as `<server>/<uuid>`.
- Window: To use a window other than 7 days, change `[7d]` in the `hami-slis-7d` group, and keep the Prometheus data for at least that long.

## SLI details

### Availability

#### Definition

The proportion of time when HAMi has a scheduler leader that has synced its node/device cache and is ready to schedule Pods that request devices. Measured by `hami_scheduler_cache_synced`.

#### User stories

- As a user of HAMi, I want my Pods that request devices to be scheduled at any time.
- As a cluster administrator, I want to know how long HAMi could not schedule Pods that request devices, for example during a leader failover or an upgrade.

#### Notes

- Standby scheduler Pods are not counted, because only the leader schedules Pods.
- A new leader counts as available only after its first node/device cache sync. Until then, it cannot check which nodes can satisfy a Pod's device request.
- Time when Prometheus cannot scrape the leader counts as unavailable, because Prometheus cannot see whether a ready leader exists.

### Freshness

#### Definition

The proportion of time when the node/device cache of the scheduler leader is fresh. The cache is fresh when its last successful sync happened less than 60 seconds ago by default (see [Tune the rules](#tune-the-rules)). Measured by `hami_scheduler_last_sync_success_timestamp_seconds`.

#### User stories

- As a user of HAMi, I want the scheduler to place my Pods based on the current devices and their health, not on old device information.
- As a cluster administrator, I want to know when the scheduler stops syncing its node/device cache.

#### Notes

- Time without a scheduler leader, before the first sync of a new leader, or when Prometheus cannot scrape the leader counts as bad, because no fresh cache can be seen.

### Reliability

#### Definition

The proportion of device allocation attempts that succeed. An attempt succeeds when the device plugin allocates the devices, and can fail in the `filter`, `bind`, or `allocate` phase. Some failure reasons are not counted (see [Notes](#reliability-notes)). Measured by `hami_scheduler_allocations_total` and `hami_scheduler_allocation_failures_total`.

#### User stories

- As a user of HAMi, I want my Pods that request devices to get them, so that they do not stay `Pending` or fail because of HAMi.
- As a cluster administrator, I want to know how often HAMi fails to allocate devices for each device type.

#### Notes {#reliability-notes}

- These failures are not counted:
  - `no_fit`: No node can satisfy the device request, for example because there are not enough free devices, the devices are unhealthy or cordoned, or a quota is reached. This depends on the devices and quotas in the cluster, not on HAMi.
  - `lock`: Another device allocation on the same node is still in progress, so HAMi cannot bind the Pod there yet. kube-scheduler tries the Pod again.
  - `lookup` and `identity`: The Pod or node changed or was deleted during scheduling, so HAMi could not find it, or the bind request no longer matched it.
- Failures in the `refit` phase are not counted on their own. If a failed NUMA refit stops the allocation, it counts as an `allocate` failure. Otherwise, the allocation continues with the devices that kubelet chose.
- An allocation that times out counts as one failure, even if the device plugin finishes it later.
- The SLI is split by device type, because each device type has its own device plugin.

### Latency

#### Definition

The proportion of successful device allocations that finish within 10 seconds by default (see [Tune the rules](#tune-the-rules)). Timing starts when HAMi starts binding the Pod to a node and ends when the scheduler sees that the device plugin has allocated the devices. Measured by `hami_scheduler_allocation_duration_seconds`.

#### User stories

- As a user of HAMi, I want my Pods to get their devices soon after they are bound to a node.
- As a cluster administrator, I want to know how often devices take too long to be allocated after HAMi starts binding the Pod.

#### Notes

- Only allocations that succeed before a timeout are counted.
- The SLI is split by device type, because each device type has its own device plugin.

### Correctness (NVIDIA only) {#correctness}

#### Definition

The proportion of vGPU containers whose Pod's total GPU memory limits on each GPU do not exceed the GPU memory HAMi allocated to that Pod on that GPU. Measured by `hami_vgpu_memory_limit_bytes` and `hami_vgpu_memory_allocated_bytes`.

#### User stories

- As a user of HAMi, I want other Pods on a shared GPU to stay within the memory allocated to them, so that they cannot use the memory allocated to my Pod.
- As a cluster administrator, I want to know if the memory limits in containers exceed what HAMi allocated.

#### Notes

- Remote GPUs are not counted, because the remote GPU monitor reports their memory limits from the HAMi allocation in the `hami.io/remote-gpu-devices-allocated` annotation, not from the limits applied on the Lupine server, so they can never exceed it.
- Time when Prometheus cannot scrape the scheduler leader is not counted, because the GPU memory allocated to each Pod is unknown.

### Completeness (NVIDIA only) {#completeness}

#### Definition

The proportion of GPUs that both the HAMi scheduler and their GPU monitor (the vGPU monitor or the remote GPU monitor) see. At each rule evaluation, the total includes every GPU that either one sees, on nodes where Prometheus scrapes a vGPU monitor or a remote GPU monitor. Measured by `hami_gpu_memory_limit_bytes` and `hami_remote_gpu_memory_limit_bytes` on the scheduler side, and `hami_host_gpu_memory_used_bytes` on the monitor side.

#### User stories

- As a user of HAMi, I want every GPU on the nodes to be available to my Pods, unless it is excluded on purpose.
- As a cluster administrator, I want to know when the scheduler and the GPU monitors disagree about which GPUs exist, for example after the device plugin fails.

#### Notes

- Devices in `filterdevices` are not registered with HAMi (see [Configuration](../configure.md#node-configuration)), so the scheduler does not see them. They count as bad until they are excluded from the rules. See [Tune the rules](#tune-the-rules).
- Time when Prometheus cannot scrape the scheduler leader, and GPUs on nodes where Prometheus cannot scrape the GPU monitor, are not counted, because what the scheduler or the monitor sees is unknown.
