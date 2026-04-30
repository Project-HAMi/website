---
title: Allocate device memory to container
linktitle: Allocate device memory
---

Allocate a certain size of device memory by specify resources such as `nvidia.com/gpumem`.
Optional, each unit of `nvidia.com/gpumem` equals 1 MiB.

```yaml
      resources:
        limits:
          nvidia.com/gpu: 1 # requesting 1 GPU
          nvidia.com/gpumem: 3000 # Each GPU contains 3000m device memory
```

Allocate a percentage of device memory by specify resource `nvidia.com/gpumem-percentage`.
Optional, each unit of `nvidia.com/gpumem-percentage` equals 1% of device memory.

```yaml
      resources:
        limits:
          nvidia.com/gpu: 1 # requesting 1 GPU
          nvidia.com/gpumem-percentage: 50 # Each GPU contains 50% device memory
```

> **NOTICE:** *`nvidia.com/gpumem` and `nvidia.com/gpumem-percentage` can't be assigned together*
