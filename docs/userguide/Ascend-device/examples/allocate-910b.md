---
title: Allocate 910b slice
---

To allocate a certain size of GPU device memory, you need only to assign `huawei.com/ascend910-memory` besides `huawei.com/ascend910`.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ascendhub.huawei.com/public-ascendhub/ascend-mindspore:23.0.RC3-centos7
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend910: 1 # requesting 1 NPU
          huawei.com/Ascend910-memory: 2000 # requesting 2000m device memory
```

> **NOTICE:** *compute resource of Ascend910B is also limited with `huawei.com/Ascend910-memory`, equals to the percentage of device memory allocated.*

## Select Device by UUID

You can specify which Ascend devices a pod uses or excludes by using annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ascend-pod
  annotations:
    # Use specific Ascend devices (comma-separated list)
    hami.io/use-Ascend910B-uuid: "device-uuid-1,device-uuid-2"
    # Or exclude specific Ascend devices (comma-separated list)
    hami.io/no-use-Ascend910B-uuid: "device-uuid-3,device-uuid-4"
spec:
  # ... rest of pod spec
```
