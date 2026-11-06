---
title: 分配设备显存
translated: true
---

要限制 Pod 的设备显存，在设置 `amd.com/gpu` 的同时用 `amd.com/gpumem` 指定 MiB 数。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-gpu-memory
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
          amd.com/gpumem: 4096 # MiB of device memory this pod may allocate on the GPU (optional, integer)
```
