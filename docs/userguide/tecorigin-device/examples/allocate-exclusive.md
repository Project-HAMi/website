---
title: Use a whole card
---

There is no separate resource for exclusive use. A container takes a whole card by requesting every core that card has — `4` on a 4-core card.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: teco-whole-card
spec:
  containers:
    - name: ctr
      image: ubuntu:22.04
      command: ["sleep"]
      args: ["infinity"]
      resources:
        limits:
          tecorigin.com/gpucore: 4
```

Because the scheduler refuses to spread a request that fits one card, `4` cores on a node with 4-core cards can only be served by one card with all four cores free. No other container shares that card.

:::note

The count must match the cards on the node. On 3-core cards the equivalent request is `3`; `4` would be split as 3 + 1 over two cards.

:::

Several whole cards are no different — ask for the sum:

```yaml
      resources:
        limits:
          tecorigin.com/gpucore: 8 # two whole 4-core cards
```

HAMi spreads that request over as few cards as possible, so it takes two whole cards here and does not fragment a third.

## Check the allocation

```bash
kubectl get pod teco-whole-card -o yaml | grep hami.io/tecorigin-devices-allocated
```

A whole 4-core card shows the mask `15` (`0b1111`):

```text
hami.io/tecorigin-devices-allocated: 3CP100241200184,Tecorigin,0,15
```