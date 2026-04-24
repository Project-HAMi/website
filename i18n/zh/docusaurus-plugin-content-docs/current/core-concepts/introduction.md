---
title: 什么是 HAMi？
translated: true
slug: /
---

HAMi（异构 AI 计算虚拟化中间件）是一个用于管理 Kubernetes 集群中异构 AI 计算设备的开源平台。前身为 k8s-vGPU-scheduler，HAMi 可在多个容器和工作负载之间实现设备共享。

HAMi 是[云原生计算基金会（CNCF）](https://cncf.io/)的 [Sandbox 项目](https://landscape.cncf.io/?item=orchestration-management--scheduling-orchestration--hami)，并被收录于 [CNCF 技术全景图](https://landscape.cncf.io/?item=orchestration-management--scheduling-orchestration--hami)和 [CNAI 技术全景图](https://landscape.cncf.io/?group=cnai&item=orchestration-management--scheduling-orchestration--hami)。

## 核心特性

### 设备共享

- **多设备支持**：兼容多种异构 AI 计算设备（GPU、NPU 等）
- **共享访问**：多个容器可同时共享设备，提高资源利用率

### 内存管理

- **硬限制**：在容器内强制执行严格的内存限制，防止资源冲突
- **动态分配**：根据工作负载需求按需分配设备内存
- **灵活单位**：支持按 MB 或占总设备内存百分比的方式指定内存分配

### 设备规格

- **类型选择**：可请求特定类型的异构 AI 计算设备
- **UUID 定向**：使用设备 UUID 精确指定特定设备

### 易用性

- **对工作负载透明**：容器内无需修改代码
- **简单部署**：使用 Helm 轻松安装和卸载，配置简单

### 开放治理

- **社区驱动**：由互联网、金融、制造业、云服务等多个领域的组织联合发起
- **中立发展**：作为开源项目由 CNCF 管理

## 后续步骤

推荐继续了解：

- 深入理解 HAMi 的 [GPU 虚拟化原理](./gpu-virtualization.md)
- 学习 HAMi 的[架构设计](./architecture.md)
- 在你的 Kubernetes 集群中[安装 HAMi](../installation/prerequisites.md)
