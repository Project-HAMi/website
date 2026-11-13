---
title: "KubeCon China 2026 回顾：两场 Keynote、一场闪电演讲，与一项案例大奖"
date: "2026-09-10"
description: "HAMi 以 CNCF 孵化项目身份首次参加 KubeCon China：两场 Keynote、一场闪电演讲、一场万卡规模生产实践、全天值守的展台 T-1，招商银行采用 HAMi 的案例还斩获 Cloud Native China 2026 案例大奖。"
tags: ["KubeCon", "GPU", "Kubernetes", "AI", "China"]
authors: [hami_community]
---

9 月 7-9 日，[KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China 2026](https://www.lfopensource.cn/kubecon-cloudnativecon-openinfra-summit-pytorch-conference-china/)在上海国际会议中心落下帷幕。这是 HAMi[晋级 CNCF 孵化项目](/zh/blog/hami-cncf-incubating)后首次参加 KubeCon China：社区带来了两场 Keynote、一场闪电演讲、一场专场分享和一个全天值守的展台，外加 Keynote 舞台上揭晓的一项案例大奖。

四场分享的幻灯片均可在 [KubeCon China 2026 活动页](/zh/landing/kubecon-china)下载。

<!-- truncate -->

## Keynote 1：大规模运行前沿智能

![张潇（密瓜智能联合创始人兼 CEO）在开幕 Keynote 舞台上，与 Linux 基金会 CTO Chris Aniszczyk 同台分享](/img/kubecon-china-2026-recap/xiao-zhang-keynote.jpg)

9 月 8 日上午的开幕 Keynote 由 Chris Aniszczyk（CTO, Cloud and Infrastructure, The Linux Foundation）与张潇（密瓜智能联合创始人兼 CEO）共同带来：当模型构建完成、AI 真正走向生产，挑战转向如何让每一块 GPU 发挥价值。云原生技术正在成为 AI 基础设施的操作系统层。

张潇的分享把 GPU 共享放到了故事中心：借助 HAMi，一张 GPU 可以切分给多个 LLM 工作负载共享，同一套调度平面还能延伸到异构加速器：

![开幕 Keynote 幻灯片“GPU sharing with HAMi”：单张 GPU 切分后同时服务多个 LLM 工作负载，四周是 HAMi 从细粒度 vGPU 到可观测性的能力矩阵](/img/kubecon-china-2026-recap/keynote-gpu-sharing.png)

生产数据页则给出了采用者的实测结果：招商银行单卡推理吞吐提升 46.7%（ResNet 50·batch 32）；驾驶仿真场景 GPU 工时减少 30%；训推一体流水线所需 GPU 减半；页面上的 GPU 基础设施已有 90% 由 HAMi 管理。

![Keynote 幻灯片“HAMi in production”：单卡推理吞吐 +46.7%、驾驶仿真 GPU 工时 -30%、训推流水线 GPU -50%、90% 的 GPU 基础设施由 HAMi 管理](/img/kubecon-china-2026-recap/keynote-hami-production.png)

## Keynote 2：基于 llm-d 的多元 AI 加速器 PD 分离 vLLM 部署

![王纪飞与李孟轩在 Grand Ballroom II + III 进行 llm-d Keynote](/img/kubecon-china-2026-recap/llm-d-keynote.jpg)

同日上午，王纪飞（HAMi Approver，密瓜智能）与李孟轩（密瓜智能联合创始人兼 CTO）登台带来 5 分钟 Keynote，介绍专注于在 Kubernetes 上构建分布式 LLM 推理的 CNCF 项目 [llm-d](https://github.com/llm-d/llm-d)。当推理集群不再只有 NVIDIA 一种 GPU，PD 分离（Prefill/Decode Disaggregation）架构如何在多元加速器上高效部署 vLLM？他们的答案是：把 HAMi 的异构 GPU 共享与调度能力带入 llm-d 的推理拓扑，让切分、共享与调度跨硬件架构运转。

![Keynote 幻灯片“Optimize LLM-D inference”：请求经 llm-d router 进入 Prefill 与 Decode 实例，每个实例运行在 HAMi 通过 MIG/MPS 切分的 GPU 上，调度层可选用 HAMi、Volcano 或 KAI Scheduler](/img/kubecon-china-2026-recap/llm-d-architecture.png)

## 闪电演讲：从静态切片到弹性 GPU，用 HAMi 实现动态 MIG

午前的闪电演讲中，王纪飞再次聚焦 MIG 的老问题：静态预切分要求运维在工作负载到来之前猜好整卡分区布局。HAMi 给出的路线是调度驱动的动态 MIG：先由调度器完成 Pod 放置，再由 device plugin 在节点上重配 MIG 实例，负载在运行时拿到自己的 MIG UUID。

> GPU partitioning should follow scheduling, not precede it.（GPU 分区应该跟随调度，而不是先于调度。）

![闪电演讲幻灯片“Dynamic MIG — Publish capacity”：HAMi 调度器放置 Pod，device plugin 经 NVML 将 GPU 重切为 MIG 实例，负载在运行时获得 MIG UUID](/img/kubecon-china-2026-recap/dynamic-mig-publish-capacity.png)

## 专场分享：合合信息如何支撑数十亿次文档扫描

![李孟轩现场分享合合信息生产实践](/img/kubecon-china-2026-recap/intsig-session.jpg)

![Walter Duan（合合信息）在台上分享 IntSig 训推总览](/img/kubecon-china-2026-recap/walter-duan.jpg)

下午的专场分享由李孟轩（密瓜智能联合创始人兼 CTO）与 Walter Duan（合合信息）带来，深入剖析了一个多数团队梦寐以求的 GPU 集群：万卡规模的训推一体平台，自建数据中心与多云混合部署，运行 1000+ 在线推理服务与 1000+ 离线训练任务，训练侧 24 小时利用率保持在 90% 以上，训练算力覆盖 Hopper、Ampere、Blackwell 与昇腾。

![专场幻灯片“CaseStudy: IntSig 训推总览”：万卡集群、1000+ 在线推理服务、1000+ 离线训练任务、90%+ 24 小时利用率](/img/kubecon-china-2026-recap/intsig-cluster-overview.png)

合合信息从腾讯 QGPU 迁移到 HAMi 后，一站式获得虚拟化、调度与监控能力。部署打法：小模型推理用切片、高负载与大模型保留整卡；Binpack 优先装箱减少碎片；高负载与低负载混布；分配指标接入监控、从分配到使用形成闭环；配合 Karpenter 实现弹性扩容。实测收益：GPU 利用率提升 50%、综合成本降低 30%、推理性能下降控制在 10% 以内。

![专场幻灯片“IntSig HAMi 部署方式与收益”：五种部署模式与实测收益：GPU 利用率 +50%、成本 -30%、推理性能下降控制在 10% 以内](/img/kubecon-china-2026-recap/intsig-hami-results.png)

演讲还集中披露了 HAMi 的生产案例数据：顺丰 GPU 从 1400 张精简到 1000 张、业务不受影响；招商银行 10000+ GPU、利用率 20% → 80%；蔚来 CI 效率提升 10 倍；工商银行 GPU 利用率 20% → 70%。同时也有“烧钱的反模式”警示：GPU 切分低于 1/6 时反而适得其反。结尾现场演示了合合信息开源的 AI 终端 Chaterm，用自然语言直接操作 GPU 集群。

## 招商银行斩获案例大奖

![Keynote 大屏揭晓招商银行为 Cloud Native China 2026 案例大奖得主，其参考架构基于 Kubernetes、Kueue、KEDA、Fluid、Prometheus 与 HAMi 构建](/img/kubecon-china-2026-recap/case-study-award.jpg)

还有一个值得记住的 Keynote 瞬间：招商银行被评为 Cloud Native China 2026 案例大奖得主，其参考架构组合了 Kubernetes、Kueue、KEDA、Fluid 与 Prometheus，GPU 共享层正是 HAMi，也就是那家把 10000+ GPU 利用率从 20% 提升到 80% 的银行。

## 展台 T-1

![HAMi 社区伙伴在 Grand Ballroom I 的 T-1 展台合影](/img/kubecon-china-2026-recap/hami-booth.jpg)

维护者从上午一直值守到闭馆。聊得最多的话题：如何在不改动应用的前提下把 HAMi 引入现有集群；与 Volcano、Kueue、KAI Scheduler 的协同；MIG、vGPU 等切分方案的选型；以及 fleet 规模的多租户 GPU 管理。

## 观看与下载

所有 session 均有录制，会后将在 CNCF 官方频道上线。四场分享（两场 Keynote、一场闪电演讲与合合信息专场）的幻灯片均可从 [KubeCon China 2026 活动页](/zh/landing/kubecon-china)下载。

欢迎加入 [HAMi 社区](/zh/community)参与讨论。
