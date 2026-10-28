---
title: Allocate device memory to container
sidebar_label: Allocate device memory
---

Allocate a certain size of device memory by specifying resources such as `nvidia.com/gpumem`. This resource is optional. With the default `memoryFactor: 1`, each unit of `nvidia.com/gpumem` equals 1 MiB.

Use a non-negative integer without suffixes such as `Mi`, `Gi`, or `G`. For example, request `16384` for 16 GiB with the default memory factor. Kubernetes quantity suffixes do not express HAMi memory units.

```yaml
resources:
  limits:
    nvidia.com/gpu: 1 # requesting 1 GPU
    nvidia.com/gpumem: 3000 # Each GPU contains 3000 MiB device memory
```

Allocate a percentage of device memory by specifying resource `nvidia.com/gpumem-percentage`. Optional, each unit of `nvidia.com/gpumem-percentage` equals 1% of device memory. Use a plain integer such as `50` for 50%, without a `%` suffix.

```yaml
resources:
  limits:
    nvidia.com/gpu: 1 # requesting 1 GPU
    nvidia.com/gpumem-percentage: 50 # Each GPU contains 50% device memory
```

:::note

Prefer specifying memory using one of these resources. If both are set and `nvidia.com/gpumem` is a positive integer, it takes precedence when determining the memory request. If `nvidia.com/gpumem` is omitted or 0, a valid `nvidia.com/gpumem-percentage` is used to calculate the memory request.

If `nvidia.com/gpumem-percentage` is 100 and `nvidia.com/gpucores` is not specified, HAMi automatically sets `nvidia.com/gpucores: 100`, even when `nvidia.com/gpumem` is also set to a positive integer.

The `nvidia.com/gpumem-percentage` value must still pass validation even when `nvidia.com/gpumem` is set to a positive integer.

:::
