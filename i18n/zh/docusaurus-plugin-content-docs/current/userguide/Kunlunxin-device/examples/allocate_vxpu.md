---
title: 分配 vxpu 设备
---

## 分配 vxpu 设备

要分配特定显存大小的vxpu，您只需要分配 `kunlunxin.com/vxpu` 以及 `kunlunxin.com/vxpu-memory`

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
          kunlunxin.com/vxpu: 1 # 请求 1 个 XPU
          kunlunxin.com/vxpu-memory: 24576 # 每个 XPU 需要 24576 MiB 设备内存
```