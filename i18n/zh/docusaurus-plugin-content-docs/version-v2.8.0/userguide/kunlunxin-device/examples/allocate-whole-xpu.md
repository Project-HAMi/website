---
title: 分配整个 xpu 卡
---

## 分配独占设备

要分配整个 xpu 设备，您只需要分配 `kunlunxin.com/xpu`，无需其他字段。您可以为容器分配多个 XPU。

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
          kunlunxin.com/xpu: 1 # 请求 1 个 XPU
```