---
title: Enable Kunlunxin GPU topology-aware scheduling
---

**We now support kunlunxin.com/xpu by implementing topo-awareness among kunlunxin XPUs**:

When multiple XPUs are configured on a single P800 server, the GPU cards have better performance to be connected or on the same numa, as the following figure shows. This forms a topology among all the cards on the server. 

![img](../../resources/kunlunxin_topo.jpg)

A user job requests a certain number of kunlunxin.com/xpu resources, Kubernetes schedule pods to the appropriate node with minimized fragmentation, and quality of performance. Xpu-device further processes the logic of allocating the remaining resources on the resource node following criterias below:
1. Only 1,2,4,8 cards allocations are legal

2. Allocation of 1,2,4 XPUs can't be assigned across different numas.

3. Minimize the fragmentation after alloation.

## Important Notes

1. Device sharing is not supported yet.

2. These features are tested on Kunlunxin P800

## Prerequisites

* Kunlunxin driver version >= 5.0.21
* Kubernetes >= 1.23
* kunlunxin k8s-device-plugin

## Enabling topo-awareness scheduling

* Deploy Kunlunxin device-plugin on P800 nodes (Please consult your device provider to aquire its package and document)

* Deploy HAMi according to README.md

## Running Kunlunxin jobs

Kunlunxin P800 GPUs can now be requested by a container
using the `kunlunxin.com/xpu`  resource type:

```
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
spec:
  containers:
    - name: ubuntu-container
      image: docker.io/library/ubuntu:latest
      imagePullPolicy: IfNotPresent
      command: ["sleep","infinity"]
      resources:
        limits:
          kunlunxin.com/xpu: 4 # requesting 4 XPUs
```

> **NOTICE:** *You can find more examples in examples folder
