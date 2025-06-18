---
title: Allocate specific Qos policy devices
translated: true
---

## Allocate specific Qos policy devices

Users can configure the Qos Policy parameter for tasks via `metax-tech.com/sgpu-qos-policy` to specify the scheduling policy used by the sGPU. The specific sGPU scheduling policy description can be found in the following table.

| scheduling policy   | description |
| --- | --- |
| `best-effort`   | sGPU is no limit on computing power   |
| `fixed-share`   | sGPU is a fixed computing power quota, and it cannot be used beyond the fixed quota  |
| `burst-share`   | sGPU is a fixed computing power quota. If the GPU card still has idle computing power, it can be used by the sGPU |

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    metax-tech.com/sgpu-qos-policy: "best-effort" # allocate specific qos sgpu
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      imagePullPolicy: IfNotPresent
      command: ["sleep","infinity"]
      resources:
        limits:
          metax-tech.com/sgpu: 1 # requesting 1 GPU
          metax-tech.com/vcore: 60 # each GPU use 60% of total compute cores
          metax-tech.com/vmemory: 4 # each GPU require 4 GiB device memory
```
