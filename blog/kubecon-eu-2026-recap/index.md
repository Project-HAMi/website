---
title: "KubeCon EU 2026 Recap: HAMi From Project Pavilion to Main Stage Keynote Demo"
date: "2026-03-31"
description: "KubeCon EU 2026 has wrapped up in Amsterdam, sending a clear signal: cloud native is evolving from an application runtime platform into the foundation for AI infrastructure. As a CNCF Sandbox project, HAMi made a landmark appearance across the Maintainer Summit, technical sessions, Project Pavilion, and the main stage Keynote Demo."
tags: ["KubeCon", "GPU", "Kubernetes", "AI"]
authors: [hami_community]
---

The recently concluded **KubeCon + CloudNativeCon Europe 2026** sent an increasingly clear signal to the industry:

**Cloud native is rapidly evolving from an "application runtime platform" into the operational foundation for AI infrastructure.**

<!-- truncate -->

In Amsterdam, discussions around Kubernetes, GPUs, inference serving, Agentic AI, and heterogeneous compute scheduling have moved beyond concepts into concrete engineering practice, community collaboration, and infrastructure paradigm evolution.

As a CNCF Sandbox project, HAMi made a landmark appearance at this year's conference, spanning the Maintainer Summit, Lightning Talks, Project Pavilion, and the main stage Keynote Demo.

![Mengxuan Li and Reza Jelveh at the KubeCon Keynote Live Demo](/img/kubecon-eu-2026-recap/keynote-live-demo.jpg)

## Kubernetes Is Entering the AI Infra Era

If Kubernetes previously focused on container orchestration, microservice governance, and cloud native application delivery, the questions dominating this KubeCon were quite different:

- How can AI workloads run more efficiently on Kubernetes?
- How can GPUs be shared, partitioned, scheduled, and isolated?
- How can LLM serving and underlying resource management work in concert?
- How can heterogeneous compute be unified into the cloud native scheduling system?

These questions point to a more fundamental shift:

> **Kubernetes is moving from "orchestrating applications" to "orchestrating compute."**

This is exactly where HAMi operates.

## Maintainer Summit: GPU Scheduling Enters Core Community Discussions

At the pre-conference **Maintainer Summit**, HAMi Maintainer Mengxuan Li shared HAMi's insights on AI workloads.

![HAMi Maintainer Mengxuan Li sharing AI Workloads insights at Maintainer Summit](/img/kubecon-eu-2026-recap/cto-maintainer-summit.png)

The team also participated in closed-door CNCF meetings, engaging in in-depth discussions with CNCF TOC Chair Karena Angell, Red Hat, and vLLM community members Brian Stevens and Robert Shaw.

![Discussions on GPU Sharing with CNCF TOC, Red Hat, and vLLM community](/img/kubecon-eu-2026-recap/cncf-toc-redhat-vllm.png)

This discussion was particularly representative, as it didn't stay at the level of "how to build features for a project," but addressed a bigger question:

> **When LLM serving, GPU resource management, and Kubernetes begin converging in real production environments, what new abstractions does the infrastructure layer need?**

During the exchange, the direction HAMi is pushing drew noticeable attention. There is a growing realization that GPUs can no longer be treated as simple devices — they are becoming an infrastructure resource layer that can be scheduled, shared, and governed.

This is also why the collaboration between HAMi and projects like vLLM is becoming increasingly natural. At this event, both sides began exploring joint content collaboration and technical exchange, indicating that the AI Infra ecosystem is accelerating from "standalone projects" to "composable collaboration."

Additionally, HAMi is currently applying for CNCF Incubation and participated in discussions as a representative project during the TAG workshop.

![TAG Workshop discussing CNCF project governance](/img/kubecon-eu-2026-recap/tag-workshop.jpg)

<!-- truncate -->

## Two Technical Sessions: From Community Problems to Engineering Solutions

### Xiao Zhang: K8s Issue #52757 — Sharing GPUs Among Multiple Containers

This issue ([#52757](https://github.com/kubernetes/kubernetes/issues/52757)) is not new — it's a long-standing "unsolved problem" in the Kubernetes community.

With the explosion of AI workloads, this problem has been amplified:

- Inference serving requires more granular GPU usage
- Multi-tenant environments demand resource sharing
- AI workload patterns mean GPUs are no longer suitable for exclusive allocation

This is why what appears to be a low-level problem has become one of the core issues in AI infrastructure.

![Xiao Zhang presenting HAMi at the KubeCon Cloud Native AI forum](/img/kubecon-eu-2026-recap/zhangxiao-gpu-sharing.png)

HAMi Maintainer Xiao Zhang's talk started from a classic, long-standing problem in the Kubernetes community: **How can multiple containers share a GPU?**

While this question seems specific, it actually points to a challenge the entire AI infrastructure ecosystem faces. Once you enter inference, batch processing, online serving, and multi-tenant mixed scenarios, GPUs can no longer be simply allocated in an "exclusive whole-card" manner.

The significance of this talk lies in putting HAMi's solution back into the original context of the Kubernetes community: not building an isolated solution from scratch, but addressing a long-standing upstream problem that hasn't been fully resolved.

### Mengxuan Li: Dynamic, Smart, Stable GPU-Sharing Middleware in Kubernetes

HAMi Maintainer Mengxuan Li's talk focused on HAMi's core architecture and capabilities, systematically covering:

- GPU virtualization
- GPU sharing and scheduling mechanisms
- Stability and production readiness design
- Approaches to AI workload resource management in Kubernetes

![Mengxuan Li presenting HAMi at KubeCon](/img/kubecon-eu-2026-recap/limengxuan-hami-talk.png)

This wasn't just a project feature introduction — it was answering a more practical question:

> **Before Kubernetes natively solves the GPU sharing problem, how can enterprises actually run AI workloads — stably and efficiently?**

## Project Pavilion: Face-to-Face Global Community Exchange

Beyond the speaking sessions, HAMi also had a booth at the KubeCon EU 2026 **Project Pavilion**.

![A steady stream of visitors at the HAMi booth](/img/kubecon-eu-2026-recap/booth-crowd.jpg)

Over the course of the event, the booth became a hub for intensive exchanges. Visitors included:

- Overseas developers and contributors
- Enterprise users and platform teams
- University and research institution staff
- Cloud providers and GPU ecosystem professionals
- Community members interested in AI infra, heterogeneous compute, and Kubernetes GPU scheduling

We also connected with more community contributors on-site, including contributors from India — Rudraksh Karpe and Shivay Lamba.

![Indian contributors Rudraksh Karpe (center) and Shivay Lamba (right)](/img/kubecon-eu-2026-recap/indian-contributors.png)

In the Poster Session, community contributors created a diagram illustrating "Kubernetes as the Universal GPU Control Plane."

![Kubernetes as the Universal GPU Control Plane](/img/kubecon-eu-2026-recap/k8s-gpu-control-plane.jpg)

The value of these exchanges goes beyond "increasing visibility" — it helps validate something:

> **GPU scheduling, resource sharing, and heterogeneous compute management have become a real global demand, not a niche problem for any single market.**

## Keynote Demo: HAMi on the KubeCon Main Stage

![KubeCon Keynote hosted by Linux Foundation CEO Jonathan and CNCF CTO Chris](/img/kubecon-eu-2026-recap/keynote-hosts.png)

If the talks and booth represented "recognition within professional circles," the most iconic moment of this KubeCon was undoubtedly:

> **HAMi became a Chinese open source project to take the KubeCon EU 2026 main stage Keynote, completing a live Demo.**

This was the most critical moment of the entire conference.

During the main keynote, HAMi Maintainer **Mengxuan Li** and **Reza Jelveh** delivered a live Demo showcasing multi-workload GPU scheduling on Kubernetes.

![Mengxuan Li and Reza during the live Demo](/img/kubecon-eu-2026-recap/limengxuan-reza-demo.jpg)

The Demo used two typical AI workloads: YOLO inference serving and Qwen3-8B large model inference. In the traditional Kubernetes scheduling model, these two types of tasks would typically require exclusive GPU access. Under HAMi's scheduling model, GPUs are decomposed into "compute + memory" resource units that can be shared on-demand by multiple Pods.

In the live demonstration, multiple YOLO instances were scheduled to run on the same GPU, while the Qwen3-8B model was co-located with other workloads on the same GPU through a binpack strategy. Different types of AI workloads coexisted on the same GPU while maintaining resource isolation and controllable scheduling.

What this Demo presented was not just an improvement in GPU utilization, but more importantly, a new infrastructure capability: GPUs transitioning from "devices" to "schedulable resources," with Kubernetes gaining the foundational ability to manage AI workloads.

### Why Does This Matter?

**First, AI infrastructure topics have entered the KubeCon main narrative.**

In the past, the KubeCon main stage focused primarily on Kubernetes itself and foundational platform capabilities. This time, a GPU resource management project like HAMi entering the main keynote demo signals that **how AI workloads run on Kubernetes has become a question the cloud native community must address head-on.**

**Second, GPU scheduling is no longer a "niche topic."**

GPU sharing, virtualization, resource isolation, and heterogeneous scheduling were previously confined to specialized circles. Now, they've evolved from "specialized domain problems" to "common infrastructure problems." In TOC discussions and community exchanges, multiple projects (including vLLM-related practices) have begun to directly depend on underlying GPU scheduling capabilities.

**Third, this is the result of accumulated HAMi community effort.**

An open source project making it to the KubeCon main stage isn't just about "having a feature to demo." Behind it is the alignment of technical direction with industry trends, community value being recognized, and the project's position in the ecosystem becoming clearer.

This keynote demo also served as a positioning confirmation:

> **HAMi is evolving from a GPU sharing tool into an important component of the AI compute resource layer on Kubernetes.**

### AI Native Summit

Following the main KubeCon conference, the co-located AI Native Summit was also held.

Compared to the main KubeCon, the AI Native Summit's discussions focused more directly on one question: **AI workload operational efficiency is becoming the new infrastructure bottleneck.**

In this context, GPU virtualization and scheduling are no longer internal Kubernetes optimizations — they are key factors directly impacting model serving costs, response times, and system throughput.

Reza Jelveh presented "HAMi: Heterogeneous GPU Virtualization and Scheduling for AI-Native Infrastructure on Kubernetes."

![Reza presenting HAMi at AI Native Summit](/img/kubecon-eu-2026-recap/reza-ai-native-summit.png)

Reza also participated in a panel discussion titled "AI Native Technology."

![Reza participating in the AI Native Technology panel discussion](/img/kubecon-eu-2026-recap/reza-panel-discussion.png)

The AI Native Summit brought together technical experts from cloud native, AI infrastructure, and the telecom industry for in-depth discussions on the evolution of AI-native architectures. The conference focused on how infrastructure can evolve from traditional service-oriented, request-response patterns to a new generation of platforms designed for inference, conversation, and autonomous decision-making — covering key topics such as AI gateways, inference scheduling, multi-model routing, and multi-tenant isolation.

## A Notable Detail: HAMi Enters the Broader Cloud Native Context

Beyond the live demo and talks, there was another important external signal from this conference: HAMi was mentioned as a **representative case in the expanded Cloud Native Landscape** during the main stage keynote.

![HAMi highlighted as a Cloud Native Landscape expansion project during Keynote](/img/kubecon-eu-2026-recap/landscape-mention.jpg)

This indicates that HAMi's significance extends beyond "a project doing GPU scheduling" — it's being viewed as a representative of next-generation infrastructure problems within the broader cloud native evolution.

The cloud native community is realizing:

- The existing resource model built around CPU / memory / network / storage isn't enough
- The AI era demands new resource abstractions
- GPUs, inference, heterogeneous devices, and workload governance are becoming key infrastructure topics for the next phase

HAMi sits precisely at this inflection point, offering a clear, pragmatic, and implementable engineering path.

## Key Takeaways

Looking back at KubeCon, several things stand out for the community:

### 1. Global Community Focus on AI Infra Is Rapidly Increasing

People are no longer satisfied with just discussing models and applications. They're asking:

- How does it run at the infrastructure level?
- How are resources scheduled?
- How do we improve efficiency?
- How do we ensure system stability?

### 2. The Kubernetes-AI Convergence Is Entering Deep Waters

The question is no longer "can it run?" but: can it run efficiently, at scale, and stably in production environments?

### 3. HAMi's Positioning Is Becoming Clearer

HAMi is no longer just "a project that does GPU sharing." It's gradually forming its unique positioning:

> **The GPU resource layer and heterogeneous compute scheduling capability for Kubernetes.**

## Conclusion

KubeCon EU 2026 has reinforced our conviction: **cloud native won't be replaced by AI — it will be redefined by AI.**

From booth exchanges to technical sessions to the main stage demo, HAMi's presence at this conference was more than just an event appearance — it was a signal:

> **Cloud native infrastructure around GPUs, inference, and heterogeneous compute is entering a new phase.**

If you're also interested in AI infrastructure, GPU virtualization, and the evolution of Kubernetes in the AI era, we invite you to join the HAMi community and help drive the next steps in this space.

![HAMi community members and contributors group photo at KubeCon](/img/kubecon-eu-2026-recap/team-photo.jpg)
