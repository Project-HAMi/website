---
title: Allocate vxpu device
---

## Allocate vxpu device

To allocate a certain part of device core resource, you need only to assign the `kunlunxin.com/vxpu` along with the `kunlunxin.com/vxpu-memory`

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
          kunlunxin.com/vxpu: 1 # requesting 1 XPU
          kunlunxin.com/vxpu-memory: 24576 # each XPU require 24576 MiB device memory
```