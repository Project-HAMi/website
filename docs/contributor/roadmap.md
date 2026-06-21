---
id: roadmap
title: Hardware Support Roadmap
sidebar_label: Roadmap
---

## Device Support Matrix

| Device Type | Manufacturer  | Models            | Memory Isolation | Core Isolation | Multi-Card |
| ----------- | ------------- | ----------------- | :--------------: | :------------: | :--------: |
| GPU         | NVIDIA        | All               |       Yes        |      Yes       |    Yes     |
| MLU         | Cambricon     | 370, 590          |       Yes        |      Yes       |     No     |
| GCU         | Enflame       | S60               |       Yes        |      Yes       |     No     |
| DCU         | Hygon         | Z100, Z100L       |       Yes        |      Yes       |     No     |
| NPU         | Huawei Ascend | 310P, 910B, 910B3 |       Yes        |      Yes       |     No     |
| GPU         | Iluvatar      | All               |       Yes        |      Yes       |     No     |
| DPU         | Teco          | Checking          |   In progress    |  In progress   |     No     |
| GPU         | Moore Threads | MTT S4000         |       Yes        |      Yes       |     No     |
| GPU         | Birentech     | Model 110         |   In progress    |  In progress   |     No     |
| GPU         | MetaX         | MXC500            |       Yes        |      Yes       |     No     |
| XPU         | Kunlunxin     | P800              |       Yes        |      Yes       |     No     |
| GPU         | Vastai        | VA16              |       Yes        |      Yes       |     No     |

## Planned Features

- [ ] Support video codec processing
- [x] Support Multi-Instance GPUs (MIG)
- [ ] Support flexible scheduling policies
  - [x] binpack
  - [x] spread
  - [ ] numa affinity
- [ ] Integrated gpu-operator
- [ ] Rich observability support
- [x] DRA support
- [ ] Support Intel GPU device
- [ ] Support AMD GPU device
- [x] Support Enflame GCU device
