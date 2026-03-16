---
title: Assign task to a certain GPU
---

## Assign task to a certain GPU 

To assign a task to a certain GPU, you need only to assign the `nvidia.com/use-gpuuuid` in annotations field.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    nvidia.com/use-gpuuuid: "GPU-123456"
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:18.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2 # requesting 2 vGPUs
```