---
title: Allocate device core to container
linktitle: Allocate device core usage
---

Allocate a part of device core resources by specify resource `mthreads.com/sgpu-core`.
Optional, each unit of `mthreads.com/smlu-core` equals 1/16 of device cores.

```yaml
      resources:
        limits:
          mthreads.com/vgpu: 1 # requesting 1 GPU
          mthreads.com/sgpu-core: "8" # Each GPU contains 50% device cores
```
