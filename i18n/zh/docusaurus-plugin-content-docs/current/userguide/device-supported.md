---
title: 支持的设备
description: 查询 HAMi 支持的设备型号，比较各型号的显存和算力隔离能力，并查找对应的设备配置与资源分配指南。
displayed_sidebar: docs
translated: true
---

适用版本：**Next（未发布）**，对应 [HAMi 开发提交 `adf1a43a`](https://github.com/Project-HAMi/HAMi/tree/adf1a43a07cf7e3b697012b80eef3ddd7c919222)。HAMi [v2.11.0 已正式发布](https://github.com/Project-HAMi/HAMi/releases/tag/v2.11.0)；历史版本参阅 [v2.10.0 支持矩阵](/zh/docs/userguide/device-supported)。

最后核验日期：**2026-11-06**，核对范围为 [HAMi 源码](https://github.com/Project-HAMi/HAMi/tree/adf1a43a07cf7e3b697012b80eef3ddd7c919222)、[默认设备配置](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/charts/hami/values.yaml#L545)和设备指南。

下表列出 HAMi 的设备接入状态、资源分配模式和多卡切分支持情况，包括已发布和实验性接入。部署所需的设备插件、驱动及容器运行环境见下方设备指南。

<!-- prettier-ignore -->
| 设备 | 模式 | 型号范围                          | 集成状态 | 显存控制                                                                 | 计算资源控制                                                                                                                         | 多卡切分                                                                                                                                              |
| --- | --- |-----------------------------------|----------|--------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| [NVIDIA GPU](nvidia-device/specify-device-memory-usage.md) | HAMi-core | All | 稳定 | [显存配额](nvidia-device/specify-device-memory-usage.md) | [时间片限流](nvidia-device/specify-device-core-usage.md) | [支持](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device-plugin/nvidiadevice/nvinternal/plugin/server.go#L1524-L1529) |
| [NVIDIA GPU](nvidia-device/specify-device-memory-usage.md) | [MIG（动态切分）](nvidia-device/dynamic-mig-support.md#启用动态-mig-支持) | [支持 MIG 的型号](nvidia-device/dynamic-mig-support.md#前提条件) | 稳定 | [按硬件 profile 分配](nvidia-device/dynamic-mig-support.md#运行-mig-工作负载) | [按硬件 profile 分配](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/mig-device-names.html#id3) | [支持](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device-plugin/nvidiadevice/nvinternal/plugin/util.go#L466-L476)（[受 CUDA 和驱动版本限制](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/mig-device-names.html#cuda-device-enumeration)） |
| [AMD GPU](amd-device/enable-amd-gpu-sharing.md) | [CU 切分](amd-device/enable-amd-gpu-sharing.md#运行-amd-任务) | Instinct / ROCm，见指南 | 稳定 | [显存配额](amd-device/enable-amd-gpu-sharing.md#简介) | [CU 份额](amd-device/enable-amd-gpu-sharing.md#简介) | [支持](https://github.com/Project-HAMi/amd-device-plugin/blob/83e7a3438f43fae360ac1e8f2e65412deeea4cf5/internal/pkg/plugin/plugin.go#L771-L776) |
| [AWS Neuron](awsneuron-device/enable-awsneuron-managing.md) | [整卡 / 核心分配](awsneuron-device/enable-awsneuron-managing.md#设备分配粒度) | Inferentia / Trainium，见指南 | 稳定 | [无独立配额接口](awsneuron-device/enable-awsneuron-managing.md#设备分配粒度) | [NeuronCore 分配](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/awsneuron/device.go#L454-L505) | [支持跨设备核心分配](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/awsneuron/device.go#L454-L514)（末设备可部分分配；[所选设备须空闲并满足拓扑约束](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/awsneuron/device.go#L376-L445)） |
| [Biren GPU](biren-device/enable-biren-sharing.md) | [整卡 / 预切分 SVI](https://github.com/Project-HAMi/biren-device-plugin/blob/f0a83df3b681bc3aac795eafb2232ee966c4a2dd/pkg/brgpu/runc.go#L177-L270) | Biren166M | 稳定 | [SVI 固定分区](biren-device/enable-biren-sharing.md#注意事项) | [SVI 固定分区](biren-device/enable-biren-sharing.md#注意事项) | [支持](https://github.com/Project-HAMi/biren-device-plugin/blob/f0a83df3b681bc3aac795eafb2232ee966c4a2dd/pkg/brgpu/plugin.go#L282-L349)（[预切分 SVI 实例](https://github.com/Project-HAMi/biren-device-plugin/blob/f0a83df3b681bc3aac795eafb2232ee966c4a2dd/pkg/brgpu/register.go#L64-L82)） |
| [Cambricon MLU](cambricon-device/enable-cambricon-mlu-sharing.md) | [动态 SMLU](cambricon-device/enable-cambricon-mlu-sharing.md#开启-mlu-复用) | 370、590 | 稳定 | [显存配额](cambricon-device/enable-cambricon-mlu-sharing.md#运行-mlu-任务) | [核心配额](cambricon-device/enable-cambricon-mlu-sharing.md#运行-mlu-任务) | [不支持](cambricon-device/enable-cambricon-mlu-sharing.md#注意事项) |
| [Enflame GCU](enflame-device/enable-enflame-gcu-sharing.md) | [DRS](enflame-device/enable-enflame-gcu-sharing.md#运行-gcu-任务) | S60 | 稳定 | [按 profile 分配](enflame-device/enable-enflame-gcu-sharing.md#按显存算力申请统一-api) | [按 profile 分配](enflame-device/enable-enflame-gcu-sharing.md#按显存算力申请统一-api) | [不支持](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/enflame/device.go#L390-L396) |
| [Ascend NPU](ascend-device/enable-ascend-sharing.md) | [template](ascend-device/enable-ascend-sharing.md#template-模式) | 910A、910B 系列、910C、310P | 稳定 | [按模板分配](ascend-device/enable-ascend-sharing.md#template-模式) | [由模板决定](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/ascend/device.go#L217-L226) | [不支持](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/ascend/device.go#L269-L276) |
| [Ascend NPU](ascend-device/enable-ascend-sharing.md) | [hami-core](ascend-device/enable-ascend-sharing.md#hami-core-模式) | 取决于型号与运行时，见指南 | 稳定 | [显存配额](ascend-device/enable-ascend-sharing.md#单卡显存和算力配额) | [算力配额](ascend-device/enable-ascend-sharing.md#单卡显存和算力配额) | [支持](ascend-device/enable-ascend-sharing.md#双卡-vllm-推理tp2) |
| [Ascend NPU](ascend-device/enable-ascend-sharing.md) | [ENPU](ascend-device/enable-ascend-sharing.md#enpu) | A2/910B、A3/910C | 稳定 | [显存配额](ascend-device/enable-ascend-sharing.md#单卡算力与显存配额) | [取决于 ENPU 策略](ascend-device/enable-ascend-sharing.md#enpu-policy) | [不支持](ascend-device/enable-ascend-sharing.md#enpu-policy) |
| [Ascend NPU](ascend-device/enable-ascend-sharing.md) | 整卡 | [950DT](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/examples/ascend/job-950DT.yaml#L1-L14) 9582（96 GiB）；需单独部署 [ascend-device-plugin v1.5.0（Chart 0.2.2）](https://github.com/Project-HAMi/ascend-device-plugin/releases/tag/ascend-device-plugin-0.2.2) | 稳定 | [无独立配额接口](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/charts/hami/values.yaml#L1018-L1024) | [无独立配额接口](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/charts/hami/values.yaml#L1018-L1024) | [不适用](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/charts/hami/values.yaml#L1018-L1024) |
| [Hygon HCU](hygon-device/enable-hygon-hcu-sharing.md) | [动态切分 vHCU](https://github.com/HYGON-AI/k8s-hcu-device-plugin/blob/1b0dce86471ff80d61535f68f26e34ee54b33ab8/README.md#使用模式对比) | All | 稳定 | [显存配额](hygon-device/enable-hygon-hcu-sharing.md#简介) | [计算资源份额](hygon-device/enable-hygon-hcu-sharing.md#简介) | [不支持](hygon-device/enable-hygon-hcu-sharing.md#注意事项) |
| [Iluvatar GPU](iluvatar-device/enable-iluvatar-gpu-sharing.md) | [vGPU（gpu-manager）](iluvatar-device/enable-iluvatar-gpu-sharing.md#设备粒度) | MR-V100、MR-V50、BI-V150、BI-V100 | 稳定 | [显存配额](iluvatar-device/enable-iluvatar-gpu-sharing.md#显存分配) | [核心配额](iluvatar-device/enable-iluvatar-gpu-sharing.md#核心分配) | [不支持](iluvatar-device/enable-iluvatar-gpu-sharing.md#注意事项) |
| [Kunlunxin XPU](kunlunxin-device/enable-kunlunxin-vxpu.md) | [VXPU](kunlunxin-device/enable-kunlunxin-vxpu.md#设备粒度分区) | P800-OAM | 稳定 | [按切分规格分配](kunlunxin-device/enable-kunlunxin-vxpu.md#设备粒度分区) | [随切分规格分配](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/kunlun/vdevice.go#L179-L205) | [支持](kunlunxin-device/enable-kunlunxin-vxpu.md#重要说明) |
| [MetaX GPU](metax-device/metax-sgpu/enable-metax-gpu-sharing.md) | [sGPU](metax-device/metax-sgpu/enable-metax-gpu-sharing.md#运行沐曦任务) | MXC500 | 稳定 | [显存配额](metax-device/metax-sgpu/enable-metax-gpu-sharing.md#运行沐曦任务) | [取决于 QoS](metax-device/metax-sgpu/examples/allocate-qos-policy.md) | [支持](https://developer.metax-tech.com/api/client/document/preview/1411/3rd/12_hami.html#sgpuoption)（[启用 `sgpu-app-class` 时不支持](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/metax/sdevice.go#L89-L105)） |
| [Mthreads GPU](mthreads-device/enable-mthreads-gpu-sharing.md) | [sGPU](mthreads-device/enable-mthreads-gpu-sharing.md#运行-gpu-任务) | MTT S4000 | 稳定 | [离散显存规格](mthreads-device/enable-mthreads-gpu-sharing.md#运行-gpu-任务) | [核心配额](mthreads-device/enable-mthreads-gpu-sharing.md#运行-gpu-任务) | [不支持](mthreads-device/enable-mthreads-gpu-sharing.md#注意事项) |
| [Teco GPU（Tecorigin）](https://github.com/Project-HAMi/HAMi/pull/3369) | 核心分配（开发中） | 待确认 | 实验性 | 待验证 | 待验证 | 待验证 |
| [Vastai GPU](vastai/enable-vastai-sharing.md) | [整卡 / Die 切分](vastai/enable-vastai-sharing.md#介绍) | VA16 | 稳定 | [整卡或 Die 分配](vastai/enable-vastai-sharing.md#介绍) | [整卡或 Die 分配](vastai/enable-vastai-sharing.md#介绍) | [支持（Die 分配）](https://github.com/Project-HAMi/vastai-device-plugin/blob/dba981846dbdfcf531f7bd3b5d657075e812c49f/cmd/va-vg-plugin/server.go#L383-L388) |

**稳定**表示已包含在 HAMi 正式发布版本中，本表按 [v2.11.0](https://github.com/Project-HAMi/HAMi/releases/tag/v2.11.0) 核对发布状态。**实验性（Experimental）**表示接入仍在开发或验证中，尚未正式发布。

Teco 接入尚未合并到上述 Next 基线，设备型号和能力待验证，进展见 [HAMi #3369](https://github.com/Project-HAMi/HAMi/pull/3369) 和[文档 PR #979](https://github.com/Project-HAMi/website/pull/979)。

表中能力的含义：

- **显存控制**：容器可申请的显存配额或分区规格。使用模板或固定规格时，显存按规格向上对齐。
- **计算资源控制**：各设备通过时间片、核心分配、硬件分区或 QoS 策略控制计算资源，具体限制见表中对应链接。
- **多卡切分**：同一容器跨多张物理设备分配资源，且可使用其中设备的部分资源。仅分配多张整卡不计为多卡切分，具体分配粒度和限制见对应链接。`不适用` 表示该模式仅分配整卡。

## 组件集成指南

在 NVIDIA 共享场景中，[Volcano vGPU](volcano-vgpu/nvidia-gpu/how-to-use-volcano-vgpu.md) 和 [KAI Scheduler](kai-scheduler/how-to-use-kai-scheduler.md) 保留各自的调度能力，并使用 HAMi-core 提供运行时隔离；KAI Scheduler 的集成用于显存隔离。[HAMi-DRA](nvidia-device/dynamic-resource-allocation.md) 通过 DRA 驱动与 Kubernetes 调度器协作，其 NVIDIA 共享路径使用 [HAMi-core 在运行时执行显存和算力限制](https://github.com/Project-HAMi/k8s-dra-driver/blob/9475a1b344e7e5fb8310d47de398199101f8d0ba/cmd/hami-kubelet-plugin/hami_core.go#L218-L267)。

下表提供各设备与调度组件的集成指南，包含安装步骤、配置要求和使用限制。`-` 表示暂无对应指南。

<!-- prettier-ignore -->
| 制造商                    | HAMi | HAMi-DRA | Volcano | KAI-scheduler |
| ------------------------- | ---- | -------- | ------- | ------------- |
| 英伟达（NVIDIA）          | [分配设备显存](nvidia-device/specify-device-memory-usage.md) · [远程 GPU](nvidia-device/remote-gpu.md) | [动态资源分配](nvidia-device/dynamic-resource-allocation.md) | [使用 Volcano vGPU](volcano-vgpu/nvidia-gpu/how-to-use-volcano-vgpu.md) | [使用 KAI Scheduler](kai-scheduler/how-to-use-kai-scheduler.md) |
| AMD                       | [启用 AMD GPU 共享](amd-device/enable-amd-gpu-sharing.md#部署) | - | - | - |
| AWS                       | [管理 AWS Neuron 设备](awsneuron-device/enable-awsneuron-managing.md#启用-neuron-共享支持) | - | - | - |
| 壁仞（Biren）             | [启用壁仞设备共享](biren-device/enable-biren-sharing.md#启用壁仞设备共享) | - | - | - |
| 寒武纪（Cambricon）       | [启用寒武纪 MLU 共享](cambricon-device/enable-cambricon-mlu-sharing.md#开启-mlu-复用) | - | - | - |
| 燧原科技（Enflame）       | [启用燧原 GCU 共享](enflame-device/enable-enflame-gcu-sharing.md#开启-drs-调度) | - | - | - |
| 华为昇腾（Huawei Ascend） | [启用昇腾共享](ascend-device/enable-ascend-sharing.md#部署-ascend-设备插件) | - | [Volcano 昇腾 vNPU](../installation/how-to-use-volcano-ascend.md) | - |
| 海光（Hygon）             | [启用海光 HCU 共享](hygon-device/enable-hygon-hcu-sharing.md#开启-hcu-复用) | - | - | - |
| 天数智芯（Iluvatar）      | [启用天数 GPU 共享](iluvatar-device/enable-iluvatar-gpu-sharing.md#启用-gpu-共享支持) | - | - | - |
| 昆仑芯（Kunlunxin）       | [整卡调度](kunlunxin-device/enable-kunlunxin-schedule.md)、[VXPU 共享](kunlunxin-device/enable-kunlunxin-vxpu.md#启用-xpu-共享支持) | - | - | - |
| 沐曦（MetaX）             | [启用沐曦 GPU 共享](metax-device/metax-sgpu/enable-metax-gpu-sharing.md#开启复用沐曦设备) | - | - | - |
| 摩尔线程（Mthreads）      | [启用摩尔线程 GPU 共享](mthreads-device/enable-mthreads-gpu-sharing.md#开启-gpu-复用) | - | - | - |
| Teco（Tecorigin） | [接入指南（开发中）](https://github.com/Project-HAMi/website/pull/979) | - | - | - |
| 瀚博（Vastai）            | [启用瀚博设备共享](vastai/enable-vastai-sharing.md#启用瀚博半导体设备共享) | - | - | - |

每份指南都包含该设备的具体搭建步骤、配置说明以及已知限制，部署该设备前请先查阅。
