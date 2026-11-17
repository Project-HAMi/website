---
id: scheduler-metrics
title: Scheduler Metrics
sidebar_label: Scheduler Metrics
---

HAMi exposes scheduler metrics on the configured scheduler metrics endpoint. The allocation outcome metrics use only bounded label values:

| Metric | Meaning |
| --- | --- |
| `hami_scheduler_allocations_total` | Successful device reservations recorded by the filter phase. |
| `hami_scheduler_allocation_failures_total` | Filter and bind allocation failures. |
| `hami_scheduler_bind_rollbacks_total` | Bind failures that release a reservation. |
| `hami_scheduler_is_leader` | `1` if this instance is the current leader, otherwise `0`. |
| `hami_scheduler_cache_synced` | `1` if the internal node/device cache is fully synced, otherwise `0`. |
| `hami_scheduler_last_sync_success_timestamp_seconds` | Unix timestamp of the last successful cache sync. Exported only by the leader, and only after the first success. |

The labels are `phase`, `device_type`, and `failure_reason`. They never contain pod, namespace, node, UUID, or request identifiers. `failure_reason` uses this complete, fixed set:

| Value              | Meaning                                                            |
| ------------------ | ------------------------------------------------------------------ |
| `none`             | The operation succeeded.                                           |
| `no_fit`           | No candidate node could satisfy the device request.                |
| `lookup`           | A required pod or node could not be read from the scheduler cache. |
| `identity`         | The bind request did not match the current pod identity or target. |
| `lock`             | Device reservation locking failed.                                 |
| `annotation_patch` | A required pod annotation update failed.                           |
| `bind`             | Another bind operation failed.                                     |
| `internal`         | Internal usage, scoring, discovery, or cleanup failed.             |

A successful filter reservation uses `failure_reason="none"`; bind failures are reported by the failure and rollback counters.

The three scheduler state gauges above have no labels. Use `time() - hami_scheduler_last_sync_success_timestamp_seconds` to see how long ago the leader last synced successfully.
