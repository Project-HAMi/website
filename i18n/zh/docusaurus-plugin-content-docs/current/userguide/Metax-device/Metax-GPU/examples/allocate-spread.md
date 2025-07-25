---
title: 使用扩展调度策略分配沐曦设备
translated: true
---

为了以最佳性能分配沐曦设备，您只需将 `metax-tech.com/gpu` 与注释 `hami.io/node-scheduler-policy: "spread"` 一起分配。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
  annotations: 
    hami.io/node-scheduler-policy: "spread" # 当此参数设置为 spread 时，调度器将尝试为此任务找到最佳拓扑。
spec:
  containers:
    - name: ubuntu-container
      image: cr.metax-tech.com/public-ai-release/c500/colossalai:2.24.0.5-py38-ubuntu20.04-amd64 
      imagePullPolicy: IfNotPresent
      command: ["sleep","infinity"]
      resources:
        limits:
          metax-tech.com/gpu: 4 # 请求 4 个沐曦 GPU
```
