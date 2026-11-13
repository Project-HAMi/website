---
title: 分配设备核心给容器
sidebar_label: 指定核心
translated: true
---

通过指定资源 `hygon.com/hcucores` 来分配设备核心资源的百分比。可选项，每个 `hygon.com/hcucores` 单位等于设备核心的 1%。

```yaml
resources:
  limits:
    hygon.com/hcunum: 1 # 请求 1 个 HCU
    hygon.com/hcucores: 15 # 每个 HCU 分配 15% 的设备核心
```
