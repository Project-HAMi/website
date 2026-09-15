---
title: 选择你的方案
sidebar_label: 选择你的方案
translated: true
---

HAMi 有不止一种形态，旁边还有另外两个项目。本页回答大家最先问的问题：我该装哪一个？

## HAMi 还是 HAMi-DRA

两者都能把一块 GPU 的一部分分给容器，区别在于 Kubernetes 用什么方式把设备交出去。

除非下面每一条都成立，否则请选择**经典 HAMi**：

- Kubernetes v1.34 或更高版本，并启用 DRA Consumable Capacity [特性门控](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/)
- containerd 或 CRI-O 中已启用 [CDI](../installation/configure-cdi.md)
- NVIDIA GPU 驱动 440 或更高版本

少任何一条，HAMi-DRA 都无法运行。完整前置条件见 [HAMi DRA for Kubernetes](../installation/how-to-use-hami-dra.md)。

|  | 经典 HAMi | HAMi-DRA |
| --- | --- | --- |
| Kubernetes | v1.23 或更高 | v1.34 或更高，需开启特性门控 |
| 设备如何到达 Pod | Device Plugin | 通过 mutating webhook 生成 ResourceClaim |
| Pod spec | `nvidia.com/gpu`、`nvidia.com/gpumem` 与 `nvidia.com/gpucores` limits | 写法相同，自动转换为 ResourceClaim |
| CDI | 不需要 | 需要 |
| 额外组件 | 无 | cert-manager |

两者都在容器内运行 HAMi-core，因此显存和算力限制的行为完全一致。HAMi-DRA 改变的是分配路径，不是隔离方式。

从 [快速部署](./deploy-with-helm.md) 开始；若上面的条件都已满足，也可以直接看 [HAMi DRA for Kubernetes](../installation/how-to-use-hami-dra.md)。

## HAMi、Volcano vGPU 还是 KAI Scheduler

这三者并不是同一个问题的三个答案。调度和隔离是两件事：

- **调度**决定 Pod 落在哪块 GPU 上，以及可以申领多少。
- **隔离**负责让 Pod 无法超出申领量。下面每种方案的这一步都由同一个库完成，也就是注入到容器里的 [HAMi-core](https://github.com/Project-HAMi/HAMi-core)。

所以真正要选的是你已经在用哪个调度器。

|  | HAMi | Volcano vGPU | KAI Scheduler |
| --- | --- | --- | --- |
| 调度器 | HAMi scheduler | Volcano | KAI |
| Device plugin | HAMi device plugin | volcano-vgpu-device-plugin | NVIDIA device plugin |
| 隔离 | HAMi-core | HAMi-core | HAMi-core，通过 kai-resource-isolator |
| 是否还要装 HAMi | 不适用 | 否 | 否 |
| Gang 调度与队列 | 否 | 是 | 是 |
| 非 NVIDIA 设备 | 支持，见 [HAMi 支持的设备](../userguide/device-supported.md) | 仅 NVIDIA，Ascend 走独立的 [Volcano vNPU](../installation/how-to-use-volcano-ascend.md) 集成 | NVIDIA |
| 版本要求 | HAMi v2.x | Volcano v1.9 或更高 | KAI v0.16.4 或更高 |
| 指南 | [快速部署](./deploy-with-helm.md) | [使用 Volcano vGPU](../userguide/volcano-vgpu/nvidia-gpu/how-to-use-volcano-vgpu.md) | [配合 HAMi 使用 KAI Scheduler](../userguide/kai-scheduler/how-to-use-kai-scheduler.md) |

简单的判断方式：

- 对调度器没有偏好，或者使用 NVIDIA 以外的设备：选 **HAMi**。
- 已经在用 Volcano 跑批处理任务：选 **Volcano vGPU**，不需要再装 HAMi。
- 已经在用 KAI：选 **KAI Scheduler** 加 kai-resource-isolator。缺少 isolator 时，申领 GPU 一部分的 Pod 仍然可以用满整卡。

:::note

一个节点上只能有一个 device plugin 拥有 `nvidia.com/gpu`。安装 HAMi 的 device plugin 之前，请先移除或停用 NVIDIA 官方 device plugin。参见 [FAQ](../faq/faq.md)。

:::
