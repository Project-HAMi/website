---
title: 为容器分配设备显存
sidebar_label: 指定显存
translated: true
---

通过指定资源如 `nvidia.com/gpumem` 来分配一定大小的设备显存。该资源为可选项。在默认配置 `memoryFactor: 1` 下，每个 `nvidia.com/gpumem` 单位等于 1 MiB。

请使用非负整数，不要添加 `Mi`、`Gi` 或 `G` 等后缀。例如，在默认显存系数下，申请 16 GiB 应填写 `16384`。Kubernetes 的资源数量后缀不表示 HAMi 的显存单位。

```yaml
resources:
  limits:
    nvidia.com/gpu: 1 # 请求 1 个 GPU
    nvidia.com/gpumem: 3000 # 每个 GPU 包含 3000 MiB 设备显存
```

通过指定资源 `nvidia.com/gpumem-percentage` 来分配设备显存的百分比。可选项，每个 `nvidia.com/gpumem-percentage` 单位等于设备显存的 1%。请使用纯整数，例如用 `50` 表示 50%，不要添加 `%` 后缀。

```yaml
resources:
  limits:
    nvidia.com/gpu: 1 # 请求 1 个 GPU
    nvidia.com/gpumem-percentage: 50 # 每个 GPU 包含 50% 设备显存
```

:::note

建议选择一种方式指定显存。若同时设置合法值且 `nvidia.com/gpumem` 设置为大于 0 的整数，显存申请量以 `nvidia.com/gpumem` 为准；若 `nvidia.com/gpumem` 未设置或为 0，且 `nvidia.com/gpumem-percentage` 为 1–100，则按百分比计算显存申请量。

在此版本中，百分比仍可能通过设备评分影响 GPU 选择，因此同时设置两个参数并不意味着百分比会被完全忽略。

如果 `nvidia.com/gpumem-percentage` 为 100 且未指定 `nvidia.com/gpucores`，HAMi 会自动补上 `nvidia.com/gpucores: 100`，即使同时将 `nvidia.com/gpumem` 设置为大于 0 的整数。

即使将 `nvidia.com/gpumem` 设置为大于 0 的整数，`nvidia.com/gpumem-percentage` 仍须通过合法性校验。

:::
