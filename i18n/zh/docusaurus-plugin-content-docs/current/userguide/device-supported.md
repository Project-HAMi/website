---
title: HAMi 支持的设备
translated: true
---

HAMi 支持的设备如下表所示：

本表反映的是 HAMi 最新发布版本 v2.9.0。

<!-- prettier-ignore -->
| 设备类型   | 制造商                    | 支持型号                    | 状态         | 显存隔离 | 核心隔离 | 多卡支持 |
| ---------- | ------------------------- | --------------------------- | ------------ | -------- | -------- | -------- |
| GPU        | 英伟达（NVIDIA）          | 全系列                      | 稳定         | 是       | 是       | 是       |
| MLU        | 寒武纪（Cambricon）       | 370、590                    | 稳定         | 是       | 是       | 否       |
| DCU        | 海光（Hygon）             | 全系列                      | 稳定         | 是       | 是       | 否       |
| NPU        | 华为昇腾（Huawei Ascend） | 910B、910B3、910C、310P     | 稳定         | 是       | 是       | 否       |
| GPU        | 天数智芯（Iluvatar）      | 全部                        | 稳定         | 是       | 是       | 否       |
| GPU        | 摩尔线程（Mthreads）      | MTT S4000                   | 稳定         | 是       | 是       | 否       |
| GPU        | 沐曦（MetaX）             | MXC500                      | 稳定         | 是       | 是       | 否       |
| GCU        | 燧原科技（Enflame）       | S60                         | 稳定         | 是       | 是       | 否       |
| XPU        | 昆仑芯（Kunlunxin）       | P800                        | 稳定         | 是       | 是       | 否       |
| GPU        | 瀚博（Vastai）            | VA16                        | 稳定         | 是       | 是       | 否       |
| Neuron     | AWS                       | Inf、Trn                    | 稳定         | 否       | 否       | 是       |
| GPU        | 壁仞（Biren）             | Biren166M                   | 稳定         | 是       | 是       | 否       |
| DPU        | 太初元碁（Teco）          | 检查中                      | 验证中       | 否     | 否     | 否       |

支持状态：

- **稳定（Stable）** - 已在最新发布版本中提供。
- **实验性（Experimental）** - 已在 HAMi 中实现，但尚未包含在正式发布版本中。
- **验证中（Under Validation）** - 支持仍在实现中，尚不可用。

能力列：

- **显存隔离（MemoryIsolation）** - 是否为每个容器强制执行显存硬限制：超出请求显存的工作负载会被拒绝，而不能使用整块物理设备显存。
- **核心隔离（CoreIsolation）** - 是否为每个容器强制执行算力硬限制：内核执行会被限流以保持在请求的份额内，而不能自由使用物理设备的算力。
- **多卡支持（MultiCard Support）** - 单个 Pod 是否可以请求并调度到该类型的多张物理卡，由 HAMi 协调所选卡之间的分配。

## 设备指南

每份指南均包含该设备的具体搭建步骤、配置说明以及已知限制和约束条件；部署该设备前请先查阅对应指南。

- **NVIDIA**：[为容器分配设备显存](nvidia-device/specify-device-memory-usage.md)
- **寒武纪（Cambricon）**：[启用寒武纪 MLU 共享](cambricon-device/enable-cambricon-mlu-sharing.md)
- **海光（Hygon）**：[启用 Hygon DCU 共享](hygon-device/enable-hygon-dcu-sharing.md)
- **华为昇腾（Huawei Ascend）**：[启用 Huawei Ascend 共享](ascend-device/enable-ascend-sharing.md)
- **天数智芯（Iluvatar）**：[启用天数智芯 GPU 共享](iluvatar-device/enable-iluvatar-gpu-sharing.md)
- **摩尔线程（Mthreads）**：[启用 Mthreads GPU 共享](mthreads-device/enable-mthreads-gpu-sharing.md)
- **沐曦（MetaX）**：[启用沐曦 GPU 共享](metax-device/metax-sgpu/enable-metax-gpu-sharing.md)
- **燧原科技（Enflame）**：[启用燧原 GPU 共享](enflame-device/enable-enflame-gcu-sharing.md)
- **昆仑芯（Kunlunxin）**：[启用昆仑芯 GPU 拓扑感知调度](kunlunxin-device/enable-kunlunxin-schedule.md)
- **瀚博（Vastai）**：[启用瀚博半导体设备共享](vastai/enable-vastai-sharing.md)
- **AWS Neuron**：[启用 AWS-Neuron 设备共享](awsneuron-device/enable-awsneuron-managing.md)
- **壁仞（Biren）**：[启用壁仞设备共享](biren-device/enable-biren-sharing.md)
