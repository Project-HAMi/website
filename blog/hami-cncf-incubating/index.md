---
title: "HAMi Moves to CNCF Incubating Stage"
date: "2026-07-02"
description: "On July 2, 2026, the CNCF Technical Oversight Committee (TOC) voted to accept HAMi as a CNCF Incubating project."
authors: [hami_community]
tags: ["CNCF", "Incubating"]
---

We are excited to announce that **on July 2, 2026, HAMi was accepted as a CNCF Incubating project**, with the CNCF Technical Oversight Committee passing [the incubation vote](https://github.com/cncf/toc/issues/1775) unanimously in favor.

This is an important milestone following HAMi joining the CNCF as a Sandbox project in August 2024. It means the CNCF Technical Oversight Committee (TOC) recognizes HAMi's mature technical and security practices, active community, real production adoption, and open ecosystem integration.

<!-- truncate -->

Our sincere thanks to CNCF TOC Chair [Karena Angell](https://www.linkedin.com/feed/update/urn:li:activity:7478594903292399616/), who led the due diligence, TOC member Kevin Wang, TAG-Runtime for its technical review, and all the adopters who shared their insights.

HAMi is a heterogeneous compute virtualization and scheduling middleware for Kubernetes. Through container-level hard isolation, it finely partitions GPU memory and compute so that multiple workloads can safely share a single accelerator. Founded by maintainers [Xiao Zhang](https://github.com/wawa0210) and [Mengxuan Li](https://github.com/archlitchi), it is built by developers worldwide under CNCF governance.

Today, HAMi is used by hundreds of organizations across a dozen-plus accelerators including NVIDIA, Ascend, Cambricon, Hygon, Moore Threads, Enflame, Kunlunxin, MetaX, AWS Neuron, and Vastai (see the [supported device list](https://project-hami.io/docs/userguide/device-supported)). [CNCF case studies](https://project-hami.io/case-studies) document production practices at China Merchants Bank, SNOW Corp., NIO, KE Holdings, DaoCloud, SF Technology, and PREP EDU — spanning finance, automotive, mobility, logistics, education, and cloud services. HAMi-core integrates with the Kubernetes default scheduler, [Volcano](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_gpu_sharing.md), [Kueue](https://github.com/kubernetes-sigs/kueue), [Koordinator](https://koordinator.sh/docs/user-manuals/device-scheduling-gpu-share-with-hami), and the [NVIDIA KAI Scheduler](/blog/hami-core-adopted-by-nvidia-kai-scheduler).

This milestone was made possible by a global community of nearly 500 contributors from dozens of countries. [Dynamia](https://www.dynamia.ai), [DaoCloud](https://www.daocloud.io), [4Paradigm](https://www.4paradigm.com), [NVIDIA](https://www.nvidia.com), and [Huawei Cloud](https://www.huawei.com), together with many individual developers, user enterprises, and ecosystem partners, have each made irreplaceable contributions.

Entering Incubation is a higher starting point. The community will keep investing in upstream R&D, ecosystem adaptation, and production-grade deployment, working with global partners to make HAMi the open infrastructure for heterogeneous compute management in the AI era.

Come build with us on [GitHub](https://github.com/Project-HAMi/HAMi) and the [community](/community).
