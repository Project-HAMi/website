---
title: Device supported by HAMi
---

The table below lists the devices supported by HAMi. This matrix reflects HAMi v2.10.0, the latest released version.

<!-- prettier-ignore -->
| Type   | Manufacturer  | Models                  | Status           | MemoryIsolation | CoreIsolation | MultiCard Partitioning |
| ------ | ------------- | ----------------------- | ---------------- | --------------- | ------------- | ---------------------- |
| GPU    | NVIDIA        | All                     | Stable           | Yes             | Yes           | Yes                    |
| MLU    | Cambricon     | 370, 590                | Stable           | Yes             | Yes           | No                     |
| DCU    | Hygon         | All                     | Stable           | Yes             | Yes           | No                     |
| NPU    | Huawei Ascend | 910B, 910B3, 910C, 310P | Stable           | Yes             | Yes           | No                     |
| GPU    | Iluvatar      | All                     | Stable           | Yes             | Yes           | No                     |
| GPU    | Mthreads      | MTT S4000               | Stable           | Yes             | Yes           | No                     |
| GPU    | MetaX         | MXC500                  | Stable           | Yes             | Yes           | No                     |
| GCU    | Enflame       | S60                     | Stable           | Yes             | Yes           | No                     |
| XPU    | Kunlunxin     | P800                    | Stable           | Yes             | No            | No                     |
| GPU    | Vastai        | VA16                    | Stable           | No              | No            | No                     |
| GPU    | AMD           | Instinct / ROCm         | Stable           | Yes             | Yes           | No                     |
| Neuron | AWS           | Inf, Trn                | Stable           | No              | Yes           | No                     |
| GPU    | Biren         | Biren166M               | Stable           | No              | No            | No                     |
| DPU    | Teco          | Checking                | Under Validation | No              | No            | No                     |

Support status:

- **Stable** - Available in the latest released HAMi version.
- **Experimental** - Implemented in HAMi but not yet included in a released version.
- **Under Validation** - Support is still being implemented; not yet functional.

Capability columns:

- **MemoryIsolation** - Whether HAMi enforces a hard VRAM limit per container: workloads that exceed their requested memory are rejected instead of drawing on the full physical device memory.
- **CoreIsolation** - Whether HAMi enforces a hard compute usage limit per container: kernel execution is throttled to stay within the requested share instead of using the physical device's compute freely.
- **MultiCard Partitioning** - Whether a single Pod can use partitioned memory or compute resources across multiple physical cards. `No` means multiple whole cards can still be requested, but memory or core resources must not be specified when requesting more than one card.

## Which component supports which device

HAMi is one of four ways to reach these devices. The other three schedule the workload themselves and rely on HAMi-core for isolation.

Each cell links to the guide for that device and component. A dash means there is no guide today, not that the combination is impossible.

<!-- prettier-ignore -->
| Manufacturer  | HAMi | HAMi-DRA | Volcano | KAI-scheduler |
| ------------- | ---- | -------- | ------- | ------------- |
| NVIDIA        | [Allocate device memory](nvidia-device/specify-device-memory-usage.md) | [Dynamic Resource Allocation](nvidia-device/dynamic-resource-allocation.md) | [Use Volcano vGPU](volcano-vgpu/nvidia-gpu/how-to-use-volcano-vgpu.md) | [Use KAI Scheduler](kai-scheduler/how-to-use-kai-scheduler.md) |
| Cambricon     | [Enable Cambricon MLU sharing](cambricon-device/enable-cambricon-mlu-sharing.md) | - | - | - |
| Hygon         | [Enable Hygon DCU sharing](hygon-device/enable-hygon-dcu-sharing.md) | - | - | - |
| Huawei Ascend | [Enable Huawei Ascend sharing](ascend-device/enable-ascend-sharing.md) | - | [Volcano Ascend vNPU](../installation/how-to-use-volcano-ascend.md) | - |
| Iluvatar      | [Enable Iluvatar GPU sharing](iluvatar-device/enable-iluvatar-gpu-sharing.md) | - | - | - |
| Mthreads      | [Enable Mthreads GPU sharing](mthreads-device/enable-mthreads-gpu-sharing.md) | - | - | - |
| MetaX         | [Enable MetaX GPU sharing](metax-device/metax-sgpu/enable-metax-gpu-sharing.md) | - | - | - |
| Enflame       | [Enable Enflame GCU sharing](enflame-device/enable-enflame-gcu-sharing.md) | - | - | - |
| Kunlunxin     | [Enable Kunlunxin scheduling](kunlunxin-device/enable-kunlunxin-schedule.md) | - | - | - |
| Vastai        | [Enable Vastai sharing](vastai/enable-vastai-sharing.md) | - | - | - |
| AMD           | [Enable AMD GPU sharing](amd-device/enable-amd-gpu-sharing.md) | - | - | - |
| AWS           | [Manage AWS Neuron devices](awsneuron-device/enable-awsneuron-managing.md) | - | - | - |
| Biren         | [Enable Biren sharing](biren-device/enable-biren-sharing.md) | - | - | - |
| Teco          | - | - | - | - |

Each linked guide covers device-specific setup, configuration notes, and known limitations. Read it before deploying that device.

## Every page, by vendor

All vendor pages are listed here so this page reaches each of them.

### NVIDIA

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

### Cambricon

- [Enable Cambricon MLU Sharing](cambricon-device/enable-cambricon-mlu-sharing.md)
- [Allocate device memory](cambricon-device/specify-device-memory-usage.md)
- [Allocate device core usage](cambricon-device/specify-device-core-usage.md)
- [Assign to certain device type](cambricon-device/specify-device-type-to-use.md)
- [Allocate device core and memory to container](cambricon-device/examples/allocate-core-and-memory.md)
- [Allocate exclusive device](cambricon-device/examples/allocate-exclusive.md)

### Hygon

- [Enable Hygon DCU sharing](hygon-device/enable-hygon-dcu-sharing.md)
- [Allocate device memory](hygon-device/specify-device-memory-usage.md)
- [Allocate device core to container](hygon-device/specify-device-core-usage.md)
- [Assign to certain device](hygon-device/specify-device-uuid-to-use.md)
- [Allocate device core and memory resource](hygon-device/examples/allocate-core-and-memory.md)
- [Allocate exclusive device](hygon-device/examples/allocate-exclusive.md)
- [Assign task to certain DCU cards](hygon-device/examples/specify-certain-cards.md)

### Mthreads

- [Enable Mthreads GPU sharing](mthreads-device/enable-mthreads-gpu-sharing.md)
- [Allocate device memory to container](mthreads-device/specify-device-memory-usage.md)
- [Allocate device core to container](mthreads-device/specify-device-core-usage.md)
- [Allocate device core and memory resource](mthreads-device/examples/allocate-core-and-memory.md)
- [Allocate exclusive device](mthreads-device/examples/allocate-exclusive.md)

### Iluvatar

- [Enable Iluvatar GPU Sharing](iluvatar-device/enable-iluvatar-gpu-sharing.md)
- [Allocate BI-V150 slice](iluvatar-device/examples/allocate-bi-v150.md)
- [Allocate MR-V100 slice](iluvatar-device/examples/allocate-mr-v100.md)
- [Allocate exclusive BI-V150 device](iluvatar-device/examples/allocate-exclusive-bi-v150.md)
- [Allocate exclusive MR-V100 device](iluvatar-device/examples/allocate-exclusive-mr-v100.md)

### Enflame

- [Enable Enflame GCU Sharing](enflame-device/enable-enflame-gcu-sharing.md)

### AMD

- [Enable AMD GPU Sharing](amd-device/enable-amd-gpu-sharing.md)
- [Allocate device core and memory resource](amd-device/examples/allocate-core-and-memory.md)

### AWS Neuron

- [Enable AWS-Neuron device Sharing](awsneuron-device/enable-awsneuron-managing.md)
- [Allocate AWS Neuron core](awsneuron-device/examples/allocate-neuron-core.md)
- [Allocate AWS Neuron device](awsneuron-device/examples/allocate-neuron-device.md)

### Vastai

- [Enable Vastai Sharing](vastai/enable-vastai-sharing.md)
- [Allocate Vastai Device](vastai/examples/default-use.md)

### Biren

- [Enable Biren Sharing](biren-device/enable-biren-sharing.md)
- [Allocate Biren Device](biren-device/examples/default-use.md)

### Kunlunxin

- [Enable Kunlunxin GPU Topology-Aware Scheduling](kunlunxin-device/enable-kunlunxin-schedule.md)
- [Enable Kunlunxin VXPU](kunlunxin-device/enable-kunlunxin-vxpu.md)
- [Allocate a whole xpu card](kunlunxin-device/examples/allocate-whole-xpu.md)
- [Allocate vxpu device](kunlunxin-device/examples/allocate-vxpu.md)

### MetaX

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

### Huawei Ascend

- [Enable Huawei Ascend sharing](ascend-device/enable-ascend-sharing.md)
- [Huawei Ascend device template](ascend-device/device-template.md)
- [Allocate 310P slice](ascend-device/examples/allocate-310p.md)
- [Allocate 910B slice](ascend-device/examples/allocate-910b.md)
- [Allocate exclusive device](ascend-device/examples/allocate-exclusive.md)
- [Soft slicing (hami-vnpu-core)](ascend-device/examples/allocate-soft-slicing.md)
