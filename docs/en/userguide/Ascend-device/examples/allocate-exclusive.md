---
title: Allocate exclusive device
---

To allocate a whole Ascend device, you need to only assign `huawei.com/ascend910` or `huawei.com/310p` without other fields.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
spec:
  containers:
    - name: ubuntu-container
      image: ascendhub.huawei.com/public-ascendhub/ascend-mindspore:23.0.RC3-centos7
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend910B: 2 # requesting 2 whole Ascend 910b devices
```
