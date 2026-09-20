---
title: 分配独占设备
translated: true
---

要分配整个 Huawei Ascend 设备，只需设置对应的 resourceName（如 `huawei.com/Ascend910B` 或 `huawei.com/Ascend310P`），不需要指定显存资源。

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
          huawei.com/Ascend910B: 2 # 请求 2 个完整的 Huawei Ascend 910B 设备
```
