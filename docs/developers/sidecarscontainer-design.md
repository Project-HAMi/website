---
title: Sidecar Container GPU Resource Accounting
---

## Problem Summary

Native sidecar containers are declared in `spec.initContainers` with `restartPolicy: Always`, but unlike regular init containers they run for the whole pod lifetime, next to the app containers. HAMi ([Init Container GPU Resource Accounting](./initcontainer-design.md)) classifies only by which list a container appears in. There is no `RestartPolicy` check anywhere, so a sidecar gets run-to-completion semantics it doesn't have.

This design adds sidecars as a third container class.

## The Problem in HAMi Today

**1. Under-accounting: `CollapseInitContainerUsage` (`pkg/device/initContainer.go`).** Classification is by index (`cidx < numInit`), so a sidecar lands in the init-peak (`max`) bucket. A 4000 MiB sidecar plus a 4000 MiB app container on one card is accounted as `max(4000, 4000) = 4000`; real demand is 8000, so the scheduler can oversubscribe the card.

**2. The shrink gate never opens.** The shrink waits for every init container to be `Terminated`. A sidecar never terminates, so pods with one never release their init containers' memory. Case 4 of the init design stops working.

**3. A bug waiting to happen. `AppContainersOnlyDeviceUsage`.** The shrink target skips all init containers, sidecars included, unreachable today only because gate (2) never opens. Fix the gate but not the target, and a running sidecar's usage gets dropped from accounting. The two have to change together.

## The Core Idea

The upstream formula (what the apiserver itself charges):

```text
effective = max( max over non-sidecar init_i ( init_i + sum(sidecars declared before init_i) ),
                 sum(apps) + sum(all sidecars) )
```

A flat `sidecar_sum + max(init_peak, app_sum)` (same spirit as the init design's assumption, using `sum(all sidecars)` instead of the ordering-aware term) was considered as a cheaper approximation. It turned out no harder to walk `spec.initContainers` in declaration order and fold each sidecar's usage into the running peak as it's seen, so the shipped code computes the ordering-aware term above directly, matching the apiserver exactly rather than only bounding it from above. Per device UUID and resource (count, mem, cores):

```text
effective[uuid] = max( max over non-sidecar init_i ( init_i[uuid] + sidecar_sum_so_far[uuid] ),
                        app_sum[uuid] + sidecar_sum[uuid] )
```

where `sidecar_sum_so_far` accumulates only the sidecars declared earlier in `spec.initContainers`, and `sidecar_sum` in the second term is the total across all sidecars. If there are no non-sidecar init containers, the first term is 0, and a missing per-UUID entry also counts as 0 before the `max()` and addition.

**Classification:**

```text
isSidecar(c) := c ∈ spec.initContainers && c.RestartPolicy != nil &&
                *c.RestartPolicy == corev1.ContainerRestartPolicyAlways
```

The nil check makes this safe everywhere: absent field means no sidecars, behavior stays exactly as today. No version gating, no new config.

## Proposal

- **Admission quota check:** walk `spec.initContainers` in order, accumulating a running sidecar sum and folding it into each non-sidecar init container's peak (`pkg/scheduler/webhook.go`'s `fitResourceQuota`); the final `effectiveReq` is that peak compared against the total sidecar sum plus the app sum; memory factor applied once to the result.
- **Scheduler fit & scoring:** a steady-state pass fits sidecars plus app containers cumulatively against a shared node copy; each non-sidecar init container gets its own fresh copy, deep-copied from that shared one at the point it's reached, so it's pre-charged with only the sidecars declared before it; merge per UUID via `max()`.
- **Usage recording:** `CollapseInitContainerUsage` routes sidecars into the app-sum bucket and adds their sum to the init peak. The same split applies to the per-entry slot count (PR 2623): sidecar slots add like app containers, non-sidecar inits keep their peak of 1. `getNodesUsage` only consumes the stored output, so it needs no change of its own. Add/update/delete symmetry stays as it is.

Annotations don't change, but a sidecar keeps its position in the init range of `hami.io/vgpu-devices-allocated`, and the annotation itself carries no sidecar identity. Position `i` maps to `pod.Spec.InitContainers[i]` when `i < len(InitContainers)`, otherwise to `pod.Spec.Containers[i - len(InitContainers)]`; readers (`CollapseInitContainerUsage`, device plugin `Allocate`, WebUI, which already holds the Pod object) then check that container's `restartPolicy`, never the position alone.

### Cases (one node, single 24Gi GPU)

- **Oversubscription prevented:** sidecar 10Gi + app 10Gi. Before: accounted `max(10,10) = 10Gi`, so a later 12Gi pod schedules → real demand 32Gi. After: accounted 20Gi → the 12Gi pod is rejected.
- **Shrink restored:** init 20Gi + sidecar 2Gi + app 10Gi. Before: gate never opens, 20Gi held forever. After, admission depends on declaration order: sidecar declared before the init container charges `max(2+20, 2+10) = 22Gi`; init container declared first charges `max(20, 2+10) = 20Gi`. Either way, once the init container exits 0, usage shrinks to the steady state `2+10 = 12Gi`.
- No sidecars, or terminal phase: identical to the init design.

## Shrink Rules

Same three rules as the init design, with non-sidecar inserted: shrink to steady-state usage (apps + sidecars) once non-sidecar inits exit 0; hold on non-zero exit; zero at terminal phase. A sidecar can crash-loop through `Terminated` states; its usage stays counted through the gap and never briefly reads zero stored usage only changes at add, at the shrink (whose target includes sidecars), or at terminal phase, and a restart triggers none of these. But an exit-0 gap can momentarily satisfy today's gate and fire the shrink, permanently dropping the sidecar's usage; the non-sidecar gate closes that. A test should pin both. If all init containers are sidecars (`init_peak = 0`), the gate is satisfied immediately and the shrink recomputes the stored value (delta 0). `initContainerResourceReleased` keeps its semantics. Rename `AppContainersOnlyDeviceUsage` (e.g. `SteadyStateDeviceUsage`) so an un-migrated caller fails to compile instead of silently dropping sidecar usage.

## Interaction with Kubernetes ResourceQuota

The apiserver charges the same ordering-aware upstream formula against the container-level resource requests HAMi's mutating webhook writes into the pod spec, on the same `spec.initContainers` order HAMi itself walks. Because admission computes that formula directly instead of the flat simplification, the two stay in agreement regardless of whether the sidecar is declared before or after the init container, avoiding the mismatch a flat sum would have caused. As before, the shrink only frees capacity inside HAMi; the apiserver's quota charge is unaffected, since the sidecar's share has to be held until the pod ends anyway.
