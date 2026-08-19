---
title: NVIDIA dynamic MIG implementation
sidebar_label: Dynamic MIG Implementation
---

## Introduction

HAMi v2.10 replaces predefined `knownMigGeometries` and whole-GPU template switching with a reservation-first Dynamic MIG architecture. Hardware capability originates on the node, the scheduler reserves an exact MIG placement before binding a Pod, and the NVIDIA device plugin realizes and reclaims the corresponding GPU instance (GI) and compute instance (CI).

The design keeps four responsibilities separate:

| Authority | Responsibility |
| --- | --- |
| NVML on the node | Reports profile memory, compute capacity, slice count, and legal placements |
| HAMi scheduler | Selects the physical GPU, profile, and placement and accounts for the reservation |
| NVIDIA device plugin | Serializes hardware mutation and creates, verifies, adopts, and destroys GI/CI instances |
| Pod annotation | Persists the allocation identity shared by the scheduler and device plugin |

This model creates hardware-isolated MIG devices per Pod without making the scheduler mutate GPU hardware or making the device plugin choose a different placement at runtime.

## Design goals

- Treat the node and NVML as the source of truth for hardware capability.
- Reserve topology, not only aggregate MIG slice count.
- Realize exactly the profile and placement accepted by the scheduler.
- Use stable workload metadata for reconciliation and restart recovery.
- Reclaim one Pod's instance without reconfiguring instances owned by other Pods.
- Keep the shared scheduler/device-plugin contract compact as GPU density grows.

## Architecture

```text
                        Kubernetes control plane

  +----------------+       Node capability       +----------------+
  | Device Plugin  | --------------------------> | HAMi Scheduler |
  |                |                             |                |
  | NVML discovery |       Pod reservation       | Placement      |
  | GI/CI manager  | <-------------------------- | policy         |
  | Reconciler     |                             | Capacity model |
  +-------+--------+                             +--------+-------+
          |                                               |
          | exact GI/CI realization                       | bind
          v                                               v
  +----------------+                             +----------------+
  | NVIDIA GPU     |                             | Workload Pod   |
  | MIG topology   |                             | Allocation     |
  | and instances  |                             | annotation     |
  +----------------+                             +----------------+
```

The device plugin publishes capability in the NVIDIA node registration annotation. The scheduler reconstructs topology occupancy from active Pod reservations. The Pod annotation is the durable handoff between the scheduling and runtime phases.

## Capability discovery contract

### Policy comes from `migProfileAllowlist`

The scheduler device configuration names the profiles that cluster policy allows for each model:

```yaml
nvidia:
  migProfileAllowlist:
    - models: ["A100-SXM4-40GB"]
      profiles: ["1g.5gb", "2g.10gb", "3g.20gb", "7g.40gb"]
    - models: ["RTX PRO 6000 Blackwell Server Edition"]
      profiles: ["1g.24gb", "2g.48gb", "4g.96gb"]
```

The [Chart's default configuration](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/templates/scheduler/device-configmap.yaml) also includes A30, A100 80 GB, H100, H20, H200, and B200 mappings. The allowlist determines what the cluster permits; it does not define capacity or a complete geometry.

A custom `device-config.content` value or external ConfigMap replaces the Chart default. Such configurations must use `migProfileAllowlist` explicitly. Legacy `knownMigGeometries` fields are not converted automatically.

### Capability comes from NVML

For every allowlisted profile on a matching GPU, the device plugin queries NVML for profile information and possible placements. It publishes scheduler-facing fields in the per-GPU `migProfiles` array of `hami.io/node-nvidia-register`:

```json
{
  "name": "2g.10gb",
  "memoryMB": 9984,
  "core": 29,
  "sliceCount": 2,
  "placements": [
    { "start": 0, "size": 2 },
    { "start": 2, "size": 2 },
    { "start": 4, "size": 2 }
  ]
}
```

| Field        | Scheduler use                                                     |
| ------------ | ----------------------------------------------------------------- |
| `name`       | Stable profile identity across components                         |
| `memoryMB`   | Match `nvidia.com/gpumem` demand against actual reported capacity |
| `core`       | Account for the profile's compute share                           |
| `sliceCount` | Order profile candidates deterministically                        |
| `placements` | Select a legal, non-overlapping physical slice interval           |

Profile names are policy labels, but their memory, compute, and placement data are node-local facts. A profile that is not allowlisted or that NVML cannot resolve is omitted. Device-plugin-only discovery data, such as the maximum instance count, is not added to the shared wire format when placements already express schedulable capacity.

## Scheduling and reservation

For a Pod selecting `nvidia.com/vgpu-mode: "mig"`, scheduling follows this sequence:

1. Reconstruct each GPU's occupied intervals from active Pod reservations.
2. Sort discovered profile candidates by NVML-reported memory and slice count.
3. Choose the smallest profile that satisfies the container's memory request.
4. Select a deterministic legal placement that does not overlap an existing or newly accepted reservation.
5. Add the reservation to scheduler occupancy immediately, before the Pod is bound.
6. Persist the complete logical reservation in the Pod.

A placement occupies the half-open interval `[placement.start, placement.start + placement.size)`. Aggregate free slices are not sufficient if no placement reported for the requested profile fits without overlap. In that case the Pod remains Pending. The scheduler does not request a whole-GPU template change and does not move a running GI.

### Pod reservation contract

The scheduler writes a JSON array to `hami.io/vgpu-mig-allocations`, with one entry per requested MIG device:

```json
[
  {
    "containerIndex": 0,
    "deviceIndex": 0,
    "gpuUUID": "GPU-xxxxxxxx",
    "profile": "2g.10gb",
    "placement": { "start": 2, "size": 2 },
    "migUUID": "MIG-xxxxxxxx",
    "gpuInstanceID": 4,
    "computeInstanceID": 0
  }
]
```

The scheduler writes `containerIndex`, `deviceIndex`, `gpuUUID`, `profile`, and `placement`. The runtime identity fields are initially absent. After realization, the device plugin patches the same record with `migUUID`, `gpuInstanceID`, and `computeInstanceID`.

Container and device indexes disambiguate repeated allocations on the same physical GPU. Runtime identity is valid only when all three runtime fields are present; partial runtime identity fails validation. This annotation is an internal protocol and must not be generated or modified by users.

## Runtime realization

During kubelet `Allocate`, the device plugin resolves the entries for the container being started and performs the following operations:

1. Reconcile tracked instances against the current active-Pod snapshot.
2. Verify that the reserved profile and placement still exist in NVML capability.
3. Acquire the per-physical-GPU mutation lock.
4. Create the GI at exactly the scheduler-selected placement and create its CI.
5. Resolve the MIG UUID, GI ID, and CI ID and expose the MIG device to the container.
6. Patch the Pod's allocation annotation with that runtime identity.

The manager key is the physical GPU index, profile, placement start, and placement size. Repeated `Allocate` calls for the same reservation return the same managed MIG UUID. If a multi-device allocation fails partway through, instances created by that attempt are rolled back; already adopted instances are not destroyed as part of that rollback.

The device plugin never retries a different physical placement. Doing so would violate the scheduler's topology accounting and could overlap another accepted reservation.

## Reconciliation and reclaim

The device plugin periodically lists Pods assigned to its node. Pods with valid reservations form the desired allocation set if they are not deleting and have not reached Succeeded or Failed. Managed instances absent from that set are released by destroying their exact CI and GI.

Reconciliation is intentionally conservative. A complete Kubernetes list and valid allocation annotations authorize a cleanup pass. API failures, malformed records, or partial runtime identity cause destructive reconciliation to be skipped rather than allowing the plugin to infer ownership.

This convergent loop makes a placement reusable after its Pod terminates while leaving unrelated placements on the same GPU intact.

## Device plugin restart adoption

Startup recovery uses both Kubernetes allocation state and NVML activity:

1. Active Pod reservations and GPU process state identify GPUs carrying work.
2. Idle GPUs are prepared in a clean MIG-ready state; old GI/CI instances on those idle GPUs can be removed.
3. For each active v2.10 record, the plugin verifies the annotated profile, placement, MIG UUID, GI ID, and CI ID against NVML.
4. A matching live instance is adopted into the new manager's allocation maps.
5. Normal reconciliation resumes from the reconstructed ownership state.

If allocation state cannot be read reliably during startup, the plugin preserves GPUs instead of applying destructive idle-GPU cleanup. Legacy `GPU-UUID[template-slot]` identifiers cannot be adopted because they do not prove a physical placement and complete runtime identity.

## Metrics and observability

The scheduler exports realized instances through the current metric:

```text
# HELP hami_node_gpu_mig_instance_info Realized MIG instance identity and scheduler placement
# TYPE hami_node_gpu_mig_instance_info gauge
hami_node_gpu_mig_instance_info{compute_instance_id="0",device_index="0",device_uuid="GPU-xxxxxxxx",gpu_instance_id="4",mig_uuid="MIG-xxxxxxxx",node="MIG-NODE-A",placement_size="2",placement_start="2",profile="2g.10gb"} 1
```

Only reservations enriched with complete runtime identity produce this series. Its labels join the scheduler reservation to the physical GPU, placement, MIG UUID, GI ID, and CI ID. `device_uuid` plus `gpu_instance_id` can also correlate with DCGM series carrying `UUID` and `GPU_I_ID`.

`nodeGPUMigInstance` is a compatibility metric emitted only when `legacyMetrics: true`; the current Chart default is `false`. The standard scheduler endpoint is `<scheduler-ip>:31993/metrics` with the default NodePort service.

Useful operational signals include:

- device plugin discovery logs and non-empty per-GPU `migProfiles`;
- scheduler placement decisions and Pods that remain Pending under capacity or fragmentation pressure;
- the `hami.io/vgpu-mig-allocations` transition from logical reservation to runtime identity;
- GI/CI visibility through `nvidia-smi` or NVML;
- reclaim and startup-adoption logs; and
- sustained workload progress before and after a device plugin restart.

## Migration and ownership boundaries

### Legacy HAMi geometry implementation

The v2.9 and v2.10 protocols cannot safely serve MIG workloads as a mixed scheduler/device-plugin pair. A legacy scheduler publishes and consumes `migtemplate` and template/slot identifiers; v2.10 consumes `migProfiles` and requires an exact profile/placement reservation.

Initial migration therefore requires a controlled handover:

1. stop new MIG scheduling and drain legacy MIG Pods one node at a time;
2. convert the union of required legacy profiles from `knownMigGeometries` into `migProfileAllowlist`;
3. upgrade the scheduler before the node device plugins;
4. validate capability publication, realization, reclaim, and restart adoption; and
5. uncordon each node only after its lifecycle test passes.

Routine mixed-profile creation after migration does not require a whole-GPU geometry switch when a legal free placement exists. Hardware fragmentation, MIG mode changes, driver maintenance, rollback, or a layout that requires moving an active GI can still require draining or rebooting.

### NVIDIA MIG Manager

MIG Manager applies node- or GPU-level geometries, while HAMi Dynamic MIG creates and destroys GI/CI instances from per-Pod reservations. Both mutate the same hardware state and must not reconcile the same physical GPU concurrently.

GPU Operator may continue to provide the NVIDIA driver, Container Toolkit, DCGM, and other infrastructure. Before HAMi assumes mutation ownership, stop MIG Manager reconciliation and ensure a controller cannot recreate it or reapply `nvidia.com/mig.config`. Deleting one MIG Manager Pod without changing its controller policy does not establish that boundary.

See the [Dynamic MIG user guide](../userguide/nvidia-device/dynamic-mig-support) for the current Chart allowlist, migration checklist, workload example, and validation commands.

## Special thanks

Thanks to @sailorvii for helping make the original Dynamic MIG feature possible.
