---
title: Devices supported by HAMi
description: Find supported device models, compare memory and compute isolation capabilities, and follow the setup and allocation guides for your hardware.
displayed_sidebar: docs
---

Applicable version: **HAMi v2.10.0**.

Last verified: **2026-11-06**, against the [HAMi source](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/scheduler/config/config.go#L99), [default device configuration](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/charts/hami/templates/scheduler/device-configmap.yaml#L16), and device guides.

The table below lists the device models, allocation modes, and multi-card partitioning capabilities integrated with HAMi. See the device guides below for the required plugins, drivers, and container runtimes.

<!-- prettier-ignore -->
| Device | Mode | Models | Integration status | Memory control | Compute control | Multi-card partitioning |
| --- | --- | --- | --- | --- | --- | --- |
| [NVIDIA GPU](#nvidia) | HAMi-core | All | Stable | [Memory quota](nvidia-device/specify-device-memory-usage.md) | [Time-slice throttling](nvidia-device/specify-device-core-usage.md) | [Yes](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device-plugin/nvidiadevice/nvinternal/plugin/server.go#L832-L837) |
| [NVIDIA GPU](#nvidia) | [MIG (dynamic partitioning)](nvidia-device/dynamic-mig-support.md#enable-dynamic-mig-support) | [MIG-capable models](nvidia-device/dynamic-mig-support.md#prerequisites) | Stable | [Hardware profile](nvidia-device/dynamic-mig-support.md#run-a-mig-workload) | [Hardware profile](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/mig-device-names.html#id3) | [Yes](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device-plugin/nvidiadevice/nvinternal/plugin/util.go#L349-L358) ([subject to CUDA and driver requirements](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/mig-device-names.html#cuda-device-enumeration)) |
| [AMD GPU](#amd) | [CU slicing](amd-device/enable-amd-gpu-sharing.md#running-amd-vgpu-jobs) | Instinct / ROCm; see guide | Stable | [Memory quota](amd-device/enable-amd-gpu-sharing.md#running-amd-vgpu-jobs) | [CU share](amd-device/enable-amd-gpu-sharing.md#running-amd-vgpu-jobs) | [Yes](https://github.com/Project-HAMi/amd-device-plugin/blob/0691b4f960d8e5d3e8918c7e30e5e984faaa0f03/internal/pkg/plugin/plugin.go#L688-L742) |
| [AWS Neuron](#aws-neuron) | [Whole device / core allocation](awsneuron-device/enable-awsneuron-managing.md#device-granularity) | Inferentia / Trainium; see guide | Stable | [No separate quota interface](awsneuron-device/enable-awsneuron-managing.md#device-granularity) | [NeuronCore allocation](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device/awsneuron/device.go#L141-L154) | [No](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device/awsneuron/device.go#L141-L154) |
| [Biren GPU](#biren) | [Whole device / pre-partitioned SVI](biren-device/enable-biren-sharing.md#introduction) | Biren166M | Stable | [Fixed SVI partitions](biren-device/enable-biren-sharing.md#notes) | [Fixed SVI partitions](biren-device/enable-biren-sharing.md#notes) | [Yes (SVI partitions)](https://github.com/Project-HAMi/biren-device-plugin/blob/f0a83df3b681bc3aac795eafb2232ee966c4a2dd/pkg/brgpu/plugin.go#L339-L349) |
| [Cambricon MLU](#cambricon) | [Dynamic SMLU](cambricon-device/enable-cambricon-mlu-sharing.md#enabling-mlu-sharing) | 370, 590 | Stable | [Memory quota](cambricon-device/enable-cambricon-mlu-sharing.md#running-mlu-jobs) | [Core quota](cambricon-device/enable-cambricon-mlu-sharing.md#running-mlu-jobs) | [No](cambricon-device/enable-cambricon-mlu-sharing.md#running-mlu-jobs) |
| [Enflame GCU](#enflame) | [DRS](enflame-device/enable-enflame-gcu-sharing.md#running-drs-workloads) | S60 | Stable | [Profile-based allocation](enflame-device/enable-enflame-gcu-sharing.md#request-by-memorycore-recommended-unified-api) | [Profile-based allocation](enflame-device/enable-enflame-gcu-sharing.md#request-by-memorycore-recommended-unified-api) | [No](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device/enflame/device.go#L358-L364) |
| [Ascend NPU](#huawei-ascend) | [template](ascend-device/enable-ascend-sharing.md#1-template-based-hard-slicing-vnpu) | 910A, 910B series, 910C, 310P | Stable | [Template-based allocation](ascend-device/enable-ascend-sharing.md#notes) | [Determined by template](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device/ascend/device.go#L153-L163) | [No](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device/ascend/device.go#L177-L181) |
| [Ascend NPU](#huawei-ascend) | [hami-core](ascend-device/enable-ascend-sharing.md#2-soft-slicing-with-runtime-interception-hami-vnpu-core) | Depends on model and runtime; see guide | Stable | [Memory quota](ascend-device/enable-ascend-sharing.md#soft-slicing-hami-vnpu-core) | [Compute quota](ascend-device/enable-ascend-sharing.md#soft-slicing-hami-vnpu-core) | [Yes](ascend-device/enable-ascend-sharing.md#multi-card-parallel-inference-soft-slicing) |
| [Hygon DCU](#hygon) | [Dynamic vDCU partitioning](hygon-device/enable-hygon-dcu-sharing.md#running-dcu-jobs) | All | Stable | [Memory quota](hygon-device/enable-hygon-dcu-sharing.md#introduction) | [Compute share](hygon-device/enable-hygon-dcu-sharing.md#introduction) | [No](hygon-device/enable-hygon-dcu-sharing.md#notes) |
| [Iluvatar GPU](#iluvatar) | [vGPU (gpu-manager)](iluvatar-device/enable-iluvatar-gpu-sharing.md#device-granularity) | MR-V100, MR-V50, BI-V150, BI-V100 | Stable | [Memory quota](iluvatar-device/enable-iluvatar-gpu-sharing.md#memory-allocation) | [Core quota](iluvatar-device/enable-iluvatar-gpu-sharing.md#core-allocation) | [No](iluvatar-device/enable-iluvatar-gpu-sharing.md#notes) |
| [Kunlunxin XPU](#kunlunxin) | [VXPU](kunlunxin-device/enable-kunlunxin-vxpu.md#device-granularity-partitioning) | P800-OAM | Stable | [Partition size](kunlunxin-device/enable-kunlunxin-vxpu.md#device-granularity-partitioning) | [Determined by partition size](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device/kunlun/vdevice.go#L184-L210) | [Yes](kunlunxin-device/enable-kunlunxin-vxpu.md#important-notes) |
| [MetaX GPU](#metax) | [sGPU](metax-device/metax-sgpu/enable-metax-gpu-sharing.md#running-metax-jobs) | MXC500 | Stable | [Memory quota](metax-device/metax-sgpu/enable-metax-gpu-sharing.md#running-metax-jobs) | [Depends on QoS](metax-device/metax-sgpu/examples/allocate-qos-policy.md) | [Yes](https://developer.metax-tech.com/api/client/document/preview/1411/3rd/12_hami.html#sgpuoption) ([not supported with `sgpu-app-class`](https://github.com/Project-HAMi/HAMi/blob/4707fb02c91c545bc7343ce26dba4c32919f9a3e/pkg/device/metax/sdevice.go#L89-L105)) |
| [Mthreads GPU](#mthreads) | [sGPU](mthreads-device/enable-mthreads-gpu-sharing.md#running-mthreads-jobs) | MTT S4000 | Stable | [Discrete memory sizes](mthreads-device/enable-mthreads-gpu-sharing.md#running-mthreads-jobs) | [Core quota](mthreads-device/enable-mthreads-gpu-sharing.md#running-mthreads-jobs) | [No](mthreads-device/enable-mthreads-gpu-sharing.md#important-notes) |
| [Vastai GPU](#vastai) | [Whole card / Die allocation](vastai/enable-vastai-sharing.md#introduction) | VA16 | Stable | [Whole card or Die allocation](vastai/enable-vastai-sharing.md#introduction) | [Whole card or Die allocation](vastai/enable-vastai-sharing.md#introduction) | [Yes (Die allocation)](https://github.com/Project-HAMi/vastai-device-plugin/blob/dba981846dbdfcf531f7bd3b5d657075e812c49f/cmd/va-vg-plugin/server.go#L383-L388) |

**Stable** means available in v2.10.0.

Capability columns:

- **Memory control**: The memory quota or partition size that a container can request. Templates and fixed partition sizes round memory allocations up to the corresponding size.
- **Compute control**: Devices control compute resources through time slices, core allocation, hardware partitions, or QoS policies. See the linked references in the table for limitations.
- **Multi-card partitioning**: A single container can use part of the resources on multiple physical devices at the same time. Follow the device guide when requesting multiple whole devices. `N/A` means the mode allocates whole devices only.

## Component integration guides

The table below links to device and scheduling component integration guides, including installation steps, configuration requirements, and limitations. `-` means no guide is available.

<!-- prettier-ignore -->
| Manufacturer  | HAMi | HAMi-DRA | Volcano | KAI-scheduler |
| ------------- | ---- | -------- | ------- | ------------- |
| NVIDIA        | [Allocate device memory](nvidia-device/specify-device-memory-usage.md) | [Dynamic Resource Allocation](nvidia-device/dynamic-resource-allocation.md) | [Use Volcano vGPU](volcano-vgpu/nvidia-gpu/how-to-use-volcano-vgpu.md) | [Use KAI Scheduler](kai-scheduler/how-to-use-kai-scheduler.md) |
| Cambricon     | [Enable Cambricon MLU sharing](cambricon-device/enable-cambricon-mlu-sharing.md#enabling-mlu-sharing) | - | - | - |
| Hygon         | [Enable Hygon DCU sharing](hygon-device/enable-hygon-dcu-sharing.md#enabling-dcu-sharing-support) | - | - | - |
| Huawei Ascend | [Enable Huawei Ascend sharing](ascend-device/enable-ascend-sharing.md#deployment) | - | [Volcano Ascend vNPU](../installation/how-to-use-volcano-ascend.md) | - |
| Iluvatar      | [Enable Iluvatar GPU sharing](iluvatar-device/enable-iluvatar-gpu-sharing.md#enabling-gpu-sharing-support) | - | - | - |
| Mthreads      | [Enable Mthreads GPU sharing](mthreads-device/enable-mthreads-gpu-sharing.md#enabling-gpu-sharing-support) | - | - | - |
| MetaX         | [Enable MetaX GPU sharing](metax-device/metax-sgpu/enable-metax-gpu-sharing.md#enabling-gpu-sharing-support) | - | - | - |
| Enflame       | [Enable Enflame GCU sharing](enflame-device/enable-enflame-gcu-sharing.md#enable-enflame-drs-scheduling) | - | - | - |
| Kunlunxin     | [Whole-device scheduling](kunlunxin-device/enable-kunlunxin-schedule.md) · [VXPU sharing](kunlunxin-device/enable-kunlunxin-vxpu.md#enable-xpu-sharing-support) | - | - | - |
| Vastai        | [Enable Vastai sharing](vastai/enable-vastai-sharing.md#enabling-vastai-device-sharing) | - | - | - |
| AMD           | [Enable AMD GPU sharing](amd-device/enable-amd-gpu-sharing.md#enabling-amd-gpu-sharing) | - | - | - |
| AWS           | [Manage AWS Neuron devices](awsneuron-device/enable-awsneuron-managing.md#enabling-neuron-sharing-support) | - | - | - |
| Biren         | [Enable Biren sharing](biren-device/enable-biren-sharing.md#enabling-biren-device-sharing) | - | - | - |

## Device documentation index

### NVIDIA {#nvidia}

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

### Cambricon {#cambricon}

- [Enable Cambricon MLU Sharing](cambricon-device/enable-cambricon-mlu-sharing.md)
- [Allocate device memory](cambricon-device/specify-device-memory-usage.md)
- [Allocate device core usage](cambricon-device/specify-device-core-usage.md)
- [Assign to certain device type](cambricon-device/specify-device-type-to-use.md)
- [Allocate device core and memory to container](cambricon-device/examples/allocate-core-and-memory.md)
- [Allocate exclusive device](cambricon-device/examples/allocate-exclusive.md)

### Hygon {#hygon}

- [Enable Hygon DCU sharing](hygon-device/enable-hygon-dcu-sharing.md)
- [Allocate device memory](hygon-device/specify-device-memory-usage.md)
- [Allocate device core to container](hygon-device/specify-device-core-usage.md)
- [Assign to certain device](hygon-device/specify-device-uuid-to-use.md)
- [Allocate device core and memory resource](hygon-device/examples/allocate-core-and-memory.md)
- [Allocate exclusive device](hygon-device/examples/allocate-exclusive.md)
- [Assign task to certain DCU cards](hygon-device/examples/specify-certain-cards.md)

### Mthreads {#mthreads}

- [Enable Mthreads GPU sharing](mthreads-device/enable-mthreads-gpu-sharing.md)
- [Allocate device memory to container](mthreads-device/specify-device-memory-usage.md)
- [Allocate device core to container](mthreads-device/specify-device-core-usage.md)
- [Allocate device core and memory resource](mthreads-device/examples/allocate-core-and-memory.md)
- [Allocate exclusive device](mthreads-device/examples/allocate-exclusive.md)

### Iluvatar {#iluvatar}

- [Enable Iluvatar GPU Sharing](iluvatar-device/enable-iluvatar-gpu-sharing.md)
- [Allocate BI-V150 slice](iluvatar-device/examples/allocate-bi-v150.md)
- [Allocate MR-V100 slice](iluvatar-device/examples/allocate-mr-v100.md)
- [Allocate exclusive BI-V150 device](iluvatar-device/examples/allocate-exclusive-bi-v150.md)
- [Allocate exclusive MR-V100 device](iluvatar-device/examples/allocate-exclusive-mr-v100.md)

### Enflame {#enflame}

- [Enable Enflame GCU Sharing](enflame-device/enable-enflame-gcu-sharing.md)

### AMD {#amd}

- [Enable AMD GPU Sharing](amd-device/enable-amd-gpu-sharing.md)
- [Allocate device core and memory resource](amd-device/examples/allocate-core-and-memory.md)

### AWS Neuron {#aws-neuron}

- [Enable AWS-Neuron device Sharing](awsneuron-device/enable-awsneuron-managing.md)
- [Allocate AWS Neuron core](awsneuron-device/examples/allocate-neuron-core.md)
- [Allocate AWS Neuron device](awsneuron-device/examples/allocate-neuron-device.md)

### Vastai {#vastai}

- [Enable Vastai Sharing](vastai/enable-vastai-sharing.md)
- [Allocate Vastai Device](vastai/examples/default-use.md)

### Biren {#biren}

- [Enable Biren Sharing](biren-device/enable-biren-sharing.md)
- [Allocate Biren Device](biren-device/examples/default-use.md)

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

### Huawei Ascend {#huawei-ascend}

- [Enable Huawei Ascend sharing](ascend-device/enable-ascend-sharing.md)
- [Huawei Ascend device template](ascend-device/device-template.md)
- [Allocate 310P slice](ascend-device/examples/allocate-310p.md)
- [Allocate 910B slice](ascend-device/examples/allocate-910b.md)
- [Allocate exclusive device](ascend-device/examples/allocate-exclusive.md)
- [Soft slicing (hami-vnpu-core)](ascend-device/examples/allocate-soft-slicing.md)
