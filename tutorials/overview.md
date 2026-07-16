---
title: Tutorials
slug: /
---

import LabCardGridAuto from '@site/src/components/labs/LabCardGridAuto';

Hands-on tutorials for learning HAMi by doing. Each lab is a step-by-step exercise with real, captured outputs: you build a cluster, install HAMi, and verify GPU partitioning behavior yourself.

## Concepts

Background knowledge that the labs build on.

- [GPU Software Stack Overview](/docs/core-concepts/gpu-stack): the 5 layers from hardware to Kubernetes scheduling
- [Understanding GPU Drivers](/docs/core-concepts/gpu-driver): kernel modules, NVML, and how to troubleshoot from the bottom up
- [HAMi Cluster Architecture](/docs/core-concepts/hami-architecture): every component in a HAMi cluster and what breaks without it

## Labs

<LabCardGridAuto /> Each lab lists its own prerequisites. Labs 3 and 4 continue from the cluster Lab 1 builds, so a single session covers all three; Lab 2 runs on any laptop with no GPU required. Lab 7 brings up its own single-node k3s cluster on a rented GPU VM, without the GPU Operator. Lab 8 requires an existing Volcano GPU cluster and validates Volcano vGPU, Gang scheduling, and queue-level limits. Lab 9 uses Kueue admission control to enforce HAMi vGPU count, memory, and compute quotas.
