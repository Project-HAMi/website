---
title: Allocate device core and memory resource
---

To allocate a certain part of device core resource, you need only to assign the `hygon.com/hcucores` and `hygon.com/hcumem` along with the number of hygon HCUs you requested in the container using `hygon.com/hcunum`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: alexnet-tf-gpu-pod-mem
  labels:
    purpose: demo-tf-amdgpu
spec:
  containers:
    - name: alexnet-tf-gpu-container
      image: image.sourcefind.cn:5000/hcu/admin/base/pytorch:2.1.0-ubuntu22.04-dtk24.04.2-py3.10
      workingDir: /root
      command: ["sleep", "infinity"]
      resources:
        limits:
          hygon.com/hcunum: 1 # requesting an HCU
          hygon.com/hcumem: 2000 # each hcu require 2000 MiB device memory
          hygon.com/hcucores: 15 # each hcu use 15% device cores
```
