---
title: 为容器分配 Huawei Ascend-910B 切片
translated: true
---

要分配一定大小的设备显存，需在 `huawei.com/Ascend910B3` 之外同时设置 `huawei.com/Ascend910B3-memory`。

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
          huawei.com/Ascend910B3: 1 # 请求 1 个 NPU
          huawei.com/Ascend910B3-memory: 16384 # 申请 16 GiB 设备显存
```

:::note

模板模式下，显存和算力由所选设备模板共同决定。本例使用默认 910B3 配置中的 `vir05_1c_16g` 模板。其他型号应使用 `devices.ascend.configs` 中对应的资源名称。

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
    hami.io/use-Ascend910B3-uuid: "device-uuid-1,device-uuid-2"
    # 或排除特定的 Huawei Ascend 设备（逗号分隔列表）
    hami.io/no-use-Ascend910B3-uuid: "device-uuid-3,device-uuid-4"
spec:
  # ... 其余 Pod 配置
```
