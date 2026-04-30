---
title: Allocate device memory to container
linktitle: Allocate device memory
---

Allocate a percentage size of device memory by specifying resources such as `mthreads.com/sgpu-memory`.
Optional, each unit of `mthreads.com/sgpu-memory` equals 512 MiB of device memory.

```yaml
      resources:
        limits:
          mthreads.com/vgpu: 1 # requesting 1 MLU
          mthreads.com/sgpu-memory: 32 # Each GPU contains 16G device memory
```
