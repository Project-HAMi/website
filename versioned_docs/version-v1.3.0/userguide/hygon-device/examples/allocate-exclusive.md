---
title: Allocate exclusive device
---

## Allocate exclusive device

To allocate a whole cambricon device, you need to only assign `hygon.com/dcunum` without other fields.

```
apiVersion: v1
kind: Pod
metadata:
  name: alexnet-tf-gpu-pod-mem
  labels:
    purpose: demo-tf-amdgpu
spec:
  containers:
    - name: alexnet-tf-gpu-container
      image: image.sourcefind.cn:5000/dcu/admin/base/pytorch:2.1.0-centos7.6-dtk24.04-py310
      workingDir: /root
      command: ["sleep","infinity"]
      resources:
        limits:
          hygon.com/dcunum: 1 # requesting a GPU
```