---
title: HAMi 支持的设备
description: 查询 HAMi 支持的设备型号，比较各型号的显存和算力隔离能力，并查找对应的设备配置与资源分配指南。
displayed_sidebar: docs
translated: true
---

适用版本：**Next（未发布）**，对应 [HAMi 开发提交 `adf1a43a`](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/scheduler/config/config.go#L126)。HAMi [v2.11.0 已正式发布](https://github.com/Project-HAMi/HAMi/releases/tag/v2.11.0)；历史版本参阅 [v2.10.0 支持矩阵](/zh/docs/userguide/device-supported)。

最后核验日期：**2026-11-06**，核对范围为 [HAMi 源码](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/scheduler/config/config.go#L126)、[默认设备配置](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/charts/hami/values.yaml#L545)和设备指南。

下表列出 HAMi 已接入的设备型号、资源分配模式和多卡切分支持情况。部署所需的设备插件、驱动及容器运行环境见下方设备指南。

<!-- prettier-ignore -->
| 设备 | 模式 | 型号范围                          | 集成状态 | 显存控制                                                                 | 计算资源控制                                                                                                                         | 多卡切分                                                                                                                                              |
| --- | --- |-----------------------------------|----------|--------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| [NVIDIA GPU](#nvidia) | HAMi-core | 取决于型号与驱动 | 稳定 | [显存配额](nvidia-device/specify-device-memory-usage.md) | [时间片限流](nvidia-device/specify-device-core-usage.md) | [支持](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device-plugin/nvidiadevice/nvinternal/plugin/server.go#L1524-L1529) |
| [NVIDIA GPU](#nvidia) | [MIG（动态切分）](nvidia-device/dynamic-mig-support.md#启用动态-mig-支持) | [支持 MIG 的型号](nvidia-device/dynamic-mig-support.md#前提条件) | 稳定 | [按硬件 profile 分配](nvidia-device/dynamic-mig-support.md#运行-mig-工作负载) | [按硬件 profile 分配](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/mig-device-names.html#id3) | [支持](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device-plugin/nvidiadevice/nvinternal/plugin/util.go#L466-L476)（受 CUDA 和驱动版本限制） |
| [AMD GPU](#amd) | [CU 切分](amd-device/enable-amd-gpu-sharing.md#运行-amd-任务) | Instinct / ROCm，见指南 | 稳定 | [显存配额](amd-device/enable-amd-gpu-sharing.md#简介) | [CU 份额](amd-device/enable-amd-gpu-sharing.md#简介) | [支持](https://github.com/Project-HAMi/amd-device-plugin/blob/83e7a3438f43fae360ac1e8f2e65412deeea4cf5/internal/pkg/plugin/plugin.go#L771-L776) |
| [AWS Neuron](#aws-neuron) | [整卡 / 核心分配](awsneuron-device/enable-awsneuron-managing.md#设备分配粒度) | Inferentia / Trainium，见指南 | 稳定 | [无独立配额接口](awsneuron-device/enable-awsneuron-managing.md#设备分配粒度) | [NeuronCore 分配](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/awsneuron/device.go#L454-L505) | [不支持](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/awsneuron/device.go#L454-L505) |
| [Biren GPU](#biren) | [整卡 / 预切分 SVI](biren-device/enable-biren-sharing.md#introduction) | Biren166M | 稳定 | [SVI 固定分区](biren-device/enable-biren-sharing.md#注意事项) | [SVI 固定分区](biren-device/enable-biren-sharing.md#注意事项) | [支持（SVI 分区）](https://github.com/Project-HAMi/biren-device-plugin/blob/f0a83df3b681bc3aac795eafb2232ee966c4a2dd/pkg/brgpu/plugin.go#L339-L349) |
| [Cambricon MLU](#cambricon) | [动态 SMLU](cambricon-device/enable-cambricon-mlu-sharing.md#开启-mlu-复用) | 370、590 | 稳定 | [显存配额](cambricon-device/enable-cambricon-mlu-sharing.md#运行-mlu-任务) | [核心配额](cambricon-device/enable-cambricon-mlu-sharing.md#运行-mlu-任务) | [不支持](cambricon-device/enable-cambricon-mlu-sharing.md#注意事项) |
| [Enflame GCU](#enflame) | [DRS](enflame-device/enable-enflame-gcu-sharing.md#运行-gcu-任务) | S60 | 稳定 | [按 profile 分配](enflame-device/enable-enflame-gcu-sharing.md#按显存算力申请统一-api) | [按 profile 分配](enflame-device/enable-enflame-gcu-sharing.md#按显存算力申请统一-api) | [不支持](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/enflame/device.go#L390-L396) |
| [Ascend NPU](#huawei-ascend) | [template](ascend-device/enable-ascend-sharing.md#template-模式) | 910A、910B 系列、910C、310P | 稳定 | [按模板分配](ascend-device/enable-ascend-sharing.md#template-模式) | [由模板决定](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/ascend/device.go#L217-L226) | [不支持](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/ascend/device.go#L269-L276) |
| [Ascend NPU](#huawei-ascend) | [hami-core](ascend-device/enable-ascend-sharing.md#hami-core-模式) | 取决于型号与运行时，见指南 | 稳定 | [显存配额](ascend-device/enable-ascend-sharing.md#单卡显存和算力配额) | [算力配额](ascend-device/enable-ascend-sharing.md#单卡显存和算力配额) | [支持](ascend-device/enable-ascend-sharing.md#双卡-vllm-推理tp2) |
| [Ascend NPU](#huawei-ascend) | [ENPU](ascend-device/enable-ascend-sharing.md#enpu) | A2/910B、A3/910C | [稳定（v2.11.0）](https://github.com/Project-HAMi/HAMi/blob/de6be6a042a2fd1f4e46ad71cdf87270db3c382a/pkg/device/ascend/device.go#L46-L49) | [显存配额](ascend-device/enable-ascend-sharing.md#单卡算力与显存配额) | [取决于 ENPU 策略](ascend-device/enable-ascend-sharing.md#enpu-policy) | [不支持](ascend-device/enable-ascend-sharing.md#enpu-policy) |
| [Ascend NPU](#huawei-ascend) | 整卡 | [950DT](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/examples/ascend/job-950DT.yaml#L12-L14) 9582（96 GiB） | [稳定（v2.11.0）](https://github.com/Project-HAMi/HAMi/blob/de6be6a042a2fd1f4e46ad71cdf87270db3c382a/charts/hami/values.yaml#L1018-L1024) | [无独立配额接口](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/charts/hami/values.yaml#L1018-L1024) | [无独立配额接口](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/charts/hami/values.yaml#L1018-L1024) | [不适用](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/charts/hami/values.yaml#L1018-L1024) |
| [Hygon HCU](#hygon) | [动态切分 vHCU](https://github.com/HYGON-AI/k8s-hcu-device-plugin/blob/1b0dce86471ff80d61535f68f26e34ee54b33ab8/README.md#使用模式对比) | 以厂商插件支持范围为准 | [稳定（v2.11.0）](https://github.com/Project-HAMi/HAMi/blob/de6be6a042a2fd1f4e46ad71cdf87270db3c382a/charts/hami/values.yaml#L561-L572) | [显存配额](hygon-device/enable-hygon-hcu-sharing.md#简介) | [计算资源份额](hygon-device/enable-hygon-hcu-sharing.md#简介) | [不支持](hygon-device/enable-hygon-hcu-sharing.md#注意事项) |
| [Iluvatar GPU](#iluvatar) | [vGPU（gpu-manager）](iluvatar-device/enable-iluvatar-gpu-sharing.md#设备粒度) | MR-V100、MR-V50、BI-V150、BI-V100 | 稳定 | [显存配额](iluvatar-device/enable-iluvatar-gpu-sharing.md#显存分配) | [核心配额](iluvatar-device/enable-iluvatar-gpu-sharing.md#核心分配) | [不支持](iluvatar-device/enable-iluvatar-gpu-sharing.md#注意事项) |
| [Kunlunxin XPU](#kunlunxin) | [VXPU](kunlunxin-device/enable-kunlunxin-vxpu.md#设备粒度分区) | P800-OAM | 稳定 | [按切分规格分配](kunlunxin-device/enable-kunlunxin-vxpu.md#设备粒度分区) | [随切分规格分配](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/kunlun/vdevice.go#L179-L205) | [支持](kunlunxin-device/enable-kunlunxin-vxpu.md#重要说明) |
| [MetaX GPU](#metax) | [sGPU](metax-device/metax-sgpu/enable-metax-gpu-sharing.md#运行沐曦任务) | MXC500 | 稳定 | [显存配额](metax-device/metax-sgpu/enable-metax-gpu-sharing.md#运行沐曦任务) | [取决于 QoS](metax-device/metax-sgpu/examples/allocate-qos-policy.md) | [支持](https://developer.metax-tech.com/api/client/document/preview/1411/3rd/12_hami.html#sgpuoption)（启用 `sgpu-app-class` 时不支持） |
| [Mthreads GPU](#mthreads) | [sGPU](mthreads-device/enable-mthreads-gpu-sharing.md#运行-gpu-任务) | MTT S4000 | 稳定 | [离散显存规格](mthreads-device/enable-mthreads-gpu-sharing.md#运行-gpu-任务) | [核心配额](mthreads-device/enable-mthreads-gpu-sharing.md#运行-gpu-任务) | [不支持](mthreads-device/enable-mthreads-gpu-sharing.md#注意事项) |
| [Vastai GPU](#vastai) | [整卡 / Die 切分](vastai/enable-vastai-sharing.md#介绍) | VA16 | 稳定 | [整卡或 Die 分配](vastai/enable-vastai-sharing.md#介绍) | [整卡或 Die 分配](vastai/enable-vastai-sharing.md#介绍) | [支持（Die 分配）](https://github.com/Project-HAMi/vastai-device-plugin/blob/dba981846dbdfcf531f7bd3b5d657075e812c49f/cmd/va-vg-plugin/server.go#L383-L388) |

**稳定**表示已包含在 HAMi 正式发布版本中，本表按 [v2.11.0](https://github.com/Project-HAMi/HAMi/releases/tag/v2.11.0) 核对发布状态。**实验性**表示已加入 Next，但尚未包含在正式发布版本中。

表中能力的含义：

- **显存控制**：容器可申请的显存配额或分区规格。使用模板或固定规格时，显存按规格向上对齐。
- **计算资源控制**：各设备通过时间片、核心分配、硬件分区或 QoS 策略控制计算资源，具体限制见下文。
- **多卡切分**：同一容器同时使用多张物理设备的部分资源。多张整卡的分配单独按设备指南配置。`不适用` 表示该模式仅分配整卡。

## 设备使用限制

- **NVIDIA**：HAMi-core [支持多卡软切分](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device-plugin/nvidiadevice/nvinternal/plugin/server.go#L1524-L1529)，算力通过[时间片限流](nvidia-device/specify-device-core-usage.md)，利用率会随工作负载波动。[动态 MIG](nvidia-device/dynamic-mig-support.md#前提条件) 仅适用于支持 MIG 的 GPU，切分规格由硬件 profile 决定。单个 CUDA 进程使用多个 MIG 实例需要 CUDA 12 和 R570 或更新的驱动，每个 GI 最多枚举一个 CI；R570 之前的驱动只能枚举一个 MIG 实例。参阅 [CUDA 设备枚举限制](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/mig-device-names.html#cuda-device-enumeration)。
- **AMD**：支持多卡显存和 CU 配额。使用插件 `0.0.2` 或更新版本时，各卡分别使用调度器分配的显存配额；旧版 `0.0.1` 对所有卡使用第一张卡的显存配额。Next 还支持显存百分比、NUMA/XGMI 约束及默认资源配置。显存限制通过运行时 hook 或 `dmem` cgroup 实现，环境要求见 [AMD 指南](amd-device/enable-amd-gpu-sharing.md#节点需求)，插件版本差异见[多卡显存配额修复](https://github.com/Project-HAMi/amd-device-plugin/pull/103)。
- **AWS Neuron**：`aws.amazon.com/neuroncore` 按核心数量分配计算资源。Next 按节点上报的设备容量分配 NeuronCore。跨设备请求可包含若干完整设备和最后一个设备的部分核心，分配需满足连续核心和拓扑要求。显存随设备分配，不支持单独申请显存配额。参阅 [Neuron 指南](awsneuron-device/enable-awsneuron-managing.md#设备分配粒度)和[核心分配规则](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/awsneuron/device.go#L454-L505)。
- **Biren / Vastai**：通过设备数量申请整卡或预先划分的分区，显存和算力由分区规格决定。Biren SVI 支持[二分或四分](https://github.com/Project-HAMi/biren-device-plugin/blob/f0a83df3b681bc3aac795eafb2232ee966c4a2dd/pkg/brgpu/runc.go#L237-L245)，设备插件可向同一容器[挂载多个 SVI 分区](https://github.com/Project-HAMi/biren-device-plugin/blob/f0a83df3b681bc3aac795eafb2232ee966c4a2dd/pkg/brgpu/plugin.go#L339-L349)。Vastai Die 模式可跨 AIC 分配，调度器[优先选择同一 AIC 上的可用 Die](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/vastai/device.go#L361-L372)。使用分区模式时，资源数量表示分区数。参阅 [Biren 指南](biren-device/enable-biren-sharing.md#注意事项)和 [Vastai 指南](vastai/enable-vastai-sharing.md#die-模式)。
- **Cambricon**：使用厂商插件的 `dynamic-smlu` 模式。显存和核心配额仅在 `vmlu=1` 时生效，多卡请求使用整卡。MLU370 的驱动和工具包要求见[节点需求](cambricon-device/enable-cambricon-mlu-sharing.md#节点需求)，单卡共享限制见[注意事项](cambricon-device/enable-cambricon-mlu-sharing.md#注意事项)。
- **Enflame**：通过 `gcushare-device-plugin` 使用 DRS 切分，HAMi [选择满足显存和算力请求的 profile](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/enflame/device.go#L447-L462)。[直接申请 DRS](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/enflame/device.go#L371-L377)和[按显存、算力申请](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/enflame/device.go#L390-L396)均固定为单设备分配。可用规格见 [DRS 指南](enflame-device/enable-enflame-gcu-sharing.md#按显存算力申请统一-api)。
- **Huawei Ascend**：模板模式按模板分配显存和计算资源，[不支持单独设置 `-core`](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/ascend/device.go#L217-L226)。hami-vnpu-core 支持多卡软切分，显存和算力配额按卡生效。hami-vnpu-core 目前仅支持 ARM 平台，驱动和 CANN 环境要求见 [Ascend 指南](ascend-device/enable-ascend-sharing.md#hami-core-模式)。
- **Ascend ENPU**：每个容器限用一个物理 DIE。默认 `elastic` 策略允许借用空闲算力；如需固定算力份额，使用 `fixed-share`。参阅 [ENPU 指南](ascend-device/enable-ascend-sharing.md#enpu)。
- **Ascend 950DT**：当前 HAMi 的 [9582 型号（96 GiB）配置](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/charts/hami/values.yaml#L1018-L1024)仅提供整卡分配。部署需使用配套设备插件，参阅 [950DT 整卡示例](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/examples/ascend/job-950DT.yaml#L12-L14)。
- **Hygon**：使用[动态切分 vHCU](https://github.com/HYGON-AI/k8s-hcu-device-plugin/blob/1b0dce86471ff80d61535f68f26e34ee54b33ab8/README.md#使用模式对比)，按任务请求创建和回收 vHCU。默认使用 `hygon.com/hcunum`、`hcumem` 和 `hcucores`，需配套 HCU 插件。每个容器最多共享一张设备，多卡请求使用整卡。参阅 [Hygon 指南](hygon-device/enable-hygon-hcu-sharing.md#注意事项)。
- **Iluvatar**：共享需部署 gpu-manager 并配置容器内的运行库。每个容器最多共享一张 GPU，多卡请求使用整卡。参阅 [Iluvatar 指南](iluvatar-device/enable-iluvatar-gpu-sharing.md#注意事项)。
- **Kunlunxin**：`kunlunxin.com/xpu` 用于整卡分配；`kunlunxin.com/vxpu` 和 `vxpu-memory` 用于切分。[显存切分规格](kunlunxin-device/enable-kunlunxin-vxpu.md#设备粒度分区)为 24、48 GiB，超过 48 GiB 时分配 96 GiB 整卡；[计算资源随规格分配](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/kunlun/vdevice.go#L179-L205)。支持多卡切分，可分配数量受拓扑和驱动句柄数量限制。参阅 [VXPU 指南](kunlunxin-device/enable-kunlunxin-vxpu.md#重要说明)。
- **MetaX**：支持多卡 sGPU 分配，[显存和算力按每张 sGPU 配置](https://developer.metax-tech.com/api/client/document/preview/1411/3rd/12_hami.html#sgpuoption)。sGPU 的算力限制由 QoS 策略决定：默认 `best-effort` 不限制算力，`fixed-share` 将算力限制在申请的份额内，`burst-share` 允许借用空闲算力。[启用 `sgpu-app-class` 时，每个容器只能申请一张设备](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/metax/sdevice.go#L89-L105)。参阅 [QoS 指南](metax-device/metax-sgpu/examples/allocate-qos-policy.md)。
- **Mthreads**：每个 Pod 最多共享一张 Mthreads GPU，Pod 内的所有容器共用这一限制。多卡请求使用整卡。参阅 [Mthreads 指南](mthreads-device/enable-mthreads-gpu-sharing.md#注意事项)。

## 组件集成指南

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
| 瀚博（Vastai）            | [启用瀚博设备共享](vastai/enable-vastai-sharing.md#启用瀚博半导体设备共享) | - | - | - |

## 设备文档索引

### 英伟达（NVIDIA） {#nvidia}

- [使用 Lupine 访问远程 GPU](nvidia-device/remote-gpu.md)
- [对齐 GPU 与 CPU 的 NUMA 位置](nvidia-device/numa-alignment.md)

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

### AMD {#amd}

- [启用 AMD GPU 共享](amd-device/enable-amd-gpu-sharing.md)
- [AMD GPU 共享的工作原理](amd-device/how-it-works.md)
- [配置 AMD device plugin](amd-device/configuration.md)
- [AMD GPU 共享故障排查](amd-device/troubleshooting.md)
- [AMD GPU 测试状态](amd-device/verification-status.md)
- [分配整张 GPU](amd-device/examples/default-use.md)
- [分配设备显存](amd-device/examples/use-memory.md)
- [按百分比分配设备显存](amd-device/examples/use-memory-percentage.md)
- [分配设备核心和显存](amd-device/examples/allocate-core-and-memory.md)
- [将任务分配到指定类型的 GPU](amd-device/examples/specify-card-type-to-use.md)
- [让任务避开某种类型的 GPU](amd-device/examples/specify-card-type-not-use.md)
- [将任务分配到指定 UUID 的 GPU](amd-device/examples/specify-uuid-to-use.md)
- [让任务避开指定 UUID 的 GPU](amd-device/examples/specify-uuid-not-use.md)
- [在同一 NUMA 节点上分配 GPU](amd-device/examples/numa-bind.md)
- [分配通过 XGMI 互联的 GPU](amd-device/examples/link-bind.md)
- [选择 GPU 调度策略](amd-device/examples/scheduler-policy.md)
- [设置 Pod 的队列优先级](amd-device/examples/task-priority.md)

### AWS Neuron {#aws-neuron}

- [启用 AWS-Neuron 设备共享](awsneuron-device/enable-awsneuron-managing.md)
- [分配 AWS Neuron 核心资源](awsneuron-device/examples/allocate-neuron-core.md)
- [分配 AWS Neuron 设备](awsneuron-device/examples/allocate-neuron-device.md)

### 壁仞（Biren） {#biren}

- [启用壁仞设备共享](biren-device/enable-biren-sharing.md)
- [申请壁仞设备](biren-device/examples/default-use.md)

### 寒武纪（Cambricon） {#cambricon}

- [启用寒武纪 MLU 共享](cambricon-device/enable-cambricon-mlu-sharing.md)
- [为容器分配设备显存](cambricon-device/specify-device-memory-usage.md)
- [分配设备核心给容器](cambricon-device/specify-device-core-usage.md)
- [分配到特定设备类型](cambricon-device/specify-device-type-to-use.md)
- [为容器分配设备核心和显存资源](cambricon-device/examples/allocate-core-and-memory.md)
- [分配独占设备](cambricon-device/examples/allocate-exclusive.md)

### 燧原科技（Enflame） {#enflame}

- [启用燧原 GPU 共享](enflame-device/enable-enflame-gcu-sharing.md)

### 华为昇腾（Huawei Ascend） {#huawei-ascend}

- [启用 Huawei Ascend 共享](ascend-device/enable-ascend-sharing.md)
- [Huawei Ascend 设备模板](ascend-device/device-template.md)
- [为容器分配 Huawei Ascend-310P 切片](ascend-device/examples/allocate-310p.md)
- [为容器分配 Huawei Ascend-910B 切片](ascend-device/examples/allocate-910b.md)
- [分配独占设备](ascend-device/examples/allocate-exclusive.md)
- [软切片（hami-vnpu-core）](ascend-device/examples/allocate-soft-slicing.md)

### 海光（Hygon） {#hygon}

- [启用 Hygon HCU 共享](hygon-device/enable-hygon-hcu-sharing.md)
- [为容器分配设备显存](hygon-device/specify-device-memory-usage.md)
- [分配设备核心给容器](hygon-device/specify-device-core-usage.md)
- [分配到特定设备](hygon-device/specify-device-uuid-to-use.md)
- [为容器分配设备核心和显存资源](hygon-device/examples/allocate-core-and-memory.md)
- [分配独占设备](hygon-device/examples/allocate-exclusive.md)
- [将任务分配给特定的 HCU](hygon-device/examples/specify-certain-cards.md)

### 天数智芯（Iluvatar） {#iluvatar}

- [启用天数智芯 GPU 共享](iluvatar-device/enable-iluvatar-gpu-sharing.md)
- [为容器分配 BI-V150 切片](iluvatar-device/examples/allocate-bi-v150.md)
- [为容器分配 MR-V100 切片](iluvatar-device/examples/allocate-mr-v100.md)
- [分配多个独占 BI-V150 设备](iluvatar-device/examples/allocate-exclusive-bi-v150.md)
- [分配多个独占 MR-V100 设备](iluvatar-device/examples/allocate-exclusive-mr-v100.md)

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

### 摩尔线程（Mthreads） {#mthreads}

- [启用 Mthreads GPU 共享](mthreads-device/enable-mthreads-gpu-sharing.md)
- [为容器分配设备显存](mthreads-device/specify-device-memory-usage.md)
- [分配设备核心给容器](mthreads-device/specify-device-core-usage.md)
- [为容器分配设备核心和显存资源](mthreads-device/examples/allocate-core-and-memory.md)
- [分配独占设备](mthreads-device/examples/allocate-exclusive.md)

### 瀚博（Vastai） {#vastai}

- [启用瀚博半导体设备共享](vastai/enable-vastai-sharing.md)
- [申请瀚博半导体的设备](vastai/examples/default-use.md)
