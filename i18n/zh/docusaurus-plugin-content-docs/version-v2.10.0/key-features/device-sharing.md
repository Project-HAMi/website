---
title: 设备共享
description: Pod 可以申请哪些资源，以及多个 Pod 如何共享一张卡。
translated: true
---

HAMi 允许多个任务共享同一块 GPU、MLU 或 NPU 设备，从而最大化异构 AI 计算资源的利用率。

## 核心能力 {#device-sharing}

HAMi 的设备共享能力包括：

- **多任务共享：** 同一设备可被多个任务共享，每个任务仅使用设备的一部分资源。
- **设备显存控制：** 可按 MB 或百分比分配显存。
- **使用指定设备：** 支持选择特定类型的异构 AI 设备，或通过 UUID 精确指定目标设备。
- **容器内硬限制：** 可对流式多处理器施加硬限制。
- **无侵入式控制：** 无需修改现有程序即可实现资源分配管理。
- **动态 MIG 支持：** 支持通过 MIG 切片动态调整 MIG，实现动态 MIG 切片能力。

![HAMi 设备共享示例，展示多个任务共享单个 GPU](/img/docs/zh/key-features/example.svg)

## Pod 可以申请什么

| 资源                           | 含义                                                           |
| ------------------------------ | -------------------------------------------------------------- |
| `nvidia.com/gpu`               | 物理 GPU 的数量。设为 `2` 时，容器会分别从两张卡上各得到一份。 |
| `nvidia.com/gpumem`            | 每张 GPU 上的显存，单位 MiB。                                  |
| `nvidia.com/gpumem-percentage` | 每张 GPU 上的显存，按整卡的百分比计算。与 `gpumem` 二选一。    |
| `nvidia.com/gpucores`          | 每张 GPU 上的算力，按整卡的百分比计算。                        |

## 一张卡如何共享

![三个 Pod 按槽位、显存和算力共享一张 GPU](/img/docs/zh/core-concepts/device-sharing.svg)

每张卡有三项额度：

- **槽位**：device plugin 把每张卡上报 `deviceSplitCount` 次，默认 10。一个容器在它用到的每张卡上占一个槽位，所以一张卡最多给 10 个容器共享。
- **显存**：一张卡上所有容器的显存加起来不能超过这张卡的显存。
- **算力**：一张卡上所有容器的算力份额加起来最多 100%。

以上额度基于默认的 `deviceMemoryScaling` 和 `deviceCoreScaling`，即 1。设置大于 1 时可以超额分配一张卡。详见[配置](../userguide/configure.md)。

## Time-slicing、MPS 和 HAMi

NVIDIA device plugin 也能通过 time-slicing 或 MPS 共享一张卡。HAMi 的共享方式和 time-slicing 相同，并为每个容器加上显存和算力限额。

![time-slicing、MPS 和 HAMi 如何共享一张 GPU](/img/docs/zh/core-concepts/sharing-compare.svg)

## 默认值

- 容器既没有设置 `gpumem` 也没有设置 `gpumem-percentage` 时，会分到整张卡的显存。
- 容器没有设置 `gpucores`，并且没有申请显存或设置了 `gpumem-percentage: 100` 时，webhook 会把 `gpucores` 设为 100。`gpucores: 100` 的容器只会被放到没有其他任务使用的卡上。所以只写 `nvidia.com/gpu: 1` 仍然表示独占一张卡。
- 容器设置了 `gpumem` 但没有设置 `gpucores` 时，算力不受限制，和同卡的其他容器共用算力。

管理员可以通过 `defaultMemory`、`defaultCores` 和 `deviceSplitCount` 修改这些默认值，见[全局配置](../userguide/configure.md)。

## 其他设备

其他厂商的设备使用各自的资源名，有些设备只支持上面的一部分能力。各设备的支持情况见 [HAMi 支持的设备](../userguide/device-supported.md)。在支持 MIG 的 NVIDIA 卡上，HAMi 还可以分配 MIG 实例，见[启用动态 MIG 功能](../userguide/nvidia-device/dynamic-mig-support.md)。

## 优势 {#benefits}

这些特性能够在多种设备类型和工作负载的共享设备环境中，提高资源利用率与隔离性。

## 了解更多

- [设备资源隔离](./device-resource-isolation.md)：HAMi 如何在容器内执行每个 Pod 的份额
- [为容器分配设备显存](../userguide/nvidia-device/specify-device-memory-usage.md)和[分配设备核心给容器](../userguide/nvidia-device/specify-device-core-usage.md)
