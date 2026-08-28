---
title: 将任务分配给 MIG 实例
translated: true
---

此示例申请两个至少 8000 MiB 的 MIG 实例。调度器会选择满足显存请求的最小允许列表 profile，在 A100-40GB-PCIE 上通常为 `2g.10gb * 2`，在 A100-80GB-SXM 上通常为 `1g.10gb * 2`。

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
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2
          nvidia.com/gpumem: 8000
```
