---
title: Choose Your Setup
sidebar_label: Choose your setup
---

HAMi ships in more than one shape, and two other projects sit next to it. This page answers the question people ask first: which one do I install?

## HAMi or HAMi-DRA

Both give a container a slice of a GPU. They differ in how Kubernetes hands the device over.

Pick **classic HAMi** unless every line below is true for your cluster:

- Kubernetes v1.34 or later, with the DRA Consumable Capacity [feature gate](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/) enabled
- [CDI](../installation/configure-cdi.md) enabled in containerd or CRI-O
- NVIDIA GPU driver 440 or later

If any of them is missing, HAMi-DRA cannot run. See [HAMi DRA for Kubernetes](../installation/how-to-use-hami-dra.md) for the full prerequisites.

|  | Classic HAMi | HAMi-DRA |
| --- | --- | --- |
| Kubernetes | v1.23 or later | v1.34 or later, feature gate on |
| How devices reach the pod | Device Plugin | ResourceClaim, through a mutating webhook |
| Pod spec | `nvidia.com/gpu`, `nvidia.com/gpumem` and `nvidia.com/gpucores` limits | the same limits, converted to a ResourceClaim for you |
| CDI | not required | required |
| Extra components | none | cert-manager |

Both run HAMi-core inside the container, so the memory and core limits behave the same either way. HAMi-DRA changes the allocation path, not the isolation.

Start with [Quick Start](./deploy-with-helm.md), or with [HAMi DRA for Kubernetes](../installation/how-to-use-hami-dra.md) if the list above is satisfied.

## HAMi, Volcano vGPU or KAI Scheduler

These are not three answers to the same question. Scheduling and isolation are separate jobs:

- **Scheduling** decides which pod lands on which GPU, and how much of it the pod may claim.
- **Isolation** is what stops a pod from using more than it claimed. In every option below that work is done by the same library, [HAMi-core](https://github.com/Project-HAMi/HAMi-core), injected into the container.

So the real choice is which scheduler you already run.

|  | HAMi | Volcano vGPU | KAI Scheduler |
| --- | --- | --- | --- |
| Scheduler | HAMi scheduler | Volcano | KAI |
| Device plugin | HAMi device plugin | volcano-vgpu-device-plugin | NVIDIA device plugin |
| Isolation | HAMi-core | HAMi-core | HAMi-core, through kai-resource-isolator |
| Install HAMi as well | n/a | no | no |
| Gang scheduling and queues | no | yes | yes |
| Non-NVIDIA devices | yes, see [Device supported by HAMi](../userguide/device-supported.md) | NVIDIA only, Ascend goes through the separate [Volcano vNPU](../installation/how-to-use-volcano-ascend.md) integration | NVIDIA |
| Requires | HAMi v2.x | Volcano v1.9 or later | KAI v0.16.4 or later |
| Guide | [Quick Start](./deploy-with-helm.md) | [Use Volcano vGPU](../userguide/volcano-vgpu/nvidia-gpu/how-to-use-volcano-vgpu.md) | [Use KAI Scheduler with HAMi](../userguide/kai-scheduler/how-to-use-kai-scheduler.md) |

A short way to decide:

- No scheduler preference, or devices other than NVIDIA: **HAMi**.
- Already running Volcano for batch jobs: **Volcano vGPU**. You do not need to install HAMi.
- Already running KAI: **KAI Scheduler** plus kai-resource-isolator. Without the isolator, a pod that asks for a fraction of a GPU can still use all of it.

:::note

Only one device plugin may own `nvidia.com/gpu` on a node. Remove or disable the NVIDIA device plugin before installing the HAMi one. See the [FAQ](../faq/faq.md).

:::
