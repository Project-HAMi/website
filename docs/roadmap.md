---
title: HAMi Roadmap
---

# HAMi Roadmap

This document defines a high level roadmap for HAMi development and upcoming releases.
Community and contributor involvement is vital for successfully implementing all desired items for each release.
We hope that the items listed below will inspire further engagement from the community to keep karmada progressing and shipping exciting and valuable features.

Heterogeneous AI Computing device to support:

| Production  | manufactor | Type        |MemoryIsolation | CoreIsolation | MultiCard support |
|-------------|------------|-------------|-----------|---------------|-------------------|
| GPU         | NVIDIA     | All         | ✅              | ✅            | ✅                |
| MLU         | Cambricon  | 370, 590    | ✅              | ✅            | ❌                |
| DCU         | Hygon      | Z100, Z100L | ✅              | ✅            | ❌                |
| Ascend      | Huawei     | 910B        | ✅              | ✅            | ❌                |
| GPU         | iluvatar   | All         | ✅              | ✅            | ❌                |
| DPU         | Teco       | Checking    | In progress     | In progress   | ❌                |

- [ ] Support video codec processing
- [ ] Support Multi-Instance GPUs (MIG)
- [ ] Support Flexible scheduling policies
  - [x] binpack
  - [x] spread
  - [ ] numa affinity
- [ ] integrated gpu-operator
- [ ] Rich observability support
- [ ] DRA Support
- [ ] Support Intel GPU device
- [ ] Support AMD GPU device
