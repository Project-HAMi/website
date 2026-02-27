---
title: 什么是 HAMi？
translated: true
slug: /
---

## HAMi：异构 AI 计算虚拟化中间件 {#hami-heterogeneous-ai-computing-virtualization-middleware}

异构 AI 计算虚拟化中间件（HAMi），前身为 k8s-vGPU-scheduler，是一个专为管理 k8s 集群中异构 AI 计算设备而设计的"一体化"Helm Chart。它能够实现异构 AI 设备在多个任务间的共享能力。

HAMi 是[云原生计算基金会（CNCF）](https://cncf.io/)的 SandBox 项目，同时被收录于[CNCF 技术全景图 - 编排与调度类目](https://landscape.cncf.io/?item=orchestration-management--scheduling-orchestration--hami)及[CNAI 技术全景图](https://landscape.cncf.io/?group=cnai&item=cnai--general-orchestration--hami)。

## 为什么选择 HAMi {#why-hami}

- **设备共享**
  - 支持多种异构 AI 计算设备（如 NVIDIA GPU/CUDA）
  - 支持多设备容器的设备共享

- **设备显存控制**
  - 容器内硬性内存限制
  - 支持动态设备显存分配
  - 支持按 MB 或百分比分配内存

- **设备规格指定**
  - 支持指定特定类型的异构 AI 计算设备
  - 支持通过设备 UUID 指定具体设备

- **开箱即用**
  - 对容器内任务透明无感
  - 通过 helm 一键安装/卸载，简洁环保

- **开放中立**
  - 由互联网、金融、制造业、云服务商等多领域联合发起
  - 以 CNCF 开放治理为目标

## 后续步骤 {#whats-next}

推荐继续了解：

- 学习 HAMi 的[架构设计](./architecture.md)
- 开始[安装 HAMi](../installation/prequisities.md)
