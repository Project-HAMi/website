---
title: "LFX Mentorship 2026 Term 3 开放申请：HAMi 四大开源课题等你挑战"
date: "2026-08-03"
description: "HAMi 参与 Linux Foundation LFX Mentorship 2026 第三期（9 月至 11 月），mentee 申请于 8 月 3 日至 8 月 18 日开放。一文了解四大课题、导师团队、时间线与申请流程。"
authors: [hami_community]
tags: ["LFX", "Mentorship", "CNCF", "社区"]
---

Linux Foundation **LFX Mentorship Program** 2026 第三期（Term 3）正式启动，**HAMi** 将在 9 月至 11 月期间指导四个开源课题。

mentee 申请通道于 **2026 年 8 月 3 日**开启，**8 月 18 日**截止。无论你钟情底层 C/C++ 性能优化、GPU 可观测性、容器隔离安全，还是开发者教育与文档，都能找到适合你的方向。

<!-- truncate -->

## 什么是 LFX Mentorship Program？

LFX Mentorship 是 Linux Foundation 主办的开源导师计划。在为期三个月的周期里，入选的贡献者将与开源项目的维护者（maintainer）一对一协作，完成一个明确的项目。入选的 mentee 可获得由 LFX Mentorship Program 发放的津贴（性质为教育资助，金额核定与发放均由主办方负责，HAMi 社区不承担津贴支付，详见下文 FAQ），并积累真实的生产级经验，在 CNCF 社区留下公开的贡献记录。

HAMi 在本期（Term 3）提供的每个课题大约对应 **350 小时**的工作量，分布在约 12 周的指导期内。

## 为什么选择 HAMi？

HAMi 是 CNCF 孵化（Incubating）项目，也是 Kubernetes 的异构算力虚拟化与调度中间件。它不改驱动、不改应用，通过 CUDA API 劫持（HAMi-Core，即注入容器内的 `libvgpu.so`）在软件层实现 GPU 虚拟化，精细切分 GPU 的显存与算力，让多个工作负载安全共享同一张加速卡。目前已被数百家组织在十多种加速卡上投入生产使用，与 Kubernetes 默认调度器、Volcano、Kueue、Koordinator 以及 NVIDIA KAI Scheduler 完成集成，并由全球近 500 位贡献者共同建设。

加入 HAMi，意味着站在 AI 基础设施浪潮的中心做开源。

## 第三期（Term 3）四大课题

### 1. HAMi GPU 共享实战 Workshop 与文档

- 上游 Issue：[Project-HAMi/website#656](https://github.com/Project-HAMi/website/issues/656)
- LFX 申请页：[HAMi GPU Sharing Workshop and Documentation](https://mentorship.lfx.linuxfoundation.org/project/ab5693b7-9759-48e2-b609-f48af6b82206)
- 技术栈：Kubernetes、HAMi、Markdown、Docusaurus
- 技能要求：技术写作、文档可复现性测试、故障排查、GitHub 工作流
- 导师：Reza Jelveh（[@fishman](https://github.com/fishman)）、宋净超（Jimmy Song）（[@rootsongjc](https://github.com/rootsongjc)）

本项目旨在产出可复现的动手实验（hands-on labs），帮助用户与新贡献者部署 HAMi、理解 GPU 共享，并排查安装、调度与分配中的常见问题。预期成果包括：HAMi GPU 共享实战实验、vLLM/Ray/SGLang 等 AI 推理工作负载示例、常见问题排查指南、带验证步骤的测试用 manifest，以及至少一个面向 HAMi 网站（或导师认可的 HAMi 仓库）的贡献。

### 2. 修复子进程与 SSH 进程的 GPU 显存隔离

- 上游 Issue：[Project-HAMi/HAMi#2125](https://github.com/Project-HAMi/HAMi/issues/2125)
- LFX 申请页：[Fix GPU Memory Isolation for Child and SSH Processes](https://mentorship.lfx.linuxfoundation.org/project/e5e55e8c-fab1-4453-9d49-a4a5e013c4c5)
- 技术栈：Kubernetes、Linux 容器、NVIDIA GPU、HAMi-core
- 技能要求：Linux 调试、容器运行时分析、安全推理、C/C++、测试
- 导师：李孟轩（Mengxuan Li）（[@archlitchi](https://github.com/archlitchi)）、宋净超（Jimmy Song）（[@rootsongjc](https://github.com/rootsongjc)）

在 HAMi 管理的容器中，后启动的进程（包括子进程，以及通过 SSH 或新登录 shell 启动的进程）可能无法保持预期的显存上限。本课题将定位并修复这一隔离边界问题。预期成果包括：可复现的测试用例与根因分析、经维护者评审的隔离设计（覆盖隔离边界、兼容性与失败模式）、维护者认可的实现（或在平台受限时经过验证的设计或原型）、覆盖原始进程、子进程、SSH 与新 shell 场景的回归测试，以及配置说明与迁移文档。

### 3. 降低 HAMi-core 初始化的锁竞争

- 上游 Issue：[Project-HAMi/HAMi#1662](https://github.com/Project-HAMi/HAMi/issues/1662)
- LFX 申请页：[Reduce HAMi-core Initialization Lock Contention](https://mentorship.lfx.linuxfoundation.org/project/ce2ebae3-6936-409d-a9d7-c98b109ec814)
- 技术栈：C/C++、Linux、CUDA、NVML、HAMi-core
- 技能要求：Linux 并发、性能剖析、基准测试（benchmarking）、同步设计、测试
- 导师：李孟轩（Mengxuan Li）（[@archlitchi](https://github.com/archlitchi)）、杨守仁（Shouren Yang）（[@Shouren](https://github.com/Shouren)）

当数百个进程并发初始化 CUDA 并争用同一把共享统一锁时，HAMi-core 的启动性能会明显下降。本课题要在保证正确性的前提下，降低初始化延迟与锁竞争。预期成果包括：并发初始化的可复现基准、经维护者认可的加锁设计、带并发与回归测试的实现、启动延迟、吞吐与资源占用的性能测量，以及设计与运维影响文档。

### 4. HAMi GPU 可观测性：指标与仪表盘

- 上游 Issue：[Project-HAMi/HAMi#2126](https://github.com/Project-HAMi/HAMi/issues/2126)
- LFX 申请页：[HAMi GPU Observability: Metrics and Dashboards](https://mentorship.lfx.linuxfoundation.org/project/dd302799-03ec-4184-b289-4d59a41fe7ed)
- 技术栈：Prometheus、Grafana、OpenTelemetry、Kubernetes、Go、HAMi
- 技能要求：指标埋点、PromQL、仪表盘设计、可观测性、Kubernetes 调试、HAMi 内部原理
- 导师：Mesut Oezdil（[@mesutoezdil](https://github.com/mesutoezdil)）、Reza Jelveh（[@fishman](https://github.com/fishman)）、宋净超（Jimmy Song）（[@rootsongjc](https://github.com/rootsongjc)）

本课题面向运维共享 GPU 工作负载的同学，目标是让 HAMi 的可观测性更实用、更一致、文档更完善。重点在实用的指标与仪表盘，同时把链路追踪（tracing）限定在一条导师认可的控制面链路的设计与概念验证上。预期成果包括：现有指标、导出器、标签、仪表盘与文档的差距分析、经维护者评审的 Prometheus 指标与标签改进、一个带版本管理的 Grafana 仪表盘、指标语义与单位及示例 PromQL 文档、一条选定工作流的 OpenTelemetry 链路设计与小范围 POC、基于交付遥测数据的告警或 SLO 指南，以及至少一个涉及指标、仪表盘、测试或文档的合并贡献。

## 导师团队

四个课题由 HAMi 的五位维护者共同指导：

- **李孟轩（Mengxuan Li）**（[@archlitchi](https://github.com/archlitchi)）
- **宋净超（Jimmy Song）**（[@rootsongjc](https://github.com/rootsongjc)）
- **杨守仁（Shouren Yang）**（[@Shouren](https://github.com/Shouren)）
- **Mesut Oezdil**（[@mesutoezdil](https://github.com/mesutoezdil)）
- **Reza Jelveh**（[@fishman](https://github.com/fishman)）

每个课题至少配备一位技术导师与一位社区导师，分别负责架构与代码评审，以及 onboarding 与 CNCF 工作流指导。

## 时间线

| 阶段               | 时间                                 |
| ------------------ | ------------------------------------ |
| 课题征集（已完成） | 2026 年 7 月 1 日 至 7 月 28 日      |
| **mentee 申请**    | **2026 年 8 月 3 日 至 8 月 18 日**  |
| 申请评审           | 2026 年 8 月 19 日 至 9 月 1 日      |
| **导师指导期**     | **2026 年 9 月 7 日 至 11 月 27 日** |

约 12 周的指导期大致分为三个阶段：

- **第 1 个月（9 月）：onboarding。** 理解 HAMi 架构与社区流程，搭建本地环境，提交第一个 issue 并争取尽快合并。
- **第 2 个月（10 月）：主开发。** 推进核心实现，参与社区讨论，在社区会议或 Slack 上同步进展。
- **第 3 个月（11 月）：交付。** 完成交付物，补充文档，向社区做最终成果展示。

## 如何申请

申请通过 LFX 平台完成。需要准备的材料（具体以各课题 LFX 申请页为准）：

1. 简历（Resume）
2. 求职信（Cover Letter）
3. 在读证明或同等材料（School Enrollment Verification）
4. 学校或雇主的参与许可（Participation Permission）
5. 编程挑战（Coding Challenge）
6. 课题特定的自定义前置任务（需提交文件）

建议步骤：

1. 在 [LFX Mentorship 平台](https://mentorship.lfx.linuxfoundation.org/) 注册账号。
2. 浏览上方四个课题，选择最匹配你技能与兴趣的一个，进入对应的 LFX 申请页。
3. 在申请截止（**8 月 18 日**）前提交全部材料并完成 coding challenge。
4. 等待评审结果（**8 月 19 日 至 9 月 1 日**）。

## 常见问题

**我可以同时申请多个课题吗？** 建议聚焦你最感兴趣、最匹配的一个，把精力投入到高质量的申请材料上。

**不是在校学生可以申请吗？** 可以。LFX 面向广泛的贡献者，但需要提供在读证明或雇主的参与许可，具体以平台要求为准。

**津贴是多少？按 PPP 计算。** 津贴由 LFX Mentorship Program（Linux Foundation 主办，Linux Foundation、Intel 等提供资金支持）发放，性质为教育资助（educational grant），并非工资报酬。金额按购买力平价（PPP）计算，范围为 1,000 至 6,600 美元，具体取决于 mentee 所在的国家或地区，分两期在中期评估（10 月 21 日）与最终评估（11 月 25 日）之后发放。津贴的核定与发放均由主办方负责，HAMi 社区不承担津贴支付，具体规则以 [Linux Foundation 官方说明](https://www.linuxfoundation.org/blog/strengthening-lfx-mentoring-a-fairer-stipend-model-and-a-shared-standard-of-excellence) 为准。

**我没有 HAMi 贡献经验，可以申请吗？** 可以。提前在 [HAMi GitHub](https://github.com/Project-HAMi/HAMi) 熟悉代码、尝试解决一个 good-first-issue，会让你的申请更有竞争力。

## 立即开始

申请截止日期是 **2026 年 8 月 18 日**，时间紧迫。现在就去选择你的课题：

- 四个课题的 LFX 申请页见上文各章节
- HAMi 代码仓库：[Project-HAMi/HAMi](https://github.com/Project-HAMi/HAMi)
- 加入 HAMi Discord：[discord.gg/Amhy7XmbNq](https://discord.gg/Amhy7XmbNq)
- 更多社区入口：[HAMi 社区](/community)

期待在 Term 3 与你一起做开源。
