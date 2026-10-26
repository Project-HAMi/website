---
title: 为容器分配设备显存
translated: true
---

通过指定资源如 `nvidia.com/gpumem` 来分配一定大小的设备显存。可选项，每个 `nvidia.com/gpumem` 单位等于 1M。

请将 `nvidia.com/gpumem` 设置为不带单位后缀的非负整数。

```yaml
      resources:
        limits:
          nvidia.com/gpu: 1 # 请求 1 个 GPU
          nvidia.com/gpumem: 3000 # 每个 GPU 包含 3000m 设备显存
```

通过指定资源 `nvidia.com/gpumem-percentage` 来分配设备显存的百分比。可选项，每个 `nvidia.com/gpumem-percentage` 单位等于设备显存的 1% 百分比。

```yaml
      resources:
        limits:
          nvidia.com/gpu: 1 # 请求 1 个 GPU
          nvidia.com/gpumem-percentage: 50 # 每个 GPU 包含 50% 设备显存
```

:::note

建议选择一种方式指定显存。若同时设置合法值且 `nvidia.com/gpumem` 设置为大于 0 的整数，显存申请量以 `nvidia.com/gpumem` 为准；若 `nvidia.com/gpumem` 未设置或为 0，且 `nvidia.com/gpumem-percentage` 为 1–100，则按百分比计算显存申请量。

在此版本中，百分比仍可能通过设备评分影响 GPU 选择，因此同时设置两个参数并不意味着百分比会被完全忽略。

:::
