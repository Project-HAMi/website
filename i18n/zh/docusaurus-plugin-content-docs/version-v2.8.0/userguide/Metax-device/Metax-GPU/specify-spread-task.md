---
title: 扩展调度策略
translated: true
---

为了分配性能最佳的 沐曦设备，您只需将 `metax-tech.com/gpu` 与注释 `hami.io/node-scheduler-policy: "spread"` 一起分配

```yaml
metadata:
  annotations: 
    hami.io/node-scheduler-policy: "spread" # 当此参数设置为 spread 时，调度器将尝试为此任务找到最佳拓扑。
```
