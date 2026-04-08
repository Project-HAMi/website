---
title: "KubeCon EU 2026 回顾：HAMi 从展台到主论坛 Keynote Demo"
date: "2026-03-31"
description: "KubeCon EU 2026 已于阿姆斯特丹落幕。本届大会释放出明确信号：云原生正在从应用运行平台演进为 AI 基础设施底座。HAMi 作为 CNCF Sandbox 项目，在 Maintainer Summit、技术分享、Project Pavilion 及主论坛 Keynote Demo 中完成了一次标志性亮相。"
tags: ["KubeCon", "GPU", "Kubernetes", "AI"]
authors: [hami_community]
---

刚刚结束的 **KubeCon + CloudNativeCon Europe 2026**，释放出一个越来越明确的行业信号：

**云原生正在快速从“应用运行平台”演进为 AI 基础设施的运行底座。**

在阿姆斯特丹，围绕 Kubernetes、GPU、推理服务、Agentic AI 和异构算力调度的讨论，已经不再停留在概念层面，而是进入到更具体的工程实践、社区协作与基础设施范式演进阶段。

<!-- truncate -->

作为 CNCF Sandbox 项目，HAMi 在本届大会上完成了从 Maintainer Summit、Lightning Talk、Project Pavilion 到主论坛 Keynote Demo 的一系列亮相。

![李孟轩和 Reza Jelveh 在 KubeCon Keynote Live Demo](/img/kubecon-eu-2026-recap/keynote-live-demo.jpg)

## Kubernetes 正在进入 AI Infra 阶段

如果说过去 Kubernetes 主要解决的是容器编排、微服务治理和云原生应用交付，那么在这届 KubeCon 上，更受关注的问题已经变成了：

- AI workload 如何更高效地运行在 Kubernetes 上？
- GPU 如何被共享、切分、调度和隔离？
- LLM serving 与底层资源管理如何协同？
- 异构算力如何被统一纳入云原生调度体系？

这些问题背后对应的是一个更本质的变化：

> **Kubernetes 正在从"编排应用"走向"编排算力"。**

这也正是 HAMi 所处的位置。

## Maintainer Summit：GPU 调度进入更核心的社区讨论

在大会前的 **Maintainer Summit** 上，HAMi Maintainer 李孟轩分享了 HAMi 对 AI 工作负载的见解。

![HAMi Maintainer 李孟轩在 Maintainer Summit 上分享 AI Workloads 洞察](/img/kubecon-eu-2026-recap/cto-maintainer-summit.png)

随后团队参与了 CNCF 闭门会议，与 CNCF TOC 主席 Karena Angell、Red Hat 以及 vLLM 社区成员 Brian Stevens、Robert Shaw 等进行了深入交流。

![与 CNCF TOC、Red Hat、vLLM 社区分享交流 GPU Sharing](/img/kubecon-eu-2026-recap/cncf-toc-redhat-vllm.png)

这次讨论很有代表性，因为它并不停留在"某个项目怎么做功能"，而是在讨论一个更大的问题：

> **当 LLM serving、GPU 资源管理和 Kubernetes 在真实生产环境中开始汇合时，基础设施层需要什么样的新抽象？**

现场交流中，HAMi 所推动的方向引起了明显关注。大家越来越意识到，GPU 已经不能只被看作一个简单设备，而正在变成一种可以被调度、共享、治理的基础设施资源层。

这也是为什么 HAMi 与 vLLM 等项目之间的协同开始变得越来越自然。在本次活动中，双方已经开始探讨后续的联合内容合作与技术交流，这也说明 AI Infra 生态正在加速从"单点项目"走向"组合式协作"。

另外 HAMi 项目也正在申请 CNCF 孵化，在 TAG workshop 中作为代表项目参与了讨论。

![TAG Workshop 讨论 CNCF 的项目治理](/img/kubecon-eu-2026-recap/tag-workshop.jpg)

<!-- truncate -->

## 两场技术分享：从社区问题到工程实现

### 张潇：K8s Issue #52757 — Sharing GPUs Among Multiple Containers

这个问题（[#52757](https://github.com/kubernetes/kubernetes/issues/52757)）并不是一个新问题，而是在 Kubernetes 社区中存在多年的"未被彻底解决的问题"。

随着 AI workload 的爆发，这个问题被重新放大：

- 推理服务需要更细粒度的 GPU 使用方式
- 多租户环境要求资源共享
- AI workload 的形态决定了 GPU 不再适合独占

这也是为什么，这个看似底层的问题，开始成为 AI 基础设施的核心问题之一。

![张潇在 KubeCon 的 Cloud Native AI 论坛上分享 HAMi](/img/kubecon-eu-2026-recap/zhangxiao-gpu-sharing.png)

HAMi Maintainer 张潇的分享从 Kubernetes 社区长期存在的一个经典问题出发：**多个容器如何共享 GPU？**

这个问题看似具体，但实际上指向的是整个 AI 基础设施生态共同面临的难题。因为一旦进入推理、批处理、在线服务和多租户混合场景，GPU 就不再适合以"整卡独占"的方式被简单分配。

这场分享的重要性，在于它把 HAMi 所解决的问题放回到了 Kubernetes 社区的原始语境中：不是另起炉灶做一个孤立方案，而是在回应一个长期存在、尚未被彻底解决的 upstream 问题。

### 李孟轩：Dynamic, Smart, Stable GPU-Sharing Middleware in Kubernetes

HAMi Maintainer 李孟轩的分享聚焦 HAMi 的核心架构与能力，系统介绍了：

- GPU 虚拟化
- GPU 共享与调度机制
- 稳定性与生产可用性设计
- 在 Kubernetes 中实现 AI workload 资源管理的思路

![李孟轩在 KubeCon 上分享 HAMi](/img/kubecon-eu-2026-recap/limengxuan-hami-talk.png)

这并不只是介绍一个项目功能，而是在回答一个更实际的问题：

> **在 Kubernetes 尚未原生解决 GPU 共享问题的前提下，企业如何真正把 AI workload 跑起来，并跑得更稳、更高效？**

## Project Pavilion：面对面的全球社区交流

除了议题分享，HAMi 还在 KubeCon EU 2026 的 **Project Pavilion** 设有展台。

![前往 HAMi 展台交流的人络绎不绝](/img/kubecon-eu-2026-recap/booth-crowd.jpg)

在这几天里，展台成为了非常密集的交流现场。前来交流的人群覆盖了：

- 海外开发者与贡献者
- 企业用户与平台团队
- 高校、研究机构人员
- 云厂商及 GPU 生态相关从业者
- 对 AI infra、异构算力和 Kubernetes GPU 调度感兴趣的社区成员

在现场我们也结交了更多社区贡献者，包括来自印度的贡献者 Rudraksh Karpe 和 Shivay Lamba。

![来自印度的贡献者 Rudraksh Karpe（中间）和 Shivay Lamba（右）](/img/kubecon-eu-2026-recap/indian-contributors.png)

在 Poster Session 中社区贡献者制作了 Kubernetes as the universal GPU control plane 的示意图。

![Kubernetes as the universal GPU control plane](/img/kubecon-eu-2026-recap/k8s-gpu-control-plane.jpg)

这类交流的价值，不只是"增加曝光"，而是帮助验证一件事：

> **GPU 调度、资源共享和异构算力管理，已经成为全球范围内的真实需求，而不是某个局部市场的特殊问题。**

## Keynote Demo：HAMi 登上 KubeCon 主论坛舞台

![KubeCon Keynote — Linux Foundation CEO Jonathan 和 CNCF CTO Chris 联合主持](/img/kubecon-eu-2026-recap/keynote-hosts.png)

如果说演讲和展台代表的是"专业圈层中的认可"，那么这次 KubeCon 最具标志性的时刻，无疑是：

> **HAMi 作为中国开源项目登上了 KubeCon EU 2026 的主论坛 Keynote，并完成了现场 Demo 展示。**

这是本次大会最关键、也最值得被强调的一环。

在主论坛环节中，HAMi Maintainer **李孟轩** 与 **Reza Jelveh** 进行了现场 Demo，展示了基于 Kubernetes 的多 workload GPU 调度场景。

![李孟轩和 Reza 现场 Demo](/img/kubecon-eu-2026-recap/limengxuan-reza-demo.jpg)

Demo 以两个典型 AI workload 为例：一类是 YOLO 推理服务，另一类是 Qwen3-8B 大模型推理任务。在传统 Kubernetes 调度模型中，这两类任务通常需要独占 GPU 运行，而在 HAMi 的调度模型下，GPU 被拆分为"算力 + 显存"的资源单元，可以被多个 Pod 按需共享。

在实际演示中，多个 YOLO 实例被调度到同一张 GPU 上运行，而 Qwen3-8B 模型则通过 binpack 策略与其他 workload 共同部署在同一 GPU 上。不同类型的 AI workload 在同一 GPU 上共存，同时保持资源隔离与调度可控。

这个 Demo 所呈现的，并不仅仅是 GPU 利用率的提升，更重要的是一个新的基础设施能力：GPU 从"设备"转变为"可调度资源"，而 Kubernetes 正在具备管理 AI workload 的基础能力。

### 为什么这件事有意义？

**第一，AI 基础设施议题已经进入 KubeCon 的主叙事。**

过去 KubeCon 主论坛更多聚焦 Kubernetes 本身和基础平台能力。而这次，HAMi 这样的 GPU 资源管理项目能够进入主论坛 demo，说明 **AI workload 如何运行在 Kubernetes 上，已经成为云原生社区必须正面回答的问题。**

**第二，GPU 调度不再只是"边缘话题"。**

GPU 共享、虚拟化、资源隔离、异构调度这些问题，过去往往更多存在于专业小圈子中。但现在，它们已经从"专门领域问题"变成"基础设施共同问题"。在 TOC 讨论和社区交流中，多个项目（包括 vLLM 相关实践）已经开始直接依赖底层 GPU 调度能力。

**第三，这是 HAMi 社区共同积累的结果。**

一个开源项目能够走到 KubeCon 主舞台，不会只是因为"有个功能能演示"。它背后是技术方向与行业趋势对齐、社区价值被看见、项目在生态中的位置变得更清晰。

这次 keynote demo 也是一次定位确认：

> **HAMi 正在从 GPU sharing 工具，走向 Kubernetes 上 AI 算力资源层的重要组成部分。**

### AI Native Summit

在 KubeCon 大会后还举办了同场活动 AI Native Summit。

与 KubeCon 主会场相比，AI Native Summit 的讨论更加直接聚焦在一个问题上：**AI workload 的运行效率，正在成为新的基础设施瓶颈。**

在这个语境下，GPU virtualization 和调度问题，不再是 Kubernetes 内部优化，而是直接影响模型服务成本、响应时间和系统吞吐能力的关键因素。

Reza Jelveh 分享了《HAMi: Heterogeneous GPU Virtualization and Scheduling for AI-Native Infrastructure on Kubernetes》。

![Reza 在 AI Native Summit 上分享 HAMi](/img/kubecon-eu-2026-recap/reza-ai-native-summit.png)

Reza 还参与了主题为《AI Native Technology》的圆桌讨论。

![Reza 参与 AI Native Technology 圆桌讨论](/img/kubecon-eu-2026-recap/reza-panel-discussion.png)

本次 AI Native Summit 汇聚了来自云原生、AI 基础设施及电信行业的技术专家，围绕 AI 原生架构的演进展开深入探讨。会议重点关注在大模型和 Agent 驱动背景下，基础设施如何从传统的服务化、请求响应模式，演进为面向推理、会话和自治决策的新一代平台体系，涵盖 AI 网关、推理调度、多模型路由以及多租户隔离等关键议题。

## 一个值得注意的细节：HAMi 进入更大的云原生语境

除了现场 demo 和分享之外，这次大会还有一个很重要的外部信号：在主舞台分享中，HAMi 也被作为 **Cloud Native Landscape 扩展背景下的代表性案例** 被提及。

![HAMi 作为 Cloud Native Landscape 的扩展项目在 Keynote 中被重点提及](/img/kubecon-eu-2026-recap/landscape-mention.jpg)

这说明 HAMi 的意义已经不只是"某个项目在做 GPU 调度"，而是在更大的云原生演进语境里，被看作新一代基础设施问题的代表。

云原生社区正在意识到：

- 过去那套围绕 CPU / 内存 / 网络 / 存储构建的资源模型还不够
- AI 时代需要新的资源抽象
- GPU、推理、异构设备与工作负载治理，正在成为下一阶段的重要基础设施议题

而 HAMi 正是在这个转折点上，提供了一种清晰、务实、可落地的工程路径。

## 本次参会的核心收获

回看这次 KubeCon，有几件事值得社区关注：

### 1. 全球社区对 AI Infra 的关注正在快速升温

大家已经不再满足于讨论模型和应用本身，而是在追问：

- 底层怎么跑？
- 资源怎么调？
- 效率怎么提升？
- 系统怎么稳定？

### 2. Kubernetes 与 AI 的结合正在进入深水区

现在的问题已经不再是"能不能跑"，而是：能不能高效地跑、能不能大规模地跑、能不能在生产环境稳定地跑。

### 3. HAMi 的定位越来越明确

HAMi 不再只是"做 GPU 共享的一个项目"，而是在逐步形成自己的独特定位：

> **面向 Kubernetes 的 GPU 资源层与异构算力调度能力。**

## 结语

KubeCon EU 2026 让我们更加确信：**云原生不会被 AI 替代，反而会因为 AI 被重新定义。**

从展台交流，到议题分享，再到主论坛 demo，HAMi 在这次大会上的亮相，更像是一个信号：

> **围绕 GPU、推理与异构算力的云原生基础设施，正在进入新的阶段。**

如果你同样关注 AI 基础设施、GPU 虚拟化以及 Kubernetes 在 AI 时代的演进，欢迎加入 HAMi 社区，与我们一起推动这一领域的下一步发展。

![HAMi 社区成员与贡献者在 KubeCon 会场合影](/img/kubecon-eu-2026-recap/team-photo.jpg)
