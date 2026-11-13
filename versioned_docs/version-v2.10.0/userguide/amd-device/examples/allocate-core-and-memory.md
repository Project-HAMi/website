---
title: Allocate device core and memory resource
---

To allocate part of an AMD GPU, set `amd.com/gpucores` and `amd.com/gpumem` together with the number of GPUs in `amd.com/gpu`.

The example below requests one GPU with 48 GiB device memory and 25% compute units:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-vgpu-example
spec:
  schedulerName: hami-scheduler
  restartPolicy: Never
  containers:
    - name: pytorch
      image: rocm/pytorch:latest
      command: ["bash", "-c"]
      args:
        - |
          env | grep -E 'LD_AUDIT|HIP_DEVICE_MEMORY_LIMIT'
          python3 -c 'import torch; print(torch.cuda.mem_get_info(0)); print(torch.cuda.get_device_name(0))'
          sleep 300
      resources:
        limits:
          amd.com/gpu: 1 # requesting one AMD GPU
          amd.com/gpumem: 49152 # each GPU requires 49152 MiB device memory
          amd.com/gpucores: 25 # each GPU uses 25% of total compute units
```
