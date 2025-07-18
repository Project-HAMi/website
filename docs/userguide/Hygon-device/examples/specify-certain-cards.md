---
title: Assign task to certain DCU cards
---

## Assign task to certain DCU cards

To assign a task to certain DCUs, you need only to assign the `hygon.com/use-gpuuuid` in annotations field.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    hygon.com/use-gpuuuid: "DCU-123,DCU-456" # specify the DCU UUIDs, comma-separated
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:18.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          hygon.com/dcunum: 1 # requesting DCU
```