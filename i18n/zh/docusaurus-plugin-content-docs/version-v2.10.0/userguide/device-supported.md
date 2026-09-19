---
title: HAMi 支持的设备
translated: true
---

下表列出了 HAMi 支持的设备。本表反映的是 HAMi 最新发布版本 v2.10.0。

<!-- prettier-ignore -->
| 设备类型 | 制造商                    | 支持型号                | 状态   | 显存隔离 | 核心隔离 | 多卡切分支持 |
| -------- | ------------------------- | ----------------------- | ------ | -------- | -------- | ------------ |
| GPU      | 英伟达（NVIDIA）          | 全系列                  | 稳定   | 是       | 是       | 是           |
| MLU      | 寒武纪（Cambricon）       | 370、590                | 稳定   | 是       | 是       | 否           |
| DCU      | 海光（Hygon）             | 全系列                  | 稳定   | 是       | 是       | 否           |
| NPU      | 华为昇腾（Huawei Ascend） | 910B、910B3、910C、310P | 稳定   | 是       | 是       | 否           |
| GPU      | 天数智芯（Iluvatar）      | 全部                    | 稳定   | 是       | 是       | 否           |
| GPU      | 摩尔线程（Mthreads）      | MTT S4000               | 稳定   | 是       | 是       | 否           |
| GPU      | 沐曦（MetaX）             | MXC500                  | 稳定   | 是       | 是       | 否           |
| GCU      | 燧原科技（Enflame）       | S60                     | 稳定   | 是       | 是       | 否           |
| XPU      | 昆仑芯（Kunlunxin）       | P800                    | 稳定   | 是       | 否       | 否           |
| GPU      | 瀚博（Vastai）            | VA16                    | 稳定   | 否       | 否       | 否           |
| GPU      | AMD                       | Instinct / ROCm         | 稳定   | 是       | 是       | 否           |
| Neuron   | AWS                       | Inf、Trn                | 稳定   | 否       | 是       | 否           |
| GPU      | 壁仞（Biren）             | Biren166M               | 稳定   | 否       | 否       | 否           |
| DPU      | 太初元碁（Teco）          | 检查中                  | 验证中 | 否       | 否       | 否           |

支持状态：

- **稳定（Stable）** - 已在最新发布版本中提供。
- **实验性（Experimental）** - 已在 HAMi 中实现，但尚未包含在正式发布版本中。
- **验证中（Under Validation）** - 支持仍在实现中，尚不可用。

能力列：

- **显存隔离** - 是否为每个容器强制执行显存硬限制：超出请求显存的工作负载会被拒绝，而不能使用整块物理设备显存。
- **核心隔离** - 是否为每个容器强制执行算力硬限制：内核执行会被限流以保持在请求的份额内，而不能自由使用物理设备的算力。
- **多卡切分支持** - 单个 Pod 是否可以同时使用多张物理卡的显存或算力切分资源。对于标记为 `否` 的已支持设备，多卡请求必须使用整卡，且不能指定显存或算力资源。

## 各组件分别支持哪些设备

HAMi 只是使用这些设备的四种方式之一。另外三种自行完成调度，隔离部分依赖 HAMi-core。

每个单元格链接到该设备与该组件对应的指南。短横线表示目前没有对应指南，并不代表该组合不可行。

<!-- prettier-ignore -->
| 制造商                    | HAMi | HAMi-DRA | Volcano | KAI-scheduler |
| ------------------------- | ---- | -------- | ------- | ------------- |
| 英伟达（NVIDIA）          | [分配设备显存](nvidia-device/specify-device-memory-usage.md) | [动态资源分配](nvidia-device/dynamic-resource-allocation.md) | [使用 Volcano vGPU](volcano-vgpu/nvidia-gpu/how-to-use-volcano-vgpu.md) | [使用 KAI Scheduler](kai-scheduler/how-to-use-kai-scheduler.md) |
| 寒武纪（Cambricon）       | [启用寒武纪 MLU 共享](cambricon-device/enable-cambricon-mlu-sharing.md) | - | - | - |
| 海光（Hygon）             | [启用海光 DCU 共享](hygon-device/enable-hygon-dcu-sharing.md) | - | - | - |
| 华为昇腾（Huawei Ascend） | [启用昇腾共享](ascend-device/enable-ascend-sharing.md) | - | [Volcano 昇腾 vNPU](../installation/how-to-use-volcano-ascend.md) | - |
| 天数智芯（Iluvatar）      | [启用天数 GPU 共享](iluvatar-device/enable-iluvatar-gpu-sharing.md) | - | - | - |
| 摩尔线程（Mthreads）      | [启用摩尔线程 GPU 共享](mthreads-device/enable-mthreads-gpu-sharing.md) | - | - | - |
| 沐曦（MetaX）             | [启用沐曦 GPU 共享](metax-device/metax-sgpu/enable-metax-gpu-sharing.md) | - | - | - |
| 燧原科技（Enflame）       | [启用燧原 GCU 共享](enflame-device/enable-enflame-gcu-sharing.md) | - | - | - |
| 昆仑芯（Kunlunxin）       | [启用昆仑芯调度](kunlunxin-device/enable-kunlunxin-schedule.md) | - | - | - |
| 瀚博（Vastai）            | [启用瀚博设备共享](vastai/enable-vastai-sharing.md) | - | - | - |
| AMD                       | [启用 AMD GPU 共享](amd-device/enable-amd-gpu-sharing.md) | - | - | - |
| AWS                       | [管理 AWS Neuron 设备](awsneuron-device/enable-awsneuron-managing.md) | - | - | - |
| 壁仞（Biren）             | [启用壁仞设备共享](biren-device/enable-biren-sharing.md) | - | - | - |
| 太初元碁（Teco）          | - | - | - | - |

每份指南都包含该设备的具体搭建步骤、配置说明以及已知限制，部署该设备前请先查阅。

## 每个厂商的全部页面

下面按厂商列出所有页面，方便从本页直达。

### 英伟达（NVIDIA）

- [为容器分配设备显存](nvidia-device/specify-device-memory-usage.md)
- [动态资源分配](nvidia-device/dynamic-resource-allocation.md)
- [启用动态 MIG 功能](nvidia-device/dynamic-mig-support.md)
- [调度策略](nvidia-device/scheduling-policy.md)
- [分配设备核心给容器](nvidia-device/specify-device-core-usage.md)
- [分配到特定设备类型](nvidia-device/specify-device-type-to-use.md)
- [分配到特定设备](nvidia-device/specify-device-uuid-to-use.md)
- [为 NVIDIA 设备使用扩展的 resourcequota](nvidia-device/using-resourcequota.md)
- [使用独占 GPU](nvidia-device/examples/use-exclusive-card.md)
- [为容器分配特定设备显存](nvidia-device/examples/allocate-device-memory.md)
- [按百分比分配设备显存给容器](nvidia-device/examples/allocate-device-memory2.md)
- [为容器分配设备核心资源](nvidia-device/examples/allocate-device-core.md)
- [分配任务到特定类型](nvidia-device/examples/specify-card-type-to-use.md)
- [将任务分配给特定的 GPU](nvidia-device/examples/specify-certain-card.md)
- [将任务分配给 MIG 实例](nvidia-device/examples/dynamic-mig-example.md)

### 寒武纪（Cambricon）

- [启用寒武纪 MLU 共享](cambricon-device/enable-cambricon-mlu-sharing.md)
- [为容器分配设备显存](cambricon-device/specify-device-memory-usage.md)
- [分配设备核心给容器](cambricon-device/specify-device-core-usage.md)
- [分配到特定设备类型](cambricon-device/specify-device-type-to-use.md)
- [为容器分配设备核心和显存资源](cambricon-device/examples/allocate-core-and-memory.md)
- [分配独占设备](cambricon-device/examples/allocate-exclusive.md)

### 海光（Hygon）

- [启用 Hygon DCU 共享](hygon-device/enable-hygon-dcu-sharing.md)
- [为容器分配设备显存](hygon-device/specify-device-memory-usage.md)
- [分配设备核心给容器](hygon-device/specify-device-core-usage.md)
- [分配到特定设备](hygon-device/specify-device-uuid-to-use.md)
- [为容器分配设备核心和显存资源](hygon-device/examples/allocate-core-and-memory.md)
- [分配独占设备](hygon-device/examples/allocate-exclusive.md)
- [将任务分配给特定的 DCU](hygon-device/examples/specify-certain-cards.md)

### 摩尔线程（Mthreads）

- [启用 Mthreads GPU 共享](mthreads-device/enable-mthreads-gpu-sharing.md)
- [为容器分配设备显存](mthreads-device/specify-device-memory-usage.md)
- [分配设备核心给容器](mthreads-device/specify-device-core-usage.md)
- [为容器分配设备核心和显存资源](mthreads-device/examples/allocate-core-and-memory.md)
- [分配独占设备](mthreads-device/examples/allocate-exclusive.md)

### 天数智芯（Iluvatar）

- [启用天数智芯 GPU 共享](iluvatar-device/enable-iluvatar-gpu-sharing.md)
- [为容器分配 BI-V150 切片](iluvatar-device/examples/allocate-bi-v150.md)
- [为容器分配 MR-V100 切片](iluvatar-device/examples/allocate-mr-v100.md)
- [分配多个独占 BI-V150 设备](iluvatar-device/examples/allocate-exclusive-bi-v150.md)
- [分配多个独占 MR-V100 设备](iluvatar-device/examples/allocate-exclusive-mr-v100.md)

### 燧原科技（Enflame）

- [启用燧原 GPU 共享](enflame-device/enable-enflame-gcu-sharing.md)

### AMD

- [启用 AMD GPU 共享](amd-device/enable-amd-gpu-sharing.md)
- [分配设备核心和显存资源](amd-device/examples/allocate-core-and-memory.md)

### AWS Neuron

- [启用 AWS-Neuron 设备共享](awsneuron-device/enable-awsneuron-managing.md)
- [分配 AWS Neuron 核心资源](awsneuron-device/examples/allocate-neuron-core.md)
- [分配 AWS Neuron 设备](awsneuron-device/examples/allocate-neuron-device.md)

### 瀚博（Vastai）

- [启用瀚博半导体设备共享](vastai/enable-vastai-sharing.md)
- [申请瀚博半导体的设备](vastai/examples/default-use.md)

### 壁仞（Biren）

- [启用壁仞设备共享](biren-device/enable-biren-sharing.md)
- [申请壁仞设备](biren-device/examples/default-use.md)

### 昆仑芯（Kunlunxin）

- [启用昆仑芯 GPU 拓扑感知调度](kunlunxin-device/enable-kunlunxin-schedule.md)
- [启用昆仑芯 VXPU](kunlunxin-device/enable-kunlunxin-vxpu.md)
- [分配整个 xpu 卡](kunlunxin-device/examples/allocate-whole-xpu.md)
- [分配 vxpu 设备](kunlunxin-device/examples/allocate-vxpu.md)

### 沐曦（MetaX）

- [启用沐曦 GPU 共享](metax-device/metax-sgpu/enable-metax-gpu-sharing.md)
- [为容器分配设备核心和显存资源](metax-device/metax-sgpu/examples/default-use.md)
- [分配独占设备](metax-device/metax-sgpu/examples/allocate-exclusive.md)
- [分配特定 Qos Policy 的设备](metax-device/metax-sgpu/examples/allocate-qos-policy.md)
- [启用沐曦 GPU 拓扑感知调度](metax-device/metax-gpu/enable-metax-gpu-schedule.md)
- [Binpack 调度策略](metax-device/metax-gpu/specify-binpack-task.md)
- [扩展调度策略](metax-device/metax-gpu/specify-spread-task.md)
- [分配沐曦设备](metax-device/metax-gpu/examples/default-use.md)
- [使用 binpack 调度策略分配沐曦设备](metax-device/metax-gpu/examples/allocate-binpack.md)
- [使用扩展调度策略分配沐曦设备](metax-device/metax-gpu/examples/allocate-spread.md)

### 华为昇腾（Huawei Ascend）

- [启用 Huawei Ascend 共享](ascend-device/enable-ascend-sharing.md)
- [Huawei Ascend 设备模板](ascend-device/device-template.md)
- [为容器分配 Huawei Ascend-310P 切片](ascend-device/examples/allocate-310p.md)
- [为容器分配 Huawei Ascend-910B 切片](ascend-device/examples/allocate-910b.md)
- [分配独占设备](ascend-device/examples/allocate-exclusive.md)
- [软切片（hami-vnpu-core）](ascend-device/examples/allocate-soft-slicing.md)
