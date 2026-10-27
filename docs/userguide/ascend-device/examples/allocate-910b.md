---
title: Allocate 910B3 slice
---

To allocate a certain size of device memory, assign `huawei.com/Ascend910B3-memory` alongside `huawei.com/Ascend910B3`.

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
          huawei.com/Ascend910B3: 1 # requesting 1 NPU
          huawei.com/Ascend910B3-memory: 2000 # Request 2000 MiB of device memory
```

:::note

With the default 910B3 templates, this 2000 MiB request selects `vir05_1c_16g`, which provides 16384 MiB of memory and 5 AI cores. Memory and compute are determined by the selected template.

:::

## Select Device by UUID

You can specify which Huawei Ascend devices a pod uses or excludes by using annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ascend-pod
  annotations:
    # Use specific Huawei Ascend devices (comma-separated list)
    hami.io/use-Ascend910B3-uuid: "device-uuid-1,device-uuid-2"
    # Or exclude specific Huawei Ascend devices (comma-separated list)
    hami.io/no-use-Ascend910B3-uuid: "device-uuid-3,device-uuid-4"
spec:
  # ... rest of pod spec
```
