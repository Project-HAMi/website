---
title: 分配独占设备
translated: true
---

要分配整个 Ascend 设备，您只需分配 `huawei.com/ascend910` 或 `huawei.com/310p`，无需其他字段。

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
          huawei.com/Ascend910B: 2 # 请求 2 个完整的 Ascend 910b 设备
```
