---
title: Allocate device core and memory resource
---

## Allocate device core and memory to container

To allocate a certain part of device core resource, you need only to assign the `cambricon.com/mlu370.smlu.vmemory` and `cambricon.com/mlu370.smlu.vcore` along with the number of cambricon MLUs you requested in the container using `cambricon.com/vmlu`

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: binpack-1
  labels:
    app: binpack-1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: binpack-1
  template:
    metadata:
      labels:
        app: binpack-1
    spec:
      containers:
        - name: c-1
          image: ubuntu:18.04
          command: ["sleep"]
          args: ["100000"]
          resources:
            limits:
              cambricon.com/vmlu: "1"
              cambricon.com/mlu370.smlu.vmemory: "20"
              cambricon.com/mlu370.smlu.vcore: "10"
```