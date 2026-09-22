---
title: 为容器分配设备核心和显存资源
sidebar_label: 分配核心和显存
translated: true
---

要分配设备核心资源的某一部分，你只需在容器中使用 `hygon.com/hcunum` 请求的海光 HCU 数量，并分配 `hygon.com/hcucores` 和 `hygon.com/hcumem`。

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
          hygon.com/hcumem: 2000 # 每个 HCU 需要 2000 MiB 设备显存
          hygon.com/hcucores: 15 # 每个 HCU 使用 15% 个设备核心
```
