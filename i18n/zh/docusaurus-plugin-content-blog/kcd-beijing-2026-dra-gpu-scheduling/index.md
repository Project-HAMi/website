---
title: "从 Device Plugin 到 DRA：GPU 调度范式升级与 HAMi-DRA 实践回顾"
date: "2026-03-23"
description: "本文回顾了 HAMi 社区在 KCD Beijing 2026 的技术分享，深入探讨了从 Device Plugin 到 DRA 的 GPU 调度范式升级，以及 HAMi-DRA 的实践经验和性能优化成果。"
tags: ["KCD", "DRA", "GPU", "Kubernetes", "AI", "调度"]
authors: [hami_community]
---

刚刚过去的 [KCD Beijing 2026](https://www.bagevent.com/event/kcd-beijing-2026)，是近年来规模最大的一次 Kubernetes 社区大会之一。

**超过 1000 人报名参与，刷新历届 KCD 北京记录。**

HAMi 社区不仅受邀进行了技术分享，也在现场设立了展台，与来自云原生与 AI 基础设施领域的开发者、企业用户进行了深入交流。

本次分享主题为：

> **从 Device Plugin 到 DRA：GPU 调度范式升级与 HAMi-DRA 实践**

本文结合现场分享内容与 PPT，做一次更完整的技术回顾。附幻灯片下载：[GitHub - HAMi-DRA KCD Beijing 2026](https://github.com/Project-HAMi/community/blob/main/talks/01-kcd-beijing-20260323/KCD-Beijing-2026-GPU-Scheduling-DRA-HAMi-Wang-Jifei-James-Deng.pdf)。

<!-- truncate -->

## HAMi 社区在现场

本次分享由两位 HAMi 社区核心贡献者完成：

- 王纪飞（「Dynamia 密瓜智能」，HAMi Approver，HAMi-DRA 主要贡献者）
- James Deng（第四范式，HAMi Reviewer）

他们长期专注于：

- GPU 调度与虚拟化
- Kubernetes 资源模型
- 异构算力管理

同时，HAMi 社区在现场设有展台，与参会者围绕以下问题进行了大量交流：

- Kubernetes 是否真的适合 AI workload？
- GPU 是否应该成为"调度资源"，而不是"设备"？
- 如何在不破坏生态的情况下引入 DRA？

## 现场回顾

![大会主会场](/img/kcd-beijing-2026/keynote.jpg)

![观众注册中](/img/kcd-beijing-2026/register.jpg)

![HAMi 展台前参会者前来交流打卡](/img/kcd-beijing-2026/booth.jpg)

![志愿者在为观众盖章](/img/kcd-beijing-2026/booth2.jpg)

![王纪飞正在分享中](/img/kcd-beijing-2026/wangjifei.jpg)

![James Deng 正在分享](/img/kcd-beijing-2026/james.jpg)

## GPU 调度范式正在发生变化

这次分享的核心，其实不是 DRA 本身，而是一个更大的转变：

> **GPU 正在从"设备"变成"资源对象"。**

## 1. Device Plugin 的天花板

传统模型的问题，本质上在于表达能力：

- 只能描述"数量"（`nvidia.com/gpu: 1`）
- 无法表达：
  - 多维资源（显存 / core / slice）
  - 多卡组合
  - 拓扑（NUMA / NVLink）

👉 这直接导致：

- 调度逻辑外溢（extender / sidecar）
- 系统复杂度上升
- 并发能力受限

## 2. DRA：资源建模能力的跃迁

DRA 的核心优势是：

- **多维资源建模能力**
- **完整设备生命周期管理**
- **细粒度资源分配能力**

关键变化：

> **资源申请从 Pod 内嵌字段 → 独立 ResourceClaim 对象**

## 关键现实问题：DRA 太复杂了

PPT 里有一页非常关键，很多人会忽略：

### 👉 DRA 请求长这样

```yaml
spec:
  devices:
    requests:
    - exactly:
        allocationMode: ExactCount
        capacity:
          requests:
            memory: 4194304k
            count: 1
```

同时还要写 CEL selector：

```yaml
device.attributes["gpu.hami.io"].type == "hami-gpu"
```

### 对比 Device Plugin

```yaml
resources:
  limits:
    nvidia.com/gpu: 1
```

👉 结论非常明确：

> **DRA 是能力升级，但 UX 明显退化。**

## HAMi-DRA 的关键突破：自动化

这是这次分享最有价值的部分之一：

### 👉 Webhook 自动生成 ResourceClaim

HAMi 的做法不是让用户"直接用 DRA"，而是：

> **让用户继续用 Device Plugin，用系统自动转换成 DRA**

### 工作机制

输入（用户）：

```yaml
nvidia.com/gpu: 1
nvidia.com/gpumemory: 4000
```

↓

Webhook 转换：

- 生成 ResourceClaim
- 构造 CEL selector
- 注入设备约束（UUID / GPU 类型）

↓

输出（系统内部）：

- 标准 DRA 对象
- 可调度资源表达

### 核心价值

> **把 DRA 从"专家接口"，变成"普通用户可用接口"。**

## DRA Driver：真正的落地复杂度

DRA driver 并不只是"注册资源"，而是完整 lifecycle 管理：

### 三个核心接口

- Publish Resources
- Prepare Resources
- Unprepare Resources

### 实际挑战

- `libvgpu.so` 注入
- `ld.so.preload`
- 环境变量管理
- 临时目录（cache / lock）

👉 这意味着：

> **GPU 调度已经进入 runtime orchestration 层，而不是简单资源分配。**

## 性能对比：DRA 并不只是"更优雅"

PPT 中给出了一个很关键的 benchmark：

### Pod 创建时间对比

- HAMi（传统）：最高 ~42,000
- HAMi-DRA：显著下降（~30%+ 改善）

👉 这说明：

> **DRA 的资源预绑定机制，可以减少调度阶段冲突和重试**

## 可观测性的范式变化

这是一个被低估的变化：

### 传统模型

- 资源信息：来自 Node
- 使用情况：来自 Pod
- → 需要聚合、推导

### DRA 模型

- ResourceSlice：设备库存
- ResourceClaim：资源分配
- → **资源视角是第一等公民**

👉 这带来的变化：

> **Observability 从"推导"变成"直接建模"**

## 异构设备的统一建模

PPT 提出了一个非常关键的未来方向：

> **如果设备属性标准化，可以实现 vendor-agnostic 调度模型**

例如：

- PCIe root
- PCI bus ID
- GPU attributes

👉 这其实是一个更大的叙事：

> **DRA 是 heterogeneous compute abstraction 的起点**

## 更大的趋势：Kubernetes 正在成为 AI 控制平面

把这些点串起来，其实可以看到一个更大的趋势：

### 1. Node → Resource

- 从"调度机器"
- 到"调度资源对象"

### 2. Device → Virtual Resource

- GPU 不再是卡
- 而是可切分、组合的资源

### 3. Imperative → Declarative

- 调度逻辑 → 资源声明

👉 本质上：

> **Kubernetes 正在进化为 AI Infra Control Plane**

## 🌱 HAMi 在其中的位置

HAMi 的定位正在逐渐清晰：

> **Kubernetes 上的 GPU Resource Layer**

- 向下：适配异构 GPU
- 向上：支撑 AI workload（训练 / 推理 / Agent）
- 中间：调度 + 虚拟化 + 抽象

而 HAMi-DRA：

> **是这个资源层与 Kubernetes 原生模型对齐的关键一步**

## 社区的意义

这次分享还有一个很重要的点：

- 来自不同公司的贡献者共同完成
- 在真实生产环境中验证
- 通过社区分享经验

这也是 HAMi 一直坚持的方式：

> **用社区推动 AI 基础设施，而不是封闭系统**

## 总结

这次分享真正的价值不只是介绍 DRA，而是回答了一个关键问题：

> **如何把一个"正确但难用"的模型，变成"今天就能用的系统"？**

HAMi-DRA 给出的答案是：

- 不改变用户习惯
- 吸收 DRA 能力
- 内部完成复杂性转化
