---
title: Assign task to a certain type
---

## Assign task to a certain type

To assign a task to a certain GPU type, you need only to assign the `nvidia.com/use-gputype` in annotations field.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    nvidia.com/use-gputype: "A100,V100"
    #In this example, we want to run this job on A100 or V100
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:18.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2 # requesting 2 vGPUs
```

> **NOTICE:** * You can assign this task to multiple GPU types, use comma to separate,In this example, we want to run this job on A100 or V100*
