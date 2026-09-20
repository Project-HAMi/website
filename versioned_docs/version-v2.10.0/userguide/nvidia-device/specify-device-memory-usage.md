---
title: Allocate device memory to container
sidebar_label: Allocate device memory
---

Allocate a certain size of device memory by specifying resources such as `nvidia.com/gpumem`. This resource is optional. With the default `memoryFactor: 1`, each unit of `nvidia.com/gpumem` equals 1 MiB.

Use a plain integer without suffixes such as `Mi`, `Gi`, or `G`. For example, request `16384` for 16 GiB with the default memory factor. Kubernetes quantity suffixes do not express HAMi memory units.

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

`nvidia.com/gpumem` and `nvidia.com/gpumem-percentage` cannot be assigned together

:::
