---
title: Allocate exclusive device
---

To allocate a whole Mthreads device, you need to only assign `mthreads.com/vgpu` without other fields. You can allocate multiple GPUs for a container.

When `mthreads.com/sgpu-memory` and `mthreads.com/sgpu-core` are omitted, the admission webhook fills in the full card: 96 memory units and 16 core groups on MTT S4000, or 160 memory units and 16 core groups on MTT S5000. Filling 160 units on an S5000 requires `devices.mthreads.memoryPerCard` to be `[160]` when installing HAMi.

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
