---
title: "HAMi 亮相 KubeCon + CloudNativeCon 日本 2026"
date: "2026-08-01"
description: "回顾 HAMi 在横滨 KubeCon + CloudNativeCon 日本 2026 的亮相：一场关于 SNOW 千卡生产蓝图的主舞台分享，以及 HAMi 展台。"
tags: ["KubeCon", "GPU", "Kubernetes", "AI", "Japan"]
authors: [hami_community]
---

[KubeCon + CloudNativeCon 日本 2026](https://events.linuxfoundation.org/kubecon-cloudnativecon-japan/) 于 7 月 28 至 30 日在 Pacifico Yokohama 举办。HAMi 以一场主舞台分享和 Project Pavilion 的展台参与本届大会。[Reza Jelveh](https://github.com/fishman) 登台分享，并在展台值守。

完整的回顾、演讲幻灯片与 SNOW 案例，请见 [KubeCon 日本 2026 专页](/zh/landing/kubecon-japan)。

<!-- truncate -->

## Keynote 中的 HAMi

![HAMi 出现在 Chris Aniszczyk 与 Jonathan Bryce 在 KubeCon 日本 2026 的 Keynote 幻灯片中](/img/kubecon-japan-2026-recap/keynote.jpg)

HAMi 出现在开场 Keynote 中，CNCF 首席技术官 Chris Aniszczyk 与 Linux 基金会云与基础设施执行董事 Jonathan Bryce 的幻灯片对其进行了介绍。

## 主舞台：共享 GPU 调度与主动自动伸缩

![Reza Jelveh（密瓜智能）与 Jeonghyun Kim（SNOW）在 KubeCon 日本 2026 的分享](/img/kubecon-japan-2026-recap/reza-snow.jpg)

[**Shared GPU Scheduling & Proactive Autoscaling: A Production Blueprint for 1000+ GPUs**](https://events.linuxfoundation.org/kubecon-cloudnativecon-japan/program/schedule/?id=1182713) 这场分享，由 Jeonghyun Kim（SNOW AI 工程师）与 Reza Jelveh 共同呈现。

该分享介绍了 SNOW 如何以超过 1000 张 NVIDIA A100 GPU，服务 Snow、Epik、B612 三款覆盖超过 2 亿用户的 AI 应用。其架构以 HAMi 完成 GPU 共享，以 KEDA 实现主动式扩容，在相同流量下将 GPU 需求减半，并提升了负载波动下的恢复能力。

## 展台

![KubeCon 日本 2026 Project Pavilion 的 HAMi 展台](/img/kubecon-japan-2026-recap/hami-booth.jpg)

在 Project Pavilion 的 HAMi 展台，前来交流的工程师主要关注以下问题：

- 如何将 HAMi 引入现有集群
- HAMi 与 **Volcano**、**Kueue**、**NVIDIA KAI Scheduler** 如何协同
- 实际的 GPU 调度难题：显存碎片化、批处理任务导致的 GPU 闲置，以及推理工作负载难以获得稳定的 GPU 切片

## 进一步了解

本次活动的演讲、SNOW 案例、完整指标、幻灯片与参与方式，均可在 [KubeCon 日本 2026 专页](/zh/landing/kubecon-japan) 查看。如需参与讨论，欢迎加入 [HAMi 社区](/zh/community)。
