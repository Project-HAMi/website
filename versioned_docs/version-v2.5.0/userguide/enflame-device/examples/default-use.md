---
title: Allocate GCU slice
---

This example below shows a task requires 22% percentage of a GCU

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gcushare-pod-2
  namespace: kube-system
spec:
  terminationGracePeriodSeconds: 0
  containers:
    - name: pod-gcu-example1
      image: ubuntu:18.04
      imagePullPolicy: IfNotPresent
      command:
        - sleep
      args:
        - '100000'
      resources:
        limits:
          enflame.com/vgcu: 1
          enflame.com/vgcu-percentage: 22
```