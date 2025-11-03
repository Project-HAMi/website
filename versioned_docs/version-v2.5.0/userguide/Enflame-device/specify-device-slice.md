---
title: Allocate Enflame GCU slice
---

## Allocate a portion of GCU

Allocate a portion of device memory by specify resources `enflame.com/vgcu` and `enflame.com/vgcu-percentage`. Each unit of `enflame.com/vgcu-percentage` equals to 1% device memory and computing cores.

```
      resources:
        limits:
          enflame.com/vgcu: 1 # requesting 1 GCU
          enflame.com/vgcu-percentage: 32 # Each GPU contains 32% device memory and cores
```
