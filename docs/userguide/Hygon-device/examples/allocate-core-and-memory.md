---
title: Allocate device core and memory resource
---

## Allocate device core and memory to container

To allocate a certain part of device core resource, you need only to assign the `hygon.com/dcucores` and `hygon.com/dcumem` along with the number of cambricon DCUs you requested in the container using `hygon.com/dcunum`

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
          hygon.com/dcumem: 2000 # each dcu require 2000 MiB device memory
          hygon.com/dcucores: 15 # each dcu use 15 device cores
```