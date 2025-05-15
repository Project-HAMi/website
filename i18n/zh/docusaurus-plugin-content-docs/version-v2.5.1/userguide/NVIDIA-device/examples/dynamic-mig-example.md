---
title: 将任务分配给 mig 实例
translated: true
---

## 此示例将为 A100-40GB-PCIE 设备分配 2g.10gb * 2 或为 A100-80GB-XSM 设备分配 1g.10gb * 2。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    nvidia.com/vgpu-mode: "mig"
    hami.io/gpu-scheduler-policy: "binpack" #(可选)
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:18.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2
          nvidia.com/gpumem: 8000
```
