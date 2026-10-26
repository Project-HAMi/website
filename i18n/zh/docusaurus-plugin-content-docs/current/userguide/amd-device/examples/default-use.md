---
title: 分配整张 GPU
translated: true
---

只设置 `amd.com/gpu` 的 Pod 会获得整张 GPU：全部计算单元和全部显存。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-gpu-pod
spec:
  containers:
    - name: rocm
      image: rocm/dev-ubuntu-24.04:7.2.4
      command: ["bash", "-c", "sleep infinity"]
      securityContext:
        allowPrivilegeEscalation: false
      resources:
        limits:
          amd.com/gpu: 1 # a whole GPU: all its compute units and all its memory
```
