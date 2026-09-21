---
title: Allocate device memory to container
sidebar_label: Allocate device memory
---

Allocate a part of device memory by specifying resource `mthreads.com/sgpu-memory`. Optional. Each unit equals 512 MiB. Use a plain integer without suffixes such as `Mi`, `Gi`, or `G`; the value is a count of memory units, not a percentage.

```yaml
resources:
  limits:
    mthreads.com/vgpu: 1 # requesting 1 GPU
    mthreads.com/sgpu-memory: 32 # Allocate 32 x 512 MiB = 16 GiB
```

The maximum and the valid values depend on the card model:

| Card model | Device memory | Valid `sgpu-memory` values    |
| ---------- | ------------- | ----------------------------- |
| MTT S4000  | 48 GiB        | 2, 4, 8, 16, 32, 64, 96       |
| MTT S5000  | 80 GiB        | 2, 4, 8, 16, 32, 64, 128, 160 |

Values outside the list are rejected at admission. On MTT S5000 clusters, set `devices.mthreads.memoryPerCard` to `[160]` when installing HAMi. See [Enable Mthreads GPU sharing](enable-mthreads-gpu-sharing.md) for details.
