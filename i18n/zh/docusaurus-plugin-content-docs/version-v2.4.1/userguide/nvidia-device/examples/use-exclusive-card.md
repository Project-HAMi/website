---
title: Use exclusive GPU
---

## Allocate device core to container

To use GPU in an exclusive mode, which is the default behaviour of nvidia-k8s-device-plugin, you need only to assign the `nvidia.com/gpu` without other resource fields.

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
```