---
title: 分配设备核心给容器
translated: true
---

## 分配设备核心给容器

通过指定资源 `nvidia.com/gpucores` 来分配设备核心资源的百分比。可选项，每个单位的 `nvidia.com/gpucores` 等于设备核心的 1%。

```yaml
      resources:
        limits:
          nvidia.com/gpu: 1 # 请求 1 个 GPU
          nvidia.com/gpucores: 50 # 每个 GPU 分配 50% 的设备核心。
```

> **注意：** *HAMi-core 使用时间片来限制设备核心的使用。因此，通过 nvidia-smi 查看 GPU 利用率时会有波动*