---
title: 分配独占设备
translated: true
---

要分配整个沐曦 GPU 设备，您只需为容器申请 `metax-tech.com/sgpu` 资源。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      imagePullPolicy: IfNotPresent
      command: ["sleep","infinity"]
      resources:
        limits:
          metax-tech.com/sgpu: 1 # 请求 1 个独占 GPU
```
