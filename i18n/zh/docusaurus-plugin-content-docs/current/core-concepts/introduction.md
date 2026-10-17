---
title: 什么是 HAMi？
description: HAMi 是什么、要解决什么问题，以及它的核心特性。
translated: true
slug: /
---

HAMi（异构 AI 计算虚拟化中间件）是一个用于管理 Kubernetes 集群中异构 AI 计算设备的开源平台。前身为 k8s-vGPU-scheduler，HAMi 可在多个容器和工作负载之间实现设备共享。

HAMi 是[云原生计算基金会（CNCF）](https://cncf.io/)的 [孵化项目](https://landscape.cncf.io/?group=projects-and-products&project=incubating&item=orchestration-management--scheduling-orchestration--hami)，并被收录于 [CNCF 技术全景图](https://landscape.cncf.io/?group=projects-and-products&project=incubating&item=orchestration-management--scheduling-orchestration--hami)和 [CNAI 技术全景图](https://landscape.cncf.io/?group=cnai&item=orchestration-management--scheduling-orchestration--hami)。

## 要解决的问题

Kubernetes 按整数计算 GPU。一个申请 `nvidia.com/gpu: 1` 的 Pod 会拿到整张卡，即使它的模型只需要 24 GiB 卡上的 2 GiB。卡上剩下的显存和算力不能再分给其他 Pod，GPU 利用率很低，昂贵的资源被浪费，其他 Pod 只能等下一张空闲的卡。

![没有 HAMi 和使用 HAMi 时的一张 GPU](/img/docs/zh/core-concepts/hami-before-after.svg)

## 核心特性

### 设备共享

- **多设备支持**：兼容多种异构 AI 计算设备（GPU、NPU 等）
- **共享访问**：多个容器可同时共享设备，提高资源利用率

详见[设备共享](../key-features/device-sharing.md)和 [HAMi 支持的设备](../userguide/device-supported.md)。

### 显存管理

- **硬限制**：在容器内强制执行严格的显存限制，防止资源冲突
- **动态分配**：根据工作负载需求按需分配设备显存
- **灵活单位**：支持按 MB 或占总设备显存百分比的方式指定显存分配

详见[设备共享](../key-features/device-sharing.md)和[设备资源隔离](../key-features/device-resource-isolation.md)。

### 设备规格

- **类型选择**：可请求特定类型的异构 AI 计算设备
- **UUID 定向**：使用设备 UUID 精确指定特定设备

详见[调度](./scheduling.md)。

### 易用性

- **对工作负载透明**：容器内无需修改代码
- **简单部署**：使用 Helm 轻松安装和卸载，配置简单

详见[快速部署](../get-started/deploy-with-helm.md)。

### 开放治理

- **社区驱动**：由互联网、金融、制造业、云服务等多个领域的组织联合发起
- **中立发展**：作为开源项目由 CNCF 管理

详见[社区治理](../contributor/governance.md)。

## 工作原理

Pod 申请 HAMi 资源时，webhook 把它交给 HAMi 调度器，调度器选出有足够余量的节点和卡。在这个节点上，HAMi device plugin 把卡和 HAMi-Core 挂进容器，由 HAMi-Core 执行容器的显存和算力限额。详见[架构设计](./architecture.md)。

## 下一步

- [架构](./architecture.md)：HAMi 的组件，以及一个 Pod 经过的路径
- [选择你的方案](../get-started/choose-your-setup.md)，然后[快速部署](../get-started/deploy-with-helm.md)
