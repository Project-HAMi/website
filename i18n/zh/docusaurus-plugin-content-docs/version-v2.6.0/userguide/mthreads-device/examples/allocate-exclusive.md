---
title: 分配独占设备
translated: true
---

## 分配独占设备

要分配整个寒武纪设备，您只需分配 `mthreads.com/vgpu` 而无需其他字段。您可以为一个容器分配多个 GPU。

```
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
