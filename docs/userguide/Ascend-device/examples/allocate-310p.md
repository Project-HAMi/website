---
title: Allocate 310p slice
---

To allocate a certain size of GPU device memory, you need only to assign `huawei.com/ascend310P-memory` besides `huawei.com/ascend310P`.

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

> **NOTICE:** *compute resource of Ascend310P is also limited with `huawei.com/Ascend310P-memory`, equals to the percentage of device memory allocated.*

## Select Device by UUID

You can specify which Ascend devices a pod uses or excludes by using annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ascend-pod
  annotations:
    # Use specific Ascend devices (comma-separated list)
    hami.io/use-Ascend310P-uuid: "device-uuid-1,device-uuid-2"
    # Or exclude specific Ascend devices (comma-separated list)
    hami.io/no-use-Ascend310P-uuid: "device-uuid-3,device-uuid-4"
spec:
  # ... rest of pod spec
```

