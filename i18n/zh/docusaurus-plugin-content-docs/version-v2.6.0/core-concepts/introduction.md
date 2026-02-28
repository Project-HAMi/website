---
slug: /
title: 什么是 HAMi？
translated: true
---

## HAMi: 异构 AI 计算虚拟化中间件

异构 AI 计算虚拟化中间件（HAMi），前称为 k8s-vGPU-scheduler，是一个设计用于管理 k8s 集群中异构 AI 计算设备的“全合一”图表。它可以提供在任务之间共享异构 AI 设备的能力。

HAMi 是一个[云原生计算基金会](https://cncf.io/)的沙箱项目和[景观项目](https://landscape.cncf.io/?item=orchestration-management--scheduling-orchestration--hami)以及[CNAI 景观项目](https://landscape.cncf.io/?group=cnai&item=cnai--general-orchestration--hami)。

## 为什么选择 HAMi

- __设备共享__
  - 支持多种异构 AI 计算设备
  - 支持多设备容器的设备共享

- __设备显存控制__
  - 容器内的硬限制
  - 支持动态设备显存分配
  - 支持按 MB 或百分比分配内存

- __设备规格__
  - 支持指定某种类型的异构 AI 计算设备  
  - 支持使用设备 UUID 指定某个异构 AI 计算设备

- __易于尝试__
  - 对容器内的任务透明
  - 使用 helm 安装/卸载，简单且环保

- __开放和中立__
  - 由互联网、金融、制造、云服务提供商等共同发起
  - 目标是与 CNCF 进行开放治理

## 下一步

以下是一些推荐的下一步操作：

- 了解 HAMi 的[架构](./architecture.md)。
- 开始[安装 HAMi](../installation/prequisities.md)。
