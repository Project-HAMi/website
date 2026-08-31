---
title: "HAMi at KubeCon + CloudNativeCon Japan 2026"
date: "2026-08-01"
description: "A recap of HAMi's presence at KubeCon + CloudNativeCon Japan 2026 in Yokohama, including a main-stage session on the SNOW 1000-GPU production blueprint and the HAMi booth."
tags: ["KubeCon", "GPU", "Kubernetes", "AI", "Japan"]
authors: [hami_community]
---

[KubeCon + CloudNativeCon Japan 2026](https://events.linuxfoundation.org/kubecon-cloudnativecon-japan/) was held July 28-30 at Pacifico Yokohama. HAMi took part with a main-stage session and a booth in the Project Pavilion. [Reza Jelveh](https://github.com/fishman) presented the session and staffed the booth.

For the full overview, talk slides, and the SNOW case study, see the [KubeCon Japan 2026 page](/landing/kubecon-japan).

<!-- truncate -->

## HAMi in the Keynote

![HAMi appeared in the keynote slides of Chris Aniszczyk and Jonathan Bryce at KubeCon Japan 2026](/img/kubecon-japan-2026-recap/keynote.jpg)

HAMi was featured in the opening keynote, appearing in the slides of CNCF CTO Chris Aniszczyk and Jonathan Bryce, Executive Director, Cloud and Infrastructure, The Linux Foundation.

## On Stage: Shared GPU Scheduling + Proactive Autoscaling

![Reza Jelveh (Dynamia) and Jeonghyun Kim (SNOW) presenting at KubeCon Japan 2026](/img/kubecon-japan-2026-recap/reza-snow.jpg)

The session [**Shared GPU Scheduling & Proactive Autoscaling: A Production Blueprint for 1000+ GPUs**](https://events.linuxfoundation.org/kubecon-cloudnativecon-japan/program/schedule/?id=1182713) was presented by Jeonghyun Kim (AI Engineer at SNOW) and Reza Jelveh.

The session described how SNOW serves Snow, Epik, and B612, three widely used AI applications reaching more than 200 million users, on over 1000 NVIDIA A100 GPUs. The architecture combines HAMi for GPU sharing with KEDA for proactive autoscaling, halving the GPUs required for the same traffic and improving recovery under load.

## At the Booth

![The HAMi booth at the KubeCon Japan 2026 Project Pavilion](/img/kubecon-japan-2026-recap/hami-booth.jpg)

At the HAMi booth in the Project Pavilion, engineers stopped by with questions including:

- How to introduce HAMi into an existing cluster
- How HAMi interoperates with **Volcano**, **Kueue**, and the **NVIDIA KAI Scheduler**
- Practical GPU scheduling problems: memory fragmentation, idle GPUs behind batch jobs, and inference workloads unable to obtain a predictable GPU slice

## Learn More

The talk, SNOW case study, complete metrics, slides, and ways to get involved are available on the [KubeCon Japan 2026 page](/landing/kubecon-japan). To join the discussion, visit the [HAMi community](/community).
