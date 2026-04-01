---
title: "HAMi at KubeCon Europe 2026: Building the GPU Resource Layer in Kubernetes"
date: "2026-03-19"
description: "HAMi will be featured in multiple activities at KubeCon Europe 2026, including Project Pavilion booth, technical sessions, main stage demo, and post-conference AI events. As a CNCF Sandbox project, HAMi focuses on GPU virtualization, sharing, and scheduling, which is increasingly intersecting with AI infrastructure topics in the Kubernetes ecosystem."
tags: ["KubeCon", "GPU", "Kubernetes", "AI"]
authors: [hami_community]
---

Next week, HAMi will be featured in multiple activities at [KubeCon + CloudNativeCon Europe 2026](https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/), including Project Pavilion booth, technical sessions, main stage demo, and post-conference AI-related events.

As a CNCF Sandbox project, HAMi focuses on GPU virtualization, sharing, and scheduling, which is increasingly intersecting with AI infrastructure topics in the Kubernetes ecosystem. KubeCon + CloudNativeCon Europe 2026 will be held in Amsterdam from March 23-26, with March 23 as pre-event programming and March 24-26 as the main conference.

<!-- truncate -->

![KubeCon EU 2026 attracts 13,000 attendees](/img/blog-hami-at-kubecon-eu-2026-kubecon.png)

## Why This KubeCon Matters

Looking at the cloud native community discussions over the past few years, a clear trend emerges: AI is moving from the application layer into Kubernetes' resource layer, scheduling layer, and control layer.

The discussions around GPUs are no longer limited to "device visibility" or "driver availability," but have extended to sharing, partitioning, utilization, multi-tenant isolation, and AI workload scheduling semantics.

The official agenda of KubeCon Europe 2026 reflects this trend across keynotes, AI-related sessions, Project Pavilion, and co-located events.

In this context, HAMi's problem space becomes clearer: it's not simply about "making Kubernetes recognize GPUs," but making GPUs a resource layer capability that can be abstracted, shared, and scheduled.

This is why this KubeCon is more than just a project showcase for the HAMi community—it's an opportunity to engage with the broader cloud native ecosystem.

## Finding HAMi at KubeCon

![Welcome to HAMi Booth](/img/blog-hami-at-kubecon-eu-2026-booth.png)

HAMi will have a booth at Project Pavilion for in-person exchanges with community members, users, and maintainers.

- **Booth**: **P-13B**
- **Times**:
  - **March 24 (Tuesday) 15:10–19:00**
  - **March 26 (Thursday) 12:30–14:00**

If you're attending, stop by the HAMi Booth to discuss:

- GPU virtualization and sharing in Kubernetes
- Resource scheduling and utilization optimization for AI workloads
- Multi-tenant GPU resource management
- HAMi's integration with ecosystem projects like [Volcano](https://volcano.sh/), [Kueue](https://kueue.sigs.k8s.io/), [vLLM](https://github.com/vllm-project/vllm), and others

Project Pavilion is the project showcase area within the main KubeCon exhibition, designed for community projects, maintainers, and developers to connect.

## HAMi @ KubeCon Europe 2026 Event Overview

### 1. Opening Keynote

- **Time**: March 24, 09:00–09:35
- **Location**: Hall 12
- **Speakers**: Jonathan Bryce (Linux Foundation Executive Director) & Chris Aniszczyk (CNCF CTO)
- **Agenda**: [Keynote: Welcome + Opening Remarks](https://kccnceu2026.sched.com/event/2CtKk/keynote-welcome-+-opening-remarks-jonathan-bryce-executive-director-cloud-and-infrastructure-linux-foundation-chris-aniszczyk-cto-cloud-and-infrastructure-linux-foundation?iframe=no)

This opening keynote will be delivered by leadership from Linux Foundation and CNCF.

For community members focused on AI infrastructure, the keynote serves as an observation window: Is the main cloud native narrative embracing more AI, GPU, and resource management topics?

### 2. HAMi Technical Sessions (Lightning Talks)

#### GPU Sharing in Kubernetes

- **Time**: March 23, 17:15–17:25
- **Location**: Hall 7 · Room B
- **Speaker**: Xiao Zhang (CEO, Dynamia, HAMi Maintainer)
- **Agenda**: [K8s Issue #52757: Sharing GPUs Among Multiple Containers](https://colocatedeventseu2026.sched.com/event/2DY9v/cllightning-talk-k8s-issue-?iframe=yes&w=100%&sidebar=yes&bg=no#52757-sharing-gpus-among-multiple-containers-xiao-zhang-dynamiaai)

This lightning talk will address Kubernetes' long-standing GPU sharing problem, discussing the background, challenges, and implementation paths for multi-container GPU sharing.

#### HAMi Project Technical Deep Dive

- **Time**: March 23, 14:43–14:48
- **Location**: Elicium 2
- **Speaker**: Mengxuan Li (CTO, Dynamia, HAMi Maintainer)
- **Agenda**: [HAMi: Dynamic, Smart, Stable GPU-Sharing Middleware in Kubernetes](https://kccnceu2026.sched.com/event/2EFyZ/project-lightning-talk-hami-dynamic-smart-stable-gpu-sharing-middleware-in-kubernetes-mengxuan-li-maintainer?iframe=yes&w=100%&sidebar=yes&bg=no)

This session will focus on HAMi's core architecture and capabilities, including GPU virtualization, sharing and scheduling mechanisms, and the project's design philosophy around stability and production readiness.

### 3. Maintainer Summit

- **Time**: March 22
- **Information**: [Maintainer Summit](https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/features-add-ons/maintainer-summit/)

HAMi will also participate in the KubeCon Maintainer Summit, engaging with maintainers around **Insights on AI Workloads**.

The Maintainer Summit is a maintainer-focused event held the day before the main conference, focusing on upstream collaboration, SIG/WG topics, and inter-project discussions.

For HAMi, this is an important venue to bring GPU resource management and AI workload topics into a broader maintainer context. The Maintainer Summit is confirmed for March 22 at RAI Amsterdam.

### 4. Poster Session

- **Time**: March 25, 13:15–14:15
- **Location**: Hall 1–5 · Gouda Zone · Poster Pavilion
- **Speakers**: Satyam Soni (Devtron) & Rudraksh Karpe (ZS Associates)
- **Agenda**: [Kubernetes as the Universal GPU Control Plane for AI Workloads](https://kccnceu2026.sched.com/event/2CW0q/poster-session-kubernetes-as-the-universal-gpu-control-plane-for-ai-workloads-satyam-soni-devtronai-rudraksh-karpe-zs-associates-inc?iframe=yes&w=100%&sidebar=yes&bg=no)

This poster session discusses the potential of Kubernetes as a GPU control plane from an ecosystem perspective—a direction highly relevant to HAMi's long-term focus.

### 5. Main Stage Demo

- **Time**: March 26, 10:03–10:18
- **Location**: Hall 12
- **Speakers**: Mengxuan Li (CTO, Dynamia, HAMi Maintainer), Reza Jelveh (Head of Global Market & Solution Engineer, Dynamia)

The main stage demo during KubeCon will showcase GPU sharing and scheduling in action within Kubernetes. Compared to traditional slide presentations, this demo provides a more intuitive understanding of the complete chain from resource abstraction to system implementation.

### 6. AI Native Summit

- **Time**: March 27, 09:00–16:00
- **Location**: Van der Valk Hotel Amsterdam – Zuidas
- **Agenda**: [AI Native Summit Hosted by ETSI ISG NFV](https://kccnceu2026.sched.com/event/2HKYM/ai-native-summit-hosted-by-etsi-isg-nfv-separate-registration-required?iframe=no)

After the main conference, the AI Native Summit is also worth attention. This event is better suited for system-level discussions of the resource layer and control layer in AI infrastructure, and Kubernetes' role within them.

## Beyond HAMi: Other Topics to Follow

If you're attending this KubeCon, in addition to HAMi-related activities, we recommend focusing on these areas:

- Device Management / DRA
- AI workload scheduling
- GPU observability
- Inference platforms and AI reference stacks
- GPU sharing and resource abstraction

While these topics are spread across different venues, they all point to one question: **How can Kubernetes gain stronger resource management and scheduling capabilities in the AI era?**

## Community Updates and Follow-up Content

During the conference, the HAMi community will continue to curate and publish related content, including technical session highlights, on-site demonstrations, and observations on AI infrastructure trends.

Stay connected:

- [HAMi GitHub Repository](https://github.com/project-hami/hami)
- [HAMi Community Website](https://project-hami.io)

If you'll be in Amsterdam, come find us at Project Pavilion.

`📍 HAMi Booth: P-13B`
