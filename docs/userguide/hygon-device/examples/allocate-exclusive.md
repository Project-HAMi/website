---
title: Allocate exclusive device
---

To allocate a whole hygon HCU device, you need to only assign `hygon.com/hcunum` without other fields.

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
```
