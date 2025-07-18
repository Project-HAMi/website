---
title: 分配到特定设备
translated: true
---

## 分配到特定设备类型

有时任务可能希望在某个特定的DCU上运行，可以在pod注释中填写`hygon.com/use-gpuuuid`字段。HAMi调度器将尝试匹配具有该UUID的设备。

例如，具有以下注释的任务将被分配到UUID为`DCU-123456`的设备上

```yaml
metadata:
  annotations:
    hygon.com/use-gpuuuid: "DCU-123456"
```

> **注意：** *每个DCU UUID在集群中是唯一的，因此分配某个UUID意味着将此任务分配到具有该DCU的特定节点上*