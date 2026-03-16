---
title: Allocate device memory by percentage
---

## Allocate a part of device memory by percentage to container

To allocate a certain size of GPU device memory by percentage, you need only to assign `nvidia.com/gpumem-percentage` besides `nvidia.com/gpu`.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:18.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2 # requesting 2 vGPUs
          nvidia.com/gpumem-percentage: 50 # each vGPU requests 50% of device memory
```

> **NOTICE:** *`nvidia.com/gpumem` can't be used together with `nvidia.com/gpumem-percentage`*