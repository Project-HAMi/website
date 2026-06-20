---
title: "HAMi v2.9.0 发布：昇腾用户态切分、DRA 正式可用与调度生态扩展"
date: "2026-05-11"
description: "HAMi v2.9.0 正式发布。这是一个在异构设备虚拟化深度、调度器生态扩展与 Kubernetes 原生标准落地层面具有里程碑意义的版本，引入了昇腾 910C HAMi-core 模式、HAMi-DRA 正式可用、Volcano vGPU 升级至 v0.19 等重磅特性。"
tags: ["Release", "GPU", "Kubernetes", "DRA"]
authors: [hami_community]
---

HAMi 社区正式发布 HAMi v2.9.0。这是一个在异构设备虚拟化深度、调度器生态扩展与 Kubernetes 原生标准落地层面具有里程碑意义的版本。

v2.9.0 引入了昇腾 910C HAMi-core 模式、HAMi-DRA 正式可用、项目发布以及 Volcano vGPU 升级至 v0.19 等重磅特性，同时在可观测性、安全性、稳定性等方面进行了系统性增强，共有 19 位新贡献者首次参与。

本文将对 v2.9.0 的主要更新进行详细说明。

<!-- truncate -->

## 核心特性与能力更新

本节介绍 HAMi v2.9.0 的核心特性与能力更新，涵盖异构设备虚拟化、DRA 标准接口、调度器生态和上游组件对齐等方面。

### 昇腾 910C HAMi-core 虚拟化模式

HAMi v2.9.0 为华为昇腾（Ascend）设备引入了 HAMi-core 模式，实现了用户态虚拟化拦截，无需修改业务代码即可获得显存与算力的细粒度共享能力。

HAMi-core 通过纯软件方式在用户态拦截和管控 ACL（Ascend Computing Language）调用，实现了**显存 MB 级别、算力百分比级别**的细粒度切分。同一张昇腾 910C 可以同时服务多个不同规格的推理或训练任务，无需修改业务代码，也无需特定硬件支持。

相比传统的 SR-IOV 硬件切分方案，HAMi-core 在切分粒度和灵活性上有质的飞跃：

| 维度                 | 独占模式 | SR-IOV         | HAMi-core（v2.9）      |
| :------------------- | :------- | :------------- | :--------------------- |
| 显存切分             | 不可切分 | 按 VF 固定分配 | **MB 级别精确控制**    |
| 算力切分             | 不可切分 | 按 VF 比例分配 | **百分比级别灵活配置** |
| 切分数量             | 1 Pod/卡 | 通常 2-4 VF/卡 | **10+ Pod/卡**         |
| 是否需要硬件支持     | 否       | 是             | **否**                 |
| 是否需要修改业务代码 | 否       | 否             | **否**                 |

例如，一张 64GB 显存的昇腾 910C，可以按如下方式同时分配给多个任务：

```yaml
# 任务 1：大模型推理，32GB 显存 + 50% 算力
resources:
  limits:
    hami.io/vnpu-core: "50"
    hami.io/vnpu-core-memory: "32768"

# 任务 2：模型微调，16GB 显存 + 30% 算力
resources:
  limits:
    hami.io/vnpu-core: "30"
    hami.io/vnpu-core-memory: "16384"

# 任务 3：轻量推理，8GB 显存 + 20% 算力
resources:
  limits:
    hami.io/vnpu-core: "20"
    hami.io/vnpu-core-memory: "8192"
```

核心能力包括：

- **Ascend 910C 超节点支持**：针对 SuperPod 环境实现了 module-pair 级别的资源分配，充分发挥超节点在分布式训练中的硬件优势
- **vNPU-Core 虚拟化**：新增 `hami-vnpu-core` 资源类型，支持基于注解的节点过滤与多设备请求，实现更灵活的算力切分策略
- **用户态拦截**：以不侵入业务容器的方式实现显存与算力的软切分，显著提升单卡承载任务数

用户在部署 HAMi 时，将 values 中 `ascend.hamiVnpuCore` 设置成 true 即可开启本特性。也可以在 `ascend-device-plugin` 的节点配置中开启。支持一个集群中某些节点开启，某些节点关闭。

需要注意的是，在 2.9 版本，用户 Pod 需要在注解中显式地声明 `huawei.com/vnpu-mode: 'hami-core'` 才能使用本特性。未被声明的 Pod 仍然会使用上个版本的按照模版的 vNPU 切分方式，若无可用节点，则会导致任务 pending。

> 该特性已在招商银行生产环境中得到验证。招商银行基于 HAMi-vNPU-Core 软切分方案，实现了昇腾 910C 算力资源 100% 入池与大模型高性能通信，显著提升了国产算力资源利用率。

感谢华为云加拿大实验室和招商银行 [@ashergaga](https://github.com/ashergaga) 对本功能的贡献。

本版本同时更新了 [HAMi-core 性能基准测试数据](/docs/userguide/benchmark)，详细的 benchmark 流程请参考[项目文档](https://github.com/Project-HAMi/HAMi/tree/master/benchmarks)。

### HAMi-DRA 解决方案：轻量版 HAMi

HAMi v2.9.0 中，HAMi-DRA 正式达到可用状态，已升级至 v0.2.0。HAMi-DRA 是基于 Kubernetes Dynamic Resource Assignment（DRA）标准的独立实现项目，定位为"轻量版 HAMi"。

DRA 可以作为 HAMi 与其它调度器的标准连接方案，可以在 volcano、kai-scheduler 等自定义调度器上即插即用，不再需要进行代码层面的改动。

DRA 是 Kubernetes 社区正在推进的下一代设备资源声明与分配机制。HAMi-DRA 的核心理念是：

- **不改变用户习惯**：继续使用 Device Plugin 语法，底层自动转换为 DRA 资源模型
- **内部消化复杂性**：Webhook、Driver、生命周期管理全部由系统处理
- **通过社区协作推动演进**：来自不同公司的贡献者在真实生产环境中验证方案

当前 HAMi-DRA 已实现面向 NVIDIA / Ascend / Enflame 三大平台的方案落地。通过原生 Kubernetes 能力简化调度链路，统一调度层屏蔽底层硬件差异，实现异构算力统一管理。

> HAMi-DRA 项目地址：[https://github.com/Project-HAMi/HAMi-DRA](https://github.com/Project-HAMi/HAMi-DRA)

### Volcano vGPU 版本升级至 v0.19 并支持 CDI

HAMi v2.9.0 将关联的 Volcano vGPU Device Plugin 同步升级至 v0.19 版本，保持与 Volcano 上游的一致性。同时新增对 Container Device Interface（CDI）模式的支持。

CDI 支持带来的优势：

- 使用更标准的设备注入方式，降低设备管理与容器运行时之间的耦合度
- 提供更清晰的设备声明与生命周期管理
- 修复了 MIG 在 CDI 模式下的分配问题，进一步提升 NVIDIA GPU 的灵活切分能力

Volcano vGPU Device Plugin 项目地址：[https://github.com/Project-HAMi/volcano-vgpu-device-plugin](https://github.com/Project-HAMi/volcano-vgpu-device-plugin)

### 新增 Vastai（瀚博半导体）设备支持

瀚博半导体（Vastai Technologies）是国内领先的通用 GPU 芯片设计企业。v2.9.0 新增对其设备的管理支持，提供两种分配模式：

| 模式 | 说明 | 适用场景 |
| :-- | :-- | :-- |
| **整卡模式（Full-Card）** | 每个 Pod 独占一整张 GPU | 大模型训练、性能敏感型推理 |
| **Die 模式** | 按芯片 Die 切分，调度器感知 AIC 拓扑结构，减少跨 Die 通信开销 | 多任务共享、资源利用率优化 |

使用示例：

```yaml
# 节点需要先打标签：kubectl label node <node-name> vastai=on
# values.yaml 中配置：
# vastai:
#   enabled: true
#   customresources:
#     - vastaitech.com/va

# 整卡模式
resources:
  limits:
    vastaitech.com/va: "1"

# Die 模式（带设备选择注解）
# annotations:
#   vastaitech.com/use-va: "0"
#   vastaitech.com/nouse-va: "1"
```

Vastai 设备支持的加入，使 HAMi 已覆盖 **NVIDIA、华为昇腾、寒武纪、海光 DCU、壁仞、燧原、沐曦、昆仑芯、AMD、Iluvatar、Enflame、AWS Neuron、瀚博半导体** 等十余种异构算力设备，是目前 Kubernetes 生态中覆盖最广泛的异构设备虚拟化与调度项目之一。

## 可观测性与安全增强

### 可观测性增强

v2.9.0 在可观测性方面进行了多项改进：

- vGPUmonitor 新增 `--metrics-bind-address` 参数，支持自定义指标暴露地址
- Helm Chart 中新增 Prometheus ServiceMonitor，覆盖调度器和设备插件
- Prometheus 指标与标签命名对齐社区最佳实践
- 新增设备类型标签（device type label）在指标中的支持
- 优化日志级别控制，新增相关单元测试

### 安全与稳定性改进

安全与稳定性方面的重要改进包括：

- Scheduler 路由新增 `io.LimitReader` 防止 DoS 攻击（[#554](https://github.com/Project-HAMi/HAMi/issues/554)）
- Go 语言升级至 1.26.2，修复已知安全问题
- NodeLock 优化为指数退避策略，提升大规模集群下的可扩展性
- 修复 Leader 选举中的空指针问题，增强高可用部署的稳定性
- 修复调度器评分中的除零错误
- 修复多容器 Pod（含 init 容器）的设备分配问题
- 修复 Linux 内核 6.17 在 NVIDIA 健康检查中的握手边界问题
- 修复全局镜像标签覆盖组件级镜像标签的问题
- 修复设备过滤不生效的问题
- 修复 Device Plugin 与 Scheduler 注解不一致的问题
- 修复 stale Deleted handshake 导致节点调度中断的问题

## 更多重要更新

- **Webhook 资源配额检查**：在 Pod 提交阶段校验 GPU 资源请求是否超出配额限制，避免调度失败后再回退
- **HAMi-skills 调试工具**：新增 k8s-debug-gpu-pod skill 和 vGPU metrics summarizer skill，辅助 GPU 问题排查与运维
- **vLLM 兼容性修复**：修复了 vLLM > 0.18 中使用 tensor parallelism 时的初始化错误
- **local-deploy 支持**：新增 local-deploy target，支持快速部署到 minikube/kind 集群进行开发调试

## 社区与生态进展

### DRA 生态联盟

DRA 正在成为 Kubernetes 新一代设备管理模型，但在厂商侧存在实现不确定性，在用户侧也面临较高的使用门槛。为此，HAMi 社区在第三届 HAMi Meetup 深圳站上宣布发起 DRA 生态联盟。

DRA 生态联盟的目标：

- 连接设备厂商与用户，推动 DRA 在真实场景中的落地
- 推动 DRA 标准化演进，降低异构设备接入的工程成本
- 统一调度层屏蔽底层硬件差异，实现异构算力统一管理

### 第三届 HAMi Meetup 深圳站

4 月 25 日，HAMi 社区在深圳成功举办[第三届线下 Meetup](/blog/hami-meetup-shenzhen-2026)。来自 CNCF、顺丰科技、招商银行、燧原科技、深信服、博维智慧科技及密瓜智能的七位技术专家，围绕 AI 基础设施云原生演进、GPU 算力池化、异构调度、DRA 技术展望等前沿话题展开深度分享。

其中，顺丰科技分享了集群平均 GPU 利用率从 40% 提升至 90% 的实战经验；招商银行展示了基于 HAMi 的异构 AI 算力调度优化实践，将跨机调度概率降低 30%。

### 新贡献者

v2.9.0 版本共有 19 位新贡献者首次参与 HAMi 项目，他们来自不同国家和组织：

[@maishivamhoo123](https://github.com/maishivamhoo123)、[@hoteye](https://github.com/hoteye)、[@jsl9208](https://github.com/jsl9208)、[@ashergaga](https://github.com/ashergaga)、[@Atroxgod](https://github.com/Atroxgod)、[@MyoungHaSong](https://github.com/MyoungHaSong)、[@charford](https://github.com/charford)、[@jcustenborder](https://github.com/jcustenborder)、[@Nov11](https://github.com/Nov11)、[@ilia-medvedev](https://github.com/ilia-medvedev)、[@Yonsun-w](https://github.com/Yonsun-w)、[@CFH2436](https://github.com/CFH2436)、[@kenwoodjw](https://github.com/kenwoodjw)、[@anandj91](https://github.com/anandj91)、[@ManishSharma1609](https://github.com/ManishSharma1609)、[@maverick123123](https://github.com/maverick123123)、[@almazkhalikov](https://github.com/almazkhalikov)、[@lin121291](https://github.com/lin121291)、[@mesutoezdil](https://github.com/mesutoezdil)

感谢每一位贡献者的付出！

## 升级指南

通过 Helm 升级至 v2.9.0：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
helm upgrade hami hami-charts/hami -n hami-system
```

完整安装文档请参考：[https://project-hami.io/zh/docs/installation/online-installation](https://project-hami.io/zh/docs/installation/online-installation)

:::warning[升级注意事项]

- 如使用 Volcano vGPU 模式，请注意 CDI 相关配置变更
- 如使用昇腾设备并希望启用 HAMi-core 模式，请参考最新文档中的 Ascend 配置章节
- 建议在升级前在测试环境验证兼容性

:::

## 社区动态

v2.9.0 发布周期内，HAMi 社区在技术布道、产品生态和用户实践等方面持续活跃，以下是值得关注的社区进展。

### 社区活动

- **KubeCon EU 2026**：HAMi 作为 CNCF Sandbox 项目亮相阿姆斯特丹，不仅设立了 Project Pavilion 展台，更登上主论坛 Keynote Demo 舞台，向全球开发者展示了 Kubernetes GPU 虚拟化的最新进展。[阅读回顾](/blog/kubecon-eu-2026-recap)
- **KCD Beijing 2026**：超过 1000 人报名参与，刷新历届 KCD 北京记录。HAMi 社区受邀分享"从 Device Plugin 到 DRA：GPU 调度范式升级与 HAMi-DRA 实践"。[阅读回顾](/blog/kcd-beijing-2026-dra-gpu-scheduling)
- **第三届 HAMi Meetup 深圳站**：来自 CNCF、顺丰科技、招商银行、燧原科技等七位专家围绕 AI 算力云原生未来展开深度分享。[阅读回顾](/blog/hami-meetup-shenzhen-2026)
- **HAMi WebUI 正式发布**：HAMi 社区推出开源 GPU 监控仪表盘 [HAMi WebUI](https://github.com/Project-HAMi/HAMi-WebUI) v1.1.0，将整个 GPU 集群呈现在单一可视化界面中，实现从 GPU 调度到可视化可观测性的完整闭环。[阅读博文](/blog/introducing-hami-webui)

### 官网与文档全面升级

v2.8.0 发布以来，HAMi 官网与文档经历了有史以来最大规模的重构。期间共有约 195 个 PR 合入 website 仓库，涵盖以下主要方向：

- **官网重构**：首页重新设计、架构图重绘、博客样式统一、移动端优化、Footer 增强，从外部搜索回归内建搜索
- **文档新增**：GPU 虚拟化原理页面、HAMi 快速入门指南、GPU 实时监控指南、升级与卸载指南、HAMi WebUI 用户与开发者指南、Vast.ai 设备文档
- **i18n 同步**：中英文档持续对齐，侧边栏标签本地化，公告栏多语言支持
- **社区内容**：新增 KubeCon EU 2026 回顾、KCD Beijing 2026 DRA 分享、HAMi WebUI 发布、Meetup 深圳站回顾等多篇博客；贝壳、蔚来、SNOW Corp.、博维智慧等采用者信息更新
- **质量治理**：全站文案去营销化、语法修正、代码块语言标注、格式标准化、贡献者指南与治理文档完善

感谢 [@mesutoezdil](https://github.com/mesutoezdil) 对 HAMi 官方文档优化做出的贡献。

官网地址：[https://project-hami.io](https://project-hami.io)

Website 仓库：[https://github.com/Project-HAMi/website](https://github.com/Project-HAMi/website)

### CNCF Case Study

越来越多的企业在生产环境中使用 HAMi 构建 GPU 虚拟化与异构算力调度能力。以下案例已发布在 CNCF 官网：

- **贝壳**：基于 Kubernetes + HAMi 构建 AIStudio 智算平台，GPU 利用率从 13% 提升至 37%（近 3 倍），支撑 10,000+ Pod 同时运行，日均处理千万级业务请求。[阅读全文](https://www.cncf.io/case-studies/ke-holdings-inc/)
- **蔚来**：在自动驾驶工作负载中采用 HAMi 混合 GPU 共享策略，CI 管道 GPU 利用率提升约 10 倍，仿真工作负载 GPU 时间减少约 30%，覆盖约 600 张 GPU 的生产集群。[阅读全文](https://www.cncf.io/case-studies/nio/)
- **SNOW Corp.**：韩国 NAVER 旗下 SNOW Corp. 管理 1000+ A100 GPU，通过 HAMi 实现 GPU 共享应对 700% 流量峰值，GPU 需求减半，预估节省 1740 万美元。[阅读全文](https://www.cncf.io/case-studies/snow-corp/)

## 总结

HAMi v2.9.0 是一次面向异构设备虚拟化深度、Kubernetes 原生标准落地与调度器生态扩展的重要版本更新。

在 GPU 虚拟化基础上，HAMi 正在向更广泛的异构算力统一管理与调度平台演进。通过引入昇腾 HAMi-core 模式、HAMi-DRA 正式可用以及 Volcano vGPU 升级，HAMi 持续扩展在异构算力调度领域的技术深度与生态广度。

我们诚挚欢迎更多开发者、用户和生态伙伴参与 HAMi 社区，共同推动 GPU 虚拟化与异构算力调度能力的演进。

---

**相关链接：**

- GitHub Release：[https://github.com/Project-HAMi/HAMi/releases/tag/v2.9.0](https://github.com/Project-HAMi/HAMi/releases/tag/v2.9.0)
- HAMi-DRA：[https://github.com/Project-HAMi/HAMi-DRA](https://github.com/Project-HAMi/HAMi-DRA)
- Volcano vGPU Device Plugin：[https://github.com/Project-HAMi/volcano-vgpu-device-plugin](https://github.com/Project-HAMi/volcano-vgpu-device-plugin)
- 项目文档：[https://project-hami.io](https://project-hami.io)
- 社区 Discord（推荐）：[https://discord.gg/Amhy7XmbNq](https://discord.gg/Amhy7XmbNq)
- 社区 CNCF Slack：[https://cloud-native.slack.com/archives/C07T10BU4R2](https://cloud-native.slack.com/archives/C07T10BU4R2)
