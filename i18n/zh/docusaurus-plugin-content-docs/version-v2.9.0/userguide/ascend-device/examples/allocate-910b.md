---
title: 为容器分配 Ascend-910B 切片
translated: true
---

要分配一定大小的设备显存，需在 `huawei.com/Ascend910B` 之外同时设置 `huawei.com/Ascend910B-memory`。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ascend910b-job
spec:
  runtimeClassName: ascend
  containers:
    - name: ubuntu-container
      image: ascendhub.huawei.com/public-ascendhub/ascend-mindspore:23.0.RC3-centos7
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend910B: 1 # 请求 1 个 NPU
          huawei.com/Ascend910B-memory: 2000 # 请求 2000m 设备显存
```

:::note

Ascend910B 的计算资源也受 `huawei.com/Ascend910B-memory` 限制，等于分配的设备显存的百分比。

:::

## 通过 UUID 选择设备

可以使用注解指定 Pod 使用或排除特定 Ascend 设备：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ascend-pod
  annotations:
    # 使用特定的 Ascend 设备（逗号分隔列表）
    hami.io/use-Ascend910B-uuid: "device-uuid-1,device-uuid-2"
    # 或排除特定的 Ascend 设备（逗号分隔列表）
    hami.io/no-use-Ascend910B-uuid: "device-uuid-3,device-uuid-4"
spec:
  # ... 其余 Pod 配置
```
