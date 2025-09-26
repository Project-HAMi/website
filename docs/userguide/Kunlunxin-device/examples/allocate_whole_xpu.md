---
title: Allocate a whole xpu card
---

## Allocate exclusive device

To allocate a whole xpu device, you need to only assign `kunlunxin.com/xpu` without other fields. You can allocate multiple XPUs for a container.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: xpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      imagePullPolicy: IfNotPresent
      command: ["sleep","infinity"]
      resources:
        limits:
          kunlunxin.com/xpu: 1 # requesting 1 XPU
```