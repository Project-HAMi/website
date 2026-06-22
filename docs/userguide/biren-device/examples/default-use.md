---
title: Allocate Biren Device
---

This example shows how to request a single Biren device in a plain Kubernetes Pod. The Pod runs a long-running container image provided by Birentech and requests one `birentech.com/gpu` device through the `resources.limits` section. You can use this as a starting point and adjust the image and resource limits to fit your own workloads.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod1
spec:
  containers:
    - image: ubuntu
      name: pod1-ctr
      command: ["sleep"]
      args: ["infinity"]
      resources:
        limits:
          birentech.com/gpu: 1
```
