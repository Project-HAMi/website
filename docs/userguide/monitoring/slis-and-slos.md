---
title: SLIs and SLOs
---

HAMi provides reference Prometheus recording rules for service level indicators (SLIs), which cover only what HAMi controls and use only HAMi metrics. HAMi does not install the rules. To set service level objectives (SLOs), see [Set SLOs](#set-slos).

:::info Recording rules

- When using Prometheus Operator: [Download hami-slis.yaml](pathname:///prometheus/hami-slis.yaml)
- When not using Prometheus Operator: [Download hami-slis.rules.yaml](pathname:///prometheus/hami-slis.rules.yaml)

:::

## Compatibility

| Component | Requirement |
| --- | --- |
| HAMi | v2.12.0 or later |
| Prometheus | Scrapes the scheduler and vGPU monitor metrics endpoints, and the remote GPU monitor endpoint when remote GPUs are used (see [Monitor remote GPU workloads](../nvidia-device/remote-gpu.md#monitor-remote-gpu-workloads)) |

The rules assume that Prometheus stores the metrics of a single cluster.

## SLIs

Each SLI is the proportion of good events out of all events. The SLIs cover three parts of HAMi: the scheduler state, device allocation, and the devices.

| SLI                                         | Series                                    |
| ------------------------------------------- | ----------------------------------------- |
| [Availability](#availability)               | `hami_scheduler_state:availability7d`     |
| [Freshness](#freshness)                     | `hami_scheduler_state:freshness7d`        |
| [Reliability](#reliability)                 | `hami_scheduler_allocation:reliability7d` |
| [Latency](#latency)                         | `hami_scheduler_allocation:latency7d`     |
| [Correctness](#correctness) (NVIDIA only)   | `hami_vgpu_memory_limit:correctness7d`    |
| [Completeness](#completeness) (NVIDIA only) | `hami_gpu:completeness7d`                 |

## Add the rules

Add `hami-slis.yaml` (Prometheus Operator) or `hami-slis.rules.yaml` using the same steps as [Add the rules](alerting-and-runbooks.md#add-the-rules).

[Completeness](#completeness) needs the Pod IP scraping. See [Prometheus without the Operator](alerting-and-runbooks.md#prometheus-without-the-operator).

## Tune the rules

Both `hami-slis.yaml` and `hami-slis.rules.yaml` contain two rule groups:

- `hami-slis` records values such as scheduler states and allocation counts at each rule evaluation.
- `hami-slis-7d` uses these recorded values to calculate SLIs over the last 7 days. It runs every 3 minutes.

Some setups need changes to specific SLIs:

- Latency: Set the threshold in `hami_scheduler_allocation:latency7d`.
  - Use a bucket value as the threshold: 1, 2, 3, 4, 5, 6, 8, 10, 20, 30, 45, 60, 120, 180, 240, or 300 seconds. Other values match no series, and the SLI has no data.
  - Change only the number in `le=~"10(\\.0)?"`. Prometheus 2 stores this bucket as `le="10"` and Prometheus 3 as `le="10.0"`. The `(\\.0)?` part matches both.
  - `hami.io/bind-time` keeps only whole seconds, so a measured duration can be up to 1 second longer than the real one. This matters most for the 1-second and 2-second thresholds.
- Freshness: Set the threshold in `:hami_scheduler_sync_fresh:bool`. The scheduler syncs its node/device cache every 15 seconds. Keep the threshold well above that.
- Completeness: To exclude GPUs that should not count, such as devices in `filterdevices`, add the matcher `device_uuid!~"(.+/)?(<uuid-1>|<uuid-2>)"` to each metric in `:hami_gpus_seen_by_both:count` and `:hami_gpus_seen_by_either:count`. For example, change `hami_gpu_memory_limit_bytes{device_type=~"NVIDIA.*"}` to `hami_gpu_memory_limit_bytes{device_type=~"NVIDIA.*", device_uuid!~"…"}`. The `(.+/)?` part also matches remote GPUs, which the scheduler reports as `<server>/<uuid>`.
- Window: To use a window other than 7 days, change `[7d]` in the `hami-slis-7d` group, and keep the Prometheus data for at least that long.

## Set SLOs

An SLO is a target for an SLI over its window, for example, "Availability is at least 99.5% over 7 days". HAMi does not ship targets because the right values depend on the cluster.

Before setting SLOs, set up scraping (see [Add the rules](#add-the-rules)) and the Completeness exclusions in [Tune the rules](#tune-the-rules). Otherwise, scrape gaps and filtered devices can affect the SLIs.

To choose SLO targets:

- Watch the SLIs for at least four 7-day windows. Keep at least 28 days of data. Use the lowest value seen during normal operation, rounded down, as the first target. Do not use 100%.
- Set Reliability and Latency targets for each device type. If a device type has few allocations, one failed allocation can significantly affect Reliability, and one slow allocation can significantly affect Latency. Consider a longer window (see **Window** in [Tune the rules](#tune-the-rules)) or a lower target.
- Review the targets every month at first, then every quarter.

An SLO target also defines an error budget. For example:

- **99.5% Availability over 7 days** allows about 50 minutes without a synced scheduler leader.
- **99% Reliability with 1,000 allocation attempts per week** allows 10 counted failures.

To see how much Availability error budget is left:

```promql
# 1: budget unused, 0: budget used up, below 0: SLO missed
1 - (1 - hami_scheduler_state:availability7d) / (1 - 0.995)
```

## SLI details

### Availability

#### Definition

The proportion of time when HAMi has a scheduler leader that has synced its node/device cache and is ready to schedule Pods that request devices. Measured by `hami_scheduler_cache_synced`.

#### Notes

- Standby scheduler Pods are not counted, because only the leader schedules Pods.
- A new leader counts as available only after its first node/device cache sync. Until then, it cannot check which nodes can satisfy a Pod's device request.
- Time when Prometheus cannot scrape the leader counts as unavailable, because Prometheus cannot see whether a ready leader exists.

### Freshness

#### Definition

The proportion of time when the node/device cache of the scheduler leader is fresh. The cache is fresh when its last successful sync happened less than 60 seconds ago by default (see [Tune the rules](#tune-the-rules)). Measured by `hami_scheduler_last_sync_success_timestamp_seconds`.

#### Notes

- Time without a scheduler leader, before the first sync of a new leader, or when Prometheus cannot scrape the leader counts as bad. In these cases, no fresh cache can be seen.

### Reliability

#### Definition

The proportion of device allocation attempts that succeed. An attempt succeeds when the device plugin allocates the devices, and can fail in the `filter`, `bind`, or `allocate` phase. Some failure reasons are not counted (see [Notes](#reliability-notes)). Measured by `hami_scheduler_allocations_total` and `hami_scheduler_allocation_failures_total`.

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

#### Notes

- Only allocations that succeed before a timeout are counted.

### Correctness (NVIDIA only) {#correctness}

#### Definition

The proportion of container GPU memory limits (one for each container on each GPU) that are good. A limit is good when the Pod's total limits on that GPU do not exceed the GPU memory HAMi allocated to the Pod on that GPU. Measured by `hami_vgpu_memory_limit_bytes` and `hami_vgpu_memory_allocated_bytes`.

#### Notes

- Remote GPUs are not counted. The remote GPU monitor reports their memory limits from the HAMi allocation in the `hami.io/remote-gpu-devices-allocated` annotation, so they can never exceed it. The monitor does not report the limits applied on the Lupine server.
- MIG containers are not counted, because the vGPU monitor reports them with their MIG UUID, which never matches the GPU UUID of the allocation.
- After a Pod's init containers finish, the limits on the GPUs they used count as bad. The vGPU monitor still reports the init containers' limits, but HAMi reduces the Pod's allocation.
- Time when Prometheus cannot scrape the scheduler leader is not counted, because the GPU memory allocated to each Pod is unknown.

### Completeness (NVIDIA only) {#completeness}

#### Definition

The proportion of GPUs that both the HAMi scheduler and their GPU monitor (the vGPU monitor or the remote GPU monitor) see. At each rule evaluation, the total includes every GPU that either one sees, on nodes where Prometheus scrapes a vGPU monitor or a remote GPU monitor. Measured by `hami_gpu_memory_limit_bytes` and `hami_remote_gpu_memory_limit_bytes` on the scheduler side, and `hami_host_gpu_memory_used_bytes` on the monitor side.

#### Notes

- Devices in `filterdevices` are not registered with HAMi (see [Configuration](../configure.md#node-configuration)), so the scheduler does not see them. They count as bad until they are excluded from the rules. See [Tune the rules](#tune-the-rules).
- Time without a synced scheduler leader or when Prometheus cannot scrape the leader is not counted, because what the scheduler sees is unknown. GPUs on nodes where Prometheus cannot scrape the GPU monitor are not counted, because what the monitor sees is unknown.
