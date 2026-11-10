---
title: Allocate cores to a container
description: Request one or more cores of a Tecorigin card, see how a request is split across cards, and verify the allocation HAMi records.
---

`tecorigin.com/gpucore` is a **core count**, not a card count. The requests below assume 4-core cards, so one card offers 4 cores and an eight-card node offers 32.

## One core

A container that asks for one core gets one core of one card. Other containers keep using the remaining cores of the same card.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: teco-one-core
spec:
  containers:
    - name: ctr
      image: ubuntu:22.04
      command: ["sleep"]
      args: ["infinity"]
      resources:
        limits:
          tecorigin.com/gpucore: 1
```

## Part of a card

Two cores of one card. The scheduler prefers a single card and takes the lowest free cores it finds, so this request is not split over two cards while a card with two free cores exists.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: teco-two-cores
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

## Across several cards

A request larger than one card's core count is split over the fewest cards, and among those sets HAMi takes the one whose free cores add up most tightly to the request, so cards that are already partly used are preferred over idle ones. The cores are then taken from the selected cards in descending order of free cores. On a node of idle 4-core cards, `6` takes four cores of one card and two of another; given cards with four and three free cores, it takes the four from the first and two from the second, leaving one core free on the second card.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: teco-six-cores
spec:
  containers:
    - name: ctr
      image: ubuntu:22.04
      command: ["sleep"]
      args: ["infinity"]
      resources:
        limits:
          tecorigin.com/gpucore: 6
```

A node is only eligible when the request can be served without spreading beyond the physical minimum number of cards. A request that needs a third card on a node where two would do is not placed on that node.

## Requests versus limits

When both are set, the limit takes precedence. For extended resources like `tecorigin.com/gpucore`, requests and limits must be set to equal values.

```yaml
      resources:
        limits:
          tecorigin.com/gpucore: 1
        requests:
          tecorigin.com/gpucore: 1
```

`0` means "no device": the container is scheduled without a Tecorigin allocation instead of failing. A fractional or negative value is rejected as an invalid device request.

## Check the allocation

```bash
kubectl get pod teco-six-cores -o yaml | grep hami.io/tecorigin-devices-allocated
```

The value lists one entry per container per card, `<card-serial>,<type>,<memory-MiB>,<core-mask>`, where the mask is decimal — `15` on a 4-core card means all four cores.
