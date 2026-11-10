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

An annotation that is present but produces no registration also leaves Pods pending with `node unregistered` in the scheduler log. The register annotation and `hami.io/node-tecorigin-cores` are fingerprinted on each health check, so correcting either one re-reads the card list; no scheduler restart is needed.

## The Pod stays pending

HAMi reports the reason in the Pod's allocation reason, as `<failed>/<total> <Reason>`. The Tecorigin backend emits four:

| Reason | Meaning |
| --- | --- |
| `CardNotHealth` | The card is marked unhealthy in the register annotation |
| `CardTimeSlicingExhausted` | The card already holds as many containers as it has cores, even if cores are free |
| `CardUUIDMismatch` | `tecorigin.com/use-gpuuuid` or `tecorigin.com/nouse-gpuuuid` excludes this card |
| `CardInsufficientCore` | Not enough free cores, or serving the request would need more cards than the request's own minimum |

For `CardInsufficientCore`, look at the free-core count in the scheduler log:

```bash
kubectl logs -n {Release Namespace} -l app.kubernetes.io/component=hami-scheduler -c vgpu-scheduler-extender --tail=200 | grep "tecorigin fit failed"
```

The line reports `want`, the node's total `freeCores`, the number of `candidates` and `maxCards` — the most cards the request may use. `maxCards` comes from the largest card on the node, so a `want` above it has to be spread and a node that would need more cards is refused.

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

Placement is deterministic: fewest cards first, then the split that leaves the least capacity unused (cards with the fewest free cores are filled first), then the lowest-indexed cards. A 6-core request therefore lands on two cards with three free cores each before it touches a card with four free cores, because 3 + 3 wastes nothing.

If a whole card was expected, confirm the request matches the card's core count: `4` on 4-core cards, `3` on 3-core cards. A `4` on a node of 3-core cards is split and cannot be exclusive.
