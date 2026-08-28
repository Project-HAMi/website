---
title: Assign task to MIG instance
---

This example requests two MIG instances with at least 8000 MiB each. The scheduler selects the smallest allowlisted profile that satisfies the memory request, typically `2g.10gb * 2` on A100-40GB-PCIE or `1g.10gb * 2` on A100-80GB-SXM.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    nvidia.com/vgpu-mode: "mig"
    hami.io/gpu-scheduler-policy: "binpack" #(Optional)
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
