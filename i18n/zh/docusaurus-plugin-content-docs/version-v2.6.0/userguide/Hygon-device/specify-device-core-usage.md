---
title: 分配设备核心给容器
translated: true
---

## 分配设备核心给容器

通过指定资源 `hygon.com/dcucores` 来分配设备核心资源的百分比。
可选项，每个 `hygon.com/dcucores` 单位等于设备核心的 1%。

```yaml
      resources:
        limits:
          hygon.com/dcunum: 1 # 请求一个 DCU
          hygon.com/dcucores: 15 # 每个 DCU 分配 15% 的设备核心
```
