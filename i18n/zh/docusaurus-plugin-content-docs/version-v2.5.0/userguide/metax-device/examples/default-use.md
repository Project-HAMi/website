---
title: 分配 metax 设备
translated: true
---

## 分配 metax 设备

要分配 metax 设备，您只需分配 `metax-tech.com/gpu`，无需其他字段。

```
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
spec:
  containers:
    - name: ubuntu-container
      image: cr.metax-tech.com/public-ai-release/c500/colossalai:2.24.0.5-py38-ubuntu20.04-amd64 
      imagePullPolicy: IfNotPresent
      command: ["sleep","infinity"]
      resources:
        limits:
          metax-tech.com/gpu: 1 # 请求 1 个 metax GPU
```
