---
title: 使用独占 GPU
translated: true
---

## 将设备核心分配给容器

要以独占模式使用 GPU，这是 nvidia-k8s-device-plugin 的默认行为，您只需分配 `nvidia.com/gpu` 而无需其他资源字段。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:18.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2 # 请求 2 个 vGPU
```
