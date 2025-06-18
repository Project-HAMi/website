---
title: Enable Metax GPU sharing
---

## Introduction

We support metax.com/gpu as follows:

- support metax.com/gpu by implementing most device-sharing features as nvidia-GPU
- support metax.com/gpu by implementing topo-awareness among metax GPUs

## support metax.com/gpu by implementing most device-sharing features as nvidia-GPU

device-sharing features include the following:

***GPU sharing***: Each task can allocate a portion of GPU instead of a whole GPU card, thus GPU can be shared among multiple tasks.

***Device Memory Control***: GPUs can be allocated with certain device memory size and have made it that it does not exceed the boundary.

***Device compute core limitation***: GPUs can be allocated with certain percentage of device core(60 indicate this container uses 60% compute cores of this device)

### Prerequisites

* Metax Driver >= 2.31.0
* Metax GPU Operator >= 0.10.1
* Kubernetes >= 1.23

### Enabling GPU-sharing Support

* Deploy Metax GPU Operator on metax nodes (Please consult your device provider to aquire its package and document)

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
      image: cr.metax-tech.com/public-ai-release/c500/colossalai:2.24.0.5-py38-ubuntu20.04-amd64 
      imagePullPolicy: IfNotPresent
      command: ["sleep","infinity"]
      resources:
        limits:
          metax-tech.com/sgpu: 1 # requesting 1 GPU 
          metax-tech.com/vcore: 60 # each GPU use 60% of total compute cores
          metax-tech.com/vmemory: 4 # each GPU require 4 GiB device memory
```

> **NOTICE1:** *You can find more examples in examples/sgpu folder*