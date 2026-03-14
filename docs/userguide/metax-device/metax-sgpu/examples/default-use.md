---
title: Allocate device core and memory resource
translated: true
---

To allocate a certain part of device core resource, you need only to assign the `metax-tech.com/vcore` and `metax-tech.com/vmemory` along with the number of Metax GPUs you requested in the container using `metax-tech.com/sgpu`.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
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

> **NOTICE:** *When a `metax-tech.com/vcore` or `metax-tech.com/vmemory` resource is not applied for, it indicates that the quota for the corresponding resource is full*
