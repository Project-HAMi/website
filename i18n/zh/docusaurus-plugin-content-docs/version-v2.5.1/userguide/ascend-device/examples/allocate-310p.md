---
title: 为容器分配 Ascend-310p 切片
translated: true
---

要分配一定大小的 GPU 设备显存，您只需在 `huawei.com/ascend310P` 之外分配 `huawei.com/ascend310P-memory`。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ascend310p-pod
spec:
  tolerations:
    - key: aaa
      operator: Exists
      effect: NoSchedule
  containers:
    - name: ubuntu-container
      image: swr.cn-south-1.myhuaweicloud.com/ascendhub/ascend-pytorch:24.0.RC1-A2-1.11.0-ubuntu20.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend310P: 1
          huawei.com/Ascend310P-memory: 1024
```

> **注意：** *Ascend910B 的计算资源也受到 `huawei.com/Ascend310P-memory` 的限制，等于分配的设备显存的百分比。*
