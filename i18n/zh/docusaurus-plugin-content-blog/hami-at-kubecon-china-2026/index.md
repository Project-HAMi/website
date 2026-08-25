---
title: "HAMi 即将亮相 KubeCon China 2026：Keynote 亮相、两场技术分享，展台 T-1 等你"
date: "2026-08-25"
description: "HAMi 将以 CNCF 孵化项目的身份首次亮相 KubeCon China 2026（9 月 7-9 日·上海国际会议中心），带来一场 Keynote 亮相、两场技术分享，并设置项目展台 T-1。从 5 分钟讲透 MIG 动态切分，到千卡规模的 GPU 虚拟化生产实践。"
tags: ["KubeCon", "GPU", "Kubernetes", "AI"]
authors: [hami_community]
---

9 月 7-9 日，[KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China 2026](https://www.lfopensource.cn/kubecon-cloudnativecon-openinfra-summit-pytorch-conference-china/)将在上海国际会议中心举行。这也是 HAMi 在今年 7 月[晋级 CNCF 孵化（Incubating）项目](/zh/blog/hami-cncf-incubating)后，首次以孵化项目的身份亮相 KubeCon China。

本届大会上，HAMi 社区将带来**一场 Keynote 亮相、两场技术分享**，并在现场设置**项目展台（T-1）**：从 5 分钟讲透 MIG 动态切分，到千卡规模的 GPU 虚拟化生产实践。欢迎社区的小伙伴到现场交流。

<!-- truncate -->

![KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China 2026](/img/blog-hami-at-kubecon-china-2026-banner.png)

## 大会信息

- **时间**：2026 年 9 月 7-9 日（9 月 8-9 日为主会日）
- **地点**：中国·上海国际会议中心
- **官网及报名**：[大会官网](https://www.lfopensource.cn/kubecon-cloudnativecon-openinfra-summit-pytorch-conference-china/)
- **完整议程**：[大会议程](https://www.lfopensource.cn/kubecon-cloudnativecon-openinfra-summit-pytorch-conference-china/program/schedule/)

HAMi 的全部活动集中在 9 月 8 日：上午 Keynote 亮相，午间一场 Lightning Talk，下午一场生产实践 Session，展台则全天开放。Keynote 环节的完整阵容以大会官网最终公布的议程为准；所有 session 均会录制，会后将在 CNCF 官方频道上线。

## Keynote：llm-d 对异构环境的支持

- **时间**：9 月 8 日 09:12-09:22
- **地点**：Grand Ballroom II + III
- **讲者**：王纪飞（HAMi Approver）

9 月 8 日上午的 Keynote 环节“Operating Frontier Intelligence at Scale”中，王纪飞将介绍 llm-d 对异构算力环境的支持。

[llm-d](https://github.com/llm-d) 是专注于在 Kubernetes 上构建分布式 LLM 推理的 CNCF 项目。当推理集群里不再只有一种 GPU，切分、共享与调度如何跨硬件架构运转？HAMi 将异构 GPU 共享与调度能力带入 llm-d 的推理拓扑。这场 10 分钟的 Keynote，值得早起。

## Lightning Talk: From Static Slices to Elastic GPUs: Dynamic MIG with HAMi

- **时间**：9 月 8 日 11:14-11:19
- **地点**：5B + C
- **讲者**：王纪飞（HAMi Approver）

在 Kubernetes 中使用 NVIDIA MIG，通常需要预先静态切分：运维必须在工作负载到来之前决定好整张卡的分区布局。切少了浪费，切多了碎片化，等负载真正到来时，布局往往已经不对了。

这场 5 分钟的闪电演讲提出一条调度驱动的路线：HAMi 将调度器与 device plugin 集成，让 GPU 分区跟随实时调度决策动态调整：先调度、后切分，而不是先切分、再调度。

> GPU partitioning should follow scheduling, not precede it.（GPU 分区应该跟随调度，而不是先于调度。）

## Session: How Intsig Serves Billions of Document Scans: GPU Virtualization at Scale with HAMi

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
