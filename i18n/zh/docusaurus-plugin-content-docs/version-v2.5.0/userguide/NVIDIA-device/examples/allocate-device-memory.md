---
title: 为容器分配特定设备内存
translated: true
---

## 为容器分配特定设备内存

要分配特定大小的 GPU 设备内存，您只需在 `nvidia.com/gpu` 之外分配 `nvidia.com/gpumem`。

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
          nvidia.com/gpumem: 3000 # 每个 vGPU 请求 3G 设备内存
```

> **注意：** *`nvidia.com/gpumem` 不能与 `nvidia.com/gpumem-percentage` 一起使用*