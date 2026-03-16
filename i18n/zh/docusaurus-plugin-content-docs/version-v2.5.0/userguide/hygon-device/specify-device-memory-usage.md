---
title: 为容器分配设备显存
translated: true
---

## 为容器分配设备显存

通过指定诸如 `hygon.com/dcumem` 之类的资源来分配设备显存的百分比大小。可选项，每个 `hygon.com/dcumem` 单位等于 1M 设备显存。

```yaml
      resources:
        limits:
          hygon.com/dcunum: 1 # 请求 1 个 DCU
          hygon.com/dcumem: 2000 # 每个 DCU 包含 2000M 设备显存
```