---
title: "KubeCon China 2026 Recap: Keynotes, a Lightning Talk, and a Case Study Award"
date: "2026-09-10"
description: "HAMi wrapped up its first KubeCon China as a CNCF Incubating project with two keynotes, a lightning talk, a 10,000-GPU production session, booth T-1, and a case study award for China Merchants Bank."
tags: ["KubeCon", "GPU", "Kubernetes", "AI", "China"]
authors: [hami_community]
---

[KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China 2026](https://www.lfopensource.cn/kubecon-cloudnativecon-openinfra-summit-pytorch-conference-china/) wrapped up on September 9 at the Shanghai International Convention Center. It was HAMi's first KubeCon China since the project [moved to CNCF Incubating](/blog/hami-cncf-incubating), and the community brought two keynotes, a lightning talk, a production session, a booth, and a case study award for China Merchants Bank announced from the keynote stage.

Slides for all four talks are available on the [KubeCon China 2026 event page](/landing/kubecon-china).

<!-- truncate -->

## Keynote 1: Operating Frontier Intelligence at Scale

![Xiao Zhang (Co-founder & CEO, Dynamia) on the opening keynote stage, co-presenting with Chris Aniszczyk (CTO, Cloud and Infrastructure, The Linux Foundation)](/img/kubecon-china-2026-recap/xiao-zhang-keynote.jpg)

The opening keynote of September 8 was co-presented by Chris Aniszczyk (CTO, Cloud and Infrastructure, The Linux Foundation) and Xiao Zhang (Co-founder & CEO, Dynamia). Once models are built and AI moves into production, the challenge shifts to making every GPU deliver value, and cloud native technology is becoming the operating system layer of AI infrastructure.

Xiao Zhang's segment put GPU sharing at the center of that story. With HAMi, one GPU can be partitioned and shared across multiple LLM workloads, and the same scheduling plane extends across heterogeneous accelerators:

![Opening keynote slide "GPU sharing with HAMi": a single GPU partitioned to serve multiple LLM workloads, surrounded by HAMi capabilities from fine-grained vGPU to observability](/img/kubecon-china-2026-recap/keynote-gpu-sharing.png)

The production slide summarized what adopters measure in practice: China Merchants Bank improved single-card inference throughput by 46.7% (ResNet 50, batch 32); a driving-simulation platform cut GPU hours by 30%; train-to-inference pipelines now run on half the GPUs; and 90% of the GPU infrastructure on the slide is managed by HAMi.

![Keynote slide "HAMi in production": +46.7% single-card inference throughput, 30% fewer GPU hours for driving simulation, 50% fewer GPUs for train-to-inference pipelines, and 90% of GPU infrastructure managed by HAMi](/img/kubecon-china-2026-recap/keynote-hami-production.png)

## Keynote 2: PD Disaggregation vLLM Deployment on Alternative AI Accelerators Using llm-d

![Jifei Wang and Mengxuan Li delivering the llm-d keynote in Grand Ballroom II + III](/img/kubecon-china-2026-recap/llm-d-keynote.jpg)

Later that morning, Jifei Wang (HAMi Approver, Dynamia) and Mengxuan Li (Co-founder & CTO, Dynamia) took the same stage for a five-minute keynote on [llm-d](https://github.com/llm-d/llm-d), the CNCF distributed inference stack for Kubernetes. When an inference cluster is no longer NVIDIA-only, how does PD (Prefill/Decode) disaggregation deploy vLLM efficiently on alternative accelerators? Their answer: HAMi contributes heterogeneous GPU sharing and scheduling to llm-d's inference topology, so partitioning, sharing, and scheduling keep working across hardware architectures.

![Keynote slide "Optimize LLM-D inference": requests flow through the llm-d router into Prefill and Decode instances, each running on GPU slices carved out by HAMi via MIG or MPS, scheduled by HAMi, Volcano, or the KAI Scheduler](/img/kubecon-china-2026-recap/llm-d-architecture.png)

## Lightning Talk: From Static Slices to Elastic GPUs, Dynamic MIG with HAMi

In the late-morning lightning talk, Jifei Wang returned to the MIG problem: static pre-partitioning forces operators to guess the partition layout before workloads arrive. HAMi's alternative is scheduling-driven dynamic MIG: the scheduler places the pod first, then the device plugin reconfigures MIG instances on the node, and the pod receives its MIG UUID at runtime.

> GPU partitioning should follow scheduling, not precede it.

![Lightning talk slide "Dynamic MIG — Publish capacity": the HAMi scheduler places a pod, the device plugin re-partitions the GPU into MIG instances via NVML, and the workload receives its MIG UUID at runtime](/img/kubecon-china-2026-recap/dynamic-mig-publish-capacity.png)

## Session: How Intsig Serves Billions of Document Scans

![Mengxuan Li presenting the Intsig production session](/img/kubecon-china-2026-recap/intsig-session.jpg)

![Walter Duan (Intsig) on stage presenting the IntSig training-and-inference overview](/img/kubecon-china-2026-recap/walter-duan.jpg)

The afternoon session by Mengxuan Li and Walter Duan (Intsig) was a deep dive into a GPU cluster most teams only dream of operating: a 10,000-GPU training-and-inference platform spanning self-built data centers and multiple clouds, running 1,000+ online inference services and 1,000+ offline training jobs, sustaining 90%+ 24-hour utilization on the training side, and covering training on Hopper, Ampere, Blackwell, and Ascend.

![Session slide "CaseStudy: IntSig training and inference overview": 10,000-GPU cluster across self-built and multi-cloud, 1000+ online inference services, 1000+ offline training jobs, 90%+ 24-hour utilization](/img/kubecon-china-2026-recap/intsig-cluster-overview.png)

After migrating from Tencent QGPU to HAMi, the team got virtualization, scheduling, and monitoring in one stack. Their deployment playbook: slices for small-model inference with whole cards reserved for heavy workloads, binpack-first packing, high/low-load colocation, a monitoring closed loop from allocation to usage, and Karpenter-based elastic scaling. The measured results: +50% GPU utilization, -30% overall cost, with inference performance overhead kept under 10%.

![Session slide "IntSig HAMi deployment and returns": five deployment patterns and the measured results: +50% GPU utilization, -30% cost, under 10% inference performance overhead](/img/kubecon-china-2026-recap/intsig-hami-results.png)

The session also consolidated HAMi's broader production data: SF Express slimmed from 1,400 to 1,000 GPUs with no business impact; China Merchants Bank runs 10,000+ GPUs at utilization up from 20% to 80%; NIO sped up CI by 10x; ICBC lifted GPU utilization from 20% to 70%. The talk also included a warning about anti-patterns (slicing below 1/6 of a card backfires), and closed with a live demo of Chaterm, Intsig's open-source AI terminal that operates GPU clusters in natural language.

## A Case Study Award for China Merchants Bank

![The keynote screen announcing China Merchants Bank as the Cloud Native China 2026 case study winner; its reference architecture is built on Kubernetes, Kueue, KEDA, Fluid, Prometheus, and HAMi](/img/kubecon-china-2026-recap/case-study-award.jpg)

One more keynote moment worth remembering: China Merchants Bank was announced as the winner of the Cloud Native China 2026 case study award, for a reference architecture that combines Kubernetes, Kueue, KEDA, Fluid, and Prometheus, with HAMi as the GPU-sharing layer. The same bank that runs 10,000+ GPUs at utilization up from 20% to 80%.

## At Booth T-1

![HAMi community members at booth T-1 in Grand Ballroom I](/img/kubecon-china-2026-recap/hami-booth.jpg)

Maintainers staffed booth T-1 from mid-morning until close. The recurring questions: how to introduce HAMi into an existing cluster without touching applications; how it interoperates with Volcano, Kueue, and the KAI Scheduler; choosing between MIG, vGPU, and other partitioning schemes; and multi-tenant GPU management at fleet scale.

## Watch and Read

All sessions were recorded and will be published on the official CNCF channels. Meanwhile, the slides of all four talks (both keynotes, the lightning talk, and the Intsig session) are downloadable from the [KubeCon China 2026 event page](/landing/kubecon-china).

To join the discussion, visit the [HAMi community](/community).
