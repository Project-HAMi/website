---
title: 为容器分配设备核心资源
translated: true
---

## 将设备核心分配给容器

要分配设备核心资源的某一部分，您只需分配 `nvidia.com/gpucores`，无需其他资源字段。

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
          nvidia.com/gpu: 2 # 请求2个vGPU
          nvidia.com/gpucores: 50 # 请求每个vGPU核心资源的50%
```

> **注意：** *HAMi 使用时间片实现 `nvidia.com/gpucores`，因此，当通过 nvidia-smi 命令查询核心利用率时，会有波动*