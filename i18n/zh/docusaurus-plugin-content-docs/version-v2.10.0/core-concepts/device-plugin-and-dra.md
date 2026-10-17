---
title: Device Plugin 与 DRA
description: Kubernetes 把设备交给 Pod 的两种方式，以及经典 HAMi 和 HAMi-DRA 分别如何使用。
sidebar_label: Device plugin 与 DRA
translated: true
---

Kubernetes 有两种把设备交给 Pod 的方式：device plugin API 和动态资源分配（DRA）。经典 HAMi 使用 device plugin，[HAMi-DRA](https://github.com/Project-HAMi/HAMi-DRA) 使用 DRA。

![device plugin 和 DRA 的设备信息流](/img/docs/zh/core-concepts/device-plugin-vs-dra.svg)

## Device plugin

device plugin 以 DaemonSet 的形式运行在每个 GPU 节点上，负责三件事：

1. **注册**：以 `nvidia.com/gpu` 这样的资源名向 kubelet 注册。
2. **上报**：报告节点上有多少个设备，kubelet 把这个数字写进节点的 capacity。
3. **分配**：Pod 在节点上启动时，kubelet 调用插件，插件返回容器需要的设备文件、挂载和环境变量。

第 2 步上报的是一个整数。调度器只知道节点有 4 张 GPU，不知道它们的显存和型号。整卡申请用这些信息就够了，但要放下一个 3000 MiB 的切片，调度器还需要更多信息。

HAMi 用两种方式补上这部分信息：

- HAMi device plugin 把每张卡上报 `deviceSplitCount` 次（默认 10），一张卡最多可以分给 10 个 Pod。只有一张 GPU 的节点会显示 `nvidia.com/gpu: 10`。
- 它把每张卡的详细信息写进节点注解 `hami.io/node-nvidia-register`，包括 UUID、显存、算力、型号、NUMA 节点和健康状态。HAMi 调度器读取这个注解来选卡。

调度器和 device plugin 如何通过注解传递调度结果，见[协议设计](../developers/protocol.md)。

## 动态资源分配

DRA 在 Kubernetes v1.34 进入 GA。它用三种 API 对象描述设备：

| 对象            | 作用                                           |
| --------------- | ---------------------------------------------- |
| `ResourceSlice` | 由 DRA 驱动发布，列出每个设备及其属性。        |
| `DeviceClass`   | 按属性筛选出的一组设备。                       |
| `ResourceClaim` | Pod 对设备的申请，类似 PersistentVolumeClaim。 |

调度器直接从 `ResourceSlice` 读取设备属性，不需要额外的注解。

HAMi-DRA 沿用 HAMi 的 Pod 写法。它的 webhook 把 `nvidia.com/gpu`、`nvidia.com/gpumem` 和 `nvidia.com/gpucores` 转换成 `ResourceClaim`。容器内的限制仍然由 HAMi-Core 执行，所以两种模式的隔离方式相同。

## 如何选择

HAMi-DRA 需要 Kubernetes v1.34 或更高版本，开启 DRA Consumable Capacity 特性门控，并在容器运行时中启用 CDI。不满足这些条件的集群，使用经典 HAMi。完整对比见[选择你的方案](../get-started/choose-your-setup.md)。

## 了解更多

- [Kubernetes 设备插件](https://kubernetes.io/zh-cn/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/)
- [Kubernetes 动态资源分配](https://kubernetes.io/zh-cn/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)
- [Kubernetes 的 HAMi DRA](../installation/how-to-use-hami-dra.md)
