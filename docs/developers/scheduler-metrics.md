---
id: scheduler-metrics
title: Scheduler Metrics
sidebar_label: Scheduler Metrics
---

HAMi exposes scheduler metrics on the configured scheduler metrics endpoint.

## Allocation outcomes

The allocation outcome metrics use only bounded label values:

| Metric | Meaning |
| --- | --- |
| `hami_scheduler_allocations_total` | Successful allocation steps. |
| `hami_scheduler_allocation_failures_total` | Failed allocation steps. |
| `hami_scheduler_bind_rollbacks_total` | Bind failures that release a reservation. |
| `hami_scheduler_allocation_duration_seconds` | Seconds from bind until the device plugin reports a successful allocation. Only the leader records it. |

The counters have the labels `phase`, `device_type`, and `failure_reason`. The histogram has only `device_type`, with buckets from 1 to 300 seconds (the default node lock timeout). The labels never contain pod, namespace, node, UUID, or request identifiers.

`phase` is the step the outcome belongs to:

| Value | Meaning |
| --- | --- |
| `filter` | The scheduler picks a node and reserves devices. |
| `bind` | The scheduler binds the pod to the node. |
| `allocate` | The device plugin allocates the reserved devices. The leader counts the result when the pod's `hami.io/bind-phase` annotation leaves `allocating`. |
| `refit` | The scheduler moves a container's allocation onto a GPU that kubelet allows. See [NUMA alignment](../userguide/nvidia-device/numa-alignment.md). |

`failure_reason` uses this complete, fixed set:

| Value | Meaning |
| --- | --- |
| `none` | The operation succeeded. |
| `no_fit` | No candidate node or device could satisfy the request. |
| `lookup` | A required pod, node, or allocation could not be found. |
| `identity` | The request did not match the current pod, container, or node. |
| `lock` | Device reservation locking failed. |
| `annotation_patch` | A required pod annotation update failed. |
| `conflict` | The pod changed during a refit, so the refit's annotation update was rejected. |
| `bind` | Another bind operation failed. |
| `device_plugin` | The device plugin reported a failed allocation. |
| `internal` | Internal decoding, usage, scoring, discovery, or cleanup failed. |

Successes use `failure_reason="none"`. A bind failure that releases its reservation increments both the failure and the rollback counter.

## Scheduler state

| Metric | Meaning |
| --- | --- |
| `hami_scheduler_is_leader` | `1` if this replica is the leader, `0` otherwise. |
| `hami_scheduler_cache_synced` | `1` once this replica has synced its node and device cache, `0` on followers. It stays `1` after later failed syncs, so use the next metric to check that the cache is fresh. |
| `hami_scheduler_last_sync_success_timestamp_seconds` | Unix time of the last successful cache sync. Only the leader exports it, after its first successful sync. `time() - hami_scheduler_last_sync_success_timestamp_seconds` is the cache age. |
