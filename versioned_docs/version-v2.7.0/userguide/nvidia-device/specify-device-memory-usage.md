---
title: Allocate device memory
---

## Allocate device memory to container

Allocate a certain size of device memory by specify resources such as `nvidia.com/gpumem`.
Optional, Each unit of `nvidia.com/gpumem` equals to 1M.

Set `nvidia.com/gpumem` to a non-negative integer without a unit suffix.

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

:::note

Prefer specifying memory using one of these resources. If both are set and `nvidia.com/gpumem` is a positive integer, it takes precedence when determining the memory request. If `nvidia.com/gpumem` is omitted or 0, a valid `nvidia.com/gpumem-percentage` is used to calculate the memory request.

If `nvidia.com/gpumem-percentage` is 100 and `nvidia.com/gpucores` is not specified, HAMi automatically sets `nvidia.com/gpucores: 100`, even when `nvidia.com/gpumem` is also set to a positive integer.

:::
