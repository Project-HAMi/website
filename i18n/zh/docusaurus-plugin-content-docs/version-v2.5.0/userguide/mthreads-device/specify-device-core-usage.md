---
title: 分配设备核心给容器
translated: true
---

## 为容器分配设备核心

通过指定资源 `mthreads.com/sgpu-core` 来分配部分设备核心资源。可选项，每个 `mthreads.com/smlu-core` 单位等于 1/16 的设备核心。

```
      resources:
        limits:
          mthreads.com/vgpu: 1 # 请求 1 个 GPU
          mthreads.com/sgpu-core: "8" # 每个 GPU 包含 50% 的设备核心
```
