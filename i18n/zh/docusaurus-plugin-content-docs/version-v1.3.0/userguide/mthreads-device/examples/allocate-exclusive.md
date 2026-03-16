---
title: Allocate exclusive device
---

## Allocate exclusive device

To allocate a whole cambricon device, you need to only assign `mthreads.com/vgpu` without other fields. You can allocate multiple GPUs for a container.

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