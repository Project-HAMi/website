---
slug: /
title: 什么是 HAMi？
translated: true
---

## HAMi: 异构AI计算虚拟化中间件

异构AI计算虚拟化中间件（HAMi），前称为k8s-vGPU-scheduler，是一个设计用于管理k8s集群中异构AI计算设备的“全合一”图表。它可以提供在任务之间共享异构AI设备的能力。

HAMi是一个[云原生计算基金会](https://cncf.io/)的沙箱项目和[景观项目](https://landscape.cncf.io/?item=orchestration-management--scheduling-orchestration--hami)以及[CNAI景观项目](https://landscape.cncf.io/?group=cnai&item=cnai--general-orchestration--hami)。

## 为什么选择HAMi：
- __设备共享__
    - 支持多种异构AI计算设备
    - 支持多设备容器的设备共享

- __设备内存控制__
    - 容器内的硬限制
    - 支持动态设备内存分配
    - 支持按MB或百分比分配内存

- __设备规格__
    - 支持指定某种类型的异构AI计算设备  
    - 支持使用设备UUID指定某个异构AI计算设备

- __易于尝试__
    - 对容器内的任务透明
    - 使用helm安装/卸载，简单且环保

- __开放和中立__
    - 由互联网、金融、制造、云服务提供商等共同发起
    - 目标是与CNCF进行开放治理


## 下一步

以下是一些推荐的下一步操作：

- 了解HAMi的[架构](./architecture.md)。
- 开始[安装HAMi](../installation/prequisities.md)。