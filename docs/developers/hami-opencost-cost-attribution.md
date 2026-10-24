---
id: hami-opencost-cost-attribution
title: HAMi-aware Fractional GPU Cost Attribution with OpenCost
sidebar_label: OpenCost Cost Attribution
---

## Summary

HAMi lets several Pods share one physical GPU by carving it into memory and compute slices. Kubernetes cost tools such as [OpenCost](https://www.opencost.io/) attribute GPU cost from the `nvidia.com/gpu` resource request, which HAMi always reports as a whole number of devices. A Pod that reserves a quarter of a card still requests `nvidia.com/gpu: 1`, so each co-located Pod is billed for a full card. Four Pods sharing one GPU are billed as four GPUs.

This document describes a design for attributing GPU cost in proportion to the fraction of a physical card each Pod actually holds, using metrics HAMi already exposes. It tracks the HAMi side of [issue #3073](https://github.com/Project-HAMi/HAMi/issues/3073) and the OpenCost report [opencost/opencost#3828](https://github.com/opencost/opencost/issues/3828).

## Motivation

### Goals

- Attribute the cost of one physical GPU across the Pods that share it, so the per-Pod charges and the unreserved idle cost reconcile to the card's price.
- Price GPU memory and GPU compute separately, since the two are rented independently and a Pod's memory share and compute share can differ.
- Base per-Pod billing on metrics that exist only while a container runs, so a reservation that never became a running Pod is not billed.

### Non-Goals

- No new runtime component in HAMi. The accounting lives in OpenCost queries and recording rules against HAMi metrics, plus this design documentation.
- No cost model for non-NVIDIA devices in the first milestone.
- No automatic attribution of contended, unlimited compute. Pods with no core limit are a documented, explicit class, never silently billed as zero.

## Background

### How a HAMi Pod requests a GPU slice

A Pod asks for a slice of a card with three limits:

```yaml
resources:
  limits:
    nvidia.com/gpu: 1 # see one GPU
    nvidia.com/gpucores: 25 # use 25% of its compute
    nvidia.com/gpumem-percentage: 25 # use 25% of its memory
```

Four such Pods can be binpacked onto one physical card at the same time.

### Why `nvidia.com/gpu` is not enough for cost

OpenCost's GPU request query reads the `nvidia_com_gpu` resource and treats it as whole-card usage. It does not read `gpucores` or `gpumem`, so it cannot see that four Pods are sharing one card. The result is up to a fourfold overcharge that users then correct by hand.

### What HAMi already records

Two families of metrics are relevant.

Scheduler reservation metrics, emitted during the scheduler filter phase from the cached allocation:

- `hami_vgpu_memory_allocated_bytes` per namespace, node, pod, and device UUID.
- `hami_vgpu_core_allocated_ratio` per the same labels. For NVIDIA this value is a percentage in the range 0 to 100, not a 0 to 1 ratio.
- `hami_gpu_memory_allocated_bytes` and `hami_node_gpu_memory_allocated_ratio` per device, which together recover a card's total memory.

These reservation series are pod level, not container level. `PodManager` stores only each pod's collapsed device usage, one entry per device type, so the `container_index` label that these metrics carried up to and including v2.10.0 was always 0 and was dropped in [#2898](https://github.com/Project-HAMi/HAMi/pull/2898). This design targets current master and treats reservation data as pod level throughout. On v2.10.0 and earlier the label is present but constant, so the same pod-level treatment applies there.

vGPUmonitor runtime metrics, emitted by the monitoring DaemonSet only while a container is running:

- `hami_container_device_utilization_ratio` per namespace, pod, container, virtual device index, and device UUID.
- `hami_vgpu_memory_used_bytes` per the same labels.

The reservation metrics are computed in the filter phase, so they record that a slice was reserved, not that the Pod ran. A Pod can pass filtering and still fail to start. They also omit the Pod UID. The runtime metrics exist only while a container runs, so they are implicitly gated on the Pod having started.

## Design Details

### Billing source

Billing is gated on the runtime metrics. They exist only while a container runs, so a slice that was reserved during the filter phase but never became a running Pod is never charged. That gate applies to both policies.

Within the gate, the two policies read their fractions from different places, because the reserved size of a slice is recorded only by the scheduler. The measured policy takes both fractions from the runtime metrics. The reservation policy takes them from the scheduler reservation metrics, and still bills only for the windows in which the runtime metrics show the container present. The scheduler reservation metrics also supply the card totals and the idle remainder used in reconciliation.

### Cost model

GPU memory and GPU compute are priced separately and summed:

```text
pod_cost_per_hour = core_price_per_hour * core_fraction
                  + mem_price_per_hour  * mem_fraction
```

`core_fraction` and `mem_fraction` are each in the range 0 to 1. There is no single universal fraction when the core and memory limits differ, so the two dimensions are always kept separate.

### Reconciliation identity

For every physical card, the per-Pod charges plus the idle cost must equal the card's price:

```text
idle_cost_per_hour = core_price_per_hour * (1 - sum(core_fraction over pods on the card))
                   + mem_price_per_hour  * (1 - sum(mem_fraction  over pods on the card))

sum(pod_cost_per_hour over pods on the card) + idle_cost_per_hour
  == physical_gpu_price_per_hour
```

The idle cost is the per-dimension remainder: for compute and for memory it prices the fraction of the card that no Pod's charge accounts for. That covers both capacity no Pod reserved and, under the measured policy, reserved capacity left idle inside a Pod's slice. Because the idle term is defined as the exact complement of the summed fractions in each dimension, the identity holds by construction for both policies: on a fully reserved card the reservation fractions sum to 1 and the idle cost is 0, while measured fractions that sum to less than 1 raise the idle cost by the matching amount, so a fully reserved but under-used card is never billed below its price.

The summed fractions are bounded to the interval 0 to 1 per card in each dimension, which keeps the idle cost non-negative and stops Pod charges from exceeding the card price. Memory is bounded physically, since used bytes cannot exceed the card total. Measured compute can briefly sum above 1 under contention or sampling noise; when the raw per-container ratios on a card sum above 1, the pipeline normalizes them proportionally so the dimension sums to exactly 1, which floors the idle cost at 0 and preserves the Pods' relative shares. Intervals where that normalization would have to discard more than a configurable tolerance are marked unattributable rather than billed on distorted fractions.

### Attribution policies

Two policies are defined. Both use the same cost model and reconciliation identity, and differ only in how the fractions are measured.

Reservation policy. `core_fraction` and `mem_fraction` come from the scheduler reservation metrics. For a Pod reserving 25% cores this is 0.25. On a fully reserved card the per-Pod fractions sum to 1 and the idle fraction is 0. This is the first-milestone target and the simplest to reason about.

Measured policy. `core_fraction` comes from `hami_container_device_utilization_ratio` averaged over the billing window and normalized to 0 to 1, and `mem_fraction` from `hami_vgpu_memory_used_bytes` over the card total. These reflect real usage inside the reserved slices and will not sum to 1, the difference being idle inside reserved slices.

### Handling of unlimited and contended compute

In HAMi, `gpucores` of 0 or unset means no compute limit, not zero compute. Such a Pod is allowed to use the whole card's compute and competes with any co-located Pods. Its real compute share cannot be derived from the allocation alone.

These Pods are an explicit class. Under the reservation policy they are either excluded from compute attribution and flagged as unattributable, or given a configurable fallback such as an equal split of the card's unreserved compute among the no-limit Pods sharing it. They are never silently billed as zero compute. Under the measured policy their compute share is taken from measured utilization over time, but only when the runtime actually collects that metric for the container.

`hami_container_device_utilization_ratio` is read from the shared region that the HAMi-core `utilization_watcher` thread writes. HAMi sets `CUDA_DEVICE_SM_LIMIT` from the allocated `gpucores` value. In the HAMi-core revision used by current HAMi master, [`do_init_device_sm_limits`](https://github.com/Project-HAMi/HAMi-core/blob/a55248ecc6e2530602875054e2d334645d08f35b/src/multiprocess/multiprocess_memory_limit.c#L281-L295) converts a zero or unset `CUDA_DEVICE_SM_LIMIT` to 100. [`init_utilization_watcher`](https://github.com/Project-HAMi/HAMi-core/blob/a55248ecc6e2530602875054e2d334645d08f35b/src/multiprocess/multiprocess_utilization_watcher.c#L273-L344) starts the watcher when at least one device has an effective SM limit greater than 0 and at most 100. The watcher collects utilization before skipping throttling for devices with a limit of 100. A Pod with `gpucores: 0` therefore does not lose utilization collection merely because it has no compute limit.

Core enforcement is controlled separately by `GPU_CORE_UTILIZATION_POLICY`, injected from the chart value `gpuCorePolicy` when that is set to something other than `default`, the other values being `force` and `disable`. Verify collection for the deployed HAMi-core version before using the measured policy. A zero utilization reading alone does not establish that collection is unavailable; an idle workload can also report zero. If collection is unavailable, flag the Pod as unattributable rather than billing it as zero compute. The first milestone remains scoped to explicit nonzero limits.

### Pod identity across the join

Neither family carries the Pod UID, and the two sit at different granularity. The reservation series are pod level: `namespace`, `node`, `pod`, `device_uuid`. The runtime series are container level: `namespace`, `pod`, `container`, `vdevice_index`, `device_uuid`, with no `node`.

There is therefore no container index to map, and kube-state-metrics is never asked for one. The join runs at pod level, per physical card. Runtime series are first summed over `container` and `vdevice_index` within each `(namespace, pod, device_uuid)` group, which gives one runtime value per Pod per card and matches the granularity at which the scheduler already collapses reservation data. That aggregated series joins the reservation series on `(namespace, pod, device_uuid)`. `node` is not part of the key, since `(namespace, pod)` already identifies a Pod in a cluster and the reservation series carry the node for reporting. kube-state-metrics then contributes workload ownership and Pod lifetime keyed on `(namespace, pod)`, which is the granularity it exposes, so no container-level mapping is required on that side either.

Adding a `pod_uid` label to HAMi metrics was considered and rejected: it would not remove the pod-level aggregation above, and it would raise cardinality on these high-volume series.

The one case this leaves open is a Pod recreated with the same name in the same namespace within a single scrape window. A `pod_uid` label is kept as a documented fallback if that case is shown to corrupt attribution in practice.

### Where attribution runs, and avoiding double counting

The attribution runs as OpenCost queries and recording rules against HAMi metrics. OpenCost custom-cost plugins add separate records and do not replace native GPU cost, so an integration must take care not to count a card twice. The adjacent GenAI and MIG efficiency plugin ([opencost/opencost-plugins#69](https://github.com/opencost/opencost-plugins/pull/69)) covers a different scope; the scope here is HAMi fractional allocation on software-shared NVIDIA GPUs.

## Validation

The accounting is encoded as Prometheus recording rules and unit-tested with `promtool` against synthetic series that mirror the milestone-1 workload: one card shared by four 25% Pods and a second card held whole by one control Pod. The test asserts the per-Pod fractions, the per-Pod cost, and the reconciliation identity on both cards, and it passes. This validates the queries and the model before any GPU time is spent.

The harness holding those manifests, queries, recording rules, the `promtool` test, and the deploy and report scripts is not part of this pull request. It currently lives in a branch of a HAMi fork, under [`opencost-repro/` on `Eshiv-Pandey/HAMi`](https://github.com/Eshiv-Pandey/HAMi/tree/docs/opencost-repro/opencost-repro), and is referenced here only as the provenance of the result above. Whether it belongs upstream, and where, is left to the discussion on the tracking issue. The remaining step is a live run on a representative multi-tenant GPU cluster to record real utilization under both policies.

## Remaining Work

- Run the reproduction on a multi-tenant GPU cluster and record the measured utilization numbers for both policies.
- Extend the `promtool` test with an over-subscribed interval, where the summed measured fractions exceed 1, to cover the proportional normalization and the unattributable fallback in both the compute and memory dimensions.
- Specify the unlimited-core fallback and the init-container release behavior as explicit, measured policies before broader use.
- Decide, with the OpenCost community, where the integration lives and how it avoids double counting native GPU cost.
