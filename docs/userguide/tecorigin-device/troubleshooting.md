---
title: Troubleshoot Tecorigin scheduling
description: Diagnose a Tecorigin node that never registers, read the allocation reasons behind a pending Pod, and interpret the core mask in the allocation annotation.
---

## The node has the resource but never appears in the scheduler

A Tecorigin node is only registered when the register annotation parses and at least one card is healthy. Check the annotation first:

```bash
kubectl get node <node-name> -o jsonpath='{.metadata.annotations.hami\.io/node-tecorigin-register}'
```

| Symptom | Cause | Fix |
| --- | --- | --- |
| Annotation missing | The device plugin is not running, or advertises a different name | Deploy the vendor plugin and confirm `tecorigin.com/gpucore` is in the node's allocatable resources |
| `want 9 fields, got 7` | The plugin omits `index` and `mode` | Publish nine fields per card; the 7-field form leaves every card at index `0` and is rejected |
| `invalid core count N for card "..."` | `count` is `0` or above `4` | Report the real core count of a 1–4-core card |
| `invalid memory ... Devmem is MiB, not bytes` | The plugin wrote a byte count | Write MiB |
| `no healthy tecorigin card found on node` | Every card reports `health=false` | Fix the card, then update the annotation so the health check re-reads it |

An annotation that is present but produces no registration also leaves Pods pending with `node unregistered` in the scheduler log.
> Note: Both `node unregistered` and `no healthy tecorigin card found on node` are logged at V(5). The HAMI chart defaults to `-v=4`, so these messages are not visible by default. You can set the scheduler log level to `-v=5` to view them, or inspect the scheduling rejection reason directly.
The register annotation and `hami.io/node-tecorigin-cores` are fingerprinted on each health check, so correcting either one re-reads the card list; no scheduler restart is needed.


## The Pod stays pending

HAMi reports the reason in the Pod's allocation reason, as `<failed>/<total> <Reason>`. The Tecorigin backend emits four:

| Reason | Meaning |
| --- | --- |
| `CardNotHealth` | The card is marked unhealthy in the register annotation |
| `CardTimeSlicingExhausted` | The card already holds as many containers as it has cores, even if cores are free |
| `CardUuidMismatch` | `tecorigin.com/use-gpuuuid` or `tecorigin.com/nouse-gpuuuid` excludes this card |
| `CardInsufficientCore` | Not enough free cores, or serving the request would need more cards than the request's own minimum |

For `CardInsufficientCore`, look at the free-core count in the scheduler log:

```bash
kubectl logs -n {Release Namespace} -l app.kubernetes.io/component=hami-scheduler -c vgpu-scheduler-extender --tail=200 | grep "tecorigin fit failed"
```
> Note: When all GPUs on the node have zero free cores, the scheduler returns `CardInsufficientCore` without logging `tecorigin fit failed`. In this case the grep above will find no matches; you need to check the card allocation status directly.


The log prints `want`, the aggregated `freeCores` from eligible candidate cards, candidate count, and `maxCards`.
`freeCores` sums only cards that pass health, UUID, container-count and free-core filters.
`maxCards` is a card count, not a core count: it equals `ceil(want / core count of the largest eligible card)`, the minimal number of cards required for this request. Any split requiring more cards will be rejected.

To tell the failure causes apart: first compare `freeCores` against `want`. If `freeCores < want`, the pool of eligible candidate cards does not have enough total free cores.
If `freeCores >= want`, then compare `want` with the largest card’s core count.
- When `want ≤ largest card core count`: `maxCards = 1`, failure means no single eligible card has enough free cores.
- When `want > largest card core count`: the request must span multiple cards; the node is rejected if the required split exceeds the minimal-card limit.


## Verify what a running container received

```bash
kubectl get pod <pod-name> -o jsonpath='{.metadata.annotations.hami\.io/tecorigin-devices-allocated}'
```

Each entry is `<card-serial>,<type>,<memory-MiB>,<core-mask>`. The mask tells you which cores of that card were allocated:

| Mask | Cores on a 4-core card |
| --- | --- |
| `1` | core 0 |
| `5` | cores 0 and 2 |
| `15` | all four cores |

A mask with gaps is expected: the runtime accepts an arbitrary set of cores, so HAMi hands out the lowest free ones instead of waiting for a contiguous run.

## Trace a core index back to a card

`TECO_VISIBLE_DEVICES` inside the container holds global core indexes. To map an index to a card, read the optional core-id map the plugin may publish:

```bash
kubectl get node <node-name> -o jsonpath='{.metadata.annotations.hami\.io/node-tecorigin-cores}'
```

```text
{"3CP100241200184":[0,1,2,3],"3CP100241200185":[4,5,6,7]}
```

Index `5` belongs to card `3CP100241200185`, local core `1`. The map never affects scheduling; it exists only for this kind of lookup. Without it, the index range still identifies the card when cards report equal core counts and are ordered by serial.

## Requests do not produce the expected split

Placement is deterministic: fewest cards first, then the set whose free cores add up most tightly to the request, then the lowest-indexed cards of each size. A 6-core request therefore lands on two cards with three free cores each rather than on a four-core and a three-core card, because 3 + 3 wastes nothing. The cores are then taken from the roomiest selected card first, so a set with four and three free cores gives 4 + 2 and leaves one core on the second card.


If a whole card was expected, confirm the request matches the card's core count: `4` on 4-core cards, `3` on 3-core cards. A `4` on a node of 3-core cards is split and cannot be exclusive.
