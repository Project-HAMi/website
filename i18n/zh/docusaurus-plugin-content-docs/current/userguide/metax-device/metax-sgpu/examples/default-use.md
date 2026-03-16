---
title: 为容器分配设备核心和显存资源
translated: true
---

要分配设备核心资源的一部分，您只需在容器中使用 `metax-tech.com/sgpu` 申请沐曦 GPU 数量的同时，申请 `metax-tech.com/vcore` 和 `metax-tech.com/vmemory`。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04 
      imagePullPolicy: IfNotPresent
      command: ["sleep","infinity"]
      resources:
        limits:
          metax-tech.com/sgpu: 1 # 请求 1 个 GPU 
          metax-tech.com/vcore: 60 # 每个 GPU 使用 60% 的计算核
          metax-tech.com/vmemory: 4 # 每个 GPU 需要 4 GiB 设备显存
```

> **注意：** 当未申请 `metax-tech.com/vcore` 或 `metax-tech.com/vmemory` 资源时，则表示对应资源配额已满。
