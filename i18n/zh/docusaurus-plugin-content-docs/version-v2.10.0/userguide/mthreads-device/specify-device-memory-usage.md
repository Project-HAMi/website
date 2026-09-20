---
title: 为容器分配设备显存
sidebar_label: 指定显存
translated: true
---

通过可选资源 `mthreads.com/sgpu-memory` 分配固定大小的设备显存。每个单位等于 512 MiB。

共享 GPU 支持的取值为 `2`、`4`、`8`、`16`、`32`、`64` 和 `96`。请使用列表中的纯整数，不要添加 `Mi`、`Gi` 或 `G` 等后缀。该值表示显存单位数，不是百分比。

```yaml
resources:
  limits:
    mthreads.com/vgpu: 1 # 请求 1 个 GPU
    mthreads.com/sgpu-memory: 32 # 分配 32 x 512 MiB = 16 GiB
```
