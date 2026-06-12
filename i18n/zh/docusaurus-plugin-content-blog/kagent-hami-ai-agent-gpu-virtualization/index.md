---
title: "我实测了：AI Agent 已经可以直接管理 Kubernetes GPU 资源"
date: "2026-05-28"
description: "AI Agent 已开始直接管理 Kubernetes GPU 资源：实测 kagent + HAMi 如何实现 GPU 虚拟化、Agent 协作与开源模型驱动的 AI Infra。"
authors: [mesut_oezdil]
tags: ["HAMi", "kagent", "GPU 虚拟化", "AI Agent", "Kubernetes", "vGPU", "云原生"]
---

- **作者：** [Mesut Oezdil](https://www.linkedin.com/in/mesut-oezdil/) / [GitHub](https://github.com/mesutoezdil)
- **原文：** [mesutoezdil.substack.com](https://mesutoezdil.substack.com/p/kagent-hami-on-nebius-2-cncf-projects)
- **GitHub Repo：** [kagentWithHami](https://github.com/mesutoezdil/kagentWithHami)
- **中文翻译：** Jimmy Song（原文发布于[微信公众号](https://mp.weixin.qq.com/s/WNzZh02_1CbMbVBfi4eRGw)）

---

<!-- truncate -->

## 在开始之前

这不是一篇"文档总结"。

你在下面看到的每一条命令，都是我亲自在 Nebius VM 上执行的。每一个输出结果，也都来自那台机器。

当某些东西失败时，我会去调试；当某些东西成功时，我会解释为什么能成功。文章中的错误都是真实遇到的错误，修复方法也都是我亲自验证过的方案。

如果你使用同样的环境运行这些命令，你会得到相同的结果。

完整仓库（包括所有 manifests 与 setup script）在这里：

https://github.com/mesutoezdil/kagentWithHami

关于本文范围：这篇文章只覆盖核心部分。完整安装流程、所有 manifests、完整 troubleshooting guide 与 setup script 都在 GitHub 仓库中。如果你想自己跑一遍，建议先从仓库开始。

如果你之前没接触过 HAMi：

https://medium.com/@mesutoezdil/hami-in-a-real-kubernetes-environment-e8eaa872f388

如果你想看 GPU 可观测性工具测试：

https://mesutoezdil.substack.com/p/i-tested-every-feature-of-ingero

## 这篇文章到底在讲什么

kagent 会把 AI Agent 变成 Kubernetes 资源。

你的 system prompt、tools、model config，全部都以 CRD 的形式存在。

你可以：

- 用 Git 管理版本
- 用 Helm 部署
- 用 kubectl 查看

HAMi 则是在 Kubernetes scheduler 层实现 GPU 虚拟化。

一张物理 NVIDIA L40S，可以在 Kubernetes 中变成 10 张虚拟 GPU，并且在 CUDA Driver 层实现严格的显存限制。

Nebius Token Factory 是一个兼容 OpenAI API 的推理服务。

本文所有测试都使用的是 Llama 3.3 70B。

我想验证的问题是：

> "一个 AI Agent，是否能够在 Kubernetes 集群内部，仅使用开源模型，就管理 GPU 虚拟化工作负载？"

答案是：

可以。

## 测试机器

```
GPU:  1x NVIDIA L40S (46GB VRAM)
CPU:  8 vCPUs
RAM:  32GB
OS:   Ubuntu 24.04 LTS for NVIDIA GPUs (CUDA 13)
```

```
nvidia-smi
| NVIDIA-SMI 580.126.09    CUDA Version: 13.0      |
|   0  NVIDIA L40S    0MiB / 46068MiB    0%        |
```

46GB VRAM 完全空闲。

而在本文结束时，它会被变成 10 张虚拟 GPU。

## 1. 安装 k3s 与 Helm

k3s 是单节点环境的理想选择。

```bash
curl -sfL https://get.k3s.io | sh -
```

（后续命令与原文一致，此处保留）

## 2. 安装 kagent

kagent 提供两个 Helm Chart。

先安装 CRD，再安装主 Chart。

这样你就可以独立升级 CRD，而不会影响正在运行的 Agent。

```bash
helm install kagent-crds \
  oci://ghcr.io/kagent-dev/kagent/helm/kagent-crds \
  --namespace kagent
```

之后安装主 Chart，并接入 Nebius Token Factory。

## 3. 安装 HAMi

如果没有 HAMi，Kubernetes 根本看不到 GPU：

```json
{"cpu": "8", "memory": "32865164Ki", "pods": "110"}
```

没有 nvidia.com/gpu。

HAMi 安装完成后：

```json
{
  "cpu": "8",
  "memory": "32865164Ki",
  "nvidia.com/gpu": "10",
  "pods": "110"
}
```

一张物理 GPU 被虚拟化成了 10 张 GPU。

## 4. 第一次 Agent 调用

LLM 会自动：

- 调用 Kubernetes API
- 获取资源
- 汇总结果

最终输出：

> "The cluster has 25 running pods across different namespaces, including kagent and kube-system."

## 5. GPU 检查

安装 HAMi 前：

> "The node does not have any GPUs available."

安装 HAMi 后：

> "The node nebius-tarantula has 10 GPUs available, type NVIDIA L40S."

Agent 可以读取并理解 HAMi 的 Kubernetes annotations。

## 6. Self-inspection 测试

Agent 使用 Kubernetes API 描述它自己。

它：

- 找到自己的 CRD
- 读取自己的 system prompt
- 读取自己的 tool list
- 解释自己的架构

一个 Agent，通过实时 API 调用，读取并解释自己的定义。

## 7. 创建自定义 Agent

创建了一个 SRE orchestrator，并将 metrics 查询委托给 promql-agent。

核心机制：

```yaml
type: Agent
```

这实现了 Agent-to-Agent（A2A）。

## 8. Agent 与 Agent 对话

两个不同 Agent 拥有：

- 独立 session
- 独立 context window
- 独立 PostgreSQL 存储

orchestrator 只能看到子 Agent 的最终结果，而无法看到内部 reasoning。

## 9. Agent 创建 HAMi GPU Pod

Agent 自动创建：

```yaml
annotations:
  nvidia.com/gpumem: "20000"
```

随后：

- 第一个 Pod 分配 20000 MiB
- 第二个 Pod 分配 15000 MiB

两个 Pod 被共享调度到同一张物理 GPU。

HAMi 会正确处理 GPU sharing。

## 10. Overcommit 保护机制

当请求：

```yaml
nvidia.com/gpu: 11
```

但集群只有 10 张虚拟 GPU 时：

```
Warning  FailedScheduling  hami-scheduler
```

Pod 会一直 Pending。

HAMi 不会调度无法满足的资源请求。

## 11. HAMi Metrics

HAMi 提供标准 Prometheus metrics：

- HostCoreUtilization
- HostGPUMemoryUsage
- hami_build_info

可以直接接入现有监控系统。

## 12. kagent CLI

kagent CLI 可以查看：

- Agent
- Session
- A2A sub-session
- Delegation latency

所有状态都存储在 PostgreSQL 中。

**A2A Agent Card**

每个 Agent 都会暴露：

```
/.well-known/agent-card.json
```

用于 multi-agent system 中的能力发现。

## 哪些东西没有成功

**Memory CRD** - 目前只支持 Pinecone。

**kmcp init** - v0.8.6 中不可用。

**Ubuntu + HAMi + sleep** - 如果镜像缺少 CUDA libraries，甚至 sleep 命令都无法启动。

**HAMi WebUI** - 需要额外安装。

## 为什么这个组合有意义

你的 deployment specs 在 Git 中。

你的 network policies 在 Git 中。

你的 RBAC rules 也在 Git 中。

那么 AI Agent 的 system prompts，为什么不能也在 Git 中？

kagent 实现了这一点。

HAMi 则在不修改 workload 的前提下，解决 GPU 资源浪费问题。

这两个项目组合后：

AI Agent 可以直接在 Kubernetes 集群内部观察、理解并管理 GPU 虚拟化基础设施。

而且：

- 使用开源模型
- 不依赖闭源 AI Provider
- 完全运行在 Kubernetes 内部

