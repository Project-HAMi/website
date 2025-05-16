---
title: 使用 binpack 调度策略分配 metax 设备
translated: true
---

## 使用 binpack 调度策略分配 metax 设备

要在最小化拓扑损失的情况下分配 metax 设备，您只需将 `metax-tech.com/gpu` 与注释 `hami.io/node-scheduler-policy`=`binpack` 一起分配。

```
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
  annotations: 
    hami.io/node-scheduler-policy: "binpack" # 当此参数设置为 binpack 时，调度器将尝试最小化拓扑损失。
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
