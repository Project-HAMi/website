---
title: 分配独占设备
sidebar_label: 独占设备
translated: true
---

要分配整个摩尔线程设备，你只需分配 `mthreads.com/vgpu` 而无需其他字段。你可以为一个容器分配多个 GPU。

当省略 `mthreads.com/sgpu-memory` 和 `mthreads.com/sgpu-core` 时，准入 webhook 会自动补全整卡配置：MTT S4000 为 96 个显存单位和 16 个算力核组，MTT S5000 为 160 个显存单位和 16 个算力核组。在 S5000 上补全 160 个单位要求安装 HAMi 时将 `devices.mthreads.memoryPerCard` 设置为 `[160]`。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpushare-pod-multi-cards
spec:
  restartPolicy: OnFailure
  containers:
    - image: core.harbor.zlidc.mthreads.com:30003/mt-ai/lm-qy2:v17-mpc
      imagePullPolicy: IfNotPresent
      name: gpushare-pod-1
      command: ["sleep"]
      args: ["100000"]
      resources:
        limits:
          mthreads.com/vgpu: 2
```
