---
title: Device resource isolation
---

A simple demonstration for device isolation:
A task with the following resources.

```yaml
      resources:
        limits:
          nvidia.com/gpu: 1 # requesting 1 vGPU
          nvidia.com/gpumem: 3000 # Each vGPU contains 3000m device memory
```

will see 3G device memory inside container

![GPU memory hard limit demonstration showing 3G device memory inside container](/img/docs/common/key-features/hard-limit.jpg)
