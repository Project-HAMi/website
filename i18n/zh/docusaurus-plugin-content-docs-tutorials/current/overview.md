---
title: 实践教程
slug: /
---

import LabCardGrid from '@site/src/components/labs/LabCardGrid';

通过动手实践学习 HAMi。每个实验都是带真实输出的分步练习：你将亲手搭建集群、安装 HAMi，并验证 GPU 切分行为。

## 概念

实验所依赖的背景知识。

- [GPU 软件栈全景](/zh/docs/core-concepts/gpu-stack)：从硬件到 Kubernetes 调度的 5 层结构
- [理解 GPU 驱动](/zh/docs/core-concepts/gpu-driver)：内核模块、NVML，以及自底向上的排障方法
- [HAMi 集群架构](/zh/docs/core-concepts/hami-architecture)：HAMi 集群中的每个组件及其作用

## 实验

<LabCardGrid items={[ { href: '/zh/tutorials/labs/online-install', title: '实验 1: 在线安装 HAMi', description: '在云虚拟机上从零搭建 GPU Kubernetes 集群并安装 HAMi。', level: 'Beginner', duration: '约 60 分钟', }, { href: '/zh/tutorials/labs/local-fake-gpu', title: '实验 2: 本地 Fake GPU 安装', description: '在笔记本上学习 HAMi 控制面，无需 GPU。', level: 'Beginner', duration: '约 30 分钟', }, { href: '/zh/tutorials/labs/gpu-partitioning', title: '实验 3: GPU 切分', description: '多个 Pod 共享一张 GPU，显存和算力限制可验证。（中文翻译整理中）', level: 'Intermediate', duration: '约 30 分钟', }, { href: '/zh/tutorials/labs/hami-dra', title: '实验 4: 用 DRA 切分 GPU', description: '通过 Kubernetes 原生 Dynamic Resource Allocation 实现同样效果。（实验性，中文翻译整理中）', level: 'Advanced', duration: '约 45 分钟', }, ]} />

每个实验都列出了各自的前提条件。实验 3 和 4 直接复用实验 1 搭建的集群，一次开机即可完成全部三个实验；实验 2 可在任意笔记本上运行，无需 GPU。
