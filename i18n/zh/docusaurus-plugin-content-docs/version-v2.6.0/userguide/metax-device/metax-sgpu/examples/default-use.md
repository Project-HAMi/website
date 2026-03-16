---
title: 为容器分配设备核心和显存资源
translated: true
---

## 为容器分配设备核心和显存资源

要分配设备核心资源的一部分，您只需在容器中使用 `metax-tech.com/sgpu` 申请 Metax GPU 数量的同时，申请 `metax-tech.com/vcore` 和 `metax-tech.com/vmemory`。

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
          metax-tech.com/sgpu: 1 # requesting 1 GPU 
          metax-tech.com/vcore: 60 # each GPU use 60% of total compute cores
          metax-tech.com/vmemory: 4 # each GPU require 4 GiB device memory
```

> **注意：** 当未申请 `metax-tech.com/vcore` 或 `metax-tech.com/vmemory` 资源时，则表示对应资源的满配额
