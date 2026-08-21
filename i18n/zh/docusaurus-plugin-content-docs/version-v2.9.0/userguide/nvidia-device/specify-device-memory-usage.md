---
title: 为容器分配设备显存
sidebar_label: 指定显存
translated: true
---

通过指定资源如 `nvidia.com/gpumem` 来分配一定大小的设备显存。可选项，每个 `nvidia.com/gpumem` 单位等于 1M。

```yaml
resources:
  limits:
    nvidia.com/gpu: 1 # 请求 1 个 GPU
    nvidia.com/gpumem: 3000 # 每个 GPU 包含 3000 MiB 设备显存
```

:::warning

请将 `nvidia.com/gpumem` 设置为**纯整数**（以 MiB 为单位计数），不要使用 Kubernetes 数量单位。带单位的值（例如 `16Gi`）会被解析为字节数（约 170 亿），从而超出 HAMi 的 32 位显存字段范围并被静默截断，通常截断为 `0`。显存请求为 0 时会无条件通过调度器的显存检查，导致 Pod 被调度到显存已满的设备上，并在运行时发生显存不足（OOM）。请使用上面示例中的整数形式（例如 `3000`）。

:::

通过指定资源 `nvidia.com/gpumem-percentage` 来分配设备显存的百分比。可选项，每个 `nvidia.com/gpumem-percentage` 单位等于设备显存的 1% 百分比。

```yaml
resources:
  limits:
    nvidia.com/gpu: 1 # 请求 1 个 GPU
    nvidia.com/gpumem-percentage: 50 # 每个 GPU 包含 50% 设备显存
```

:::note

`nvidia.com/gpumem` 和 `nvidia.com/gpumem-percentage` 不能同时分配

:::
