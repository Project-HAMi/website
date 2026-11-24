---
id: scheduler-metrics
title: Scheduler Metrics
sidebar_label: Scheduler Metrics
---

HAMi exposes scheduler metrics on the configured scheduler metrics endpoint. Every metric on this page also has the label `zone="vGPU"`.

## Scheduler state

| Metric | Meaning |
| --- | --- |
| `hami_scheduler_is_leader` | Whether this scheduler instance is the leader. |
| `hami_scheduler_cache_synced` | Whether the scheduler leader instance has synced its node/device cache at least once. It stays `1` when a later sync fails. |
| `hami_scheduler_last_sync_success_timestamp_seconds` | Time of the last successful node/device cache sync by the scheduler leader instance. |

## Allocation outcomes

The allocation outcome metrics use only bounded label values:

| Metric | Meaning |
| --- | --- |
| `hami_scheduler_allocations_total` | Successful device allocation steps. |
| `hami_scheduler_allocation_failures_total` | Failed device allocation steps. |
| `hami_scheduler_bind_rollbacks_total` | Bind failures that release the node locks taken for the pod. |

A bind that fails with `lookup` releases the pod's reservation without counting a rollback.

The labels are `phase`, `device_type`, and `failure_reason`. They never contain pod, namespace, node, UUID, or request identifiers. `phase` uses these values:

| Value | Meaning |
| --- | --- |
| `filter` | The scheduler reserves devices for the pod on a node. |
| `bind` | The scheduler binds the pod to the node. |
| `allocate` | The device plugin allocates the devices. |
| `refit` | The NVIDIA device plugin asks the scheduler to move an allocation to the devices allowed by the Topology Manager. |

`failure_reason` uses this complete, fixed set:

| Value | Meaning |
| --- | --- |
| `none` | The operation succeeded. |
| `no_fit` | No candidate node could satisfy the device request. |
| `lookup` | A required pod or node could not be read from the scheduler cache. |
| `identity` | The bind request did not match the current pod identity or target. |
| `lock` | Device reservation locking failed. |
| `annotation_patch` | A required pod annotation update failed. |
| `bind` | Another bind operation failed. |
| `internal` | Internal usage or scoring failed, or a refit could not decode or rewrite the device allocation annotations. |
| `conflict` | A refit annotation update was rejected because the pod changed after the scheduler read it. |
| `device_plugin` | The device plugin reported the allocation as failed. |
| `timeout` | The device plugin did not answer within the node lock timeout (default 5m). A later success is left out of the success count and the allocation duration, and a later failure is left out of the failure count. |

In the `refit` phase, `lookup`, `identity`, and `no_fit` cover more cases: the pod or its allocation cannot be found, the request does not match the pod, or the allowed devices or quota cannot take the refit.

## Allocation duration

| Metric | Meaning |
| --- | --- |
| `hami_scheduler_allocation_duration_seconds` | Time from bind to a successful device allocation, observed only by the scheduler leader. Its only label is `device_type`. |
