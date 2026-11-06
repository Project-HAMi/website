---
title: "HAMi at ContainerDays Singapore 2026: From GPU Sharing to AI Factory"
date: "2026-10-30"
description: "A recap of five ContainerDays Singapore 2026 sessions covering HAMi: hands-on GPU scheduling, Neocloud GPU utilization, DRA integration, AI Factory architecture, and AI-native infrastructure."
tags: ["ContainerDays", "GPU", "Kubernetes", "AI", "Singapore"]
authors: [hami_community]
---

[ContainerDays & AI Context Singapore 2026](https://www.containerdays.io/containerdays-singapore-2026/) was held on October 27-28 at Suntec Singapore, bringing together practitioners in cloud native, AI infrastructure, and platform engineering. HAMi Community Manager [Jimmy Song](https://github.com/rootsongjc) and HAMi Contributor [Reza Jelveh](https://github.com/fishman) (both at Dynamia) presented a hands-on workshop and a conference talk, and HAMi appeared in three other sessions at the event.

![ContainerDays Singapore 2026](/img/containerdays-singapore-2026-recap/banner.png)

<!-- truncate -->

## Workshop: From Zero to Shared GPUs

The workshop **From Zero to Shared GPUs: Hands-on GPU Scheduling in Kubernetes with HAMi** walked participants through GPU sharing with a local lab built on kind. A mock device plugin registered two simulated NVIDIA A100-40GB GPUs, so participants ran the real HAMi Scheduler and observed requests, device selection, and Pod placement without physical GPUs.

![Workshop lab at ContainerDays Singapore 2026](/img/containerdays-singapore-2026-recap/workshop-demo.jpg)

One experiment made a key point visible: three Pods each requesting 15,000 MB of GPU memory and 30% of compute were placed across the two simulated GPUs, while a Pod requesting 45,000 MB stayed Pending. Even though the two cards had enough free memory combined, the scheduler must check whether a single device can satisfy the request, not just the node's free capacity.

The lab continued with a comparison of **binpack** and **spread** placement, and an overview of how HAMi combines with the **KAI Scheduler**, **Volcano**, and **Kubernetes DRA**, with HAMi-core providing runtime resource limits in each combination. Simulated GPUs are sufficient for validating scheduling logic; runtime isolation still needs to be verified on real hardware.

The [workshop slides](/resources/events/2026-containerdays-singapore/containerdays-singapore-2026-workshop.pdf) and the [lab guide](https://github.com/Project-HAMi/hami-workshop) are available online, with details on the [event page](/landing/containerdays-singapore).

## Talk: 10X Your Neocloud's GPU Utilization

Reza Jelveh's session **10X Your Neocloud's GPU Utilization with HAMi** addressed a practical question for Neocloud platforms: when GPUs must serve multiple tenants and workload types, how do you reduce idle capacity?

Surveys cited in the talk reported GPU utilization mostly between 5% and 20% across teams: workloads queue for GPUs while allocated GPUs sit underused. A time-series inference task needing about 1 GB of memory can still occupy an entire 141 GB H200 if allocation is whole-card only.

![Inference replicas sharing one GPU, scaling utilization while keeping p95 latency stable](/img/containerdays-singapore-2026-recap/inference-replicas.png)

For inference, adding replicas on the same card scales utilization: in the demo, ten replicas reached 100% GPU SM utilization at the same p95 latency. The "10X" in the title is not a universal promise, as results depend on the workload mix, resource configuration, and platform baseline. Large training jobs keep whole GPUs, untrusted tenants call for MIG or dedicated devices, and heterogeneous devices such as AMD GPUs and Ascend NPUs need per-vendor resource management, which HAMi supports alongside schedulers like Volcano, Kueue, and the KAI Scheduler. The talk also distinguished HAMi's two metric sources: allocation metrics from the Scheduler (port 9395) and usage metrics from vGPUmonitor (port 9394).

The [talk slides](/resources/events/2026-containerdays-singapore/containerdays-singapore-2026-10x.pdf) are available, with details on the [event page](/landing/containerdays-singapore-10x).

## DRA Allocates, But Who Enforces?

In **DRA Allocates, But Who Enforces? Closing the GPU Sharing Gap with HAMi**, Ivan Porta (Todea) examined the gap between DRA's resource allocation and runtime enforcement. DRA can describe and allocate devices through ResourceClaims, but the Kubernetes API does not by itself stop a container from exceeding its GPU quota at runtime.

The session showed how the HAMi components close that gap: the mutating webhook adjusts scheduling information, the scheduler extender participates in placement decisions, the device plugin registers and assigns devices, and HAMi-core intercepts CUDA calls in the container runtime to enforce memory and compute limits. HAMi-DRA can convert `nvidia.com/gpu` requests into DRA ResourceClaims, keeping the Pod's resource interface stable while the underlying mechanism evolves.

![Ivan Porta presenting on DRA and HAMi](/img/containerdays-singapore-2026-recap/ivan-porta.jpg)

## Will Everyone Build an AI Factory?

Saiyam Pathak (vCluster Labs) explored the path from a single GPU on a personal computer to an enterprise AI Factory. His live demo ran multiple teams' isolated Kubernetes clusters and inference workloads on the same GPU, using open-source projects including vCluster and HAMi.

![Saiyam Pathak presenting on AI Factory architecture](/img/containerdays-singapore-2026-recap/saiyam-pathak.jpg)

The takeaway: an AI Factory is not just a pile of GPUs. It is a software platform that organizes hardware into manageable compute environments, where Kubernetes handles orchestration and GPU sharing lets limited accelerator capacity serve more teams.

## From Cloud-Native to AI-Native

Xu Chen (DaoCloud) discussed Southeast Asia's shift from cloud-native application modernization toward AI-native platforms, covering open cloud-native AI platforms and the role of open-source ecosystems. HAMi was included in the stack as the project for sharing and managing heterogeneous compute devices in Kubernetes, alongside other cloud-native components for AI workloads.

![Xu Chen presenting on cloud-native to AI-native transformation](/img/containerdays-singapore-2026-recap/xu-chen.jpg)

## Common Threads

The five sessions approached different problems, but kept returning to the same questions: how resources are allocated, how limits are enforced at runtime, whether the scheduling policy fits the workload, and whether the platform can observe both allocated and used capacity.

GPU sharing is not a uniform answer for every workload, and finer partitioning is not automatically better. Choosing an allocation model means weighing workload characteristics, performance targets, isolation boundaries, and the platform's overall utilization.

The HAMi community will continue working on GPU sharing, heterogeneous compute management, Kubernetes scheduling, and runtime isolation. To get involved, visit the [community page](/community) or the [HAMi repository](https://github.com/Project-HAMi/HAMi).
