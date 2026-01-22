---
title: Allocate device core usage
---

## Allocate device core to container

Allocate a percentage of device core resources by specify resource `nvidia.com/gpucores`.
Optional, each unit of `nvidia.com/gpucores` equals to 1% device cores.

```yaml
      resources:
        limits:
          nvidia.com/gpu: 1 # requesting 1 GPU
          nvidia.com/gpucores: 50 # Each GPU allocates 50% device cores.
```

> **NOTICE:** * HAMi-core uses time-slice to limit device core usage. Therefore, there will be fluctuations when looking at GPU utilization through nvidia-smi*