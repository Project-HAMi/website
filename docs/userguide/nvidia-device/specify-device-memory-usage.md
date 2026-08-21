---
title: Allocate device memory to container
sidebar_label: Allocate device memory
---

Allocate a certain size of device memory by specifying resources such as `nvidia.com/gpumem`. Optional, each unit of `nvidia.com/gpumem` equals 1 MiB.

```yaml
resources:
  limits:
    nvidia.com/gpu: 1 # requesting 1 GPU
    nvidia.com/gpumem: 3000 # Each GPU contains 3000 MiB device memory
```

:::warning

Set `nvidia.com/gpumem` as a **plain integer** (a count of MiB), not a Kubernetes quantity. A suffixed value such as `16Gi` is parsed as its byte count (about 17 billion), which overflows HAMi's 32-bit memory field and is silently truncated, often to `0`. A zero memory request passes the scheduler's memory check unconditionally, so the pod can be placed on a GPU that is already full and then fails with out-of-memory errors at runtime. Use the integer form shown above (for example `3000`).

:::

Allocate a percentage of device memory by specifying resource `nvidia.com/gpumem-percentage`. Optional, each unit of `nvidia.com/gpumem-percentage` equals 1% of device memory.

```yaml
resources:
  limits:
    nvidia.com/gpu: 1 # requesting 1 GPU
    nvidia.com/gpumem-percentage: 50 # Each GPU contains 50% device memory
```

:::note

`nvidia.com/gpumem` and `nvidia.com/gpumem-percentage` cannot be assigned together

:::
