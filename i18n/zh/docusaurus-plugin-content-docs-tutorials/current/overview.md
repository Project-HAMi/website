---
title: 实践教程
slug: /
---

import LabCardGridAuto from '@site/src/components/labs/LabCardGridAuto';

通过动手实践学习 HAMi。每个实验都是带真实输出的分步练习：你将亲手搭建集群、安装 HAMi，并验证 GPU 切分行为。

## 概念

实验所依赖的背景知识。

- [GPU 软件栈全景](/zh/docs/core-concepts/gpu-stack)：从硬件到 Kubernetes 调度的 5 层结构
- [理解 GPU 驱动](/zh/docs/core-concepts/gpu-driver)：内核模块、NVML，以及自底向上的排障方法
- [HAMi 集群架构](/zh/docs/core-concepts/hami-architecture)：HAMi 集群中的每个组件及其作用

## 实验

<LabCardGridAuto />

每个实验都列出了各自的前提条件。实验 3 和 4 直接复用实验 1 搭建的集群，一次开机即可完成全部三个实验；实验 2 可在任意笔记本上运行，无需 GPU。实验 7 在租用的 GPU 虚拟机上自行搭建单节点 k3s 集群，不使用 GPU Operator。实验 8 需要已有的 Volcano GPU 集群，用于验证 Volcano vGPU、Gang 调度和队列级资源限制。
