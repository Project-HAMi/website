---
title: HAMi 支持的设备
displayed_sidebar: docs
translated: true
description: 查询 HAMi 支持的设备型号，比较各型号的显存和算力隔离能力，并查找对应的设备配置与资源分配指南。
---

适用版本：**HAMi v2.10.0**。

最后核验日期：**2026-11-06**，核对范围为 [HAMi 源码](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/scheduler/config/config.go#L99)、[默认设备配置](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/charts/hami/templates/scheduler/device-configmap.yaml#L16)和设备指南。

下表列出 HAMi 已接入的设备型号、资源分配模式和多卡切分支持情况。部署所需的设备插件、驱动及容器运行环境见下方设备指南。

<!-- prettier-ignore -->
| 设备 | 模式 | 型号范围 | 集成状态 | 显存控制 | 计算资源控制 | 多卡切分 |
| --- | --- | --- | --- | --- | --- | --- |
| [NVIDIA GPU](#nvidia) | HAMi-core | All | 稳定 | [显存配额](nvidia-device/specify-device-memory-usage.md) | [时间片限流](nvidia-device/specify-device-core-usage.md) | [支持](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device-plugin/nvidiadevice/nvinternal/plugin/server.go#L832-L837) |
| [NVIDIA GPU](#nvidia) | [MIG（动态切分）](nvidia-device/dynamic-mig-support.md#启用动态-mig-支持) | [支持 MIG 的型号](nvidia-device/dynamic-mig-support.md#前提条件) | 稳定 | [按硬件 profile 分配](nvidia-device/dynamic-mig-support.md#运行-mig-工作负载) | [按硬件 profile 分配](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/mig-device-names.html#id3) | [支持](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device-plugin/nvidiadevice/nvinternal/plugin/util.go#L349-L358)（[受 CUDA 和驱动版本限制](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/mig-device-names.html#cuda-device-enumeration)） |
| [AMD GPU](#amd) | [CU 切分](amd-device/enable-amd-gpu-sharing.md#运行-amd-vgpu-任务) | Instinct / ROCm，见指南 | 稳定 | [显存配额](amd-device/enable-amd-gpu-sharing.md#运行-amd-vgpu-任务) | [CU 份额](amd-device/enable-amd-gpu-sharing.md#运行-amd-vgpu-任务) | [支持](https://github.com/Project-HAMi/amd-device-plugin/blob/0691b4f960d8e5d3e8918c7e30e5e984faaa0f03/internal/pkg/plugin/plugin.go#L688-L742) |
| [AWS Neuron](#aws-neuron) | [整卡 / 核心分配](awsneuron-device/enable-awsneuron-managing.md#设备分配粒度) | Inferentia / Trainium，见指南 | 稳定 | [无独立配额接口](awsneuron-device/enable-awsneuron-managing.md#设备分配粒度) | [NeuronCore 分配](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device/awsneuron/device.go#L141-L154) | [不支持](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device/awsneuron/device.go#L141-L154) |
| [Biren GPU](#biren) | [整卡 / 预切分 SVI](biren-device/enable-biren-sharing.md#introduction) | Biren166M | 稳定 | [SVI 固定分区](biren-device/enable-biren-sharing.md#注意事项) | [SVI 固定分区](biren-device/enable-biren-sharing.md#注意事项) | [支持（SVI 分区）](https://github.com/Project-HAMi/biren-device-plugin/blob/f0a83df3b681bc3aac795eafb2232ee966c4a2dd/pkg/brgpu/plugin.go#L339-L349) |
| [Cambricon MLU](#cambricon) | [动态 SMLU](cambricon-device/enable-cambricon-mlu-sharing.md#开启-mlu-复用) | 370、590 | 稳定 | [显存配额](cambricon-device/enable-cambricon-mlu-sharing.md#运行-mlu-任务) | [核心配额](cambricon-device/enable-cambricon-mlu-sharing.md#运行-mlu-任务) | [不支持](cambricon-device/enable-cambricon-mlu-sharing.md#注意事项) |
| [Enflame GCU](#enflame) | [DRS](enflame-device/enable-enflame-gcu-sharing.md#运行-gcu-任务) | S60 | 稳定 | [按 profile 分配](enflame-device/enable-enflame-gcu-sharing.md#按显存算力申请统一-api) | [按 profile 分配](enflame-device/enable-enflame-gcu-sharing.md#按显存算力申请统一-api) | [不支持](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device/enflame/device.go#L358-L364) |
| [Ascend NPU](#huawei-ascend) | [template](ascend-device/enable-ascend-sharing.md#1-基于模板的硬切片vnpu) | 910A、910B 系列、910C、310P | 稳定 | [按模板分配](ascend-device/enable-ascend-sharing.md#注意事项) | [由模板决定](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device/ascend/device.go#L153-L163) | [不支持](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device/ascend/device.go#L177-L181) |
| [Ascend NPU](#huawei-ascend) | [hami-core](ascend-device/enable-ascend-sharing.md#2-基于运行时拦截的软切片hami-vnpu-core) | 取决于型号与运行时，见指南 | 稳定 | [显存配额](ascend-device/enable-ascend-sharing.md#软切片hami-vnpu-core) | [算力配额](ascend-device/enable-ascend-sharing.md#软切片hami-vnpu-core) | [支持](ascend-device/enable-ascend-sharing.md#多卡并行推理软切片) |
| [Hygon DCU](#hygon) | [动态切分 vDCU](hygon-device/enable-hygon-dcu-sharing.md#运行-dcu-任务) | All | 稳定 | [显存配额](hygon-device/enable-hygon-dcu-sharing.md#简介) | [计算资源份额](hygon-device/enable-hygon-dcu-sharing.md#简介) | [不支持](hygon-device/enable-hygon-dcu-sharing.md#注意事项) |
| [Iluvatar GPU](#iluvatar) | [vGPU（gpu-manager）](iluvatar-device/enable-iluvatar-gpu-sharing.md#设备粒度) | MR-V100、MR-V50、BI-V150、BI-V100 | 稳定 | [显存配额](iluvatar-device/enable-iluvatar-gpu-sharing.md#显存分配) | [核心配额](iluvatar-device/enable-iluvatar-gpu-sharing.md#核心分配) | [不支持](iluvatar-device/enable-iluvatar-gpu-sharing.md#注意事项) |
| [Kunlunxin XPU](#kunlunxin) | [VXPU](kunlunxin-device/enable-kunlunxin-vxpu.md#设备粒度分区) | P800-OAM | 稳定 | [按切分规格分配](kunlunxin-device/enable-kunlunxin-vxpu.md#设备粒度分区) | [随切分规格分配](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device/kunlun/vdevice.go#L184-L210) | [支持](kunlunxin-device/enable-kunlunxin-vxpu.md#重要说明) |
| [MetaX GPU](#metax) | [sGPU](metax-device/metax-sgpu/enable-metax-gpu-sharing.md#运行沐曦任务) | MXC500 | 稳定 | [显存配额](metax-device/metax-sgpu/enable-metax-gpu-sharing.md#运行沐曦任务) | [取决于 QoS](metax-device/metax-sgpu/examples/allocate-qos-policy.md) | [支持](https://developer.metax-tech.com/api/client/document/preview/1411/3rd/12_hami.html#sgpuoption)（[启用 `sgpu-app-class` 时不支持](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device/metax/sdevice.go#L89-L105)） |
| [Mthreads GPU](#mthreads) | [sGPU](mthreads-device/enable-mthreads-gpu-sharing.md#运行-gpu-任务) | MTT S4000 | 稳定 | [离散显存规格](mthreads-device/enable-mthreads-gpu-sharing.md#运行-gpu-任务) | [核心配额](mthreads-device/enable-mthreads-gpu-sharing.md#运行-gpu-任务) | [不支持](mthreads-device/enable-mthreads-gpu-sharing.md#注意事项) |
| [Vastai GPU](#vastai) | [整卡 / Die 切分](vastai/enable-vastai-sharing.md#介绍) | VA16 | 稳定 | [整卡或 Die 分配](vastai/enable-vastai-sharing.md#介绍) | [整卡或 Die 分配](vastai/enable-vastai-sharing.md#介绍) | [支持（Die 分配）](https://github.com/Project-HAMi/vastai-device-plugin/blob/dba981846dbdfcf531f7bd3b5d657075e812c49f/cmd/va-vg-plugin/server.go#L383-L388) |

**稳定**表示已随 v2.10.0 发布。

表中能力的含义：

- **显存控制**：容器可申请的显存配额或分区规格。使用模板或固定规格时，显存按规格向上对齐。
- **计算资源控制**：各设备通过时间片、核心分配、硬件分区或 QoS 策略控制计算资源，具体限制见表中对应链接。
- **多卡切分**：同一容器同时使用多张物理设备的部分资源。多张整卡的分配单独按设备指南配置。`不适用` 表示该模式仅分配整卡。

## 组件集成指南

下表提供各设备与调度组件的集成指南，包含安装步骤、配置要求和使用限制。`-` 表示暂无对应指南。

<!-- prettier-ignore -->
| 制造商                    | HAMi | HAMi-DRA | Volcano | KAI-scheduler |
| ------------------------- | ---- | -------- | ------- | ------------- |
| 英伟达（NVIDIA）          | [分配设备显存](nvidia-device/specify-device-memory-usage.md) | [动态资源分配](nvidia-device/dynamic-resource-allocation.md) | [使用 Volcano vGPU](volcano-vgpu/nvidia-gpu/how-to-use-volcano-vgpu.md) | [使用 KAI Scheduler](kai-scheduler/how-to-use-kai-scheduler.md) |
| 寒武纪（Cambricon）       | [启用寒武纪 MLU 共享](cambricon-device/enable-cambricon-mlu-sharing.md#开启-mlu-复用) | - | - | - |
| 海光（Hygon）             | [启用海光 DCU 共享](hygon-device/enable-hygon-dcu-sharing.md#开启-dcu-复用) | - | - | - |
| 华为昇腾（Huawei Ascend） | [启用昇腾共享](ascend-device/enable-ascend-sharing.md#部署步骤) | - | [Volcano 昇腾 vNPU](../installation/how-to-use-volcano-ascend.md) | - |
| 天数智芯（Iluvatar）      | [启用天数 GPU 共享](iluvatar-device/enable-iluvatar-gpu-sharing.md#启用-gpu-共享支持) | - | - | - |
| 摩尔线程（Mthreads）      | [启用摩尔线程 GPU 共享](mthreads-device/enable-mthreads-gpu-sharing.md#开启-gpu-复用) | - | - | - |
| 沐曦（MetaX）             | [启用沐曦 GPU 共享](metax-device/metax-sgpu/enable-metax-gpu-sharing.md#开启复用沐曦设备) | - | - | - |
| 燧原科技（Enflame）       | [启用燧原 GCU 共享](enflame-device/enable-enflame-gcu-sharing.md#开启-drs-调度) | - | - | - |
| 昆仑芯（Kunlunxin）       | [整卡调度](kunlunxin-device/enable-kunlunxin-schedule.md)、[VXPU 共享](kunlunxin-device/enable-kunlunxin-vxpu.md#启用-xpu-共享支持) | - | - | - |
| 瀚博（Vastai）            | [启用瀚博设备共享](vastai/enable-vastai-sharing.md#启用瀚博半导体设备共享) | - | - | - |
| AMD                       | [启用 AMD GPU 共享](amd-device/enable-amd-gpu-sharing.md#开启-amd-gpu-共享) | - | - | - |
| AWS                       | [管理 AWS Neuron 设备](awsneuron-device/enable-awsneuron-managing.md#启用-neuron-共享支持) | - | - | - |
| 壁仞（Biren）             | [启用壁仞设备共享](biren-device/enable-biren-sharing.md#启用壁仞设备共享) | - | - | - |

## 设备文档索引

### 英伟达（NVIDIA） {#nvidia}

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

### 寒武纪（Cambricon） {#cambricon}

- [启用寒武纪 MLU 共享](cambricon-device/enable-cambricon-mlu-sharing.md)
- [为容器分配设备显存](cambricon-device/specify-device-memory-usage.md)
- [分配设备核心给容器](cambricon-device/specify-device-core-usage.md)
- [分配到特定设备类型](cambricon-device/specify-device-type-to-use.md)
- [为容器分配设备核心和显存资源](cambricon-device/examples/allocate-core-and-memory.md)
- [分配独占设备](cambricon-device/examples/allocate-exclusive.md)

### 海光（Hygon） {#hygon}

- [启用 Hygon DCU 共享](hygon-device/enable-hygon-dcu-sharing.md)
- [为容器分配设备显存](hygon-device/specify-device-memory-usage.md)
- [分配设备核心给容器](hygon-device/specify-device-core-usage.md)
- [分配到特定设备](hygon-device/specify-device-uuid-to-use.md)
- [为容器分配设备核心和显存资源](hygon-device/examples/allocate-core-and-memory.md)
- [分配独占设备](hygon-device/examples/allocate-exclusive.md)
- [将任务分配给特定的 DCU](hygon-device/examples/specify-certain-cards.md)

### 摩尔线程（Mthreads） {#mthreads}

- [启用 Mthreads GPU 共享](mthreads-device/enable-mthreads-gpu-sharing.md)
- [为容器分配设备显存](mthreads-device/specify-device-memory-usage.md)
- [分配设备核心给容器](mthreads-device/specify-device-core-usage.md)
- [为容器分配设备核心和显存资源](mthreads-device/examples/allocate-core-and-memory.md)
- [分配独占设备](mthreads-device/examples/allocate-exclusive.md)

### 天数智芯（Iluvatar） {#iluvatar}

- [启用天数智芯 GPU 共享](iluvatar-device/enable-iluvatar-gpu-sharing.md)
- [为容器分配 BI-V150 切片](iluvatar-device/examples/allocate-bi-v150.md)
- [为容器分配 MR-V100 切片](iluvatar-device/examples/allocate-mr-v100.md)
- [分配多个独占 BI-V150 设备](iluvatar-device/examples/allocate-exclusive-bi-v150.md)
- [分配多个独占 MR-V100 设备](iluvatar-device/examples/allocate-exclusive-mr-v100.md)

### 燧原科技（Enflame） {#enflame}

- [启用燧原 GPU 共享](enflame-device/enable-enflame-gcu-sharing.md)

### AMD {#amd}

- [启用 AMD GPU 共享](amd-device/enable-amd-gpu-sharing.md)
- [分配设备核心和显存资源](amd-device/examples/allocate-core-and-memory.md)

### AWS Neuron {#aws-neuron}

- [启用 AWS-Neuron 设备共享](awsneuron-device/enable-awsneuron-managing.md)
- [分配 AWS Neuron 核心资源](awsneuron-device/examples/allocate-neuron-core.md)
- [分配 AWS Neuron 设备](awsneuron-device/examples/allocate-neuron-device.md)

### 瀚博（Vastai） {#vastai}

- [启用瀚博半导体设备共享](vastai/enable-vastai-sharing.md)
- [申请瀚博半导体的设备](vastai/examples/default-use.md)

### 壁仞（Biren） {#biren}

- [启用壁仞设备共享](biren-device/enable-biren-sharing.md)
- [申请壁仞设备](biren-device/examples/default-use.md)

### 昆仑芯（Kunlunxin） {#kunlunxin}

- [启用昆仑芯 GPU 拓扑感知调度](kunlunxin-device/enable-kunlunxin-schedule.md)
- [启用昆仑芯 VXPU](kunlunxin-device/enable-kunlunxin-vxpu.md)
- [分配整个 xpu 卡](kunlunxin-device/examples/allocate-whole-xpu.md)
- [分配 vxpu 设备](kunlunxin-device/examples/allocate-vxpu.md)

### 沐曦（MetaX） {#metax}

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

### 华为昇腾（Huawei Ascend） {#huawei-ascend}

- [启用 Huawei Ascend 共享](ascend-device/enable-ascend-sharing.md)
- [Huawei Ascend 设备模板](ascend-device/device-template.md)
- [为容器分配 Huawei Ascend-310P 切片](ascend-device/examples/allocate-310p.md)
- [为容器分配 Huawei Ascend-910B 切片](ascend-device/examples/allocate-910b.md)
- [分配独占设备](ascend-device/examples/allocate-exclusive.md)
- [软切片（hami-vnpu-core）](ascend-device/examples/allocate-soft-slicing.md)
