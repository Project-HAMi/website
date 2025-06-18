---
title: 为容器分配设备核心和内存资源
translated: true
---

## 为容器分配设备核心和内存

要分配设备核心资源的一部分，您只需在容器中使用 `mthreads.com/vgpu` 请求的寒武纪 MLU 数量的同时，分配 `mthreads.com/sgpu-memory` 和 `mthreads.com/sgpu-core`。

```
apiVersion: v1
kind: Pod
metadata:
  name: gpushare-pod-default
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
          mthreads.com/vgpu: 1
          mthreads.com/sgpu-memory: 32
          mthreads.com/sgpu-core: 8
```
