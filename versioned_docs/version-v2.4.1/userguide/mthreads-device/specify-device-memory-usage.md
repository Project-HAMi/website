---
title: Allocate device memory
---

## Allocate device memory to container

Allocate a percentage size of device memory by specify resources such as `mthreads.com/sgpu-memory`.
Optional, Each unit of `mthreads.com/sgpu-memory` equals to 512M of device memory.

```
      resources:
        limits:
          mthreads.com/vgpu: 1 # requesting 1 MLU
          mthreads.com/sgpu-memory: 32 # Each GPU contains 16G device memory
```