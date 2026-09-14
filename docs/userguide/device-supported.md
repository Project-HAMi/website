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
