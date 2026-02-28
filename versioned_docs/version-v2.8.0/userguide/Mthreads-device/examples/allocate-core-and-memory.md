---
title: Allocate device core and memory resource
---

## Allocate device core and memory to container

To allocate a certain part of device core resource, you need only to assign the `mthreads.com/sgpu-memory` and `mthreads.com/sgpu-core` along with the number of cambricon MLUs you requested in the container using `mthreads.com/vgpu`

```yaml
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
