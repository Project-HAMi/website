---
title: 为容器分配设备核心和显存资源
translated: true
---

## 为容器分配设备核心和显存

要分配设备核心资源的某一部分，您只需在容器中使用 `cambricon.com/vmlu` 指定所需的寒武纪 MLU 数量，并分配 `cambricon.com/mlu370.smlu.vmemory` 和 `cambricon.com/mlu370.smlu.vcore`。

```yaml
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
              cambricon.com/vmlu: "1"
              cambricon.com/mlu370.smlu.vmemory: "20"
              cambricon.com/mlu370.smlu.vcore: "10"
```
