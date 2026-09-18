---
title: Allocate device core and memory resource
---

To allocate a certain part of device core resource, you need only to assign the `mthreads.com/sgpu-memory` and `mthreads.com/sgpu-core` along with the number of Mthreads GPUs you requested in the container using `mthreads.com/vgpu`.

The following example requests a 16 GiB / 50% core slice, which is valid on both MTT S4000 and MTT S5000:

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

On an MTT S5000, larger slices up to the full 80 GiB card are available (requires `devices.mthreads.memoryPerCard` set to `[160]`):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpushare-pod-s5000
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
          mthreads.com/sgpu-memory: 128 # 128 x 512 MiB = 64 GiB, MTT S5000 only
          mthreads.com/sgpu-core: 8
```
