---
title: Exclusive gpu usage
---

## Job description

To allocate an exclusive GPU, you need only assign `volcano.sh/vgpu-number` without any other `volcano.sh/xxx` fields, as the example below:

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
        volcano.sh/vgpu-number: 1
```
