---
title: Allocate certain device memory
---

## Allocate certain device memory to container

To allocate a certain size of GPU device memory, you need only to assign `nvidia.com/gpumem` besides `nvidia.com/gpu`.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:18.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2 # requesting 2 vGPUs
   nvidia.com/gpumem: 3000 # each vGPU requests 3G device memory
```

:::note

建议选择一种方式指定显存。若同时设置这两个参数，且 `nvidia.com/gpumem` 为大于 0 的整数，则显存申请量以 `nvidia.com/gpumem` 为准。详见[显存分配说明](../specify-device-memory-usage.md)。

:::
