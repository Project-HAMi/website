---
title: Device sharing
---

HAMi lets multiple tasks share the same GPU, MLU, or NPU device,
maximizing the utilization of heterogeneous AI computing resources.

## Device Sharing {#device-sharing}

HAMi's device sharing enables:

- **Multi-task sharing:** The same device can be shared by multiple tasks, each utilizing only partial device.
- **Device memory control:** Memory can be allocated by MB or percentage.
- **Use specific device:** Allows selecting specific types of heterogeneous AI devices or targeting a device using its UUID.
- **In-container hard limits:** Imposes a hard limit on streaming multiprocessors.
- **Non-intrusive control:** Requires zero changes to existing programs while managing resource allocation.
- **Dynamic MIG support:** Supports on-the-fly MIG adjustments using mig-parted for dynamic-mig.

![HAMi device sharing example showing multiple tasks sharing a single GPU](/img/docs/common/key-features/example.png)

## Benefits {#benefits}

These features improve resource efficiency and isolation in shared-device environments across diverse device types and workloads.
