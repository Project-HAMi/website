---
title: Devices supported by HAMi
description: Find supported device models, compare memory and compute isolation capabilities, and follow the setup and allocation guides for your hardware.
displayed_sidebar: docs
---

Applicable version: **Next (unreleased)**, based on [HAMi development commit `adf1a43a`](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/scheduler/config/config.go#L126). For the released version, see the [v2.10.0 support matrix](/docs/userguide/device-supported).

Last verified: **2026-11-06**, against the [HAMi source](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/scheduler/config/config.go#L126), [default device configuration](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/charts/hami/values.yaml#L545), and device guides.

The table below lists the device models, allocation modes, and multi-card partitioning capabilities integrated with HAMi. See the device guides below for the required plugins, drivers, and container runtimes.

<!-- prettier-ignore -->
| Device | Mode | Models | Integration status | Memory control | Compute control | Multi-card partitioning |
| --- | --- | --- | --- | --- | --- | --- |
| [NVIDIA GPU](#nvidia) | HAMi-core | Depends on model and driver | Stable | [Memory quota](nvidia-device/specify-device-memory-usage.md) | [Time-slice throttling](nvidia-device/specify-device-core-usage.md) | [Yes](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device-plugin/nvidiadevice/nvinternal/plugin/server.go#L1524-L1529) |
| [NVIDIA GPU](#nvidia) | [MIG (dynamic partitioning)](nvidia-device/dynamic-mig-support.md#enable-dynamic-mig-support) | [MIG-capable models](nvidia-device/dynamic-mig-support.md#prerequisites) | Stable | [Hardware profile](nvidia-device/dynamic-mig-support.md#run-a-mig-workload) | [Hardware profile](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/mig-device-names.html#id3) | [Yes](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device-plugin/nvidiadevice/nvinternal/plugin/util.go#L466-L476) (subject to CUDA and driver requirements) |
| [AMD GPU](#amd) | [CU slicing](amd-device/enable-amd-gpu-sharing.md#run-amd-jobs) | Instinct / ROCm; see guide | Stable | [Memory quota](amd-device/enable-amd-gpu-sharing.md#introduction) | [CU share](amd-device/enable-amd-gpu-sharing.md#introduction) | [Yes](https://github.com/Project-HAMi/amd-device-plugin/blob/83e7a3438f43fae360ac1e8f2e65412deeea4cf5/internal/pkg/plugin/plugin.go#L771-L776) |
| [AWS Neuron](#aws-neuron) | [Whole device / core allocation](awsneuron-device/enable-awsneuron-managing.md#device-granularity) | Inferentia / Trainium; see guide | Stable | [No separate quota interface](awsneuron-device/enable-awsneuron-managing.md#device-granularity) | [NeuronCore allocation](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/awsneuron/device.go#L454-L505) | [No](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/awsneuron/device.go#L454-L505) |
| [Biren GPU](#biren) | [Whole device / pre-partitioned SVI](biren-device/enable-biren-sharing.md#introduction) | Biren166M | Stable | [Fixed SVI partitions](biren-device/enable-biren-sharing.md#notes) | [Fixed SVI partitions](biren-device/enable-biren-sharing.md#notes) | [Yes (SVI partitions)](https://github.com/Project-HAMi/biren-device-plugin/blob/f0a83df3b681bc3aac795eafb2232ee966c4a2dd/pkg/brgpu/plugin.go#L339-L349) |
| [Cambricon MLU](#cambricon) | [Dynamic SMLU](cambricon-device/enable-cambricon-mlu-sharing.md#enabling-mlu-sharing) | 370, 590 | Stable | [Memory quota](cambricon-device/enable-cambricon-mlu-sharing.md#running-mlu-jobs) | [Core quota](cambricon-device/enable-cambricon-mlu-sharing.md#running-mlu-jobs) | [No](cambricon-device/enable-cambricon-mlu-sharing.md#running-mlu-jobs) |
| [Enflame GCU](#enflame) | [DRS](enflame-device/enable-enflame-gcu-sharing.md#running-drs-workloads) | S60 | Stable | [Profile-based allocation](enflame-device/enable-enflame-gcu-sharing.md#request-by-memorycore-recommended-unified-api) | [Profile-based allocation](enflame-device/enable-enflame-gcu-sharing.md#request-by-memorycore-recommended-unified-api) | [No](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/enflame/device.go#L390-L396) |
| [Ascend NPU](#huawei-ascend) | [template](ascend-device/enable-ascend-sharing.md#template-mode) | 910A, 910B series, 910C, 310P | Stable | [Template-based allocation](ascend-device/enable-ascend-sharing.md#template-mode) | [Determined by template](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/ascend/device.go#L217-L226) | [No](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/ascend/device.go#L269-L276) |
| [Ascend NPU](#huawei-ascend) | [hami-core](ascend-device/enable-ascend-sharing.md#hami-core-mode) | Depends on model and runtime; see guide | Stable | [Memory quota](ascend-device/enable-ascend-sharing.md#single-device-memory-and-compute-quotas) | [Compute quota](ascend-device/enable-ascend-sharing.md#single-device-memory-and-compute-quotas) | [Yes](ascend-device/enable-ascend-sharing.md#two-device-vllm-inference-tp2) |
| [Ascend NPU](#huawei-ascend) | [ENPU](ascend-device/enable-ascend-sharing.md#enpu) | A2/910B, A3/910C | Experimental | [Memory quota](ascend-device/enable-ascend-sharing.md#single-device-compute-and-memory-quotas) | [Depends on ENPU policy](ascend-device/enable-ascend-sharing.md#enpu-policy) | [No](ascend-device/enable-ascend-sharing.md#enpu-policy) |
| [Ascend NPU](#huawei-ascend) | Whole device | [950DT](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/examples/ascend/job-950DT.yaml#L12-L14) 9582 (96 GiB) | Experimental | [No separate quota interface](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/charts/hami/values.yaml#L1018-L1024) | [No separate quota interface](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/charts/hami/values.yaml#L1018-L1024) | [N/A](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/charts/hami/values.yaml#L1018-L1024) |
| [Hygon HCU](#hygon) | [Dynamic vHCU partitioning](https://github.com/HYGON-AI/k8s-hcu-device-plugin/blob/1b0dce86471ff80d61535f68f26e34ee54b33ab8/README.md#使用模式对比) | See vendor plugin support | Experimental | [Memory quota](hygon-device/enable-hygon-hcu-sharing.md#introduction) | [Compute share](hygon-device/enable-hygon-hcu-sharing.md#introduction) | [No](hygon-device/enable-hygon-hcu-sharing.md#notes) |
| [Iluvatar GPU](#iluvatar) | [vGPU (gpu-manager)](iluvatar-device/enable-iluvatar-gpu-sharing.md#device-granularity) | MR-V100, MR-V50, BI-V150, BI-V100 | Stable | [Memory quota](iluvatar-device/enable-iluvatar-gpu-sharing.md#memory-allocation) | [Core quota](iluvatar-device/enable-iluvatar-gpu-sharing.md#core-allocation) | [No](iluvatar-device/enable-iluvatar-gpu-sharing.md#notes) |
| [Kunlunxin XPU](#kunlunxin) | [VXPU](kunlunxin-device/enable-kunlunxin-vxpu.md#device-granularity-partitioning) | P800-OAM | Stable | [Partition size](kunlunxin-device/enable-kunlunxin-vxpu.md#device-granularity-partitioning) | [Determined by partition size](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/kunlun/vdevice.go#L179-L205) | [Yes](kunlunxin-device/enable-kunlunxin-vxpu.md#important-notes) |
| [MetaX GPU](#metax) | [sGPU](metax-device/metax-sgpu/enable-metax-gpu-sharing.md#running-metax-jobs) | MXC500 | Stable | [Memory quota](metax-device/metax-sgpu/enable-metax-gpu-sharing.md#running-metax-jobs) | [Depends on QoS](metax-device/metax-sgpu/examples/allocate-qos-policy.md) | [Yes](https://developer.metax-tech.com/api/client/document/preview/1411/3rd/12_hami.html#sgpuoption) (not supported with `sgpu-app-class`) |
| [Mthreads GPU](#mthreads) | [sGPU](mthreads-device/enable-mthreads-gpu-sharing.md#running-mthreads-jobs) | MTT S4000 | Stable | [Discrete memory sizes](mthreads-device/enable-mthreads-gpu-sharing.md#running-mthreads-jobs) | [Core quota](mthreads-device/enable-mthreads-gpu-sharing.md#running-mthreads-jobs) | [No](mthreads-device/enable-mthreads-gpu-sharing.md#important-notes) |
| [Vastai GPU](#vastai) | [Whole card / Die allocation](vastai/enable-vastai-sharing.md#introduction) | VA16 | Stable | [Whole card or Die allocation](vastai/enable-vastai-sharing.md#introduction) | [Whole card or Die allocation](vastai/enable-vastai-sharing.md#introduction) | [Yes (Die allocation)](https://github.com/Project-HAMi/vastai-device-plugin/blob/dba981846dbdfcf531f7bd3b5d657075e812c49f/cmd/va-vg-plugin/server.go#L383-L388) |

**Stable** means available in v2.10.0. **Experimental** means included in Next but not yet released.

Capability columns:

- **Memory control**: The memory quota or partition size that a container can request. Templates and fixed partition sizes round memory allocations up to the corresponding size.
- **Compute control**: Devices control compute resources through time slices, core allocation, hardware partitions, or QoS policies. See the limitations below.
- **Multi-card partitioning**: A single container can use part of the resources on multiple physical devices at the same time. Follow the device guide when requesting multiple whole devices. `N/A` means the mode allocates whole devices only.

## Device limitations

- **NVIDIA**: HAMi-core [supports partitioning across multiple GPUs](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device-plugin/nvidiadevice/nvinternal/plugin/server.go#L1524-L1529) and limits compute usage through [time-slice throttling](nvidia-device/specify-device-core-usage.md); reported utilization varies with the workload. [Dynamic MIG](nvidia-device/dynamic-mig-support.md#prerequisites) requires a MIG-capable GPU and uses hardware-defined profiles. A single CUDA process needs CUDA 12 and an R570 or newer driver to enumerate multiple MIG instances, with at most one CI per GI. Drivers before R570 can enumerate only one MIG instance per CUDA process. See [CUDA device enumeration limits](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/mig-device-names.html#cuda-device-enumeration).
- **AMD**: Supports memory and CU quotas across multiple GPUs. With plugin `0.0.2` or later, each GPU receives its own scheduler-assigned memory quota; version `0.0.1` applies the first GPU's memory quota to every GPU. Next also supports memory percentages, NUMA/XGMI constraints, and default resource settings. Memory limits are enforced through a runtime hook or the `dmem` cgroup controller. See the [AMD guide](amd-device/enable-amd-gpu-sharing.md#prerequisites) for environment requirements and the [multi-GPU memory quota fix](https://github.com/Project-HAMi/amd-device-plugin/pull/103) for the version difference.
- **AWS Neuron**: `aws.amazon.com/neuroncore` allocates compute by core count. Next uses the device capacity reported by the node to allocate NeuronCores. A request spanning devices can contain several whole devices and part of the cores on the last device, subject to contiguous-core and topology requirements. Memory is allocated with the device; there is no separate memory quota request. See the [Neuron guide](awsneuron-device/enable-awsneuron-managing.md#device-granularity) and [core allocation rules](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/awsneuron/device.go#L454-L505).
- **Biren / Vastai**: Request whole cards or pre-partitioned devices by device count. Memory and compute capacity are determined by the partition size. Biren SVI supports [two or four partitions per GPU](https://github.com/Project-HAMi/biren-device-plugin/blob/f0a83df3b681bc3aac795eafb2232ee966c4a2dd/pkg/brgpu/runc.go#L237-L245), and the plugin can [mount multiple SVI partitions in one container](https://github.com/Project-HAMi/biren-device-plugin/blob/f0a83df3b681bc3aac795eafb2232ee966c4a2dd/pkg/brgpu/plugin.go#L339-L349). Vastai Die mode allows allocation across AICs; the scheduler [prefers available Dies on the same AIC](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/vastai/device.go#L361-L372). In partitioned modes, the resource count is the number of partitions. See the [Biren guide](biren-device/enable-biren-sharing.md#notes) and [Vastai guide](vastai/enable-vastai-sharing.md#die-mode).
- **Cambricon**: Uses the vendor plugin in `dynamic-smlu` mode. Memory and core quotas apply only when `vmlu=1`; requests for multiple devices allocate whole devices. See the [prerequisites](cambricon-device/enable-cambricon-mlu-sharing.md#prerequisites) for MLU370 driver and toolkit requirements, and the [notes on single-device sharing](cambricon-device/enable-cambricon-mlu-sharing.md#running-mlu-jobs).
- **Enflame**: Uses DRS partitioning through `gcushare-device-plugin`. HAMi [selects a profile that satisfies the memory and compute request](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/enflame/device.go#L447-L462). Both [direct DRS requests](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/enflame/device.go#L371-L377) and [memory/compute requests](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/enflame/device.go#L390-L396) allocate exactly one device. See the [DRS guide](enflame-device/enable-enflame-gcu-sharing.md#request-by-memorycore-recommended-unified-api) for available profiles.
- **Huawei Ascend**: Template mode allocates memory and compute according to the template and [does not support a separate `-core` request](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/ascend/device.go#L217-L226). hami-vnpu-core supports partitioning across multiple devices, with memory and compute quotas applied per device. hami-vnpu-core currently supports only ARM platforms. See the [Ascend guide](ascend-device/enable-ascend-sharing.md#hami-core-mode) for driver and CANN requirements.
- **Ascend ENPU**: Each container is limited to one physical DIE. The default `elastic` policy allows borrowing idle compute capacity; use `fixed-share` for a fixed compute share. See the [ENPU guide](ascend-device/enable-ascend-sharing.md#enpu).
- **Ascend 950DT**: The current HAMi [configuration for model 9582 (96 GiB)](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/charts/hami/values.yaml#L1018-L1024) provides whole-device allocation only. Deployment requires the matching device plugin. See the [950DT whole-device example](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/examples/ascend/job-950DT.yaml#L12-L14).
- **Hygon**: Uses [dynamic vHCU partitioning](https://github.com/HYGON-AI/k8s-hcu-device-plugin/blob/1b0dce86471ff80d61535f68f26e34ee54b33ab8/README.md#使用模式对比), creating and reclaiming vHCUs according to task requests. The default resource names are `hygon.com/hcunum`, `hcumem`, and `hcucores`; a matching HCU plugin is required. Each container can share at most one device; requests for multiple devices allocate whole devices. See the [Hygon guide](hygon-device/enable-hygon-hcu-sharing.md#notes).
- **Iluvatar**: Sharing requires gpu-manager and the corresponding runtime libraries inside the container. Each container can share at most one GPU; requests for multiple GPUs allocate whole devices. See the [Iluvatar guide](iluvatar-device/enable-iluvatar-gpu-sharing.md#notes).
- **Kunlunxin**: `kunlunxin.com/xpu` requests whole devices; `kunlunxin.com/vxpu` and `vxpu-memory` request partitions. [Memory partition sizes](kunlunxin-device/enable-kunlunxin-vxpu.md#device-granularity-partitioning) are 24 and 48 GiB; requests above 48 GiB allocate a whole 96 GiB device. [Compute capacity follows the partition size](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/kunlun/vdevice.go#L179-L205). Multi-device partitioning is supported, subject to topology and driver handle limits. See the [VXPU guide](kunlunxin-device/enable-kunlunxin-vxpu.md#important-notes).
- **MetaX**: Supports multi-device sGPU allocation, with [memory and compute configured per sGPU](https://developer.metax-tech.com/api/client/document/preview/1411/3rd/12_hami.html#sgpuoption). Compute limits depend on the QoS policy: the default `best-effort` does not limit compute, `fixed-share` caps compute at the requested share, and `burst-share` allows borrowing idle capacity. [With `sgpu-app-class` enabled, each container can request only one device](https://github.com/Project-HAMi/HAMi/blob/adf1a43a07cf7e3b697012b80eef3ddd7c919222/pkg/device/metax/sdevice.go#L89-L105). See the [QoS guide](metax-device/metax-sgpu/examples/allocate-qos-policy.md).
- **Mthreads**: Each Pod can share at most one Mthreads GPU; this limit applies across all containers in the Pod. Requests for multiple GPUs allocate whole devices. See the [Mthreads guide](mthreads-device/enable-mthreads-gpu-sharing.md#important-notes).

## Component integration guides

The table below links to device and scheduling component integration guides, including installation steps, configuration requirements, and limitations. `-` means no guide is available.

<!-- prettier-ignore -->
| Manufacturer  | HAMi | HAMi-DRA | Volcano | KAI-scheduler |
| ------------- | ---- | -------- | ------- | ------------- |
| NVIDIA        | [Allocate device memory](nvidia-device/specify-device-memory-usage.md) · [Remote GPU](nvidia-device/remote-gpu.md) | [Dynamic Resource Allocation](nvidia-device/dynamic-resource-allocation.md) | [Use Volcano vGPU](volcano-vgpu/nvidia-gpu/how-to-use-volcano-vgpu.md) | [Use KAI Scheduler](kai-scheduler/how-to-use-kai-scheduler.md) |
| AMD           | [Enable AMD GPU sharing](amd-device/enable-amd-gpu-sharing.md#deploy) | - | - | - |
| AWS           | [Manage AWS Neuron devices](awsneuron-device/enable-awsneuron-managing.md#enabling-neuron-sharing-support) | - | - | - |
| Biren         | [Enable Biren sharing](biren-device/enable-biren-sharing.md#enabling-biren-device-sharing) | - | - | - |
| Cambricon     | [Enable Cambricon MLU sharing](cambricon-device/enable-cambricon-mlu-sharing.md#enabling-mlu-sharing) | - | - | - |
| Enflame       | [Enable Enflame GCU sharing](enflame-device/enable-enflame-gcu-sharing.md#enable-enflame-drs-scheduling) | - | - | - |
| Huawei Ascend | [Enable Huawei Ascend sharing](ascend-device/enable-ascend-sharing.md#deploy-the-ascend-device-plugin) | - | [Volcano Ascend vNPU](../installation/how-to-use-volcano-ascend.md) | - |
| Hygon         | [Enable Hygon HCU sharing](hygon-device/enable-hygon-hcu-sharing.md#enabling-hcu-sharing-support) | - | - | - |
| Iluvatar      | [Enable Iluvatar GPU sharing](iluvatar-device/enable-iluvatar-gpu-sharing.md#enabling-gpu-sharing-support) | - | - | - |
| Kunlunxin     | [Whole-device scheduling](kunlunxin-device/enable-kunlunxin-schedule.md) · [VXPU sharing](kunlunxin-device/enable-kunlunxin-vxpu.md#enable-xpu-sharing-support) | - | - | - |
| MetaX         | [Enable MetaX GPU sharing](metax-device/metax-sgpu/enable-metax-gpu-sharing.md#enabling-gpu-sharing-support) | - | - | - |
| Mthreads      | [Enable Mthreads GPU sharing](mthreads-device/enable-mthreads-gpu-sharing.md#enabling-gpu-sharing-support) | - | - | - |
| Vastai        | [Enable Vastai sharing](vastai/enable-vastai-sharing.md#enabling-vastai-device-sharing) | - | - | - |

## Device documentation index

### NVIDIA {#nvidia}

- [Remote GPU access with Lupine](nvidia-device/remote-gpu.md)
- [Align GPU and CPU NUMA placement](nvidia-device/numa-alignment.md)

- [Allocate device memory to container](nvidia-device/specify-device-memory-usage.md)
- [Dynamic Resource Allocation](nvidia-device/dynamic-resource-allocation.md)
- [Enable dynamic MIG feature](nvidia-device/dynamic-mig-support.md)
- [Scheduling Policies](nvidia-device/scheduling-policy.md)
- [Allocate device core to container](nvidia-device/specify-device-core-usage.md)
- [Assign to certain device type](nvidia-device/specify-device-type-to-use.md)
- [Assign to Certain Device UUID](nvidia-device/specify-device-uuid-to-use.md)
- [Using Extended ResourceQuota for NVIDIA Devices](nvidia-device/using-resourcequota.md)
- [Use Exclusive GPU](nvidia-device/examples/use-exclusive-card.md)
- [Allocate certain device memory to container](nvidia-device/examples/allocate-device-memory.md)
- [Allocate a part of device memory by percentage to container](nvidia-device/examples/allocate-device-memory2.md)
- [Allocate device core to container](nvidia-device/examples/allocate-device-core.md)
- [Assign task to a certain type](nvidia-device/examples/specify-card-type-to-use.md)
- [Assign task to a certain GPU](nvidia-device/examples/specify-certain-card.md)
- [Assign task to MIG instance](nvidia-device/examples/dynamic-mig-example.md)

### AMD {#amd}

- [Enable AMD GPU Sharing](amd-device/enable-amd-gpu-sharing.md)
- [How AMD GPU sharing works](amd-device/how-it-works.md)
- [Configure the AMD device plugin](amd-device/configuration.md)
- [Troubleshoot AMD GPU sharing](amd-device/troubleshooting.md)
- [AMD GPU test status](amd-device/verification-status.md)
- [Allocate a whole GPU](amd-device/examples/default-use.md)
- [Allocate device memory](amd-device/examples/use-memory.md)
- [Allocate device memory by percentage](amd-device/examples/use-memory-percentage.md)
- [Allocate device core and memory resource](amd-device/examples/allocate-core-and-memory.md)
- [Assign task to a certain GPU type](amd-device/examples/specify-card-type-to-use.md)
- [Avoid a certain GPU type](amd-device/examples/specify-card-type-not-use.md)
- [Assign task to a certain GPU by UUID](amd-device/examples/specify-uuid-to-use.md)
- [Avoid a certain GPU by UUID](amd-device/examples/specify-uuid-not-use.md)
- [Allocate GPUs on one NUMA node](amd-device/examples/numa-bind.md)
- [Allocate XGMI-linked GPUs](amd-device/examples/link-bind.md)
- [Choose a GPU scheduling policy](amd-device/examples/scheduler-policy.md)
- [Set the queue priority of a pod](amd-device/examples/task-priority.md)

### AWS Neuron {#aws-neuron}

- [Enable AWS-Neuron device Sharing](awsneuron-device/enable-awsneuron-managing.md)
- [Allocate AWS Neuron core](awsneuron-device/examples/allocate-neuron-core.md)
- [Allocate AWS Neuron device](awsneuron-device/examples/allocate-neuron-device.md)

### Biren {#biren}

- [Enable Biren Sharing](biren-device/enable-biren-sharing.md)
- [Allocate Biren Device](biren-device/examples/default-use.md)

### Cambricon {#cambricon}

- [Enable Cambricon MLU Sharing](cambricon-device/enable-cambricon-mlu-sharing.md)
- [Allocate device memory](cambricon-device/specify-device-memory-usage.md)
- [Allocate device core usage](cambricon-device/specify-device-core-usage.md)
- [Assign to certain device type](cambricon-device/specify-device-type-to-use.md)
- [Allocate device core and memory to container](cambricon-device/examples/allocate-core-and-memory.md)
- [Allocate exclusive device](cambricon-device/examples/allocate-exclusive.md)

### Enflame {#enflame}

- [Enable Enflame GCU Sharing](enflame-device/enable-enflame-gcu-sharing.md)

### Huawei Ascend {#huawei-ascend}

- [Enable Huawei Ascend sharing](ascend-device/enable-ascend-sharing.md)
- [Huawei Ascend device template](ascend-device/device-template.md)
- [Allocate 310P slice](ascend-device/examples/allocate-310p.md)
- [Allocate 910B slice](ascend-device/examples/allocate-910b.md)
- [Allocate exclusive device](ascend-device/examples/allocate-exclusive.md)
- [Soft slicing (hami-vnpu-core)](ascend-device/examples/allocate-soft-slicing.md)

### Hygon {#hygon}

- [Enable Hygon HCU sharing](hygon-device/enable-hygon-hcu-sharing.md)
- [Allocate device memory](hygon-device/specify-device-memory-usage.md)
- [Allocate device core to container](hygon-device/specify-device-core-usage.md)
- [Assign to certain device](hygon-device/specify-device-uuid-to-use.md)
- [Allocate device core and memory resource](hygon-device/examples/allocate-core-and-memory.md)
- [Allocate exclusive device](hygon-device/examples/allocate-exclusive.md)
- [Assign task to certain HCU cards](hygon-device/examples/specify-certain-cards.md)

### Iluvatar {#iluvatar}

- [Enable Iluvatar GPU Sharing](iluvatar-device/enable-iluvatar-gpu-sharing.md)
- [Allocate BI-V150 slice](iluvatar-device/examples/allocate-bi-v150.md)
- [Allocate MR-V100 slice](iluvatar-device/examples/allocate-mr-v100.md)
- [Allocate exclusive BI-V150 device](iluvatar-device/examples/allocate-exclusive-bi-v150.md)
- [Allocate exclusive MR-V100 device](iluvatar-device/examples/allocate-exclusive-mr-v100.md)

### Kunlunxin {#kunlunxin}

- [Enable Kunlunxin GPU Topology-Aware Scheduling](kunlunxin-device/enable-kunlunxin-schedule.md)
- [Enable Kunlunxin VXPU](kunlunxin-device/enable-kunlunxin-vxpu.md)
- [Allocate a whole xpu card](kunlunxin-device/examples/allocate-whole-xpu.md)
- [Allocate vxpu device](kunlunxin-device/examples/allocate-vxpu.md)

### MetaX {#metax}

- [Enable MetaX GPU sharing](metax-device/metax-sgpu/enable-metax-gpu-sharing.md)
- [Allocate device core and memory resource](metax-device/metax-sgpu/examples/default-use.md)
- [Allocate exclusive device](metax-device/metax-sgpu/examples/allocate-exclusive.md)
- [Allocate specific QoS policy devices](metax-device/metax-sgpu/examples/allocate-qos-policy.md)
- [Enable MetaX GPU topology-aware scheduling](metax-device/metax-gpu/enable-metax-gpu-schedule.md)
- [Binpack schedule policy](metax-device/metax-gpu/specify-binpack-task.md)
- [Spread schedule policy](metax-device/metax-gpu/specify-spread-task.md)
- [Allocate metax device](metax-device/metax-gpu/examples/default-use.md)
- [Binpack schedule policy](metax-device/metax-gpu/examples/allocate-binpack.md)
- [Spread schedule policy](metax-device/metax-gpu/examples/allocate-spread.md)

### Mthreads {#mthreads}

- [Enable Mthreads GPU sharing](mthreads-device/enable-mthreads-gpu-sharing.md)
- [Allocate device memory to container](mthreads-device/specify-device-memory-usage.md)
- [Allocate device core to container](mthreads-device/specify-device-core-usage.md)
- [Allocate device core and memory resource](mthreads-device/examples/allocate-core-and-memory.md)
- [Allocate exclusive device](mthreads-device/examples/allocate-exclusive.md)

### Vastai {#vastai}

- [Enable Vastai Sharing](vastai/enable-vastai-sharing.md)
- [Allocate Vastai Device](vastai/examples/default-use.md)
