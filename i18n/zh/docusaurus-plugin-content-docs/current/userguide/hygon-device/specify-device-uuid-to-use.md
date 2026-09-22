---
title: 分配到特定设备
sidebar_label: 指定设备
translated: true
---

有时任务可能希望在某个特定的 HCU 上运行，可以在 pod 注释中填写`hygon.com/use-gpuuuid`字段。HAMi 调度器将尝试匹配具有该 UUID 的设备。

例如，具有以下注释的任务将被分配到 UUID 为`HCU-123456`的设备上

```yaml
metadata:
  annotations:
    hygon.com/use-gpuuuid: "HCU-123456"
```

:::note

每个 HCU UUID 在集群中是唯一的，因此分配某个 UUID 意味着将此任务分配到具有该 HCU 的特定节点上

:::
