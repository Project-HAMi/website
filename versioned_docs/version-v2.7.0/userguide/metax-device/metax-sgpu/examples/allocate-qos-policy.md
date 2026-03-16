---
title: Allocate specific QoS policy devices
translated: true
---

Users can configure the QoS policy for tasks using the `metax-tech.com/sgpu-qos-policy` annotation to specify the scheduling policy used by the shared GPU (sGPU). The available sGPU scheduling policies are described in the table below:

| Scheduling Policy | Description |
|-------------------|-------------|
| `best-effort`     | The sGPU has no restriction on compute usage. |
| `fixed-share`     | The sGPU is assigned a fixed compute quota and cannot exceed this limit. |
| `burst-share`     | The sGPU is assigned a fixed compute quota, but may utilize additional GPU compute resources when they are idle. |

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
