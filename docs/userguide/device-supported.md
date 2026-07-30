---
title: Device supported by HAMi
---

The table below lists the devices supported by HAMi:

<!-- prettier-ignore -->
| Type   | Manufacturer  | Models                  | Status            | MemoryIsolation | CoreIsolation | MultiCard Support |
| ------ | ------------- | ------------------------ | ----------------- | --------------- | ------------- | ----------------- |
| GPU    | NVIDIA        | All                      | Stable             | Yes             | Yes           | Yes               |
| MLU    | Cambricon     | 370, 590                 | Stable             | Yes             | Yes           | No                |
| DCU    | Hygon         | All                      | Stable             | Yes             | Yes           | No                |
| NPU    | Huawei Ascend | 910B, 910B3, 910C, 310P  | Stable             | Yes             | Yes           | No                |
| GPU    | Iluvatar      | All                      | Stable             | Yes             | Yes           | No                |
| GPU    | Mthreads      | MTT S4000                | Stable             | Yes             | Yes           | No                |
| GPU    | MetaX         | MXC500                   | Stable             | Yes             | Yes           | No                |
| GCU    | Enflame       | S60                      | Stable             | Yes             | Yes           | No                |
| XPU    | Kunlunxin     | P800                     | Stable             | Yes             | Yes           | No                |
| GPU    | Vastai        | VA16                     | Stable             | Yes             | Yes           | No                |
| Neuron | AWS           | Inf, Trn                 | Stable             | Yes             | Yes           | Yes               |
| GPU    | Biren         | Biren166M                | Experimental       | Yes             | Yes           | No                |
| DPU    | Teco          | Checking                 | Under Validation   | No              | No            | No                |

Support status:

- **Stable** - Available in the latest released HAMi version.
- **Experimental** - Implemented in HAMi but not yet included in a released version.
- **Under Validation** - Support is still being implemented; not yet functional.

Capability columns:

- **MemoryIsolation** - Whether HAMi enforces a hard VRAM limit per container: workloads that exceed their requested memory are rejected instead of drawing on the full physical device memory.
- **CoreIsolation** - Whether HAMi enforces a hard compute usage limit per container: kernel execution is throttled to stay within the requested share instead of using the physical device's compute freely.
- **MultiCard Support** - Whether a single Pod can request and be scheduled onto more than one physical card of that type, with HAMi coordinating placement across the selected cards.
