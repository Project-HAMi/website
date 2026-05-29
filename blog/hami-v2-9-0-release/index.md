---
title: "HAMi v2.9.0 Release: Ascend User-Space Partitioning, DRA Generally Available, and Scheduler Ecosystem Expansion"
date: "2026-05-11"
description: "HAMi v2.9.0 is officially released. This milestone version delivers breakthroughs in heterogeneous device virtualization depth, scheduler ecosystem expansion, and Kubernetes native standards, featuring Ascend 910C HAMi-core mode, HAMi-DRA GA, and Volcano vGPU upgrade to v0.19."
tags: ["Release", "GPU", "Kubernetes", "DRA"]
authors: [hami_community]
---

The HAMi community is proud to announce the official release of **HAMi v2.9.0**. This represents a milestone version in terms of **heterogeneous device virtualization depth, scheduler ecosystem expansion, and Kubernetes native standards alignment**.

v2.9.0 introduces the Ascend 910C HAMi-core mode, HAMi-DRA general availability, and Volcano vGPU upgrade to v0.19, along with systematic enhancements in observability, security, and stability. This release also welcomes 19 new contributors for the first time.

This article provides a detailed overview of the major updates in v2.9.0.

<!-- truncate -->

## Core Features and Capability Updates

This section introduces the core features and capability updates in HAMi v2.9.0, covering heterogeneous device virtualization, DRA standard interfaces, scheduler ecosystem, and upstream component alignment.

### Ascend 910C HAMi-core Virtualization Mode

HAMi v2.9.0 introduces HAMi-core mode for Huawei Ascend devices, implementing user-space virtualization interception that enables fine-grained sharing of memory and compute without modifying application code.

HAMi-core intercepts and manages ACL (Ascend Computing Language) calls purely through software at the user-space level, achieving **MB-level memory and percentage-level compute** fine-grained partitioning. A single Ascend 910C card can simultaneously serve multiple inference or training tasks with different specifications, without requiring application code changes or specific hardware support.

Compared to traditional SR-IOV hardware partitioning, HAMi-core represents a qualitative leap in partitioning granularity and flexibility:

| Dimension | Exclusive Mode | SR-IOV | HAMi-core (v2.9) |
| :- | :- | :- | :- |
| Memory partitioning | Not partitionable | Fixed per VF | **MB-level precise control** |
| Compute partitioning | Not partitionable | Proportional per VF | **Percentage-level flexible config** |
| Partition count | 1 Pod/card | Typically 2-4 VF/card | **10+ Pod/card** |
| Hardware support required | No | Yes | **No** |
| Application code changes | No | No | **No** |

For example, a 64GB Ascend 910C card can be allocated to multiple tasks as follows:

```yaml
# Task 1: LLM inference, 32GB memory + 50% compute
resources:
  limits:
    hami.io/vnpu-core: "50"
    hami.io/vnpu-core-memory: "32768"

# Task 2: Model fine-tuning, 16GB memory + 30% compute
resources:
  limits:
    hami.io/vnpu-core: "30"
    hami.io/vnpu-core-memory: "16384"

# Task 3: Lightweight inference, 8GB memory + 20% compute
resources:
  limits:
    hami.io/vnpu-core: "20"
    hami.io/vnpu-core-memory: "8192"
```

Core capabilities include:

- **Ascend 910C SuperPod support**: Module-pair level resource allocation for SuperPod environments, fully leveraging hardware advantages in distributed training
- **vNPU-Core virtualization**: New `hami-vnpu-core` resource type supporting annotation-based node filtering and multi-device requests for more flexible compute partitioning strategies
- **User-space interception**: Software-based memory and compute partitioning without invading application containers, significantly increasing tasks per card

To enable this feature, set `ascend.hamiVnpuCore` to `true` in the Helm values. It can also be enabled in the `ascend-device-plugin` node configuration. The cluster supports mixed mode where some nodes have it enabled and others do not.

In v2.9, user Pods must explicitly declare `huawei.com/vnpu-mode: 'hami-core'` in annotations to use this feature. Pods without this declaration will continue to use the template-based vNPU partitioning from the previous version, and may result in pending tasks if no compatible nodes are available.

> This feature has been validated in China Merchants Bank's production environment. Based on the HAMi-vNPU-Core software partitioning solution, China Merchants Bank achieved 100% resource pooling of Ascend 910C compute and high-performance communication for large models, significantly improving domestic compute resource utilization.

Thanks to Huawei Cloud Canada Lab and China Merchants Bank [@ashergaga](https://github.com/ashergaga) for their contributions.

This release also updates the [HAMi-core performance benchmark data](/docs/userguide/benchmark). For detailed benchmark procedures, refer to the [project documentation](https://github.com/Project-HAMi/HAMi/tree/master/benchmarks).

### HAMi-DRA Solution: Lightweight HAMi

In HAMi v2.9.0, HAMi-DRA has reached general availability, upgraded to v0.2.0. HAMi-DRA is an independent implementation project based on the Kubernetes Dynamic Resource Assignment (DRA) standard, positioned as a "lightweight HAMi."

DRA can serve as a standard connection between HAMi and other schedulers, enabling plug-and-play integration with custom schedulers like Volcano and kai-scheduler without code-level modifications.

DRA is the next-generation device resource declaration and allocation mechanism being advanced by the Kubernetes community. The core principles of HAMi-DRA are:

- **Preserve user habits**: Continue using Device Plugin syntax with automatic conversion to DRA resource models underneath
- **Internalize complexity**: Webhook, Driver, and lifecycle management are all handled by the system
- **Drive evolution through community collaboration**: Contributors from different companies validate solutions in real production environments

HAMi-DRA has currently implemented solutions for NVIDIA, Ascend, and Enflame platforms. It simplifies the scheduling chain through native Kubernetes capabilities and provides a unified scheduling layer that abstracts hardware differences, enabling heterogeneous compute management.

> HAMi-DRA project repository: [https://github.com/Project-HAMi/HAMi-DRA](https://github.com/Project-HAMi/HAMi-DRA)

### Volcano vGPU Upgrade to v0.19 with CDI Support

HAMi v2.9.0 synchronizes the associated Volcano vGPU Device Plugin to v0.19, maintaining consistency with the Volcano upstream. It also adds support for Container Device Interface (CDI) mode.

Benefits of CDI support:

- More standard device injection methods, reducing coupling between device management and container runtimes
- Clearer device declaration and lifecycle management
- Fixed MIG allocation issues in CDI mode, further improving NVIDIA GPU flexible partitioning

Volcano vGPU Device Plugin repository: [https://github.com/Project-HAMi/volcano-vgpu-device-plugin](https://github.com/Project-HAMi/volcano-vgpu-device-plugin)

### New Vastai (Vastai Technologies) Device Support

Vastai Technologies is a leading domestic general-purpose GPU chip design company. v2.9.0 adds management support for their devices, offering two allocation modes:

| Mode | Description | Use Cases |
| :- | :- | :- |
| **Full-Card Mode** | Each Pod exclusively occupies an entire GPU | LLM training, performance-sensitive inference |
| **Die Mode** | Partitioned by chip Die, scheduler aware of AIC topology to reduce cross-Die communication overhead | Multi-task sharing, resource utilization optimization |

Usage example:

```yaml
# Label the node first: kubectl label node <node-name> vastai=on
# Configure in values.yaml:
# vastai:
#   enabled: true
#   customresources:
#     - vastaitech.com/va

# Full-card mode
resources:
  limits:
    vastaitech.com/va: "1"

# Die mode (with device selection annotations)
# annotations:
#   vastaitech.com/use-va: "0"
#   vastaitech.com/nouse-va: "1"
```

With Vastai device support, HAMi now covers over a dozen heterogeneous compute devices including **NVIDIA, Huawei Ascend, Cambricon, Hygon DCU, Biren, Enflame, MetaX, Kunlunxin, AMD, Iluvatar, Enflame, AWS Neuron, and Vastai Technologies**, making it one of the widest-supported heterogeneous device virtualization and scheduling projects in the Kubernetes ecosystem.

## Observability and Security Enhancements

### Observability Improvements

v2.9.0 includes multiple observability improvements:

- vGPUmonitor adds `--metrics-bind-address` parameter for custom metrics endpoint configuration
- New Prometheus ServiceMonitor in Helm Chart covering scheduler and device plugins
- Prometheus metrics and label naming aligned with community best practices
- New device type label support in metrics
- Improved log level control with related unit tests

### Security and Stability Improvements

Notable security and stability improvements include:

- Scheduler route adds `io.LimitReader` to prevent DoS attacks ([#554](https://github.com/Project-HAMi/HAMi/issues/554))
- Go language upgraded to 1.26.2, fixing known security issues
- NodeLock optimized with exponential backoff strategy, improving scalability for large-scale clusters
- Fixed null pointer issue in Leader election, enhancing HA deployment stability
- Fixed division by zero in scheduler scoring
- Fixed device allocation for multi-container Pods (including init containers)
- Fixed Linux kernel 6.17 handshake boundary issue in NVIDIA health checks
- Fixed global image tag overriding component-level image tags
- Fixed device filtering not taking effect
- Fixed annotation inconsistency between Device Plugin and Scheduler
- Fixed stale Deleted handshake causing node scheduling interruption

## More Notable Updates

- **Webhook resource quota checking**: Validates GPU resource requests against quota limits at Pod submission stage, preventing post-scheduling rollbacks
- **HAMi-skills debugging tools**: New k8s-debug-gpu-pod skill and vGPU metrics summarizer skill for GPU troubleshooting and operations
- **vLLM compatibility fix**: Fixed initialization error when using tensor parallelism in vLLM > 0.18
- **local-deploy support**: New local-deploy target for quick deployment to minikube/kind clusters for development and debugging

## Community and Ecosystem Progress

### DRA Ecosystem Alliance

DRA is becoming the next-generation device management model in Kubernetes, but faces implementation uncertainty on the vendor side and high usage barriers on the user side. To address this, the HAMi community announced the formation of a DRA Ecosystem Alliance at the 3rd HAMi Meetup in Shenzhen.

Goals of the DRA Ecosystem Alliance:

- Connect device vendors with users to drive DRA adoption in real-world scenarios
- Advance DRA standardization to reduce engineering costs for heterogeneous device integration
- Provide a unified scheduling layer that abstracts hardware differences for heterogeneous compute management

### 3rd HAMi Meetup Shenzhen

On April 25, the HAMi community successfully hosted the [3rd offline Meetup](/blog/hami-meetup-shenzhen-2026) in Shenzhen. Seven technical experts from CNCF, SF Technology, China Merchants Bank, Enflame Technology, Sangfor Technologies, Pro Wise Technology, and Migua Intelligence shared insights on topics including AI infrastructure cloud-native evolution, GPU compute pooling, heterogeneous scheduling, and DRA technology outlook.

Notably, SF Technology shared practical experience in increasing average cluster GPU utilization from 40% to 90%, while China Merchants Bank demonstrated their HAMi-based heterogeneous AI compute scheduling optimization, reducing cross-machine scheduling probability by 30%.

### New Contributors

The v2.9.0 release welcomed 19 new contributors to the HAMi project from different countries and organizations:

[@maishivamhoo123](https://github.com/maishivamhoo123), [@hoteye](https://github.com/hoteye), [@jsl9208](https://github.com/jsl9208), [@ashergaga](https://github.com/ashergaga), [@Atroxgod](https://github.com/Atroxgod), [@MyoungHaSong](https://github.com/MyoungHaSong), [@charford](https://github.com/charford), [@jcustenborder](https://github.com/jcustenborder), [@Nov11](https://github.com/Nov11), [@ilia-medvedev](https://github.com/ilia-medvedev), [@Yonsun-w](https://github.com/Yonsun-w), [@CFH2436](https://github.com/CFH2436), [@kenwoodjw](https://github.com/kenwoodjw), [@anandj91](https://github.com/anandj91), [@ManishSharma1609](https://github.com/ManishSharma1609), [@maverick123123](https://github.com/maverick123123), [@almazkhalikov](https://github.com/almazkhalikov), [@lin121291](https://github.com/lin121291), [@mesutoezdil](https://github.com/mesutoezdil)

Thank you to every contributor!

## Upgrade Guide

Upgrade to v2.9.0 via Helm:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
helm upgrade hami hami-charts/hami -n hami-system
```

For complete installation documentation, refer to: [https://project-hami.io/docs/installation/online-installation](https://project-hami.io/docs/installation/online-installation)

:::warning Upgrade notes
- If using Volcano vGPU mode, please note CDI-related configuration changes
- If using Ascend devices and wish to enable HAMi-core mode, refer to the Ascend configuration section in the latest documentation
- It is recommended to verify compatibility in a test environment before upgrading
:::

## Community Updates

During the v2.9.0 release cycle, the HAMi community remained active in technical advocacy, product ecosystem, and user practices. Here are notable community developments.

### Community Events

- **KubeCon EU 2026**: HAMi appeared in Amsterdam as a CNCF Sandbox project, setting up a Project Pavilion booth and presenting on the main stage Keynote Demo, showcasing the latest Kubernetes GPU virtualization advancements to developers worldwide. [Read recap](/blog/kubecon-eu-2026-recap)
- **KCD Beijing 2026**: Over 1,000 registrations, setting a new record for KCD Beijing. The HAMi community was invited to present "From Device Plugin to DRA: GPU Scheduling Paradigm Upgrade and HAMi-DRA Practice." [Read recap](/blog/kcd-beijing-2026-dra-gpu-scheduling)
- **3rd HAMi Meetup Shenzhen**: Seven experts from CNCF, SF Technology, China Merchants Bank, Enflame Technology, and others shared insights on the cloud-native future of AI computing. [Read recap](/blog/hami-meetup-shenzhen-2026)
- **HAMi WebUI Official Release**: The HAMi community launched the open-source GPU monitoring dashboard [HAMi WebUI](https://github.com/Project-HAMi/HAMi-WebUI) v1.1.0, presenting the entire GPU cluster in a single visual interface and completing the loop from GPU scheduling to visual observability. [Read blog post](/blog/introducing-hami-webui)

### Website and Documentation Overhaul

Since the v2.8.0 release, the HAMi website and documentation have undergone the largest-scale restructuring in history. Approximately 195 PRs were merged into the website repository, covering the following areas:

- **Website redesign**: Homepage redesign, architecture diagram updates, unified blog styling, mobile optimization, enhanced footer, and migration from external search to built-in search
- **New documentation**: GPU virtualization principles page, HAMi quick start guide, real-time GPU monitoring guide, upgrade and uninstallation guide, HAMi WebUI user and developer guides, Vast.ai device documentation
- **i18n synchronization**: Continuous alignment of Chinese and English documentation, sidebar label localization, multilingual announcement support
- **Community content**: New blog posts covering KubeCon EU 2026 recap, KCD Beijing 2026 DRA presentation, HAMi WebUI release, Meetup Shenzhen recap; updated adopter information for Beike, NIO, SNOW Corp., Pro Wise Technology, and others
- **Quality governance**: De-marketing tone across the site, grammar corrections, code block language annotations, format standardization, contributor guide and governance documentation improvements

Thanks to [@mesutoezdil](https://github.com/mesutoezdil) for contributions to optimizing HAMi official documentation.

Website: [https://project-hami.io](https://project-hami.io)

Website repository: [https://github.com/Project-HAMi/website](https://github.com/Project-HAMi/website)

### CNCF Case Studies

An increasing number of enterprises are using HAMi in production for GPU virtualization and heterogeneous compute scheduling. The following case studies have been published on the CNCF official website:

- **Beike**: Built the AIStudio intelligent computing platform based on Kubernetes + HAMi, increasing GPU utilization from 13% to 37% (nearly 3x), supporting 10,000+ concurrent Pods and processing tens of millions of daily business requests. [Read full story](https://www.cncf.io/case-studies/ke-holdings-inc/)
- **NIO**: Adopted HAMi mixed GPU sharing strategy for autonomous driving workloads, improving CI pipeline GPU utilization by approximately 10x, reducing simulation workload GPU time by approximately 30%, covering a production cluster of approximately 600 GPUs. [Read full story](https://www.cncf.io/case-studies/nio/)
- **SNOW Corp.**: SNOW Corp. under Korea's NAVER manages 1,000+ A100 GPUs, using HAMi for GPU sharing to handle 700% traffic spikes, halving GPU requirements and estimating savings of $17.4 million. [Read full story](https://www.cncf.io/case-studies/snow-corp/)

## Summary

HAMi v2.9.0 is a significant release focused on heterogeneous device virtualization depth, Kubernetes native standards alignment, and scheduler ecosystem expansion.

Building on GPU virtualization, HAMi is evolving toward a broader heterogeneous compute unified management and scheduling platform. Through the introduction of Ascend HAMi-core mode, HAMi-DRA general availability, and Volcano vGPU upgrade, HAMi continues to expand its technical depth and ecosystem breadth in heterogeneous compute scheduling.

We sincerely welcome more developers, users, and ecosystem partners to join the HAMi community and jointly advance GPU virtualization and heterogeneous compute scheduling capabilities.

---

**Related links:**

- GitHub Release: [https://github.com/Project-HAMi/HAMi/releases/tag/v2.9.0](https://github.com/Project-HAMi/HAMi/releases/tag/v2.9.0)
- HAMi-DRA: [https://github.com/Project-HAMi/HAMi-DRA](https://github.com/Project-HAMi/HAMi-DRA)
- Volcano vGPU Device Plugin: [https://github.com/Project-HAMi/volcano-vgpu-device-plugin](https://github.com/Project-HAMi/volcano-vgpu-device-plugin)
- Documentation: [https://project-hami.io](https://project-hami.io)
- Community Discord (recommended): [https://discord.gg/Amhy7XmbNq](https://discord.gg/Amhy7XmbNq)
- Community CNCF Slack: [https://cloud-native.slack.com/archives/C08844T5WBQ](https://cloud-native.slack.com/archives/C08844T5WBQ)
