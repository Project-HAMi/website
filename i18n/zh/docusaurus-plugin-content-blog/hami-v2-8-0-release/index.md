---
title: "HAMi v2.8.0 发布：全面支持 DRA 与高可用调度，迈向标准化 GPU 资源管理"
date: "2026-01-20"
description: "HAMi v2.8.0 正式发布。这是一个在架构完整性、调度可靠性以及生态对齐层面具有里程碑意义的版本，引入了 DRA 支持、Leader 选举机制、CDI 模式支持等关键特性。"
tags: ["Release", "GPU", "Kubernetes", "DRA"]
authors: [hami_community]
---

HAMi 社区正式发布 **HAMi v2.8.0**。这是一个在 **架构完整性、调度可靠性以及生态对齐** 层面具有里程碑意义的版本。

v2.8.0 不仅引入了多项关键特性更新，也在 **Kubernetes 原生标准对齐、异构设备支持、生产可用性与可观测性** 等方面进行了系统性增强，使 HAMi 更加适合在长期运行、对稳定性和演进路径敏感的 AI 生产集群中使用。

本文将对 v2.8.0 的主要更新进行详细说明。

<!-- truncate -->

## 核心特性与能力更新

本节介绍 HAMi v2.8.0 的核心特性与能力更新，涵盖标准接口支持、高可用机制、设备兼容性等方面。

### 正式支持 Kubernetes Device Resource Assignment（DRA）

HAMi v2.8.0 新增对 **Kubernetes Device Resource Assignment（DRA）** 的支持，并提供了独立实现项目：

- [https://github.com/Project-HAMi/HAMi-DRA](https://github.com/Project-HAMi/HAMi-DRA)

DRA 是 Kubernetes 社区正在推进的下一代设备资源声明与分配机制，旨在为 GPU/AI 加速器等设备提供 **更标准化、可组合、可扩展** 的资源管理模型。

HAMi 对 DRA 的支持，标志着项目在设备资源管理方向上，开始从"自定义设备调度逻辑"逐步走向 **Kubernetes 原生标准接口**。这不仅为未来更复杂的 GPU / AI 加速器使用模式奠定基础，也为 HAMi 在上游生态中的长期演进打开了空间。

> 关于 DRA 的设计理念、使用方式及与现有模式的对比，将在后续单独的技术解读文章中展开。

### 多 Scheduler 实例的 Leader 选举机制

在大规模集群或高可用部署场景下，HAMi v2.8.0 引入了 **多 Scheduler 实例的 Leader 选举机制**，以增强调度层的稳定性和可运维性。该机制具备以下优势：

- 避免多实例并发调度带来的资源冲突
- 提升 Scheduler 组件的高可用能力
- 为长期运行的生产集群提供更稳健的运行模型

该机制使 HAMi 更适合部署在对稳定性和容错能力要求较高的生产环境中。

### NVIDIA 设备支持 Container Device Interface（CDI）模式

HAMi v2.8.0 新增对 **NVIDIA [CDI（Container Device Interface）](https://github.com/cncf-tags/container-device-interface)** 模式的支持，进一步降低设备管理与容器运行时之间的耦合度。主要特性包括：

- 使用更标准的设备注入方式
- 提供更清晰的设备声明与生命周期管理
- 为未来多运行时、多设备模型打下基础

用户可以通过 `values.yaml` 中的 `deviceListStrategy` 配置项，选择使用传统的环境变量模式（`envvar`）或 CDI 模式（`cdi-annotations`）。

这一能力推动 HAMi 持续向 **更云原生、可组合的设备管理方式** 演进。

### 对齐 NVIDIA k8s-device-plugin v0.18.0

在 v2.8.0 中，HAMi 同步升级并对齐 **NVIDIA 官方 [k8s-device-plugin](https://github.com/NVIDIA/k8s-device-plugin) v0.18.0**，以实现以下目标：

- 保持对 NVIDIA 最新设备管理模型的兼容
- 降低用户在混合部署场景中的适配成本
- 确保 HAMi 作为设备管理与调度的"增强层"，而非分叉实现

这一对齐有助于用户在现有 NVIDIA GPU 生态中平滑引入 HAMi。

### Mock Device Plugin 支持

为提升工程实践中的可测试性与开发效率，v2.8.0 新增 **[Mock Device Plugin](https://github.com/Project-HAMi/mock-device-plugin)** 能力，适用于以下场景：

- 功能验证与开发调试
- CI / 测试环境下的设备模拟
- 降低新特性验证与回归测试成本

### 构建信息与 Metrics 体系更新

HAMi v2.8.0 在可观测性方面进行了补充与整理，具体包括：

- 新增 `hami_build_info` 指标
- 启动时输出更完整的版本与构建信息
- 正式移除已标记弃用的历史指标

这些改进使 HAMi 在生产环境中的版本追踪、问题定位与运维可视性更加清晰。

## 异构设备与厂商生态进展

HAMi 持续围绕 **多类型 GPU/AI 加速器** 的统一管理与调度能力进行演进。

在 v2.8.0 周期内，社区在以下方向上持续推进：

- 不同 GPU/AI 加速器设备模型的适配与能力增强
- 面向国产 GPU/AI 芯片的持续支持与特性补充
- 相关功能与 Bug Fix 的持续合入（详见 GitHub PR 记录）

这些改进进一步增强了 HAMi 在异构算力环境下的可用性与扩展空间。

## 上下游生态集成进展

HAMi 不仅是一个独立项目，也在持续与 Kubernetes AI 生态中的关键组件进行协同演进。当前主要集成方向包括：

- **Kueue**：HAMi 社区向 Kueue 项目贡献的增强能力，使其原生支持 HAMi 的设备资源管理与调度模型，为批量 AI 作业的队列管理提供异构设备调度支持
- **vLLM**：修复了多卡场景下的兼容性问题，详见相关 Issue（[#1461](https://github.com/Project-HAMi/HAMi/issues/1461) 和 [#1381](https://github.com/Project-HAMi/HAMi/issues/1381)）

这些生态集成有助于用户在真实 AI 工作负载中，构建更加完整的算力调度与资源管理方案。

## 社区与项目进展

HAMi 不仅是一个代码仓库，也是一个持续演进的开源社区与项目组织。

在 v2.8.0 周期内，社区在以下方面持续活跃：

- 用户与厂商的实际使用反馈，比如 [DaoCloud 使用 HAMi 构建 GPU 云](https://www.cncf.io/case-studies/daocloud/) 的用户案例发布在了 CNCF 官网
- 开展了两次社区 Meetup 社区活动，详见[第一届 HAMi Meetup 上海站](/blog/hami-meetup-shanghai-2025/) 和 [第二届 HAMi Meetup 北京站](/blog/hami-meetup-beijing-2025/)

HAMi 社区欢迎更多开发者、用户和生态伙伴参与项目，共同推动 GPU 虚拟化与设备调度能力的演进。

## 总结

HAMi v2.8.0 是一次面向 **标准化、生产可用性与生态对齐** 的重要版本更新。

通过引入 DRA、增强调度高可用能力、对齐主流设备插件与运行时标准，并持续扩展异构设备与生态集成，HAMi 正在稳步迈向更成熟、更可持续的 GPU 资源管理与调度平台。
