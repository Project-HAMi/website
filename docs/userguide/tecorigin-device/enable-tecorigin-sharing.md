---
title: Enable Tecorigin GPU sharing
description: Share Tecorigin cards between containers by compute core, pin a workload to specific cards, and see what HAMi does and does not isolate on this hardware.
---

## Introduction

Tecorigin cards are scheduled by **compute core**. A container asks for a number of cores with `tecorigin.com/gpucore`, and HAMi decides which card — and which cores on that card — each container gets.

HAMi supports the following for Tecorigin:

- **Core sharing**: `tecorigin.com/gpucore: N` reserves N cores of a card, so several containers can share one physical card.
- **Core-level placement**: the cores handed to a container need not be contiguous, so a card whose middle core is busy can still take a request.
- **Multi-card placement**: a request larger than one card's cores is split across cards, but only when no single card can hold it.
- **Card pinning**: `tecorigin.com/use-gpuuuid` and `tecorigin.com/nouse-gpuuuid` pin a workload to, or away from, specific cards by serial number.

Memory is not part of the request. A Tecorigin card partitions cores and memory in hardware, so every core carries its own memory slice and there is no memory resource to request. HAMi places containers by core only. See [Notes and limitations](#notes-and-limitations).

## Prerequisites

- Tecorigin accelerator driver and the SDAA runtime installed on every GPU node.
- A Tecorigin device plugin that publishes the node annotations described in [Node device annotation](#node-device-annotation), and advertises `tecorigin.com/gpucore` as a node resource. The plugin is deployed and operated by the vendor; the HAMi chart does not install it.
- A HAMi build that includes the Tecorigin backend. The backend is not part of a released HAMi version yet, so install it from a build that contains `pkg/device/tecorigin`.

## Enabling Tecorigin support

Install HAMi with [Online installation](../../installation/online-installation.md), then keep the Tecorigin settings enabled in the chart:

```yaml
devices:
  tecorigin:
    enabled: true
    resourceCountName: "tecorigin.com/gpucore"
```

`enabled` adds the resource name to the bundled kube-scheduler's extender configuration. `resourceCountName` is the resource the scheduler watches; it must match the name the device plugin advertises and the name workloads request. If you change it, update `devices.tecorigin.customresources` too, so the extender manages every Tecorigin resource name. See the [Chart values reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values) for all `devices.tecorigin.*` fields.

Disable the NVIDIA plugin on a cluster that has no NVIDIA GPUs so it does not wait for nodes:

```yaml
devicePlugin:
  enabled: false
```

### Verify the node

The device plugin advertises the node's total core count and publishes the card list. Check both before scheduling anything:

```bash
kubectl get node <node-name> -o jsonpath='{.status.allocatable.tecorigin\.com/gpucore}'
kubectl get node <node-name> -o yaml | grep hami.io/node-tecorigin-register
```

The first command prints the number of cores on the node — eight 4-core cards report `32`. The second prints the per-card device list. A node with the resource but no annotation is never registered with the scheduler, and Pods requesting cores stay pending.

## Node device annotation {#node-device-annotation}

The register annotation uses HAMi's node-device CSV, the same layout Hygon and Iluvatar publish, so the plugin needs no private format:

```text
3CP100241200184,4,15296,15,Tecorigin,0,true,0,hami-core:
```

One segment per card, each terminated by `:`. Every segment must carry all nine fields:

| Field | Meaning | Notes for the plugin |
| --- | --- | --- |
| `id` | Card serial number | The string `teco-smi` prints. It is what `tecorigin.com/use-gpuuuid` matches and what HAMi reports back in the allocation annotation. |
| `count` | Cores on this card | Must be `1`–`4`. HAMi derives the core mask from this value and rejects the card otherwise. |
| `memory` | Card memory in **MiB** | Not used for scheduling. A value above 1 TiB is rejected, which catches a byte count written by mistake. |
| `devcore` | Core mask | HAMi overwrites it with the mask derived from `count`. |
| `type` | Device type | HAMi records `Tecorigin` here; the value in the annotation is not used for matching. |
| `numa` | NUMA node | `0` when the card is not NUMA-aware. |
| `health` | Card usable | `false` drops the card from the scheduler. A node whose cards are all unhealthy leaves the scheduler cache. |
| `index` | Physical position of the card | Required. HAMi uses it to break score ties, so the 7-field form that leaves every card at `0` is rejected. |
| `mode` | Operating mode | `hami-core` when empty. |

The plugin may also publish `hami.io/node-tecorigin-cores`, a map from card serial to the global core indexes the card owns:

```text
{"3CP100241200184":[0,1,2,3],"3CP100241200185":[4,5,6,7]}
```

HAMi copies it into the scheduler cache for troubleshooting only; scheduling never reads it. Both annotations are compared on every health check, so editing them re-reads the card list without restarting the scheduler.

`hami.io/node-handshake-tecorigin` belongs to the older handshake flow. HAMi only removes it; a plugin does not need to write it.

## Allocation annotation

After a Pod is scheduled, HAMi writes the chosen devices to `hami.io/tecorigin-devices-to-allocate` (the pending list the plugin consumes) and to `hami.io/tecorigin-devices-allocated` (HAMi's own record). Each container entry is:

```text
<card-serial>,<type>,<memory-MiB>,<core-mask>
```

`core-mask` is a decimal bitmask of the cores allocated on that card: `4` cores on a 4-core card is `15` (`0b1111`), one core is `1`. The plugin expands the mask into global core indexes and sets `TECO_VISIBLE_DEVICES` accordingly. Because the mask is card-local, the optional core-id map is the only way to trace an index back to a card by hand.

## Running Tecorigin jobs

Request cores with `tecorigin.com/gpucore`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: teco-pod
spec:
  restartPolicy: OnFailure
  containers:
    - name: teco-pod
      image: ubuntu:22.04
      command: ["sleep"]
      args: ["infinity"]
      resources:
        limits:
          # A core count: 1 reserves one core of a Tecorigin card.
          tecorigin.com/gpucore: 1
```

Next steps:

- [Allocate cores to a container](examples/allocate-core.md) — several requests and what the scheduler does with each.
- [Use a whole card](examples/allocate-exclusive.md) — reserve every core of one card.
- [Assign to certain cards](examples/specify-certain-cards.md) — pin by serial number.
- [Troubleshoot Tecorigin scheduling](troubleshooting.md) — pending Pods, unregistered nodes, allocation reasons.

## Notes and limitations {#notes-and-limitations}

1. **Memory isolation is physical.** Cores and memory are partitioned on the card itself, so the memory a container reaches is the slice attached to the cores it was given. HAMi books the cores and the hardware keeps the container inside its own slice: the memory of a core the container did not receive stays out of reach.

2. **Compute isolation is physical.** Each allocated core belongs to one container rather than being time-sliced, so there is no execution rate to throttle. Two containers on one card run on disjoint cores and do not contend for the same core, though they still share the card's memory bandwidth.

3. **Cards with more than 4 cores reject the whole node annotation.** The backend derives the core mask from a 4-bit width. If any card in the annotation reports more than four cores, the parser fails the entire list; the node is not registered and none of its cores are advertised.

4. **A card takes at most as many containers as it has cores.** On a 4-core card, the fifth container that wants a core of it is refused even when cores are free. Requests that ask for more cores per container, or fewer, are not affected.

5. **A request is never spread when one card can hold it.** Splitting across cards happens only when the request exceeds the largest card's core count. A node that would have to spread a request that fits a single card elsewhere is skipped, which is reported as `CardInsufficientCore`.

6. **Cores must be an integer.** A fractional or negative `tecorigin.com/gpucore` is rejected as an invalid device request; an explicit `0` means no device. A limit takes precedence over a request when both are set.

7. **Memory is not a separate resource.** A Tecorigin card partitions cores and memory in hardware: each core owns a fixed memory slice, so a request for N cores also takes the memory attached to those N cores. There is nothing to request with `tecorigin.com/gpumem` or a percentage name, and a Pod that sets one stays pending. HAMi allocates cores only and never splits memory on its own.
