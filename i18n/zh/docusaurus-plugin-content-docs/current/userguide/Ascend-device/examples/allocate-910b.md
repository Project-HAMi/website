---
title: 为容器分配 Ascend-910B 切片
translated: true
---

## 为容器分配 Ascend-910B 切片

要分配一定大小的GPU设备内存，您只需在`huawei.com/ascend910`之外分配`huawei.com/ascend910-memory`。

```
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
          huawei.com/Ascend910: 1 # 请求1个NPU
          huawei.com/Ascend910-memory: 2000 # 请求2000m设备内存
```

> **注意：** * Ascend910B的计算资源也受`huawei.com/Ascend910-memory`限制，等于分配的设备内存的百分比。 *