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
