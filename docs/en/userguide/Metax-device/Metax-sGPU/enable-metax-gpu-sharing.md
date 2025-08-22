---
title: Enable Metax GPU sharing
translated: true
---

**HAMi now supports metax.com/gpu by implementing most device-sharing features as nvidia-GPU**, device-sharing features include the following:

- **GPU Sharing**: Tasks can request a fraction of a GPU rather than the entire GPU card, allowing multiple tasks to share the same GPU.

- **Device Memory Control**: Tasks can be allocated a specific amount of GPU memory, with strict enforcement to ensure usage does not exceed the assigned limit.

- **Compute Core Limiting**: Tasks can be allocated a specific percentage of GPU compute cores (e.g., `60` means the container can use 60% of the GPU’s compute cores).

## Prerequisites

* Metax Driver >= 2.32.0
* Metax GPU Operator >= 0.10.2
* Kubernetes >= 1.23

## Enabling GPU-sharing support

* Deploy Metax GPU Operator on metax nodes (Please consult your device provider to obtain the installation package and documentation)

* Deploy HAMi according to README.md

## Running Metax jobs

Metax GPUs can now be requested by a container
using the `metax-tech.com/sgpu` resource type:

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
