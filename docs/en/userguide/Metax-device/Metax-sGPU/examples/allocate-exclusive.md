---
title: Allocate exclusive device
translated: true
---

To allocate a whole Metax GPU device, you need to only assign `metax-tech.com/sgpu` without other fields.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      imagePullPolicy: IfNotPresent
      command: ["sleep","infinity"]
      resources:
        limits:
          metax-tech.com/sgpu: 1 # requesting 1 exclusive GPU
```
