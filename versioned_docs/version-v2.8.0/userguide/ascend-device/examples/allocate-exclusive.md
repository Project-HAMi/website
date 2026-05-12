---
title: Allocate exclusive device
---

To allocate a whole Ascend device, set the corresponding resourceName (e.g. `huawei.com/Ascend910B` or `huawei.com/Ascend310P`) without specifying a memory resource.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
spec:
  runtimeClassName: ascend
  containers:
    - name: ubuntu-container
      image: ascendhub.huawei.com/public-ascendhub/ascend-mindspore:23.0.RC3-centos7
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend910B: 2 # requesting 2 whole Ascend 910B devices
```
