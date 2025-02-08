---
title: What is HAMi?
slug: /

---

## HAMi: Heterogeneous AI Computing Virtualization Middleware

Heterogeneous AI Computing Virtualization Middleware (HAMi), formerly known as k8s-vGPU-scheduler, is an "all-in-one" chart designed to manage Heterogeneous AI Computing Devices in a k8s cluster. It can provide the ability to share Heterogeneous AI devices among tasks.

HAMi is a [Cloud Native Computing Foundation](https://cncf.io/) sandbox project & [Landscape project](https://landscape.cncf.io/?item=orchestration-management--scheduling-orchestration--hami) & [CNAI Landscape project](https://landscape.cncf.io/?group=cnai&item=cnai--general-orchestration--hami).

## Why HAMi:
- __Device sharing__
    - Support multiple Heterogeneous AI Computing devices
    - Support device-sharing for multi-device containers

- __Device Memory Control__
    - Hard limit inside container
    - Support dynamic device memory allocation
    - Support memory allocation by MB or by percentage

- __Device Specification__
    - Support specify a type of certain heterogeneous AI computing devices  
    - Support specify a certain heterogeneous AI computing devices using device UUID

- __Easy to try__
    - Transparent to tasks inside container
    - Install/Uninstall using helm, easy and green

- __Open and Neutral__
    - Jointly initiated by Internet, finance, manufacturing, cloud providers, etc.
    - Target for open governance with CNCF


## What's Next

Here are some recommended next steps:

- Learn HAMi's [architecture](./architecture.md).
- Start to [install HAMi](../installation/prequisities.md).