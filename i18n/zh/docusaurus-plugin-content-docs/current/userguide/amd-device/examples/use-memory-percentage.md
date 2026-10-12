---
title: 按百分比分配设备显存
translated: true
---

要按 GPU 显存的比例申请，设置 `amd.com/gpumem-percentage`（1-100）。同时设置 `amd.com/gpumem` 时以 `amd.com/gpumem` 为准。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-gpu-memory-percentage
spec:
  containers:
    - name: rocm
      image: rocm/dev-ubuntu-24.04:7.2.4
      command: ["bash", "-c", "sleep infinity"]
      securityContext:
        allowPrivilegeEscalation: false
      resources:
        limits:
          amd.com/gpu: 1
          amd.com/gpumem-percentage: 25 # share of the GPU's device memory, 1-100 (optional; amd.com/gpumem wins if both are set)
```
