---
title: 设备资源隔离
translated: true
---

一个用于设备隔离的简单演示：
一个具有以下资源的任务。

```
      resources:
        limits:
          nvidia.com/gpu: 1 # 请求1个vGPU
          nvidia.com/gpumem: 3000 # 每个vGPU包含3000m设备显存
```

将在容器内看到 3G 设备显存

![img](../resources/hard_limit.jpg)
