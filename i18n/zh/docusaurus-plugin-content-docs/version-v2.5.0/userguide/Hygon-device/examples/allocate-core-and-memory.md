---
title: 为容器分配设备核心和显存资源
translated: true
---

## 为容器分配设备核心和显存

要分配设备核心资源的某一部分，您只需在容器中使用 `hygon.com/dcunum` 请求的 cambricon DCU 数量，并分配 `hygon.com/dcucores` 和 `hygon.com/dcumem`。

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
      image: image.sourcefind.cn:5000/dcu/admin/base/pytorch:2.1.0-centos7.6-dtk24.04-py310
      workingDir: /root
      command: ["sleep","infinity"]
      resources:
        limits:
          hygon.com/dcunum: 1 # 请求一个 GPU
          hygon.com/dcumem: 2000 # 每个 dcu 需要 2000 MiB 设备显存
          hygon.com/dcucores: 15 # 每个 dcu 使用 15 个设备核心
```
