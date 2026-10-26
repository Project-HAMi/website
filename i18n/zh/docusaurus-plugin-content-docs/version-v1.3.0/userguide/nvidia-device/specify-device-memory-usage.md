---
title: Allocate device memory
---

## Allocate device memory to container

Allocate a certain size of device memory by specify resources such as `nvidia.com/gpumem`.
Optional, Each unit of `nvidia.com/gpumem` equals to 1M.

请将 `nvidia.com/gpumem` 设置为不带单位后缀的非负整数。

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

建议选择一种方式指定显存。若同时设置合法值且 `nvidia.com/gpumem` 设置为大于 0 的整数，显存申请量以 `nvidia.com/gpumem` 为准；若 `nvidia.com/gpumem` 未设置或为 0，且 `nvidia.com/gpumem-percentage` 为 1–100，则按百分比计算显存申请量。

在此版本中，百分比仍可能通过设备评分影响 GPU 选择，因此同时设置两个参数并不意味着百分比会被完全忽略。

:::
