---
title: Device supported by HAMi
---

The table below lists the devices supported by HAMi:

Support status:

- **Stable** — Available in the latest released HAMi version and verified working.
- **Experimental** — Implemented in HAMi but not yet included in a released version.
- **Under Validation** — Support is still being implemented; not yet functional.

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
| Neuron | AWS Neuron    | Inf, Trn                 | Stable             | Yes             | Yes           | No                |
| GPU    | Biren         | Biren166M                | Experimental       | Yes             | Yes           | No                |
| DPU    | Teco          | Checking                 | Under Validation   | In progress     | In progress   | No                |
