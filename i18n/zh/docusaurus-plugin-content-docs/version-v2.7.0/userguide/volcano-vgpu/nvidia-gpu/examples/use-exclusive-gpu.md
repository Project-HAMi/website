---
title: 使用独占 GPU
translated: true
---

## 职位描述

要分配一个独占的GPU，您只需分配`volcano.sh/vgpu-number`，而无需其他`volcano.sh/xxx`字段，如下例所示：

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
