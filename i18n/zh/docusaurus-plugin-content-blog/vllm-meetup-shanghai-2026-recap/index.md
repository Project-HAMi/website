---
title: "「你的算力用的好么？」李孟轩 vLLM Meetup 分享回顾：vLLM 推理集群优化的三个阶段"
date: "2026-07-16"
description: "2026 年 7 月 16 日，密瓜智能联合创始人兼 CTO、HAMi 作者李孟轩在 vLLM Meetup 上分享了 vLLM 推理集群优化的三个阶段：从单机进程、Kubernetes 工作负载、PD 分离，到结合 HAMi GPU 虚拟化的极致算力优化。本文为完整图文回顾。"
image: /img/vllm-meetup-shanghai-2026-recap/title.webp
tags:
  [
    "vLLM",
    "GPU Virtualization",
    "PD Disaggregation",
    "LLM-D",
    "Mooncake",
    "HAMi",
    "Inference Optimization",
    "Cloud Native",
    "AI Infrastructure",
  ]
authors: [archlitchi]
---

import Bilibili from "@site/src/components/Bilibili";

![vLLM 推理集群优化的三个阶段｜李孟轩](/img/vllm-meetup-shanghai-2026-recap/title.webp)

2026 年 7 月 16 日，密瓜智能（Dynamia）联合创始人兼 CTO、HAMi 作者 **李孟轩** 在 vLLM Meetup 上做了一场关于 **vLLM 部署与算力优化** 的技术分享。围绕一个直击痛点的问题：**「你的算力用的好么？」**，他系统梳理了 vLLM 推理集群从"能跑起来"到"把算力榨干"的演进路径，把整个优化过程拆解为清晰的三个阶段。

本文结合分享 PPT 与现场纪要，带大家完整回顾这场干货满满的分享。

<!-- truncate -->

![李孟轩在 vLLM Meetup 现场分享](/img/vllm-meetup-shanghai-2026-recap/li-mengxuan-speaking.webp)

## 视频回放

<Bilibili bvid="BV1amK462EhY" title="你的算力用的好么？vLLM Meetup上海站，李孟轩" />

## 核心问题：你的算力真的用好了吗？

大模型推理成本居高不下，GPU 越来越贵。但在生产环境里，很多团队的推理集群并没有把昂贵的算力用满。李孟轩用一个反问开场，把整场分享的主线立住了：推理集群的优化不是一次性的配置调参，而是一条从部署形态、调度架构到资源切分的演进链路。

他把这条链路抽象成三个递进的阶段：

- **Phase 0**: vLLM as a process，单机进程，快速验证
- **Phase 1**: vLLM as a workload，Kubernetes 上的标准化工作负载
- **Phase 2**: vLLM + PD 分离，Prefill 与 Decode 解耦
- **Phase 3**: vLLM + PD 分离 + GPU 虚拟化，把 Decode 阶段的空闲算力彻底榨干

下面逐个阶段展开。

## Phase 0：vLLM as a process，单机快速验证

![Phase 0: vLLM as a process](/img/vllm-meetup-shanghai-2026-recap/phase0-overview.webp)

第一阶段面向最朴素的场景：你手头有一台带 GPU 的服务器，想用最快的速度把 vLLM 推理服务跑起来做验证。

这个阶段没有编排、没有调度，vLLM 就是一个跑在单机上的进程。李孟轩给出了两种最常见的拉起方式。

![Phase 0: Conda 与 Docker 两种部署方式](/img/vllm-meetup-shanghai-2026-recap/phase0-code.webp)

**Conda 方式** 用虚拟环境直接启动，可以通过 `CUDA_VISIBLE_DEVICES` 指定 GPU 卡，配合 `--tensor-parallel-size` 开启张量并行：

```bash
conda create -n vllm python=3.11 -y
conda activate vllm

# CUDA 12.1
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

CUDA_VISIBLE_DEVICES=0,1,2,3 python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Meta-Llama-3-70B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 4 \
  --gpu-memory-utilization 0.9
```

**Docker 方式** 则用官方镜像一行命令拉起，同样支持指定设备和显存利用率。

> 这个阶段本质上是一个独立进程，只适合用在开发 / 测试场景做快速验证，并不是标准化的集群工作负载形态。

## Phase 1：vLLM as a workload，Kubernetes 上的标准化部署

![Phase 1: vLLM as a workload](/img/vllm-meetup-shanghai-2026-recap/phase1-overview.webp)

当场景从单机扩展到一个 GPU 集群，手动逐节点指定启动指令和分配 GPU 就不再现实了。第二阶段引入了 **Kubernetes 作为统一编排底座**: 把 vLLM 封装成一个标准的 Pod，写成 Deployment YAML，剩下的调度交给 K8s。

![Phase 1: 把 vLLM 写成 K8s Deployment](/img/vllm-meetup-shanghai-2026-recap/phase1-k8s.webp)

核心就是一份 Deployment，在 `resources.limits` 里声明 `nvidia.com/gpu: 1`，K8s 会自动把负载调度到有空闲 GPU 的节点上：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-server
  namespace: vllm-inference
  labels:
    app: vllm
spec:
  # ...
  containers:
    - name: vllm
      image: vllm/vllm-openai:latest
      args:
        - --model
        - meta-llama/Meta-Llama-3-8B-Instruct
        - --host
        - "0.0.0.0"
        - --port
        - "8000"
        - --gpu-memory-utilization
        - "0.9"
        - --max-model-len
        - "8192"
      resources:
        limits:
          nvidia.com/gpu: 1
          memory: "32Gi"
          cpu: "8"
```

到这里，vLLM 已经是生产可用的标准化工作负载。但李孟轩强调：直接提交这类工作负载的方案对生产环境的适配性还不够，还有进一步优化的空间，于是引出第三阶段。

## Phase 2：vLLM + PD 分离，把 Prefill 和 Decode 解耦

![Phase 2: PD 分离](/img/vllm-meetup-shanghai-2026-recap/phase2-pd.webp)

**PD 分离（Prefill / Decode Disaggregation）** 是大模型推理走向生产级的关键优化。它的核心思路是：把推理的两个阶段拆到不同的负载上分别处理。

- **Prefill 阶段** 负责处理 prompt、生成首 token 和上下文对应的 KV Cache，是计算密集型
- **Decode 阶段** 负责逐个吐出后续 token，是访存（带宽）密集型

把两者拆开的最大价值在于：**避免新请求的 Prefill 干扰正在进行的 Decode，从而稳定保障用户体感上的 TPOT（每个输出 token 的延迟）**。

李孟轩介绍了落地 PD 分离的三种路径，从最轻量到最云原生。

### 路径一：vLLM 原生 P2pNcclConnector

![Phase 2: P2pNcclConnector](/img/vllm-meetup-shanghai-2026-recap/phase2-nccl.webp)

最轻量的方式不需要任何额外组件，直接用 vLLM 原生能力。Prefill 实例作为 `kv_producer`、Decode 实例作为 `kv_consumer`，通过 **NCCL P2P 连接器** 在两者之间传输 KV Cache:

```bash
# Prefill
CUDA_VISIBLE_DEVICES=0 \
vllm serve meta-llama/Meta-Llama-3-8B-Instruct \
  --port 8100 --enforce-eager \
  --kv-transfer-config '{
    "kv_connector": "P2pNcclConnector",
    "kv_role": "kv_producer",
    "kv_rank": 0,
    "kv_parallel_size": 2
  }'

# Decode
CUDA_VISIBLE_DEVICES=0 \
MASTER_ADDR=192.168.1.10 MASTER_PORT=29500 \
vllm serve meta-llama/Meta-Llama-3-8B-Instruct \
  --port 8200 --enforce-eager \
  --kv-transfer-config '{
    "kv_connector": "P2pNcclConnector",
    "kv_role": "kv_consumer",
    "kv_rank": 1,
    "kv_parallel_size": 2
  }'
```

这种方式上手最快，但当 Decode 副本变多时，就需要配套的请求路由能力。

### 路径二：Mooncake，脱离 K8s 也能用

![Phase 2: Mooncake](/img/vllm-meetup-shanghai-2026-recap/phase2-mooncake.webp)

如果不在 Kubernetes 环境里，**Mooncake** 提供了另一套方案。它包含三个核心模块：

- **KV Cache / 请求路由**: 决定请求该发到哪个 Decode 节点
- **Transfer Engine（对标 NCCL Connector）**: 负责 KV Cache 的跨节点 P2P 传输
- **共享存储**: 支撑 KV Cache 的共享

![Phase 2: Mooncake 部署结构](/img/vllm-meetup-shanghai-2026-recap/phase2-mooncake-code.webp)

Mooncake 通过一个 Conductor 做集中调度，Prefill 和 Decode 各自起一个 transfer_engine，配合 `MooncakeConnector` 完成 KV Cache 的跨节点拷贝。它最大的特点是 **可以脱离 K8s 独立运行**，适配裸机部署的 PD 分离场景。

### 路径三：LLM-D，云原生生产级方案

![Phase 2: LLM-D](/img/vllm-meetup-shanghai-2026-recap/phase2-llmd.webp)

**LLM-D** 是面向 Kubernetes 生产环境的开源项目，可以理解为"云原生形态的 Mooncake 能力组件"。它的设计更贴合 K8s 生态：

- 通过 **CRD 定义推理池** 里的 Prefill、Decode 节点属性
- Router 基于 **KV Cache 命中** 和 **prompt 语义相似度** 两类策略分配请求，保障 TTFT
- 底层可兼容 Mooncake 连接器

![Phase 2: LLM-D 架构细节](/img/vllm-meetup-shanghai-2026-recap/phase2-llmd-detail.webp)

李孟轩表示，LLM-D 相关的部署机制已经过诸多验证，是当前在 K8s 上落地 PD 分离比较成熟的开源选择。

## Phase 3：PD 分离 + GPU 虚拟化，把 Decode 的空闲算力榨干

![Phase 3: vLLM + PD 分离 + GPU 虚拟化](/img/vllm-meetup-shanghai-2026-recap/phase3-overview.webp)

走到第三阶段，问题回到开场的那句反问：算力真的用满了吗？

关键洞察在于 Decode 阶段的瓶颈特征：**当前主流硬件下，Decode 是访存（带宽）瓶颈，而不是算力瓶颈**。也就是说，即使把业务并发拉满，GPU 的计算单元仍有大量空闲，算力资源并没有被充分利用。

既然 Decode 单卡吃不满，那就可以把多个 Decode 负载塞到同一张 GPU 上跑。这正是 **HAMi GPU 虚拟化** 发挥作用的场景。

![Phase 3: PD 分离 + GPU 虚拟化整体架构](/img/vllm-meetup-shanghai-2026-recap/phase3-architecture.webp)

整体架构是 **vLLM + LLM-D 实现 PD 分离，再叠加 HAMi GPU 虚拟化**:

- **Prefill 节点** 是计算密集型，保持独占 GPU 模式，在资源配置里直接指定 GPU 数量即可
- **Decode 节点** 通过 HAMi 做 GPU 切片调度，只需在 Deployment 里指定 GPU 显存占比，就能让多个 Decode 实例共享同一张卡
- 上层由 **llm-d router** 负责请求路由，通过 HAMi Plugin 把请求分发到切分出的 GPU Slice 上

![Phase 3: 优化效果](/img/vllm-meetup-shanghai-2026-recap/phase3-result.webp)

通过 GPU 虚拟化把多个 Decode 负载调度到同一张 GPU，可以把 **单卡承载的 Decode 实例能力提升约一倍**。

## 现场答疑精华

分享结束后的答疑环节同样信息量很大，几个核心结论值得单独拎出来。

### GPU 虚拟化复用 Decode，单卡降一点，集群涨两成

有参会者问：把多个 Decode 塞进一张卡，性能会不会受影响？

李孟轩的回答很坦诚：这其实是一个 **妥协的做法**，单卡内多个 Decode 负载会存在带宽竞争，单卡自身的解码吞吐会出现小幅下降。但从集群视角看，释放出来的空闲 GPU 可以承载更多业务负载，**整体集群的综合吞吐能实现约 20% 的提升**。在 GPU 越来越贵的当下，这笔账是划算的。

> 「这个其实大部分情况下是一个妥协的做法，因为大家都知道现在的卡越来越贵嘛。」

### HAMi 软件虚拟化 vs 英伟达 MIG

讨论中还对比了 HAMi 的 GPU 虚拟化与英伟达原生的 **MIG（Multi-Instance GPU）** 技术：

| 维度               | HAMi GPU 虚拟化          | 英伟达 MIG                                 |
| ------------------ | ------------------------ | ------------------------------------------ |
| 限制层级           | 软件层调度               | 硬件层硬配额绑定                           |
| 显存 / 算力 / 带宽 | 动态抢占，空闲资源可复用 | 切分时同步锁定上限，其他实例空闲也无法占用 |
| 调度灵活性         | 高，带宽抢占灵活         | 低，易出现性能浪费                         |

MIG 在切分实例时会同步限制各实例的显存、算力与带宽上限，调度灵活性差、容易浪费；而 HAMi 在软件层做限制，**带宽抢占更灵活，可以充分利用显卡带宽**。

> 「用 HAMi 的话，它在软件层做的限制，所以带宽抢占是比较灵活的。」

### Decode 阶段为何是访存瓶颈

最后一个问题聚焦在瓶颈判断：即便用了 PD 分离，场景是不是大多仍属于访存瓶颈，还是部分环境能达到算力瓶颈？

结论很明确：**当前多数生产环境下，Decode 阶段普遍是访存瓶颈，很难真正触达算力瓶颈**。除非卡的访存带宽特别特别高，否则一旦带宽打满，算力想提也提不上去。这也正是 Phase 3"用 GPU 虚拟化复用 Decode 空闲算力"这一思路成立的根本前提。

> 「你很难在解码阶段真正把算力达到瓶颈，因为带宽一旦打满了，算力你想提也提不上去。」

## 一句话总结

从 Phase 0 的单机进程，到 Phase 1 的 K8s 工作负载，到 Phase 2 的 PD 分离，再到 Phase 3 叠加 HAMi GPU 虚拟化，李孟轩给出的不是某个银弹参数，而是一套 **可落地、可递进** 的推理集群优化方法论：先把部署标准化，再把 Prefill / Decode 解耦，最后基于 Decode 是访存瓶颈这一事实，用 GPU 虚拟化把空闲算力彻底释放出来。

**算力效率从来不是单点能力，而是部署形态、调度架构与资源切分共同作用的结果。** 这，大概就是"你的算力用的好么？"这个问题最好的回答。

![vLLM Meetup 现场合影](/img/vllm-meetup-shanghai-2026-recap/vllm-meetup-group-photo.webp)

## 资源链接

- **PPT 下载**: [分享 PPT](https://github.com/Project-HAMi/community/tree/main/talks/02-vllm-meetup-20260716)
- **HAMi 项目**: [https://github.com/Project-HAMi/HAMi](https://github.com/Project-HAMi/HAMi)
- **密瓜智能 Dynamia**: [https://dynamia.ai](https://dynamia.ai)
- **vLLM**: [https://github.com/vllm-project/vllm](https://github.com/vllm-project/vllm)
- **LLM-D**: [https://github.com/llm-d/llm-d](https://github.com/llm-d/llm-d)
- **Mooncake**: [https://github.com/kvcache-ai/Mooncake](https://github.com/kvcache-ai/Mooncake)

## 关于分享者

**李孟轩**，密瓜智能（Dynamia）联合创始人兼 CTO，HAMi 项目作者。长期致力于异构算力调度与 GPU 虚拟化技术，HAMi 已成为云原生 GPU 共享领域最具影响力的开源项目之一，并于近期晋级 CNCF 孵化项目。
