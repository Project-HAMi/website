---
title: Binpack 调度策略
translated: true
---

为了在最小化拓扑损失的情况下分配 沐曦设备，您只需将 `metax-tech.com/gpu` 与注释 `hami.io/node-scheduler-policy: "binpack"` 一起分配。

```yaml
metadata:
  annotations: 
    hami.io/node-scheduler-policy: "binpack" # 当此参数设置为 binpack 时，调度器将尝试最小化拓扑损失。
```
