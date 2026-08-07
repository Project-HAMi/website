---
title: Querying and joining metrics
sidebar_label: PromQL recipes
---

HAMi exposes two complementary metrics endpoints: the scheduler's [cluster device allocation](device-allocation) endpoint reports what has been _allocated_, and the [real-time device usage](real-time-device-usage) endpoint reports what is actually being _used_. This page shows how to correlate the two views and lists a few ready-to-use PromQL queries.

## Correlating the allocation and usage views

Both endpoints label their per-device series with `device_uuid` (unique per physical GPU) and `zone`, so you can relate a device's allocation to its live usage in PromQL.

The host usage metrics carry no `node` label — they are reported per device — while the scheduler metrics carry both `node` and `device_uuid`. To restrict host usage to a single node's devices, filter with `and on`:

```promql
hami_host_gpu_utilization_ratio
  and on (device_uuid) hami_gpu_memory_limit_bytes{node="gpu-node-1"}
```

`and` returns the host series unchanged wherever a matching `device_uuid` exists on the right — it filters, but copies no labels. To actually attach the `node` label (for example, to group host usage by node), use a label-preserving arithmetic join instead:

```promql
hami_host_gpu_utilization_ratio
  * on (device_uuid) group_left(node)
  (hami_gpu_memory_limit_bytes * 0 + 1)
```

The right-hand `* 0 + 1` turns each scheduler series into `1`, so multiplying keeps the host value intact while `group_left(node)` carries the `node` label across.

## Useful queries

GPU memory allocated versus capacity per node, as a percentage:

```promql
100 * sum by (node) (hami_gpu_memory_allocated_bytes)
    / sum by (node) (hami_gpu_memory_limit_bytes)
```

Containers using more than 80% of their vGPU memory limit:

```promql
100 * hami_vgpu_memory_used_bytes / (hami_vgpu_memory_limit_bytes > 0) > 80
```

Number of GPUs currently shared by more than one container:

```promql
count(hami_gpu_shared_count > 1)
```

:::note

Ratio metrics (names ending in `_ratio`) are reported on a 0-100 (percent) scale, not the 0-1 scale some Prometheus conventions use. Keep that in mind when writing thresholds.

:::
