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

建议选择一种方式指定显存。若同时设置这两个参数，且 `nvidia.com/gpumem` 为大于 0 的整数，则显存申请量以 `nvidia.com/gpumem` 为准；若它未设置或为 0，则使用有效的 `nvidia.com/gpumem-percentage` 计算显存申请量。

:::
