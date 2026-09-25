---
title: Assign task to certain HCU cards
---

To assign a task to certain HCUs, you need only to assign the `hygon.com/use-gpuuuid` in annotations field.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    hygon.com/use-gpuuuid: "HCU-123,HCU-456" # specify the HCU UUIDs, comma-separated
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          hygon.com/hcunum: 1 # requesting HCU
```
