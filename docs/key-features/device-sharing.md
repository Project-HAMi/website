---
title: Device sharing
---

HAMi offers robust device-sharing capabilities, enabling multiple tasks to share the same GPU, MLU, or NPU device,
maximizing the utilization of heterogeneous AI computing resources.

## Device Sharing {#device-sharing}

HAMi's device sharing enables:

- **Multi-task sharing:** The same device can be shared by multiple tasks, each utilizing only partial device.
- **Device memory control:** Memory can be allocated by MB or percentage.
- **Use specific device:** Allows selecting specific types of heterogeneous AI devices or targeting a device using its UUID.
- **In-container hard limits:** Imposes a hard limit on streaming multiprocessors.
- **Non-intrusive control:** Requires zero changes to existing programs while managing resource allocation.
- **Dynamic MIG support:** Supports on-the-fly MIG adjustments using mig-parted for dynamic-mig.

![img](../resources/example.png)

## Benefits {#benefits}

By leveraging these features, HAMi enhances resource efficiency and security in shared-device environments.
Organizations can optimize their AI infrastructure for greater flexibility and performance while meeting diverse computational demands.
