---
title: "HAMi 即将亮相 KubeCon China 2026：两场 Keynote、两场技术分享，展台 T-1 等你"
date: "2026-08-25"
description: "HAMi 将以 CNCF 孵化项目的身份首次亮相 KubeCon China 2026（9 月 7-9 日·上海国际会议中心），带来两场 Keynote、一场闪电演讲、一场专场技术分享，并设置项目展台 T-1。从 PD 分离的异构推理部署，到 5 分钟讲透 MIG 动态切分，再到千卡规模的 GPU 虚拟化生产实践。"
tags: ["KubeCon", "GPU", "Kubernetes", "AI"]
authors: [hami_community]
---

9 月 7-9 日，[KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China 2026](https://www.lfopensource.cn/kubecon-cloudnativecon-openinfra-summit-pytorch-conference-china/)将在上海国际会议中心举行。这也是 HAMi 在今年 7 月[晋级 CNCF 孵化（Incubating）项目](/zh/blog/hami-cncf-incubating)后，首次以孵化项目的身份亮相 KubeCon China。

本届大会上，HAMi 社区将带来**两场 Keynote、一场闪电演讲、一场专场技术分享**，并在现场设置**项目展台（T-1）**：从 PD 分离的异构推理部署，到 5 分钟讲透 MIG 动态切分，再到千卡规模的 GPU 虚拟化生产实践。欢迎社区的小伙伴到现场交流。

<!-- truncate -->

![KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China 2026](/img/blog-hami-at-kubecon-china-2026-banner.png)

## 大会信息

- **时间**：2026 年 9 月 7-9 日（9 月 8-9 日为主会日）
- **地点**：中国·上海国际会议中心
- **官网及报名**：[大会官网](https://www.lfopensource.cn/kubecon-cloudnativecon-openinfra-summit-pytorch-conference-china/)
- **完整议程**：[大会议程](https://www.lfopensource.cn/kubecon-cloudnativecon-openinfra-summit-pytorch-conference-china/program/schedule/)

HAMi 的全部活动集中在 9 月 8 日：上午两场 Keynote，午间一场 Lightning Talk，下午一场生产实践 Session，展台则全天开放。Keynote 环节的完整阵容以大会官网最终公布的议程为准；所有 session 均会录制，会后将在 CNCF 官方频道上线。

## Keynote 1：大规模运行前沿智能

- **原题**：Operating Frontier Intelligence at Scale
- **时间**：9 月 8 日 09:12-09:22
- **地点**：Grand Ballroom II + III
- **讲者**：Chris Aniszczyk（CTO, Cloud and Infrastructure, The Linux Foundation）、张潇（密瓜智能联合创始人兼 CEO）

大会开幕首场 Keynote。Linux 基金会 CTO Chris Aniszczyk 将与张潇同台：当模型构建完成、AI 真正走向生产，挑战转向如何让每一块 GPU 发挥价值、随需求动态扩展、保持可靠性，并理解日益复杂的系统。云原生技术正在成为支撑这一切的操作系统层。演讲还将探讨可观测性在 AI 系统复杂化过程中与日俱增的作用，以及为什么下一代 AI 基础设施将依赖跨技术栈协同工作的开放技术。

## Keynote 2：基于 llm-d 的多元 AI 加速器 PD 分离 vLLM 部署

- **原题**：PD Disaggregation vLLM Deployment on Alternative AI Accelerators Using llm-d
- **时间**：9 月 8 日 09:59-10:04
- **地点**：Grand Ballroom II + III
- **讲者**：王纪飞（HAMi Approver，密瓜智能）、李孟轩（密瓜智能联合创始人兼 CTO）

[llm-d](https://github.com/llm-d) 是专注于在 Kubernetes 上构建分布式 LLM 推理的 CNCF 项目。当推理集群里不再只有一种 GPU，PD 分离（Prefill/Decode Disaggregation）架构如何在非 NVIDIA 的多元加速器上高效部署 vLLM？这场 Keynote 将介绍 llm-d 对异构算力环境的支持：HAMi 将异构 GPU 共享与调度能力带入 llm-d 的推理拓扑，让切分、共享与调度跨硬件架构运转。5 分钟，干货密度拉满。

## 闪电演讲：从静态切片到弹性 GPU，用 HAMi 实现动态 MIG

- **原题**：From Static Slices to Elastic GPUs: Dynamic MIG with HAMi
- **时间**：9 月 8 日 11:14-11:19
- **地点**：5B + C
- **讲者**：王纪飞（HAMi Approver，密瓜智能）

在 Kubernetes 中使用 NVIDIA MIG，通常需要预先静态切分：运维必须在工作负载到来之前决定好整张卡的分区布局。切少了浪费，切多了碎片化，等负载真正到来时，布局往往已经不对了。

这场 5 分钟的闪电演讲提出一条调度驱动的路线：HAMi 将调度器与 device plugin 集成，让 GPU 分区跟随实时调度决策动态调整：先调度、后切分，而不是先切分、再调度。

> GPU partitioning should follow scheduling, not precede it.（GPU 分区应该跟随调度，而不是先于调度。）

## 专场分享：合合信息如何支撑数十亿次文档扫描，基于 HAMi 的千卡规模 GPU 虚拟化

- **原题**：How Intsig Serves Billions of Document Scans: GPU Virtualization at Scale with HAMi
- **时间**：9 月 8 日 14:30-15:00
- **地点**：Grand Ballroom II + III
- **讲者**：李孟轩（密瓜智能联合创始人兼 CTO）、Walter Duan（合合信息 Intsig）

这是一堂千卡规模的生产实践课。[合合信息](https://www.intsig.com)（CamScanner 扫描全能王，全球 3 亿 + 下载）的 GPU 场景非常极致：单一 OCR 负载、极高并发、约 1000 张 GPU 卡，瓶颈不在调度放置，而在排队时间。

两位讲者将分享如何从腾讯 QGPU 迁移到 HAMi，一站式获得虚拟化、调度与监控能力，实现排队时间下降、利用率上升。演讲中还将集中披露 HAMi 的生产案例数据：

- **顺丰**：GPU 从 1400 张精简到 1000 张，业务不受影响
- **招商银行**：10000+ GPU，利用率 20% → 80%
- **蔚来**：CI 效率提升 10 倍
- **工商银行**：GPU 利用率 20% → 70%

分享不止有“用得好的模式”，也有“烧钱的反模式”，例如 GPU 切分低于 1/6 时反而适得其反。结尾还将现场演示合合信息开源的 AI 终端 Chaterm：用自然语言直接操作 GPU 集群。

## HAMi 项目展台：T-1

- **展位**：T-1（Grand Ballroom I）
- **时间**：9 月 8 日 10:30-19:00

HAMi 维护者将在展台值守。无论你正在做 GPU 共享、为算力利用率发愁，还是想了解多租户 GPU 管理，都欢迎来聊：

- GPU 虚拟化与共享：显存、算力的切分与隔离
- AI 负载调度与利用率优化
- MIG、vGPU 等多种切分方案的选型
- 与 [Volcano](https://volcano.sh/)、[Kueue](https://kueue.sigs.k8s.io/)、[KAI Scheduler](https://github.com/NVIDIA/KAI-Scheduler)、[vLLM](https://github.com/vllm-project/vllm) 等生态项目的集成

现场备有社区贴纸和周边，扫码即可加入 HAMi 社区群、为项目点亮 Star。

## 会前一站：HAMi Meetup 上海站

如果你提前到上海：9 月 6 日（周日）下午，密瓜智能（Dynamia）和 HAMi 社区将在上海五角场联合主办 **“不卷算力，卷效率”HAMi Meetup 上海站 · Incubating 特别活动**。这是 HAMi 晋级孵化项目后的首场线下特别活动，涵盖主题演讲、社区圆桌、Incubating 里程碑环节与 Community Night。[点此报名](https://www.huodongxing.com/event/2874911381700)。

9 月 8 日，上海，HAMi 展台 T-1，我们不见不散。
