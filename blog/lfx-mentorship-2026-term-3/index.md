---
title: "LFX Mentorship 2026 Term 3: Four Open-Source GPU Sharing Projects Open for Applications"
date: "2026-08-03"
description: "HAMi joins the Linux Foundation LFX Mentorship 2026 Term 3 (September to November). Mentee applications are open August 3 to August 18. Here is a guide to the four projects, mentors, timeline, and how to apply."
authors: [hami_community]
tags: ["LFX", "Mentorship", "CNCF", "Community"]
---

The **Linux Foundation LFX Mentorship Program** 2026 Term 3 is live, and **HAMi** is mentoring four open-source projects from September to November 2026.

Mentee applications open **August 3, 2026** and close **August 18, 2026**. Whether your interest is low-level C/C++ performance, GPU observability, container isolation security, or developer education, there is a project for you.

<!-- truncate -->

## What is the LFX Mentorship Program?

The LFX Mentorship Program is a Linux Foundation open-source mentorship initiative. Over a three-month term, accepted contributors work one-on-one with project maintainers on a defined deliverable. Selected mentees may receive a stipend from the LFX Mentorship Program (an educational grant; amount and disbursement are the organizer's responsibility, not the HAMi community's — see the FAQ below), plus hands-on production experience and a public contribution record in a CNCF community.

Each HAMi project in Term 3 represents roughly **350 hours** of work over the 12-week mentorship.

## Why HAMi?

HAMi is a CNCF Incubating project and the heterogeneous compute virtualization and scheduling middleware for Kubernetes. Without changing the GPU driver or the application, it virtualizes the GPU at the software layer through CUDA API interception (HAMi-Core, the `libvgpu.so` library injected into the container), partitioning GPU memory and compute so that multiple workloads safely share a single accelerator. It is used in production by hundreds of organizations across more than a dozen accelerator types, integrates with the Kubernetes default scheduler, Volcano, Kueue, Koordinator, and the NVIDIA KAI Scheduler, and is built by a global community of nearly 500 contributors.

Joining HAMi means doing open source at the center of the AI infrastructure wave.

## The Four Term 3 Projects

### 1. HAMi GPU Sharing Workshop and Documentation

- Upstream issue: [Project-HAMi/website#656](https://github.com/Project-HAMi/website/issues/656)
- LFX page: [HAMi GPU Sharing Workshop and Documentation](https://mentorship.lfx.linuxfoundation.org/project/ab5693b7-9759-48e2-b609-f48af6b82206)
- Stack: Kubernetes, HAMi, Markdown, Docusaurus
- Skills: Technical writing, documentation testing, troubleshooting, GitHub workflow
- Mentors: Reza Jelveh ([@fishman](https://github.com/fishman)), Jimmy Song ([@rootsongjc](https://github.com/rootsongjc))

This project creates practical, reproducible learning materials that help users and new contributors deploy HAMi, understand GPU sharing, and troubleshoot common installation, scheduling, and allocation problems. Expected outcomes include hands-on workshop labs for HAMi GPU sharing, examples for AI inference workloads such as vLLM, Ray, or SGLang, troubleshooting guides, tested manifests with verification steps, and at least one contribution to the HAMi website or another mentor-approved HAMi repository.

### 2. Fix GPU Memory Isolation for Child and SSH Processes

- Upstream issue: [Project-HAMi/HAMi#2125](https://github.com/Project-HAMi/HAMi/issues/2125)
- LFX page: [Fix GPU Memory Isolation for Child and SSH Processes](https://mentorship.lfx.linuxfoundation.org/project/e5e55e8c-fab1-4453-9d49-a4a5e013c4c5)
- Stack: Kubernetes, Linux containers, NVIDIA GPU, HAMi-core
- Skills: Linux debugging, container runtime analysis, security reasoning, C/C++, testing
- Mentors: Mengxuan Li ([@archlitchi](https://github.com/archlitchi)), Jimmy Song ([@rootsongjc](https://github.com/rootsongjc))

Processes started later inside a HAMi-managed container, including child processes and processes reached through SSH or a new login shell, may not retain the expected GPU memory limit. This project investigates and fixes that isolation boundary. Expected outcomes include a reproducible test case and documented root cause, a maintainer-reviewed design covering the intended isolation boundary, compatibility, and failure modes, a maintainer-approved implementation (or a validated design or prototype when platform constraints limit delivery), regression tests covering the original process, child process, SSH, and new-shell scenarios, plus configuration and migration documentation.

### 3. Reduce HAMi-core Initialization Lock Contention

- Upstream issue: [Project-HAMi/HAMi#1662](https://github.com/Project-HAMi/HAMi/issues/1662)
- LFX page: [Reduce HAMi-core Initialization Lock Contention](https://mentorship.lfx.linuxfoundation.org/project/ce2ebae3-6936-409d-a9d7-c98b109ec814)
- Stack: C/C++, Linux, CUDA, NVML, HAMi-core
- Skills: Linux concurrency, performance profiling, benchmarking, synchronization design, testing
- Mentors: Mengxuan Li ([@archlitchi](https://github.com/archlitchi)), Shouren Yang ([@Shouren](https://github.com/Shouren))

When hundreds of processes initialize CUDA concurrently and compete for the shared unified lock, HAMi-core startup performance degrades noticeably. This project reduces initialization latency and contention while preserving correctness. Expected outcomes include a reproducible benchmark for concurrent HAMi-core initialization, a maintainer-approved locking design, an implementation with concurrency and regression tests, performance measurements of startup latency, throughput, and relevant resource usage, plus design and operational-impact documentation.

### 4. HAMi GPU Observability: Metrics and Dashboards

- Upstream issue: [Project-HAMi/HAMi#2126](https://github.com/Project-HAMi/HAMi/issues/2126)
- LFX page: [HAMi GPU Observability: Metrics and Dashboards](https://mentorship.lfx.linuxfoundation.org/project/dd302799-03ec-4184-b289-4d59a41fe7ed)
- Stack: Prometheus, Grafana, OpenTelemetry, Kubernetes, Go, HAMi
- Skills: Metrics instrumentation, PromQL, dashboard design, observability, Kubernetes debugging, HAMi internals
- Mentors: Mesut Oezdil ([@mesutoezdil](https://github.com/mesutoezdil)), Reza Jelveh ([@fishman](https://github.com/fishman)), Jimmy Song ([@rootsongjc](https://github.com/rootsongjc))

This project improves the usefulness, consistency, and documentation of HAMi GPU observability for operators running shared GPU workloads. The focus is on practical metrics and dashboards, while keeping tracing work bounded to a design and proof of concept for one mentor-approved control-plane path. Expected outcomes include a gap analysis of current HAMi metrics, exporters, labels, dashboards, and documentation, maintainer-reviewed improvements to Prometheus metrics and labels across the device plugin and scheduler extension, a versioned Grafana dashboard, documentation covering metric semantics, units, labels, cardinality, and example PromQL, an OpenTelemetry trace design and bounded proof of concept for one selected workflow, practical alerting or SLO guidance, and at least one reviewed and merged contribution involving metrics, dashboards, tests, or documentation.

## Mentor Team

The four projects are guided by five HAMi maintainers:

- **Mengxuan Li** ([@archlitchi](https://github.com/archlitchi))
- **Jimmy Song** ([@rootsongjc](https://github.com/rootsongjc))
- **Shouren Yang** ([@Shouren](https://github.com/Shouren))
- **Mesut Oezdil** ([@mesutoezdil](https://github.com/mesutoezdil))
- **Reza Jelveh** ([@fishman](https://github.com/fishman))

Each project has at least one technical mentor and one community mentor, covering architecture and code review as well as onboarding and CNCF workflow guidance.

## Timeline

| Phase                         | Dates                                |
| ----------------------------- | ------------------------------------ |
| Project proposals (completed) | July 1 to July 28, 2026              |
| **Mentee applications**       | **August 3 to August 18, 2026**      |
| Application review            | August 19 to September 1, 2026       |
| **Mentorship period**         | **September 7 to November 27, 2026** |

The 12-week mentorship breaks into three phases:

- **Month 1 (September): onboarding.** Understand HAMi architecture and community workflow, set up your environment, open a first issue, and aim to get it merged.
- **Month 2 (October): main implementation.** Drive the core work, join community discussions, and share progress in meetings or on Slack.
- **Month 3 (November): delivery.** Finish deliverables, add documentation, and present results to the community.

## How to Apply

Applications go through the LFX platform. Materials to prepare (see each project's LFX page for specifics):

1. Resume
2. Cover letter
3. School enrollment verification (or equivalent)
4. Participation permission from school or employer
5. Coding challenge
6. A project-specific custom prerequisite (requires file submission)

Suggested steps:

1. Create an account on the [LFX Mentorship platform](https://mentorship.lfx.linuxfoundation.org/).
2. Review the four projects above, pick the one that best matches your skills and interests, and open its LFX page.
3. Submit all materials and complete the coding challenge before the **August 18** deadline.
4. Wait for review results (**August 19 to September 1**).

## FAQ

**Can I apply for more than one project?** We recommend focusing on the one that best matches your skills and interests, and investing in a high-quality application.

**Do I need to be a student?** No. LFX is open to a broad range of contributors, but you will need to provide school enrollment verification or an employer participation permission, per platform requirements.

**What is the stipend amount?** The stipend is administered by the LFX Mentorship Program (run by the Linux Foundation, funded by the Linux Foundation, Intel, and others). It is an educational grant, not wages. Under the Fairer Stipend Model, it is calculated by Purchasing Power Parity (PPP) and ranges from 1,000 to 6,600 USD depending on the mentee's country of residence, paid in two installments after the midterm evaluation (October 21) and the final evaluation (November 25). Amount determination and disbursement are the organizer's responsibility, not the HAMi community's. See the [Linux Foundation announcement](https://www.linuxfoundation.org/blog/strengthening-lfx-mentoring-a-fairer-stipend-model-and-a-shared-standard-of-excellence) for details.

**Can I apply without prior HAMi experience?** Yes. Familiarizing yourself with the [HAMi GitHub](https://github.com/Project-HAMi/HAMi) codebase and tackling a good-first-issue beforehand will make your application more competitive.

## Get Started

The application deadline is **August 18, 2026**, so time is short. Pick your project now:

- LFX application pages for all four projects are in their sections above
- HAMi repository: [Project-HAMi/HAMi](https://github.com/Project-HAMi/HAMi)
- Join the HAMi Discord: [discord.gg/Amhy7XmbNq](https://discord.gg/Amhy7XmbNq)
- More community channels: [HAMi community](/community)

We look forward to doing open source with you in Term 3.
