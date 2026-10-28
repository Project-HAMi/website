---
title: 为容器分配设备显存
sidebar_label: 指定显存
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

建议选择一种方式指定显存。若同时设置这两个参数，且 `nvidia.com/gpumem` 为大于 0 的整数，则显存申请量以 `nvidia.com/gpumem` 为准；若它未设置或为 0，则使用有效的 `nvidia.com/gpumem-percentage` 计算显存申请量。

如果 `nvidia.com/gpumem-percentage` 为 100 且未指定 `nvidia.com/gpucores`，HAMi 会自动补上 `nvidia.com/gpucores: 100`，即使同时将 `nvidia.com/gpumem` 设置为大于 0 的整数。

:::
