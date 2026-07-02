---
id: roadmap
title: 硬件支持路线图
translated: true
sidebar_label: 路线图
---

## 设备支持矩阵

| 设备类型 | 制造商        | 型号              | 显存隔离 | 核心隔离 | 多卡支持 |
| -------- | ------------- | ----------------- | :------: | :------: | :------: |
| GPU      | NVIDIA        | 全系列            |    是    |    是    |    是    |
| MLU      | Cambricon     | 370、590          |    是    |    是    |    否    |
| GCU      | Enflame       | S60               |    是    |    是    |    否    |
| DCU      | Hygon         | 全系列            |    是    |    是    |    否    |
| NPU      | Huawei Ascend | 310P、910B、910B3 |    是    |    是    |    否    |
| GPU      | Iluvatar      | 全系列            |    是    |    是    |    否    |
| DPU      | Teco          | 检查中            |  进行中  |  进行中  |    否    |
| GPU      | Moore Threads | MTT S4000         |    是    |    是    |    否    |
| GPU      | Birentech     | Model 110         |  进行中  |  进行中  |    否    |
| GPU      | MetaX         | MXC500            |    是    |    是    |    否    |
| XPU      | Kunlunxin     | P800              |    是    |    是    |    否    |
| GPU      | Vastai        | VA16              |    是    |    是    |    否    |

## 计划功能

- [ ] 支持视频编解码处理
- [x] 支持 Multi-Instance GPUs（MIG）
- [ ] 支持灵活的调度策略
  - [x] binpack
  - [x] spread
  - [ ] numa affinity
- [ ] 集成 gpu-operator
- [ ] 丰富的可观测性支持
- [x] 支持 DRA
- [ ] 支持 Intel GPU 设备
- [ ] 支持 AMD GPU 设备
- [x] 支持 Enflame GCU 设备
