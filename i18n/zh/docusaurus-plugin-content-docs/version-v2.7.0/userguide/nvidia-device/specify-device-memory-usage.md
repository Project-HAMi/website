---
title: 为容器分配设备显存
translated: true
---

## 为容器分配设备显存

通过指定资源如 `nvidia.com/gpumem` 来分配一定大小的设备显存。可选项，每个 `nvidia.com/gpumem` 单位等于 1M。

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

> **注意：** *`nvidia.com/gpumem` 和 `nvidia.com/gpumem-percentage` 不能同时分配*
