---
title: Allocate device memory to container
linktitle: Allocate device memory
---

Allocate a certain size of device memory by specifying resources such as `nvidia.com/gpumem`.
Optional, each unit of `nvidia.com/gpumem` equals 1 MiB.

Set `nvidia.com/gpumem` to a non-negative integer without a unit suffix.

```yaml
      resources:
        limits:
          nvidia.com/gpu: 1 # requesting 1 GPU
          nvidia.com/gpumem: 3000 # Each GPU contains 3000m device memory
```

Allocate a percentage of device memory by specifying resource `nvidia.com/gpumem-percentage`.
Optional, each unit of `nvidia.com/gpumem-percentage` equals 1% of device memory.

```yaml
      resources:
        limits:
          nvidia.com/gpu: 1 # requesting 1 GPU
          nvidia.com/gpumem-percentage: 50 # Each GPU contains 50% device memory
```

:::note

Prefer specifying memory using one of these resources. If both values are valid and `nvidia.com/gpumem` is set to a positive integer, the memory request is determined by `nvidia.com/gpumem`. If `nvidia.com/gpumem` is omitted or 0 and `nvidia.com/gpumem-percentage` is 1–100, the memory request is calculated from the percentage.

In this version, the percentage can still affect GPU selection through device scoring, so setting both resources does not mean that the percentage is completely ignored.

If `nvidia.com/gpumem-percentage` is 100 and `nvidia.com/gpucores` is not specified, HAMi automatically sets `nvidia.com/gpucores: 100`, even when `nvidia.com/gpumem` is also set to a positive integer.

:::
