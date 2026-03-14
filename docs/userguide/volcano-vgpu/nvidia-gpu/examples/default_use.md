---
title: Default vGPU Job
---

## Job description

vGPU can be requested by both set "volcano.sh/vgpu-number", "volcano.sh/vgpu-cores" and "volcano.sh/vgpu-memory" in resources.limits

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test1
spec:
  restartPolicy: OnFailure
  schedulerName: volcano
  containers:
  - image: ubuntu:20.04
    name: pod1-ctr
    command: ["sleep"]
    args: ["100000"]
    resources:
      limits:
        volcano.sh/vgpu-memory: 1024
        volcano.sh/vgpu-number: 1
```
