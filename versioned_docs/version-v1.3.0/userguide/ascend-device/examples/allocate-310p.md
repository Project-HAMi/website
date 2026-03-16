---
title: Allocate 310p slice
---

## Allocate a Ascend-310p slice to container

To allocate a certain size of GPU device memory, you need only to assign `huawei.com/ascend310P-memory` besides `huawei.com/ascend310P`.

```
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

> **NOTICE:** * compute resource of Ascend910B is also limited with `huawei.com/Ascend310P-memory`, equals to the percentage of device memory allocated. *