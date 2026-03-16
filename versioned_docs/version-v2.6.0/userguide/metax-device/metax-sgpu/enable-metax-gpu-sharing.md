---
title: Enable Metax GPU sharing
translated: true
---

## Introduction

**we now support metax.com/gpu by implementing most device-sharing features as nvidia-GPU**, device-sharing features include the following:

***GPU sharing***: Each task can allocate a portion of GPU instead of a whole GPU card, thus GPU can be shared among multiple tasks.

***Device Memory Control***: GPUs can be allocated with certain device memory size and have made it that it does not exceed the boundary.

***Device compute core limitation***: GPUs can be allocated with certain percentage of device core(60 indicate this container uses 60% compute cores of this device)

### Prerequisites

* Metax Driver >= 2.32.0
* Metax GPU Operator >= 0.10.2
* Kubernetes >= 1.23

### Enabling GPU-sharing Support

* Deploy Metax GPU Operator on metax nodes (Please consult your device provider to acquire its package and document)

* Deploy HAMi according to README.md

### Running Metax jobs

Metax GPUs can now be requested by a container
using the `metax-tech.com/sgpu`  resource type:

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

> **NOTICE:** *You can find more examples in [examples/metax folder](https://github.com/Project-HAMi/HAMi/tree/release-v2.6/examples/metax/sgpu)*
