---
title: 按百分比分配设备显存给容器
translated: true
---

要按百分比分配一定大小的 GPU 设备显存，你只需在 `nvidia.com/gpu` 之外分配 `nvidia.com/gpumem-percentage`。

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
          nvidia.com/gpumem-percentage: 50 # 每个 vGPU 请求 50% 的设备显存
```

:::note

建议选择一种方式指定显存。若同时设置这两个参数，且 `nvidia.com/gpumem` 为大于 0 的整数，则显存申请量以 `nvidia.com/gpumem` 为准。详见[显存分配说明](../specify-device-memory-usage.md)。

:::
s
