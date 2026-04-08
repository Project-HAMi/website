---
title: "From Device Plugin to DRA: GPU Scheduling Paradigm Upgrade and HAMi-DRA Practice Review"
date: "2026-03-23"
description: "This post reviews HAMi community's technical sharing at KCD Beijing 2026, exploring the paradigm shift from Device Plugin to DRA in GPU scheduling, and HAMi-DRA's practical experience and performance optimization."
tags: ["KCD", "DRA", "GPU", "Kubernetes", "AI", "scheduling"]
authors: [hami_community]
---

[KCD Beijing 2026](https://community.cncf.io/events/details/cncf-kcd-beijing-presents-kcd-beijing-vllm-2026/) was one of the largest Kubernetes community events in recent years.

**Over 1,000 people registered, setting a new record for KCD Beijing.**

The HAMi community not only gave a technical talk but also set up a booth, engaging deeply with developers and enterprise users from the cloud-native and AI infrastructure fields.

The topic of this talk was:

> **From Device Plugin to DRA: GPU Scheduling Paradigm Upgrade and HAMi-DRA Practice**

This article combines the on-site presentation and slides for a more complete technical review. Slides download: [GitHub - HAMi-DRA KCD Beijing 2026](https://github.com/Project-HAMi/community/blob/main/talks/01-kcd-beijing-20260323/KCD-Beijing-2026-GPU-Scheduling-DRA-HAMi-Wang-Jifei-James-Deng.pdf).

<!-- truncate -->

## HAMi Community at the Event

The talk was delivered by two core contributors of the HAMi community:

- Wang Jifei (Dynamia, HAMi Approver, main HAMi-DRA contributor)
- James Deng (Fourth Paradigm, HAMi Reviewer)

They have long focused on:

- GPU scheduling and virtualization
- Kubernetes resource models
- Heterogeneous compute management

At the booth, the HAMi community discussed with attendees questions such as:

- Is Kubernetes really suitable for AI workloads?
- Should GPUs be treated as "scheduling resources" rather than "devices"?
- How to introduce DRA without breaking the ecosystem?

## Event Recap

![Main conference hall](/img/kcd-beijing-2026/keynote.jpg)

![Attendee registration](/img/kcd-beijing-2026/register.jpg)

![Attendees visiting the HAMi booth](/img/kcd-beijing-2026/booth.jpg)

![Volunteers stamping for attendees](/img/kcd-beijing-2026/booth2.jpg)

![Wang Jifei presenting](/img/kcd-beijing-2026/wangjifei.jpg)

![James Deng presenting](/img/kcd-beijing-2026/james.jpg)

## GPU Scheduling Paradigm is Changing

The core of this talk is not just DRA itself, but a bigger shift:

> **GPUs are evolving from "devices" to "resource objects".**

## 1. The Ceiling of Device Plugin

The problem with the traditional model is its limited expressiveness:

- Can only describe "quantity" (`nvidia.com/gpu: 1`)
- Cannot express:
  - Multi-dimensional resources (memory / core / slice)
  - Multi-card combinations
  - Topology (NUMA / NVLink)

👉 This directly leads to:

- Scheduling logic leakage (extender / sidecar)
- Increased system complexity
- Limited concurrency

## 2. DRA: Leap in Resource Modeling

DRA's core advantages are:

- **Multi-dimensional resource modeling**
- **Complete device lifecycle management**
- **Fine-grained resource allocation**

Key change:

> **Resource requests move from Pod fields → independent ResourceClaim objects**

## Key Reality: DRA is Too Complex

A key slide in the PPT, often overlooked:

### 👉 DRA request looks like this

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

And you also need to write a CEL selector:

```yaml
device.attributes["gpu.hami.io"].type == "hami-gpu"
```

### Compared to Device Plugin

```yaml
resources:
  limits:
    nvidia.com/gpu: 1
```

👉 The conclusion is clear:

> **DRA is an upgrade in capability, but UX is clearly degraded.**

## HAMi-DRA's Key Breakthrough: Automation

One of the most valuable parts of this talk:

### 👉 Webhook Automatically Generates ResourceClaim

HAMi's approach is not to have users "use DRA directly", but:

> **Let users keep using Device Plugin, and the system automatically converts to DRA**

### How it works

Input (user):

```yaml
nvidia.com/gpu: 1
nvidia.com/gpumemory: 4000
```

↓

Webhook conversion:

- Generate ResourceClaim
- Build CEL selector
- Inject device constraints (UUID / GPU type)

↓

Output (system internal):

- Standard DRA objects
- Schedulable resource expression

### Core value

> **Turn DRA from an "expert interface" into an interface ordinary users can use.**

## DRA Driver: Real Implementation Complexity

DRA driver is not just "registering resources", but full lifecycle management:

### Three core interfaces

- Publish Resources
- Prepare Resources
- Unprepare Resources

### Real challenges

- `libvgpu.so` injection
- `ld.so.preload`
- Environment variable management
- Temporary directories (cache / lock)

👉 This means:

> **GPU scheduling has entered the runtime orchestration layer, not just simple resource allocation.**

## Performance Comparison: DRA is Not Just "More Elegant"

A key benchmark from the PPT:

### Pod creation time comparison

- HAMi (traditional): up to ~42,000
- HAMi-DRA: significantly reduced (~30%+ improvement)

👉 This shows:

> **DRA's resource pre-binding mechanism can reduce scheduling conflicts and retries**

## Observability Paradigm Shift

An underestimated change:

### Traditional model

- Resource info: from Node
- Usage: from Pod
- → Needs aggregation, inference

### DRA model

- ResourceSlice: device inventory
- ResourceClaim: resource allocation
- → **Resource perspective is first-class**

👉 The change:

> **Observability shifts from "inference" to "direct modeling"**

## Unified Modeling for Heterogeneous Devices

A key future direction from the PPT:

> **If device attributes are standardized, a vendor-agnostic scheduling model is possible**

For example:

- PCIe root
- PCI bus ID
- GPU attributes

👉 This is a bigger narrative:

> **DRA is the starting point for heterogeneous compute abstraction**

## Bigger Trend: Kubernetes is Becoming the AI Control Plane

Connecting these points reveals a bigger trend:

### 1. Node → Resource

- From "scheduling machines"
- To "scheduling resource objects"

### 2. Device → Virtual Resource

- GPU is no longer just a card
- But a divisible, composable resource

### 3. Imperative → Declarative

- Scheduling logic → resource declaration

👉 Essentially:

> **Kubernetes is evolving into the AI Infra Control Plane**

## HAMi's Position

HAMi's positioning is becoming clearer:

> **GPU Resource Layer on Kubernetes**

- Downward: adapts to heterogeneous GPUs
- Upward: supports AI workloads (training / inference / Agent)
- Middle: scheduling + virtualization + abstraction

HAMi-DRA:

> **is the key step aligning this resource layer with Kubernetes native models**

## Community Significance

Another important point from this talk:

- Contributors from different companies collaborated
- Validated in real production environments
- Shared experience through the community

This is the way HAMi has always insisted on:

> **Promoting AI infrastructure through community, not closed systems**

## Summary

The real value of this talk is not just introducing DRA, but answering a key question:

> **How to turn a "correct but hard to use" model into a system you can use today?**

HAMi-DRA's answer:

- Don't change user habits
- Absorb DRA capabilities
- Handle complexity internally
