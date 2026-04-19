---
title: "HAMi WebUI 正式发布：Kubernetes GPU 监控仪表盘"
slug: introducing-hami-webui
date: "2026-04-13"
description: "HAMi WebUI 是一款开源的 Kubernetes GPU 监控仪表盘，提供 GPU 资源、节点、加速器和工作负载的统一可视化监控能力。作为 HAMi（CNCF Sandbox 项目）生态的组成部分，补齐了从 GPU 调度到可视化可观测性的最后一环。"
tags: ["WebUI", "GPU", "Kubernetes", "GPU 监控", "GPU 仪表盘", "GPU 虚拟化", "可观测性"]
authors: [hami_community]
image: /img/docs/zh/userguide/webui-overview.png
---

在 Kubernetes 中管理 GPU 资源，长期以来存在一个"盲区"。你知道 GPU 在被使用，但要回答"哪个节点还有空闲？"、"这个工作负载是否真的在用分配到的 GPU？"、"集群整体 GPU 利用率趋势如何？"这些问题，往往需要在 `kubectl get`、Prometheus PromQL 和日志输出之间反复切换。

今天，HAMi 社区正式推出 **[HAMi WebUI](https://github.com/Project-HAMi/HAMi-WebUI)** —— 一款将整个 GPU 集群呈现在单一可视化界面中的开源 GPU 监控仪表盘。

HAMi WebUI v1.1.0 现已作为首个正式主要版本发布，邀请你试用。

与 HAMi 核心调度器配合，WebUI 实现了完整的闭环：**从 GPU 调度到可视化可观测性**。

<!-- truncate -->

## Kubernetes GPU 监控的挑战

[HAMi](https://github.com/Project-HAMi/HAMi) 作为 [CNCF Sandbox 项目](https://www.cncf.io/projects/hami/)，长期聚焦于 Kubernetes 中 GPU 资源的调度与管理层。调度器决定工作负载分配到哪张 GPU —— 但工作负载运行起来之后，资源层面到底在发生什么，一直缺乏直观的洞察手段。

想一想日常运维中常见的场景：

- 团队负责人想知道集群是否还有余量调度新的训练任务
- SRE 收到 GPU 显存使用率告警，需要快速定位到具体的节点和工作负载
- 集群管理员希望对比各节点 GPU 利用率，进行工作负载重均衡

没有可视化工具时，每个任务都需要在多个终端窗口之间切换，手动拼凑不同来源的数据。HAMi WebUI 正是为解决这个问题而生 —— 它是一款专为 Kubernetes 打造的 **GPU 监控仪表盘**。

## HAMi WebUI 是什么

HAMi WebUI 是 HAMi 生态中的可视化组件。HAMi 负责 GPU 资源调度和管理，WebUI 负责**数据展示和用户交互**。

它以 GPU 资源为中心，提供统一的 GPU 监控体验，帮助运维人员：

- 一目了然地掌握 GPU 集群状态
- 分析 GPU 利用率模式与趋势
- 快速定位问题，优化 GPU 资源分配

## 架构

HAMi WebUI 采用前后端分离架构，分为三层：

![HAMi WebUI 架构 - Kubernetes GPU 监控仪表盘](/img/docs/common/developers/hami-webui-architecture-diagram.svg)

| 层级         | 技术栈            | 职责                                   |
| ------------ | ----------------- | -------------------------------------- |
| **客户端**   | Vue 3 SPA + Axios | 浏览器端仪表盘 UI                      |
| **前端代理** | NestJS (BFF)      | 静态资源托管 + API 反向代理            |
| **后端**     | Go (Kratos 框架)  | API 服务，查询 Prometheus 获取 GPU 指标数据 |

前端通过统一的 `/api/vgpu/*` 端点与后端通信，由 NestJS BFF 层进行代理转发。GPU 指标数据来源于 Prometheus，由其从 HAMi 管理的节点上采集 GPU 使用遥测数据。

## 核心 GPU 监控功能

### 集群总览

集群总览页面提供了集群运行状态的快速概览，包括 GPU 资源使用率、节点状态和关键指标趋势，支持时间范围筛选。

![HAMi WebUI 集群总览仪表盘，展示 GPU 资源使用情况](/img/docs/zh/userguide/webui-overview.png)

关键指标支持下钻导航——例如，点击"可调度"可以直接跳转到节点管理页面并按该状态筛选。在一个页面上即可掌握 GPU 集群全局状态。

### 节点管理

节点级别视图展示每个节点的 GPU 分配和使用情况，以及工作负载分布。帮助运维人员对比不同节点的 GPU 资源使用情况，识别不均衡。

![HAMi WebUI 节点列表，展示各节点 GPU 分配与工作负载分布](/img/docs/zh/userguide/webui-node-list.png)

在节点详情页面，可以进一步查看该节点的 GPU 使用情况和任务分布，更好地理解负载分布。

### GPU/加速器管理

从加速器视角，WebUI 支持对每张 GPU 卡的细粒度查看——包括分配状态、利用率、显存使用和所属节点。

![HAMi WebUI 加速器列表，展示各 GPU 分配、利用率和显存使用](/img/docs/zh/userguide/webui-accelerator-list.png)

帮助你了解集群中 GPU 计算和显存资源的分配与消耗情况。

### 工作负载追踪

从工作负载视角，运维人员可以查看每个工作负载的 GPU 使用率、资源分配详情和运行时状态，便于将工作负载行为与集群 GPU 资源消耗关联分析。

![HAMi WebUI 工作负载列表，展示各工作负载 GPU 使用与资源分配](/img/docs/zh/userguide/webui-workload-list.png)

## 适合谁用？

HAMi WebUI 面向所有与 HAMi 管理的 GPU 集群交互的角色：

- **集群管理员** — 需要全局视角了解 GPU 资源健康度和利用率
- **平台工程师** — 排查 GPU 资源分配问题，优化集群效率
- **AI/ML 团队负责人** — 希望了解训练和推理工作负载的 GPU 消耗情况
- **SRE** — 需要快速获取 GPU 指标，辅助监控和告警研判

## 快速开始

使用 Helm 部署 HAMi WebUI 非常简单。你需要：

- **HAMi** >= 2.4.0
- **Prometheus** > 2.8.0
- **Helm** > 3.0

```bash
# 添加 Helm 仓库
helm repo add hami-webui https://project-hami.github.io/HAMi-WebUI

# 安装 HAMi WebUI
helm install my-hami-webui hami-webui/hami-webui \
  --set externalPrometheus.enabled=true \
  --set externalPrometheus.address="http://<你的-prometheus-服务>:9090" \
  -n kube-system

# 端口转发访问 UI
kubectl port-forward service/my-hami-webui 3000:3000 --namespace=kube-system
```

然后在浏览器中打开 `http://localhost:3000`。

详细说明请参阅 [HAMi WebUI 安装指南](/docs/installation/webui-installation)。

## 文档

HAMi 社区准备了完善的文档体系：

- **[WebUI 用户指南](/docs/userguide/hami-webui-user-guide)** — 了解如何使用集群总览、节点管理、GPU 管理和工作负载追踪功能。
- **[WebUI 开发者指南](/docs/developers/hami-webui-development-guide)** — 了解项目架构、代码仓库结构、本地开发环境和编码规范，参与 WebUI 贡献。

## 参与贡献

HAMi WebUI 是一个活跃发展的项目。v1.1.0 已带来国际化支持（中英文双语）、多架构容器镜像以及更广泛的设备厂商兼容性。

我们欢迎各种形式的贡献——Bug 修复、功能建议、文档改进和新想法。查看 [HAMi-WebUI 代码仓库](https://github.com/Project-HAMi/HAMi-WebUI) 和 [开发者指南](/docs/developers/hami-webui-development-guide) 开始参与。

查看 [v1.1.0 release notes](https://github.com/Project-HAMi/HAMi-WebUI/releases/tag/v1.1.0) 了解完整更新内容。

**相关链接：**

- [HAMi-WebUI GitHub 仓库](https://github.com/Project-HAMi/HAMi-WebUI)
- [v1.1.0 Release Notes](https://github.com/Project-HAMi/HAMi-WebUI/releases/tag/v1.1.0)
- [WebUI 安装指南](/docs/installation/webui-installation)
- [WebUI 用户指南](/docs/userguide/hami-webui-user-guide)
- [WebUI 开发者指南](/docs/developers/hami-webui-development-guide)
- [HAMi 核心项目](https://github.com/Project-HAMi/HAMi)
- [HAMi on CNCF](https://www.cncf.io/projects/hami/)
