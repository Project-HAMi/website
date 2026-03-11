---
title: Allocate device memory
---

## Allocate device memory to container

Allocate a certain size of device memory by specify resources such as `nvidia.com/gpumem`.
Optional, Each unit of `nvidia.com/gpumem` equals to 1M.

```yaml
      resources:
        limits:
          nvidia.com/gpu: 1 # requesting 1 GPU
          nvidia.com/gpumem: 3000 # Each GPU contains 3000m device memory
```

Allocate a percentage of device memory by specify resource `nvidia.com/gpumem-percentage`.
Optional, each unit of `nvidia.com/gpumem-percentage` equals to 1% percentage of device memory.

```yaml
      resources:
        limits:
          nvidia.com/gpu: 1 # requesting 1 GPU
          nvidia.com/gpumem-percentage: 50 # Each GPU contains 50% device memory
```

> **NOTICE:** *`nvidia.com/gpumem` and `nvidia.com/gpumem-percentage` can't be assigned together*
