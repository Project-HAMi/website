---
title: 架构设计
translated: true
---

HAMi 的整体架构如下所示：

![HAMi 系统架构图，显示各组件之间的关系和交互](/img/docs/common/core-concepts/architect.jpg)

HAMi 由以下组件组成：

- HAMi MutatingWebhook
- HAMi scheduler-extender
- 设备插件 (HAMi-device-plugin)
- 容器内资源控制 (HAMi-Core)

HAMi MutatingWebhook 检查该任务是否可以由 HAMi 处理，它扫描每个提交的 Pod 的资源字段，如果该 Pod 所需的每个资源是 'cpu'、'memory' 或 HAMi 资源，则会将该 Pod 的 schedulerName 字段设置为 'HAMi-scheduler'。

HAMi 调度器负责将任务分配给适当的节点和设备。同时，调度器需要维护异构计算设备的全局视图以进行监控。

设备插件层从任务的注释字段获取调度结果，并将相应的设备映射到容器。

容器内资源控制负责监控容器内的资源使用情况，并提供硬隔离能力。
