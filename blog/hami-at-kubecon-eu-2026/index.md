---
title: "HAMi 即将亮相 KubeCon Europe 2026：构建 Kubernetes 中的 GPU 资源层"
date: "2026-03-19"
description: "HAMi 将在 KubeCon Europe 2026 的多项活动中亮相，包括 Project Pavilion 展台、技术分享、主舞台 Demo 等。作为 CNCF Sandbox 项目，HAMi 关注的 GPU 虚拟化、共享与调度问题，正在与 Kubernetes 生态中的 AI 基础设施议题发生越来越直接的交汇。"
tags: ["KubeCon", "GPU", "Kubernetes", "AI"]
authors: [hami_community]
---

下周，HAMi 将在 [KubeCon + CloudNativeCon Europe 2026](https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/) 的多项活动中亮相，包括 Project Pavilion 展台、技术分享、主舞台 Demo，以及会后 AI 相关活动。

作为 CNCF Sandbox 项目，HAMi 关注的 GPU 虚拟化、共享与调度问题，正在与 Kubernetes 生态中的 AI 基础设施议题发生越来越直接的交汇。KubeCon + CloudNativeCon Europe 2026 将于 3 月 23 日至 26 日在阿姆斯特丹举行，其中 3 月 23 日为 pre-event programming，3 月 24 日至 26 日为主会期。

<!-- truncate -->

![KubeCon EU 2026 吸引了 13,000 名参会者](/img/blog-hami-at-kubecon-eu-2026-kubecon.png)

## 为什么这次 KubeCon 值得关注？

如果把过去几年云原生社区的讨论放在一起看，会发现一个越来越清晰的变化：AI 正在从应用层问题，进入 Kubernetes 的资源层、调度层与控制层。

围绕 GPU 的讨论也不再停留在"设备可见性"或"驱动可用性"，而是进一步延伸到共享、切分、利用率、多租户隔离，以及 AI workload 的调度语义等问题。

KubeCon Europe 2026 的官方议程中，keynote、AI 相关 session、Project Pavilion 与 co-located events 都体现出这一趋势。

在这个背景下，HAMi 所对应的问题空间也变得更加明确：不是简单地"让 Kubernetes 能识别 GPU"，而是让 GPU 进一步成为一种可以被抽象、被共享、被调度的资源层能力。

这也是为什么本次 KubeCon 对 HAMi 社区而言，不只是一次项目展示，更是一次和更大范围云原生生态对话的机会。

## 在 KubeCon 现场，如何找到 HAMi？

![欢迎来到 HAMi 展台](/img/blog-hami-at-kubecon-eu-2026-booth.png)

HAMi 将在 Project Pavilion 设置展台，方便与社区成员、用户和维护者进行现场交流。

- **Booth**：**P-13B**
- **时间**：
  - **3 月 24 日（周二）15:10–19:00**
  - **3 月 26 日（周四）12:30–14:00**

如果你会到现场，欢迎来到 HAMi Booth，一起交流这些话题：

- Kubernetes 中的 GPU 虚拟化与共享
- AI workload 的资源调度与利用率优化
- 多租户 GPU 资源管理
- HAMi 与 [Volcano](https://volcano.sh/)、[Kueue](https://kueue.sigs.k8s.io/)、[vLLM](https://github.com/vllm-project/vllm) 等生态项目的协同

Project Pavilion 是 KubeCon 主展区中的项目展示区域，面向社区项目、维护者与开发者交流。

## HAMi @ KubeCon Europe 2026 活动一览

### 1. Opening Keynote

- **时间**：3 月 24 日 09:00–09:35
- **地点**：Hall 12
- **讲者**：Jonathan Bryce (Linux Foundation Executive Director) & Chris Aniszczyk (CNCF CTO)
- **议程**：[Keynote: Welcome + Opening Remarks](https://kccnceu2026.sched.com/event/2CtKk/keynote-welcome-+-opening-remarks-jonathan-bryce-executive-director-cloud-and-infrastructure-linux-foundation-chris-aniszczyk-cto-cloud-and-infrastructure-linux-foundation?iframe=no)

本次开幕 keynote 由 Linux Foundation 与 CNCF 相关负责人带来。

对于关注 AI 基础设施方向的社区成员来说，keynote 本身就是一个观察窗口：云原生主叙事是否正在吸纳更多 AI、GPU 与资源管理相关议题。

### 2. HAMi 技术分享（Lightning Talks）

#### GPU Sharing in Kubernetes

- **时间**：3 月 23 日 17:15–17:25
- **地点**：Hall 7 · Room B
- **讲者**：张潇（「Dynamia 密瓜智能」CEO，HAMi Maintainer）
- **议程**：[K8s Issue #52757: Sharing GPUs Among Multiple Containers](https://colocatedeventseu2026.sched.com/event/2DY9v/cllightning-talk-k8s-issue-?iframe=yes&w=100%&sidebar=yes&bg=no#52757-sharing-gpus-among-multiple-containers-xiao-zhang-dynamiaai)

这场 lightning talk 会从 Kubernetes 社区长期存在的 GPU 共享问题出发，讨论多容器共享 GPU 的背景、挑战与相关实现路径。

#### HAMi 项目技术解读

- **时间**：3 月 23 日 14:43–14:48
- **地点**：Elicium 2
- **讲者**：李孟轩（「Dynamia 密瓜智能」CTO，HAMi Maintainer）
- **议程**：[HAMi: Dynamic, Smart, Stable GPU-Sharing Middleware in Kubernetes](https://kccnceu2026.sched.com/event/2EFyZ/project-lightning-talk-hami-dynamic-smart-stable-gpu-sharing-middleware-in-kubernetes-mengxuan-li-maintainer?iframe=yes&w=100%&sidebar=yes&bg=no)

这场分享会聚焦 HAMi 的核心架构与能力，包括 GPU 虚拟化、共享与调度机制，以及项目在稳定性与生产可用性上的设计思路。

### 3. Maintainer Summit

- **时间**：3 月 22 日
- **信息**：[Maintainer Summit](https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/features-add-ons/maintainer-summit/)

HAMi 也将参与 KubeCon 期间的 Maintainer Summit，并围绕 **Insights on AI Workloads** 与维护者群体展开交流。

Maintainer Summit 是 KubeCon 主会前一天举行的维护者活动，聚焦上游协作、SIG/WG 话题与项目间讨论。

对 HAMi 来说，这也是一个把 GPU 资源管理与 AI workload 问题带入更广泛维护者语境的重要场景。Maintainer Summit 确认于 3 月 22 日在 RAI Amsterdam 举行。

### 4. Poster Session

- **时间**：3 月 25 日 13:15–14:15
- **地点**：Hall 1–5 · Gouda Zone · Poster Pavilion
- **讲者**：Satyam Soni (Devtron) & Rudraksh Karpe (ZS Associates)
- **议程**：[Kubernetes as the Universal GPU Control Plane for AI Workloads](https://kccnceu2026.sched.com/event/2CW0q/poster-session-kubernetes-as-the-universal-gpu-control-plane-for-ai-workloads-satyam-soni-devtronai-rudraksh-karpe-zs-associates-inc?iframe=yes&w=100%&sidebar=yes&bg=no)

这场 poster session 从更生态化的角度讨论 Kubernetes 作为 GPU control plane 的可能性，这一方向与 HAMi 长期关注的问题高度相关。

### 5. 主舞台 Demo

- **时间**：3 月 26 日 10:03–10:18
- **地点**：Hall 12
- **讲者**：李孟轩（「Dynamia 密瓜智能」CTO，HAMi Maintainer），Reza Jelveh（「Dynamia 密瓜智能」Head of Global Market & Solution Engineer）

KubeCon 期间的主舞台 Demo 将展示 GPU 共享与调度在 Kubernetes 中的实际运行方式。相比常规 PPT 分享，这类 Demo 更适合直观理解从资源抽象到系统落地的完整链路。

### 6. AI Native Summit

- **时间**：3 月 27 日 09:00–16:00
- **地点**：Van der Valk Hotel Amsterdam – Zuidas
- **议程**：[AI Native Summit Hosted by ETSI ISG NFV](https://kccnceu2026.sched.com/event/2HKYM/ai-native-summit-hosted-by-etsi-isg-nfv-separate-registration-required?iframe=no)

在主会结束后，AI Native Summit 也值得关注。该活动更适合从系统层面讨论 AI 基础设施中的资源层、控制层，以及 Kubernetes 在其中的角色。

## 除了 HAMi，还可以关注哪些议题？

如果你会参加本届 KubeCon，除了 HAMi 相关活动，也建议重点关注以下方向：

- Device Management / DRA
- AI workload scheduling
- GPU observability
- inference platform 与 AI reference stack
- GPU 共享与资源抽象

这些议题虽然分散在不同会场，但共同指向一个问题：**Kubernetes 如何在 AI 时代具备更强的资源管理与调度能力。**

## 社区动态与后续内容

大会期间，HAMi 社区也会持续整理和发布相关内容，包括技术分享要点、现场展示以及对 AI 基础设施趋势的观察。

欢迎关注：

- [HAMi GitHub 仓库](https://github.com/project-hami/hami)
- [HAMi 社区官网](https://project-hami.io)

如果你也会在阿姆斯特丹，欢迎来 Project Pavilion 找到我们。

`📍 HAMi Booth：P-13B`
