---
title: 什么是HAMi？
translated: true
slug: /
---

## 目录 {#toc}

- [HAMi：异构AI计算虚拟化中间件](#hami-heterogeneous-ai-computing-virtualization-middleware)
- [为什么选择HAMi](#why-hami)
- [后续步骤](#whats-next)

## HAMi：异构AI计算虚拟化中间件 {#hami-heterogeneous-ai-computing-virtualization-middleware}

异构AI计算虚拟化中间件（HAMi），前身为k8s-vGPU-scheduler，是一个专为管理k8s集群中异构AI计算设备而设计的"一体化"Helm Chart。它能够实现异构AI设备在多个任务间的共享能力。

HAMi是[云原生计算基金会（CNCF）](https://cncf.io/)的SandBox项目，同时被收录于[CNCF技术全景图-编排与调度类目](https://landscape.cncf.io/?item=orchestration-management--scheduling-orchestration--hami)及[CNAI技术全景图](https://landscape.cncf.io/?group=cnai&item=cnai--general-orchestration--hami)。

## 为什么选择HAMi {#why-hami}

- **设备共享**
  - 支持多种异构AI计算设备（如NVIDIA GPU/CUDA）
  - 支持多设备容器的设备共享

- **设备内存控制**
  - 容器内硬性内存限制
  - 支持动态设备内存分配
  - 支持按MB或百分比分配内存

- **设备规格指定**
  - 支持指定特定类型的异构AI计算设备
  - 支持通过设备UUID指定具体设备

- **开箱即用**
  - 对容器内任务透明无感
  - 通过helm一键安装/卸载，简洁环保

- **开放中立**
  - 由互联网、金融、制造业、云服务商等多领域联合发起
  - 以CNCF开放治理为目标

## 后续步骤 {#whats-next}

推荐继续了解：

- 学习HAMi的[架构设计](./architecture.md)
- 开始[安装HAMi](../installation/prequisities.md)
 
 This content is powered by i18n-agent-action with LLM service https://api.deepseek.com with model deepseek-chat