---
title: 分配独占设备
translated: true
---

## 分配独占设备

要分配整个寒武纪设备，您只需分配 `cambricon.com/vmlu`，无需其他字段。

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: binpack-1
  labels:
    app: binpack-1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: binpack-1
  template:
    metadata:
      labels:
        app: binpack-1
    spec:
      containers:
        - name: c-1
          image: ubuntu:18.04
          command: ["sleep"]
          args: ["100000"]
          resources:
            limits:
              cambricon.com/vmlu: "1" #分配整个 MLU
```
