---
title: 架构设计
description: HAMi 的四个组件，以及一个 Pod 依次经过它们的路径。
translated: true
---

HAMi 的整体架构如下所示：

![HAMi 组件和一个 Pod 的完整路径](/img/docs/zh/core-concepts/hami-architecture-flow.svg)

HAMi 由以下组件组成：

| 组件 | 运行形式 | 作用 |
| --- | --- | --- |
| MutatingWebhook | `hami-scheduler` Deployment 的一部分 | 检查每个新建的 Pod。如果 Pod 申请了 HAMi 资源，并且没有指定其他调度器，就把 `schedulerName` 设为 `hami-scheduler`。其他 Pod 原样放行。 |
| HAMi 调度器 | `hami-scheduler` Deployment，作为 scheduler extender 与 `kube-scheduler` 配合 | 维护集群中每张 GPU 的视图。过滤节点、选卡，并把结果写进 Pod 注解。 |
| HAMi device plugin | 每个 GPU 节点上的 DaemonSet | 向 kubelet 和调度器上报节点上的卡。Pod 启动时，把选中的卡和 HAMi-Core 挂进容器，并通过环境变量传入限额。 |
| HAMi-Core（`libvgpu.so`） | 容器内加载的库 | 拦截 CUDA 和 NVML 调用。拒绝超出限额的显存分配，并可以按算力份额限制 kernel 的提交。 |

## 一个 Pod 的完整路径

以一个申请 `nvidia.com/gpumem: 3000` 的 Pod 为例：

1. **准入**：webhook 发现 Pod 申请了 HAMi 资源，把它交给 `hami-scheduler`。
2. **调度**：HAMi 调度器从节点注解读取每张卡的显存和算力，留下有卡能空出 3000 MiB 的节点，按策略选出一张卡，并把卡的 UUID 和 Pod 的份额写进 Pod 注解。
3. **启动**：选中节点上的 kubelet 启动 Pod，调用 device plugin 的 `Allocate`。
4. **注入**：device plugin 读取注解，把卡、`libvgpu.so` 和 `/etc/ld.so.preload` 挂进容器，并设置 `CUDA_DEVICE_MEMORY_LIMIT_0=3000m`。
5. **执行**：容器里的任何进程启动时，动态链接器都会先加载 HAMi-Core。之后每一次显存分配和 kernel 提交，都由 HAMi-Core 对照限额检查。详见[设备资源隔离](../key-features/device-resource-isolation.md)。

## 了解更多

- [GPU 虚拟化原理](./gpu-virtualization.md)：注册、调度和注入的详细过程
- [协议设计](../developers/protocol.md)：调度器和 device plugin 之间传递的注解
