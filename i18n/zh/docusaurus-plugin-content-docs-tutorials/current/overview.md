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

每个实验都列出了各自的前提条件。

- **实验 3 和 4** 直接复用实验 1 搭建的集群，一次开机即可完成全部三个实验。
- **实验 2** 可在任意笔记本上运行，无需 GPU。
- **实验 7** 在租用的 GPU 虚拟机上自行搭建单节点 k3s 集群，不使用 GPU Operator。
- **实验 8** 需要已有的 Volcano GPU 集群，用于验证 Volcano vGPU、Gang 调度和队列级资源限制。
- **实验 9** 使用 Kueue 准入控制限制 HAMi vGPU 数量、显存和算力配额。
- **实验 11** 将从头搭建完整的 KServe Standard 推理环境，并通过 HAMi 原生 DRA Claim 让两个 vLLM 副本共享一张 GPU。
- **实验 12** 在 GKE 1.35/COS/CDI 上部署 KAI Scheduler 与 HAMi-core，并通过 CUDA 分配验证显存上限。
- **实验 13** 在昇腾 310P3 ARM 服务器上源码编译 Volcano 与 ascend-device-plugin，验证 hami-vnpu-core 软切分、binpack 共卡与容器级监控指标。
- **实验 14** 在挂载四块 T4 的 GKE 节点上安装 HAMi v2.10.0，并通过分配注解与调度器日志观察可组合的 `gpu-scheduler-policy` 策略链（`spread`、`binpack`、`mutex`、`mutex,binpack`）。
