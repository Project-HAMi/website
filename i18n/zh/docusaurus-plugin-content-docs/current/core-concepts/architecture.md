---
title: 架构设计
translated: true
---

HAMi 通过设备感知调度和运行时资源控制，扩展 Kubernetes 对异构 AI 加速器的管理能力。其架构将集群级调度决策、节点级设备分配以及支持场景下的容器内资源控制相互分离。

![HAMi 组件及 GPU 工作负载调度流程](/img/docs/common/core-concepts/hami-architecture.svg)

## HAMi 有哪些核心组件？

在加速器工作负载的整个生命周期中，HAMi 会协调以下四个组件：

| 组件 | 运行方式 | 主要职责 |
| --- | --- | --- |
| HAMi MutatingWebhook | `hami-scheduler` Deployment 的一部分 | 将请求 HAMi 管理资源的 Pod 交给 `hami-scheduler` |
| HAMi 调度器扩展程序 | `hami-scheduler` Deployment 的一部分 | 根据集群范围内的可用资源视图选择节点和物理设备 |
| HAMi 设备插件 | 加速器节点上的 DaemonSet | 向 kubelet 注册设备，并为容器准备选定的设备 |
| HAMi-Core | 注入受支持容器的动态库 | 在运行时执行已分配的显存和算力限制 |

具体资源名称和控制机制取决于设备厂商。例如，NVIDIA 工作负载可以使用 `nvidia.com/gpumem` 请求以 MiB 为单位的显存，并使用 `nvidia.com/gpucores` 请求百分比形式的算力。其他设备使用厂商特定的资源名称，支持的分配粒度也可能不同。当前支持情况请参阅[常见问题](../faq/faq.md)。

## 工作负载如何通过 HAMi 运行？

1. **准入：** 当 Pod 请求 HAMi 管理的设备时，MutatingWebhook 会将 `spec.schedulerName` 设置为 `hami-scheduler`；如果 Pod 已明确指定调度器，则不会改写。
2. **调度：** HAMi 调度器扩展程序将 Pod 请求与各节点上报的设备信息结合起来，在调度过程中排除无法满足请求的节点，并选择合适的物理设备。
3. **分配：** 调度器把选定的设备和配额写入 Pod 注解。在目标节点上，kubelet 调用 HAMi 设备插件；设备插件读取调度结果，并将设备提供给容器。
4. **运行时控制：** 对于支持容器内控制的设备，设备插件会注入所需的运行时库和配置。对于 NVIDIA 虚拟 GPU，HAMi-Core 会拦截相关 CUDA 和 NVML 调用，以执行已分配的显存和算力限制。

这种职责划分让集群策略留在控制平面、硬件发现和分配发生在各节点，并让工作负载级资源控制靠近应用程序。

## HAMi MutatingWebhook {#hami-mutatingwebhook}

MutatingWebhook 是准入入口。它检查新建 Pod 的资源请求，以确定是否应由 HAMi 处理。对于符合条件的 Pod，它会设置：

```yaml
spec:
  schedulerName: hami-scheduler
```

没有请求 HAMi 管理资源的 Pod 会继续使用常规 Kubernetes 调度流程。明确选择其他调度器的 Pod 不会被静默改写。

## HAMi 调度器 {#hami-scheduler}

HAMi 调度器负责同时选择节点和设备。Kubernetes 设备插件通常只能通告整数形式的资源数量，无法完整描述设备型号、显存容量、算力、健康状态或拓扑等属性。因此，HAMi 设备插件通过节点注解上报详细设备信息，使调度器能够维护集群范围的设备视图。

HAMi 以[调度器扩展程序](https://github.com/kubernetes/design-proposals-archive/blob/main/scheduling/scheduler_extender.md)的方式参与标准调度流程，并不会取代 Kubernetes 调度机制。它根据资源请求筛选候选节点，应用配置的 binpack 或 spread 策略，绑定 Pod，并将分配结果写入 `hami.io/vgpu-devices-allocated` 等注解。

## 设备插件 {#device-plugin}

HAMi 设备插件运行在每个受支持的加速器节点上，并实现 Kubernetes [设备插件 API](https://kubernetes.io/zh-cn/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/)。它发现本地设备、向 kubelet 注册可分配资源、上报调度所需的设备详情，并在 Pod 绑定后处理 kubelet 的 `Allocate` 请求。

分配期间，设备插件从 Pod 注解中读取调度结果，并将选定的设备提供给容器。根据厂商集成方式的不同，它可能会挂载设备文件和运行时库，或注入描述分配配额的环境变量。

## HAMi-Core {#hami-core}

HAMi-Core 通过 `libvgpu.so` 为 NVIDIA 虚拟 GPU 提供运行时控制。设备插件借助 `/etc/ld.so.preload` 将该库加载到容器中。随后，HAMi-Core 会拦截 CUDA 显存分配和内核启动调用：超出已分配显存配额的申请会收到显存不足错误，算力使用则会被节流至请求的限制。它还会调整 NVML 返回结果，使应用看到已分配的显存，而不是物理设备的全部显存。

这种机制属于用户态控制，并非硬件安全边界。绕过被拦截库的应用（例如使用直接驱动调用或 Docker-in-Docker）可能绕过这些限制。当 GPU 支持 MIG 且需要硬件级隔离时，请使用 [NVIDIA MIG](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/)。完整的拦截和分配流程请参阅 [GPU 虚拟化原理](./gpu-virtualization.md)。

## HAMi 与时间切片和 MIG 有何区别？

| 方案 | 共享方式 | 显存和算力边界 | 适用场景 |
| --- | --- | --- | --- |
| 时间切片 | 多个工作负载轮流使用同一 GPU | 不提供工作负载级 GPU 显存隔离 | 不需要严格配额的简单并发场景 |
| HAMi 虚拟 GPU | 多个工作负载按灵活请求的配额共享 GPU | 用户态显存控制和算力节流 | 在多种 GPU 上进行细粒度、动态共享 |
| NVIDIA MIG | 将受支持的 GPU 划分为固定硬件分区 | 硬件级显存和算力隔离 | 在支持 MIG 的 GPU 上实现强隔离 |

HAMi 也支持动态 MIG 分配，因此这些方案并不总是互斥。具体选择取决于加速器型号、工作负载、隔离要求和期望的分区粒度。

## 产品架构与参考部署

本文介绍 HAMi 的产品组件，以及各类集成共有的请求处理流程。完整集群还可以包括 CNI、厂商驱动和运行时、监控系统及可选的仪表盘。有关一种面向 NVIDIA 的部署拓扑及其依赖关系，请参阅 [HAMi 安装后的集群架构](./hami-architecture.md)。

## 参考资料

- [Kubernetes 设备插件](https://kubernetes.io/zh-cn/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/)
- [Kubernetes 调度器扩展程序设计](https://github.com/kubernetes/design-proposals-archive/blob/main/scheduling/scheduler_extender.md)
- [HAMi-Core 源代码](https://github.com/Project-HAMi/HAMi-core)
- [NVIDIA Multi-Instance GPU 用户指南](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/)

## 下一步

- 深入了解 [GPU 虚拟化原理](./gpu-virtualization.md)
- 查看[参考集群架构](./hami-architecture.md)
- 检查[安装前提条件](../installation/prerequisites.md)
