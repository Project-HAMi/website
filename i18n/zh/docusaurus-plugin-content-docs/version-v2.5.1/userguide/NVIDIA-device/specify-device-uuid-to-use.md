---
title: 分配到特定设备
translated: true
---

## 分配到特定设备类型

有时任务可能希望在某个特定的GPU上运行，可以在pod注释中填写`nvidia.com/use-gpuuuid`字段。HAMi调度器将尝试匹配具有该UUID的设备。

例如，具有以下注释的任务将被分配到UUID为`GPU-123456`的设备上

```yaml
metadata:
  annotations:
    nvidia.com/use-gpuuuid: "GPU-123456"
```

> **注意：** *每个GPU UUID在集群中是唯一的，因此分配某个UUID意味着将此任务分配到具有该GPU的特定节点上*