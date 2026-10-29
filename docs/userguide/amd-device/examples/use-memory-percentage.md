---
title: Allocate device memory by percentage
---

To request device memory as a share of the GPU, set `amd.com/gpumem-percentage` (0-100). If `amd.com/gpumem` is also set to a positive integer, it takes precedence for the memory request. When `amd.com/gpumem` is omitted or 0, a percentage of 0 requests the full GPU memory.

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
          amd.com/gpumem-percentage: 25 # share of the GPU's device memory, 0-100 (optional; amd.com/gpumem takes precedence when set to a positive integer)
```
