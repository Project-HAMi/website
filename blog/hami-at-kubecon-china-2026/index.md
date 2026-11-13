---
title: "HAMi at KubeCon China 2026: Two Keynotes, Two Talks, and a Booth in Shanghai"
date: "2026-08-25"
description: "HAMi will appear at KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China 2026 with two keynotes, a lightning talk, a technical session, and a project booth. It is HAMi's first KubeCon China since being accepted as a CNCF Incubating project."
tags: ["KubeCon", "GPU", "Kubernetes", "AI"]
authors: [hami_community]
---

From September 7 to 9, [KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China 2026](https://www.lfopensource.cn/kubecon-cloudnativecon-openinfra-summit-pytorch-conference-china/) will take place at the Shanghai International Convention Center. This will be HAMi's first KubeCon China appearance since the project was accepted as a [CNCF Incubating project](/blog/hami-cncf-incubating) in July.

The HAMi community is bringing two keynotes, a lightning talk, a technical session, and a project booth to the show: from PD-disaggregated heterogeneous inference deployment, to dynamic MIG partitioning in five minutes, to a production story of GPU virtualization at thousand-GPU scale. If you are attending, come say hi.

<!-- truncate -->

![KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China 2026](/img/blog-hami-at-kubecon-china-2026-banner.png)

## Conference Details

- **Dates**: September 7-9, 2026 (September 8-9 are the main conference days)
- **Venue**: Shanghai International Convention Center, Shanghai, China
- **Registration**: [Official website](https://www.lfopensource.cn/kubecon-cloudnativecon-openinfra-summit-pytorch-conference-china/)
- **Full schedule**: [Program schedule](https://www.lfopensource.cn/kubecon-cloudnativecon-openinfra-summit-pytorch-conference-china/program/schedule/)

All HAMi-related activities happen on September 8: two keynotes in the morning, a lightning talk, a production session in the afternoon, and a booth staffed all day. The full keynote lineup is subject to the official schedule. All sessions will be recorded and published on CNCF channels after the event.

## Keynote 1: Operating Frontier Intelligence at Scale

- **Time**: September 8, 09:12-09:22
- **Location**: Grand Ballroom II + III
- **Speakers**: Chris Aniszczyk (CTO, Cloud and Infrastructure, The Linux Foundation) and Xiao Zhang (Co-founder & CEO, Dynamia)

The opening keynote of the conference. Chris Aniszczyk, CTO of the Linux Foundation, shares the stage with Xiao Zhang: once models are built and AI moves into production, the challenge shifts to making every GPU deliver value, scaling dynamically with demand, staying reliable, and understanding increasingly complex systems. Cloud native technology is becoming the operating system layer that supports it all. The talk also explores the growing role of observability as AI systems grow more complex, and why the next generation of AI infrastructure will depend on open technologies working together across the stack.

## Keynote 2: PD Disaggregation vLLM Deployment on Alternative AI Accelerators Using llm-d

- **Time**: September 8, 09:59-10:04
- **Location**: Grand Ballroom II + III
- **Speakers**: Jifei Wang (HAMi Approver, Dynamia) and Mengxuan Li (Co-founder & CTO, Dynamia)

[llm-d](https://github.com/llm-d) is a CNCF project building distributed LLM inference on Kubernetes. When an inference cluster no longer runs a single kind of GPU, how does the PD disaggregation (Prefill/Decode Disaggregation) architecture deploy vLLM efficiently on non-NVIDIA accelerators? This keynote presents llm-d's support for heterogeneous computing environments: HAMi brings heterogeneous GPU sharing and scheduling capabilities into llm-d's inference topology, letting partitioning, sharing, and scheduling work across hardware architectures. Five minutes, maximum density.

## Lightning Talk: From Static Slices to Elastic GPUs: Dynamic MIG with HAMi

- **Time**: September 8, 11:14-11:19
- **Location**: 5B + C
- **Speaker**: Jifei Wang (HAMi Approver, Dynamia)

Using NVIDIA MIG in Kubernetes usually means static pre-partitioning: operators must decide the partition layout of an entire card before workloads arrive. Partition too coarse and you waste capacity; partition too fine and you fragment the pool. By the time real workloads show up, the layout is often wrong.

This 5-minute lightning talk proposes a scheduling-driven alternative: HAMi integrates the scheduler with the device plugin, so GPU partitions follow real-time scheduling decisions: schedule first, partition second, instead of partition first, schedule second.

> GPU partitioning should follow scheduling, not precede it.

## Session: How Intsig Serves Billions of Document Scans: GPU Virtualization at Scale with HAMi

- **Time**: September 8, 14:30-15:00
- **Location**: Grand Ballroom II + III
- **Speakers**: Mengxuan Li (Co-founder & CTO, Dynamia) and Walter Duan (Intsig)

This one is a production story at thousand-GPU scale. [Intsig](https://www.intsig.com) (CamScanner, 300M+ downloads worldwide) runs an extreme GPU workload: a single OCR workload, extremely high concurrency, and roughly 1,000 GPUs, where the bottleneck is queueing time rather than placement.

The speakers will share how they migrated from Tencent QGPU to HAMi, gaining virtualization, scheduling, and monitoring in one stack, with queueing time down and utilization up. The talk will also disclose HAMi's production figures:

- **SF Express**: GPUs trimmed from 1,400 to 1,000 with no business impact
- **China Merchants Bank**: 10,000+ GPUs, utilization from 20% to 80%
- **NIO**: 10x CI efficiency improvement
- **ICBC**: GPU utilization from 20% to 70%

Beyond patterns that work, the talk also covers anti-patterns that burn money. For example, slicing a GPU below 1/6 backfires. The session closes with a live demo of Chaterm, Intsig's open-source AI terminal that operates GPU clusters in natural language.

## HAMi Booth: T-1

- **Table**: T-1 (Grand Ballroom I)
- **Time**: September 8, 10:30-19:00

HAMi maintainers will staff the booth throughout the day. Whether you are working on GPU sharing, struggling with utilization, or exploring multi-tenant GPU management, come talk to us about:

- GPU virtualization and sharing: memory and compute partitioning with isolation
- Scheduling and utilization optimization for AI workloads
- Choosing between MIG, vGPU, and other partitioning schemes
- Integrations with [Volcano](https://volcano.sh/), [Kueue](https://kueue.sigs.k8s.io/), [KAI Scheduler](https://github.com/NVIDIA/KAI-Scheduler), and [vLLM](https://github.com/vllm-project/vllm)

Come for the stickers and swag, scan to join the HAMi community, and give the project a Star.

## Warm-Up: HAMi Meetup Shanghai

If you are in Shanghai a bit early: on the afternoon of September 6 (Sunday), Dynamia and the HAMi community will co-host the **HAMi Meetup Shanghai · Incubating Special Event** in Wujiaochang. It is the first offline special event since HAMi moved to Incubating, featuring technical talks, a community panel, an Incubating milestone session, and a Community Night. [Register here](https://www.huodongxing.com/event/2874911381700).

See you in Shanghai on September 8. Find us at booth T-1.
