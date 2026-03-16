---
title: 分配独占设备
translated: true
---

## 分配独占设备

要分配整个海光 DCU 设备，您只需分配 `hygon.com/dcunum`，无需其他字段。

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
          hygon.com/dcunum: 1 # 请求一个 GPU
```