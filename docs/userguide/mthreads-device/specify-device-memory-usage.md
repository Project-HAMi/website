---
title: Allocate device memory to container
sidebar_label: Allocate device memory
---

Allocate a fixed size of device memory with the optional `mthreads.com/sgpu-memory` resource. Each unit equals 512 MiB.

For a shared GPU, supported values are `2`, `4`, `8`, `16`, `32`, `64`, and `96`. Use a plain integer from this list, without suffixes such as `Mi`, `Gi`, or `G`. The value is a count of memory units, not a percentage.

```yaml
resources:
  limits:
    mthreads.com/vgpu: 1 # requesting 1 GPU
    mthreads.com/sgpu-memory: 32 # Allocate 32 x 512 MiB = 16 GiB
```
