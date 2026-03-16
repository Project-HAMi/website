---
title: 为容器分配设备显存
translated: true
---

## 为容器分配设备显存

通过指定诸如 `mthreads.com/sgpu-memory` 之类的资源来分配设备显存的百分比大小。可选项，每个 `mthreads.com/sgpu-memory` 单位等于 512M 的设备显存。

```yaml
      resources:
        limits:
          mthreads.com/vgpu: 1 # 请求 1 个 MLU
          mthreads.com/sgpu-memory: 32 # 每个 GPU 包含 16G 设备显存
```
