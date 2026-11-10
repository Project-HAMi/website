---
title: Assign to certain cards
description: Pin a workload to specific Tecorigin cards, or exclude cards from it, with the use-gpuuuid and nouse-gpuuuid annotations.
---

A workload can pin itself to specific cards — or away from them — through Pod annotations. Values are comma-separated card serial numbers, matched exactly against the `id` field of the node's register annotation.

## Use certain cards

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: teco-pinned
  annotations:
    tecorigin.com/use-gpuuuid: "3CP100241200184,3CP100241200185"
spec:
  containers:
    - name: ctr
      image: ubuntu:22.04
      command: ["sleep"]
      args: ["infinity"]
      resources:
        limits:
          tecorigin.com/gpucore: 2
```

## Avoid certain cards

```yaml
metadata:
  annotations:
    tecorigin.com/nouse-gpuuuid: "3CP100241200187"
```

`use-gpuuuid` and `nouse-gpuuuid` are evaluated independently: a card must appear in the allowed list, or not appear in the excluded list, for the request to land on it. Listing both is allowed but a card present in both is excluded.

## Find the serial numbers

Read the node's register annotation:

```bash
kubectl get node <node-name> -o jsonpath='{.metadata.annotations.hami\.io/node-tecorigin-register}'
```

The first field of each `:`-separated segment is the card serial:

```text
3CP100241200184,4,15296,15,Tecorigin,0,true,0,hami-core:
3CP100241200185,4,15296,15,Tecorigin,0,true,0,hami-core:
```

The same serial is what `teco-smi` prints for the card, and what HAMi reports in `hami.io/tecorigin-devices-allocated`.

:::note

A serial identifies one card in the whole cluster, so pinning a card also pins the node. A workload pinned to a card that is fully allocated stays pending with `CardUUIDMismatch` or `CardInsufficientCore` in the allocation reason instead of moving to a card it was not allowed to use.

:::
