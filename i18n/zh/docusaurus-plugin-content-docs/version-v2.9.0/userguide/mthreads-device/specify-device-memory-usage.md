---
title: 为容器分配设备显存
sidebar_label: 指定显存
translated: true
---

通过指定 `mthreads.com/sgpu-memory` 资源来分配设备显存。可选项，每个 `mthreads.com/sgpu-memory` 单位代表 512MiB 的设备显存。

```yaml
resources:
  limits:
    mthreads.com/vgpu: 1 # 请求 1 个 GPU
    mthreads.com/sgpu-memory: 32 # 32 个单位 x 512MiB = 16 GiB 设备显存
```
