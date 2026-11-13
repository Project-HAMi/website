---
title: Allocate certain device memory to container
sidebar_label: Allocate certain device memory
---

import FeatureSupport from '@site/src/components/FeatureSupport';

<FeatureSupport features="memMib" />

To allocate a certain size of GPU device memory, you need only to assign `nvidia.com/gpumem` besides `nvidia.com/gpu`.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2 # requesting 2 vGPUs
          nvidia.com/gpumem: 3000 # each vGPU requests 3G device memory
```

:::note

Prefer specifying memory using one of these resources. If both are set and `nvidia.com/gpumem` is a positive integer, it takes precedence when determining the memory request. See [Allocate device memory](../specify-device-memory-usage.md) for details.

:::
