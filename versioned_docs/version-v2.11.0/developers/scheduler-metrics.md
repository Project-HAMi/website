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

## Allocation outcomes

The allocation outcome metrics use only bounded label values:

| Metric | Meaning |
| --- | --- |
| `hami_scheduler_allocations_total` | Successful device reservations recorded by the filter phase. |
| `hami_scheduler_allocation_failures_total` | Filter and bind allocation failures. |
| `hami_scheduler_bind_rollbacks_total` | Bind failures that release the node locks taken for the pod. |

A bind that fails with `lookup` releases the pod's reservation without counting a rollback.

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
| `internal`         | Internal usage or scoring failed.                                  |

A successful filter reservation uses `failure_reason="none"`. Bind failures are reported by the failure counter, and also by the rollback counter when the bind releases node locks.
