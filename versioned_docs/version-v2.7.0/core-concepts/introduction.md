---
title: What is HAMi?
slug: /
---

## HAMi: Heterogeneous AI Computing Virtualization Middleware {#hami-heterogeneous-ai-computing-virtualization-middleware}

Heterogeneous AI Computing Virtualization Middleware (HAMi), formerly known as
k8s-vGPU-scheduler is an "All-in-One" chart designed to manage Heterogeneous
AI Computing Devices in a k8s cluster. It can provide the ability to share
Heterogeneous AI devices among tasks.

HAMi is a [Cloud Native Computing Foundation](https://cncf.io/) SandBox project
  & [Landscape project](https://landscape.cncf.io/?item=orchestration-management--scheduling-orchestration--hami)
  & [CNAI Landscape project](https://landscape.cncf.io/?group=cnai&item=cnai--general-orchestration--hami).

## Why HAMi {#why-hami}

- **Device sharing**

  - Support multiple Heterogeneous AI Computing devices
  - Support device-sharing for multi-device containers

- **Device Memory Control**

  - Hard limit inside container
  - Support dynamic device memory allocation
  - Support memory allocation by MB or by percentage

- **Device Specification**

  - Support specify a type of certain heterogeneous AI computing devices
  - Support specify a certain heterogeneous AI computing devices using device UUID

- **Easy to try**

  - Transparent to tasks inside container
  - Install/Uninstall using helm, easy and green

- **Open and Neutral**
  - Jointly initiated by Internet, finance, manufacturing, cloud providers, etc.
  - Target for open governance with CNCF

## What's Next {#whats-next}

Here are some recommended next steps:

- Learn HAMi's [architecture](./architecture.md)
- Start to [install HAMi](../installation/prequisities.md)
