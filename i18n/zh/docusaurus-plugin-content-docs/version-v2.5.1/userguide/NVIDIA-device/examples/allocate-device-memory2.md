---
title: 按百分比分配设备内存给容器
translated: true
---

## 按百分比分配设备内存给容器

要按百分比分配一定大小的 GPU 设备内存，您只需在 `nvidia.com/gpu` 之外分配 `nvidia.com/gpumem-percentage`。

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
          nvidia.com/gpumem-percentage: 50 # 每个 vGPU 请求 50% 的设备内存
```

> **注意：** *`nvidia.com/gpumem` 不能与 `nvidia.com/gpumem-percentage` 一起使用*