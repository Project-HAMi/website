---
title: 将任务分配给特定的 GPU
translated: true
---

## 将任务分配给特定的 GPU

要将任务分配给特定的 GPU，只需在注释字段中分配 `nvidia.com/use-gpuuuid`。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    nvidia.com/use-gpuuuid: "GPU-123456"
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:18.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2 # 请求 2 个 vGPU
```
