---
title: Allocate device core usage
---

## Allocate device core to container

Allocate a part of device core resources by specify resource `mthreads.com/sgpu-core`.
Optional, each unit of `mthreads.com/smlu-core` equals to 1/16 device cores.

```
      resources:
        limits:
          mthreads.com/vgpu: 1 # requesting 1 GPU
          mthreads.com/sgpu-core: "8" # Each GPU contains 50% device cores
```