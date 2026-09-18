---
title: 为容器分配设备显存
sidebar_label: 指定显存
translated: true
---

通过指定资源如 `nvidia.com/gpumem` 来分配一定大小的设备显存。该资源为可选项。在默认配置 `memoryFactor: 1` 下，每个 `nvidia.com/gpumem` 单位等于 1 MiB。

请使用纯整数，不要添加 `Mi`、`Gi` 或 `G` 等后缀。例如，在默认显存系数下，申请 16 GiB 应填写 `16384`。Kubernetes 的资源数量后缀不表示 HAMi 的显存单位。

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

`nvidia.com/gpumem` 和 `nvidia.com/gpumem-percentage` 不能同时分配

:::
