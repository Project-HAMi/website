---
title: 为容器分配 Huawei Ascend-310P 切片
translated: true
---

要分配一定大小的设备显存，需在 `huawei.com/Ascend310P` 之外同时设置 `huawei.com/Ascend310P-memory`。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ascend310p-job
spec:
  runtimeClassName: ascend
  containers:
    - name: ubuntu-container
      image: swr.cn-south-1.myhuaweicloud.com/ascendhub/ascend-pytorch:24.0.RC1-A2-1.11.0-ubuntu20.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend310P: 1 # 请求 1 个 NPU
          huawei.com/Ascend310P-memory: 2000 # 请求 2000m 设备显存
```

:::note

Ascend310P 的计算资源也受 `huawei.com/Ascend310P-memory` 限制，等于分配的设备显存的百分比。

:::

## 通过 UUID 选择设备

可以使用注解指定 Pod 使用或排除特定 Huawei Ascend 设备：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ascend-pod
  annotations:
    # 使用特定的 Huawei Ascend 设备（逗号分隔列表）
    hami.io/use-Ascend310P-uuid: "device-uuid-1,device-uuid-2"
    # 或排除特定的 Huawei Ascend 设备（逗号分隔列表）
    hami.io/no-use-Ascend310P-uuid: "device-uuid-3,device-uuid-4"
spec:
  # ... 其余 Pod 配置
```
