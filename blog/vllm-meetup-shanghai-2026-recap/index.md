---
title: "Are You Making Good Use of Your Compute? Three Stages of vLLM Inference Cluster Optimization"
date: "2026-07-16"
description: "On July 16, 2026, Li Mengxuan, Co-founder & CTO of Dynamia and HAMi author, shared a three-stage optimization path for vLLM inference clusters at vLLM Meetup: from a single-node process and a Kubernetes workload, to PD disaggregation, and finally combining HAMi GPU virtualization to squeeze every drop of idle compute out of the Decode stage."
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

import YouTube from "@site/src/components/YouTube";

![Three Stages of vLLM Inference Cluster Optimization | Li Mengxuan](/img/vllm-meetup-shanghai-2026-recap/title.webp)

On July 16, 2026, **Li Mengxuan**, Co-founder & CTO of Dynamia and HAMi author, delivered a technical talk on **vLLM deployment and compute optimization** at vLLM Meetup. Built around one pointed question, **"Are you making good use of your compute?"**, the talk laid out a complete evolution path for vLLM inference clusters, from "getting it to run" to "squeezing the hardware dry", broken down into three clear stages.

This recap walks through the talk slide by slide, combining the deck with the on-site Q&A notes.

<!-- truncate -->

![Li Mengxuan presenting at vLLM Meetup](/img/vllm-meetup-shanghai-2026-recap/li-mengxuan-speaking.webp)

## Watch the Talk

<YouTube id="t_vOogph-ns" title="Are You Making Good Use of Your Compute? Three Stages of vLLM Inference Cluster Optimization - Li Mengxuan" />

## The Core Question: Are You Really Using Your Compute Well?

LLM inference is expensive, and GPUs keep getting pricier. Yet in production, most inference clusters never fully utilize the costly hardware they run on. Li Mengxuan opened with this provocation and framed the entire talk around it: optimizing an inference cluster is not a one-off tuning exercise, but an end-to-end progression spanning deployment shape, scheduling architecture, and resource slicing.

He abstracted that progression into three incremental stages:

- **Phase 0**: vLLM as a process, fast single-node validation
- **Phase 1**: vLLM as a workload, a standardized Kubernetes workload
- **Phase 2**: vLLM + PD disaggregation, decoupling Prefill and Decode
- **Phase 3**: vLLM + PD disaggregation + GPU virtualization, fully reclaiming the idle compute in the Decode stage

Let's walk through each stage.

## Phase 0: vLLM as a Process, Fast Single-Node Validation

![Phase 0: vLLM as a process](/img/vllm-meetup-shanghai-2026-recap/phase0-overview.webp)

The first stage targets the most basic scenario: you have a single GPU server and want to bring up a vLLM inference service as fast as possible for validation.

There is no orchestration and no scheduling here. vLLM is simply a process running on one machine. Li Mengxuan showed the two most common ways to launch it.

![Phase 0: Conda and Docker deployment options](/img/vllm-meetup-shanghai-2026-recap/phase0-code.webp)

**The Conda path** starts the server directly inside a virtual environment. You can pin GPUs with `CUDA_VISIBLE_DEVICES` and enable tensor parallelism with `--tensor-parallel-size`:

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

**The Docker path** brings the service up in one command using the official image, with the same control over device selection and GPU memory utilization.

> This is essentially a standalone process. It is only suitable for fast validation in dev/test scenarios, and is not a standardized cluster workload form.

## Phase 1: vLLM as a Workload, Standardized Deployment on Kubernetes

![Phase 1: vLLM as a workload](/img/vllm-meetup-shanghai-2026-recap/phase1-overview.webp)

Once the scope grows from one machine to a GPU cluster, manually pinning launch commands and assigning GPUs node by node no longer scales. The second stage introduces **Kubernetes as the unified orchestration layer**: vLLM is packaged as a standard Pod, written as a Deployment, and scheduling is left to K8s.

![Phase 1: vLLM as a K8s Deployment](/img/vllm-meetup-shanghai-2026-recap/phase1-k8s.webp)

The core is a single Deployment that declares `nvidia.com/gpu: 1` under `resources.limits`. K8s then automatically schedules the workload onto a node with a free GPU:

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

At this point vLLM is a production-ready, standardized workload. But Li Mengxuan stressed that submitting such a workload directly is still not optimal enough for production, which leads into the next stage.

## Phase 2: vLLM + PD Disaggregation, Decoupling Prefill and Decode

![Phase 2: PD disaggregation](/img/vllm-meetup-shanghai-2026-recap/phase2-pd.webp)

**PD disaggregation (Prefill / Decode Disaggregation)** is the key optimization that moves LLM inference toward production grade. The core idea: split the two phases of inference onto separate workloads.

- **The Prefill phase** processes the prompt, generates the first token, and produces the KV Cache for the context. It is compute-intensive.
- **The Decode phase** emits subsequent tokens one by one. It is memory-bandwidth-bound.

The biggest win from splitting them: **new requests' Prefill no longer interferes with in-flight Decode, which stabilizes the user-facing TPOT (time per output token)**.

Li Mengxuan introduced three paths to land PD disaggregation, from the lightest to the most cloud-native.

### Path 1: vLLM Native P2pNcclConnector

![Phase 2: P2pNcclConnector](/img/vllm-meetup-shanghai-2026-recap/phase2-nccl.webp)

The lightest option needs no extra components at all and uses vLLM's native capabilities. The Prefill instance acts as `kv_producer` and the Decode instance as `kv_consumer`, with the **NCCL P2P connector** transferring KV Cache between them:

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

This path is the fastest to get running, but once Decode replicas multiply, you need a matching request-routing capability.

### Path 2: Mooncake, Works Without Kubernetes

![Phase 2: Mooncake](/img/vllm-meetup-shanghai-2026-recap/phase2-mooncake.webp)

If you are not running on Kubernetes, **Mooncake** offers an alternative. It ships three core modules:

- **KV Cache / request routing**: decides which Decode node a request should go to
- **Transfer Engine (analogous to the NCCL Connector)**: handles cross-node P2P transfer of KV Cache
- **Shared storage**: backs KV Cache sharing

![Phase 2: Mooncake deployment layout](/img/vllm-meetup-shanghai-2026-recap/phase2-mooncake-code.webp)

Mooncake uses a Conductor for centralized scheduling. Prefill and Decode each run a transfer_engine and use the `MooncakeConnector` to copy KV Cache across nodes. Its defining trait is that **it can run independently without K8s**, fitting bare-metal PD disaggregation scenarios.

### Path 3: LLM-D, a Cloud-Native Production-Grade Solution

![Phase 2: LLM-D](/img/vllm-meetup-shanghai-2026-recap/phase2-llmd.webp)

**LLM-D** is an open source project built for Kubernetes production environments. Think of it as "Mooncake-style capabilities in cloud-native form". Its design fits the K8s ecosystem closely:

- It defines Prefill and Decode node attributes inside an inference pool via **CRDs**
- Its router dispatches requests based on two strategies, **KV Cache hit** and **prompt semantic similarity**, protecting TTFT
- It is compatible with the Mooncake connector at the lower layer

![Phase 2: LLM-D architecture detail](/img/vllm-meetup-shanghai-2026-recap/phase2-llmd-detail.webp)

Li Mengxuan noted that LLM-D's deployment mechanics have been validated in many scenarios, making it one of the more mature open source choices for landing PD disaggregation on K8s today.

## Phase 3: PD Disaggregation + GPU Virtualization, Reclaiming Idle Decode Compute

![Phase 3: vLLM + PD disaggregation + GPU virtualization](/img/vllm-meetup-shanghai-2026-recap/phase3-overview.webp)

At stage three, the question loops back to the opening provocation: is the compute really saturated?

The key insight is the bottleneck profile of the Decode phase: **on current mainstream hardware, Decode is memory-bandwidth-bound, not compute-bound**. In other words, even at full business concurrency, the GPU's compute units still sit largely idle, and the compute resource is not fully utilized.

Since a single card cannot saturate Decode, multiple Decode workloads can be packed onto the same GPU. That is exactly where **HAMi GPU virtualization** comes in.

![Phase 3: PD disaggregation + GPU virtualization overall architecture](/img/vllm-meetup-shanghai-2026-recap/phase3-architecture.webp)

The overall architecture is **vLLM + LLM-D for PD disaggregation, layered with HAMi GPU virtualization**:

- **Prefill nodes** are compute-intensive and stay in exclusive-GPU mode. You just specify the GPU count in the resource config.
- **Decode nodes** use HAMi for GPU slice scheduling. Specifying a GPU memory share in the Deployment lets multiple Decode instances share the same card.
- The **llm-d router** handles request routing on top, dispatching requests onto GPU slices through the HAMi Plugin.

![Phase 3: optimization result](/img/vllm-meetup-shanghai-2026-recap/phase3-result.webp)

By scheduling multiple Decode workloads onto the same GPU through virtualization, you can **roughly double the number of Decode instances a single card can host**.

## Highlights From the Live Q&A

The Q&A after the talk was just as information-dense. A few core takeaways deserve to be called out.

### Reusing Decode With GPU Virtualization: A Small Per-Card Drop, A ~20% Cluster Gain

An attendee asked: does packing multiple Decode workloads onto one card hurt performance?

Li Mengxuan was candid: this is fundamentally **a tradeoff**. Multiple Decode workloads on one card contend for bandwidth, so the per-card decode throughput drops slightly. But from the cluster's perspective, the freed-up GPUs can host more business workloads, and **overall cluster throughput can improve by about 20%**. With GPUs getting ever more expensive, that math works.

> "This is mostly a tradeoff, because everyone knows GPUs keep getting more expensive."

### HAMi Software Virtualization vs. NVIDIA MIG

The discussion also compared HAMi's GPU virtualization against NVIDIA's native **MIG (Multi-Instance GPU)**:

| Dimension | HAMi GPU Virtualization | NVIDIA MIG |
| --- | --- | --- |
| Limit layer | Software-layer scheduling | Hardware-layer hard quota binding |
| Memory / compute / bandwidth | Dynamic preemption, idle resources reusable | Quotas locked at split time, other instances' idle capacity cannot be used |
| Scheduling flexibility | High, flexible bandwidth preemption | Low, prone to performance waste |

MIG locks each instance's memory, compute, and bandwidth caps at split time, which is inflexible and wastes resources. HAMi enforces limits in the software layer, so **bandwidth preemption is far more flexible and the card's bandwidth is fully utilized**.

> "With HAMi, because the limits are done in the software layer, bandwidth preemption is quite flexible."

### Why Decode Is Memory-Bound

The final question focused on the bottleneck diagnosis: even with PD disaggregation, are most scenarios still memory-bound, or can some environments hit a compute bottleneck?

The answer was unambiguous: **in most production environments today, Decode is memory-bandwidth-bound and rarely hits a compute bottleneck**. Unless a card has extremely high memory bandwidth, once bandwidth is saturated the compute simply cannot go higher. This is the fundamental premise that makes the Phase 3 idea of "reclaiming idle Decode compute via GPU virtualization" hold up.

> "It's very hard to truly hit a compute bottleneck during decoding, because once bandwidth is maxed out, you can't push the compute any higher either."

## In One Sentence

From Phase 0's single-node process, to Phase 1's K8s workload, to Phase 2's PD disaggregation, and finally Phase 3's layering of HAMi GPU virtualization, Li Mengxuan did not hand over a silver-bullet parameter. He handed over a **landable, incremental** methodology for inference cluster optimization: standardize the deployment first, then decouple Prefill and Decode, and finally, based on the fact that Decode is memory-bound, use GPU virtualization to fully release the idle compute.

**Compute efficiency is never a single-point capability. It is the combined result of deployment shape, scheduling architecture, and resource slicing.** That is probably the best answer to the question, "Are you making good use of your compute?"

![vLLM Meetup group photo](/img/vllm-meetup-shanghai-2026-recap/vllm-meetup-group-photo.webp)

## Resources

- **Slides**: [Download the slide deck](https://github.com/Project-HAMi/community/tree/main/talks/02-vllm-meetup-20260716)
- **HAMi project**: [https://github.com/Project-HAMi/HAMi](https://github.com/Project-HAMi/HAMi)
- **Dynamia**: [https://dynamia.ai](https://dynamia.ai)
- **vLLM**: [https://github.com/vllm-project/vllm](https://github.com/vllm-project/vllm)
- **LLM-D**: [https://github.com/llm-d/llm-d](https://github.com/llm-d/llm-d)
- **Mooncake**: [https://github.com/kvcache-ai/Mooncake](https://github.com/kvcache-ai/Mooncake)

## About the Speaker

**Li Mengxuan** is Co-founder & CTO of Dynamia and the author of the HAMi project. He has long focused on heterogeneous compute scheduling and GPU virtualization. HAMi has become one of the most influential open source projects in cloud-native GPU sharing and recently graduated to a CNCF incubating project.
