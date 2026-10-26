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

Prefer specifying memory using one of these resources. If both values are valid and `nvidia.com/gpumem` is set to a positive integer, the memory request is determined by `nvidia.com/gpumem`. If `nvidia.com/gpumem` is omitted or 0 and `nvidia.com/gpumem-percentage` is 1–100, the memory request is calculated from the percentage.

In this version, the percentage can still affect GPU selection through device scoring, so setting both resources does not mean that the percentage is completely ignored.

:::
