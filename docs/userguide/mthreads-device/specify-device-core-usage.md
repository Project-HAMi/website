---
title: Allocate device core to container
sidebar_label: Allocate device core usage
---

Allocate a part of device core resources by specifying resource `mthreads.com/sgpu-core`. Optional, each unit of `mthreads.com/sgpu-core` equals 1/16 of device cores. Both MTT S4000 and MTT S5000 expose 16 core groups per card, so valid values range from 1 to 16.

```yaml
resources:
  limits:
    mthreads.com/vgpu: 1 # requesting 1 GPU
    mthreads.com/sgpu-core: "8" # Each GPU contains 50% device cores
```
