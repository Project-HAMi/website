---
title: Allocate device memory to container
sidebar_label: Allocate device memory
---

Allocate device memory by specifying the `mthreads.com/sgpu-memory` resource. This field is optional. Each unit of `mthreads.com/sgpu-memory` represents 512 MiB of device memory.

```yaml
resources:
  limits:
    mthreads.com/vgpu: 1 # requesting 1 GPU
    mthreads.com/sgpu-memory: 32 # 32 units x 512 MiB = 16 GiB of device memory
```
