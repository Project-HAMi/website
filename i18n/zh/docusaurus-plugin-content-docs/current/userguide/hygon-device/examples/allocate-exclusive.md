---
title: 分配独占设备
sidebar_label: 独占设备
translated: true
---

要分配整个海光 HCU 设备，你只需分配 `hygon.com/hcunum`，无需其他字段。

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
          hygon.com/hcunum: 1 # 请求一个 HCU
```
