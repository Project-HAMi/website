---
title: HAMi WebUI 使用者指南
linktitle: HAMi WebUI
translated: true
---

## 什么是 HAMi WebUI

[HAMi WebUI](https://github.com/Project-HAMi/HAMi-WebUI) 是 HAMi 提供的可视化界面，用于对 GPU 资源及工作负载进行统一监控与分析。
通过统一的可视化展示，用户可以直观查看集群运行状态，包括 GPU 使用情况、节点信息以及任务运行情况，从而更高效地理解资源分布与系统运行状态。

## 核心能力

HAMi WebUI 围绕 GPU 资源管理与可观测性，提供以下核心能力。

### 集群概览

在集群概览页面中，可以快速了解当前集群整体运行状态，包括：

- GPU 资源使用情况（利用率、分配情况等）
- 节点资源状态
- 关键指标趋势变化
- 时间范围筛选与趋势展示能力

通过统一的图表与指标展示，用户可以在一个页面中掌握系统全局状态。
同时，关键指标支持联动跳转，例如点击「可调度」可快速进入节点管理页面并查看对应状态的节点。

![HAMi WebUI 集群概览页](/img/docs/zh/userguide/webui-overview.png)

### 节点管理

提供节点维度的资源视图：

- 节点 GPU 总量与分配使用情况
- 节点工作负载情况

支持查看各节点的资源使用分布与负载情况，便于对比不同节点之间的资源利用差异。
在节点详情页中，还可以进一步查看该节点下 GPU 的具体使用情况及任务分布，用于观察资源使用分布及节点负载情况。

![HAMi WebUI 节点管理列表页](/img/docs/zh/userguide/webui-node-list.png)
![HAMi WebUI 节点管理详情页](/img/docs/zh/userguide/webui-node-detail.png)

### 算力管理

支持对 GPU 卡进行细粒度查看：

- 每张 GPU 的分配情况、使用率、显存占用等信息
- 所属节点等基本信息

支持从 GPU 维度查看资源使用情况，帮助用户理解资源分布，了解算力与显存相关的分配与消耗情况。

![HAMi WebUI 算力管理列表页](/img/docs/zh/userguide/webui-accelerator-list.png)
![HAMi WebUI 算力管理详情页](/img/docs/zh/userguide/webui-accelerator-detail.png)

### 工作负载

支持查看任务运行情况：

- 任务的 GPU 使用情况
- 资源分配情况
- 运行状态

便于从任务维度了解资源使用情况及其对 GPU 资源的占用。

![HAMi WebUI 工作负载列表页](/img/docs/zh/userguide/webui-workload-list.png)
![HAMi WebUI 工作负载详情页](/img/docs/zh/userguide/webui-workload-detail.png)

## 与 HAMi 的关系

HAMi WebUI 是 HAMi 生态中的可视化组件：

- HAMi：负责 GPU 资源调度与管理
- WebUI：负责数据展示与交互

两者结合，可以实现从资源调度到可视化监控的完整闭环。

## 总结

HAMi WebUI 提供了一套围绕 GPU 资源的可视化解决方案，使用户可以更高效地：

- 了解集群状态
- 分析资源使用情况
- 定位问题与优化资源

在实际生产环境中，WebUI 能够显著降低 GPU 运维与管理的复杂度。
