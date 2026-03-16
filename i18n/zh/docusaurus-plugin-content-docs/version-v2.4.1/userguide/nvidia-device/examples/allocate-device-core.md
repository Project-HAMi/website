---
title: Allocate device core resource
---

## Allocate device core to container

To allocate a certain part of device core resource, you need only to assign the `nvidia.com/gpucores` without other resource fields.

```
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
	  nvidia.com/gpucores: 50 # requesting 50% of each vGPU's core resources
```

> **NOTICE:** *HAMi implements `nvidia.com/gpucores` using time-slice, Therefore, when the core utilization is queried through the nvidia-smi command, there will be fluctuations*