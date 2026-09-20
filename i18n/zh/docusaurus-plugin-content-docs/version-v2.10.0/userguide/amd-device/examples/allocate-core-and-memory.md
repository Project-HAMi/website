---
title: 分配设备核心和显存资源
translated: true
---

若要分配部分 AMD GPU 资源，只需在请求 GPU 数量 `amd.com/gpu` 的同时设置 `amd.com/gpucores` 和 `amd.com/gpumem`。

以下示例请求一张 GPU，并分配 48 GiB 显存和 25% 计算单元：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-vgpu-example
spec:
  schedulerName: hami-scheduler
  restartPolicy: Never
  containers:
    - name: pytorch
      image: rocm/pytorch:latest
      command: ["bash", "-c"]
      args:
        - |
          env | grep -E 'LD_AUDIT|HIP_DEVICE_MEMORY_LIMIT'
          python3 -c 'import torch; print(torch.cuda.mem_get_info(0)); print(torch.cuda.get_device_name(0))'
          sleep 300
      resources:
        limits:
          amd.com/gpu: 1 # 请求一个 AMD GPU
          amd.com/gpumem: 49152 # 每个 GPU 包含 49152 MiB 设备显存
          amd.com/gpucores: 25 # 每个 GPU 分配 25% 的计算单元
```
