---
title: "HAMi v2.8.0 Release: Full DRA Support and High Availability Scheduling—Towards Standardized GPU Resource Management"
date: "2026-01-20"
description: "HAMi v2.8.0 is now officially released. This milestone release delivers architectural completeness, enhanced scheduling reliability, and ecosystem alignment, featuring DRA support, Leader election mechanism, CDI mode support, and more."
tags: ["Release", "GPU", "Kubernetes", "DRA"]
authors: [hami_community]
---

Te HAMi community is proud to announce the official release of **HAMi v2.8.0**. This represents a milestone version in terms of **architectural completeness, scheduling reliability, and ecosystem alignment**.

v2.8.0 not only introduces multiple key feature updates but also delivers systematic enhancements in **Kubernetes native standard alignment, heterogeneous device support, production readiness, and observability**, making HAMi more suitable for AI production clusters that require long-term operation with high stability and clear evolution paths.

This article provides a detailed overview of the major updates in v2.8.0.

<!-- truncate -->

## Core Features and Capability Updates

This section introduces the core features and capability updates in HAMi v2.8.0, covering standard interface support, high availability mechanisms, device compatibility, and more.

### Official Support for Kubernetes Device Resource Assignment (DRA)

HAMi v2.8.0 adds support for **Kubernetes Device Resource Assignment (DRA)** and provides an independent implementation project:

- [https://github.com/Project-HAMi/HAMi-DRA](https://github.com/Project-HAMi/HAMi-DRA)

DRA is the next-generation device resource declaration and allocation mechanism being advanced by the Kubernetes community, aiming to provide a **more standardized, composable, and scalable** resource management model for GPUs/AI accelerators and other devices.

HAMi's support for DRA marks the project's transition from "custom device scheduling logic" to **Kubernetes native standard interfaces** in device resource management. This not only lays the foundation for more complex GPU/AI accelerator usage patterns but also opens space for HAMi's long-term evolution in the upstream ecosystem.

> A separate technical article will cover DRA's design philosophy, usage methods, and comparison with existing patterns.

### Leader Election Mechanism for Multiple Scheduler Instances

For large-scale clusters or high-availability deployment scenarios, HAMi v2.8.0 introduces a **Leader election mechanism for multiple Scheduler instances** to enhance the stability and operability of the scheduling layer. This mechanism offers the following advantages:

- Avoids resource conflicts from concurrent scheduling by multiple instances
- Improves the high availability of the Scheduler component
- Provides a more robust operational model for long-running production clusters

This mechanism makes HAMi more suitable for deployment in production environments with high requirements for stability and fault tolerance.

### NVIDIA Device Support for Container Device Interface (CDI) Mode

HAMi v2.8.0 adds support for **NVIDIA [CDI (Container Device Interface)](https://github.com/cncf-tags/container-device-interface)** mode, further reducing the coupling between device management and container runtime. Key features include:

- Using more standard device injection methods
- Providing clearer device declaration and lifecycle management
- Laying the foundation for future multi-runtime and multi-device models

Users can choose between the traditional environment variable mode (`envvar`) or CDI mode (`cdi-annotations`) through the `deviceListStrategy` configuration in `values.yaml`.

This capability drives HAMi's continued evolution toward **more cloud-native and composable device management**.

### Alignment with NVIDIA k8s-device-plugin v0.18.0

In v2.8.0, HAMi synchronizes upgrades and aligns with **NVIDIA's official [k8s-device-plugin](https://github.com/NVIDIA/k8s-device-plugin) v0.18.0** to achieve the following goals:

- Maintain compatibility with NVIDIA's latest device management models
- Reduce user adaptation costs in hybrid deployment scenarios
- Ensure HAMi serves as an "enhancement layer" for device management and scheduling, rather than a forked implementation

This alignment helps users smoothly introduce HAMi into their existing NVIDIA GPU ecosystem.

### Mock Device Plugin Support

To improve testability and development efficiency in engineering practice, v2.8.0 adds **[Mock Device Plugin](https://github.com/Project-HAMi/mock-device-plugin)** capabilities, suitable for the following scenarios:

- Feature validation and development debugging
- Device simulation in CI/testing environments
- Reducing costs for new feature validation and regression testing

### Build Information and Metrics System Updates

HAMi v2.8.0 includes enhancements and refinements in observability, specifically:

- New `hami_build_info` metric
- More complete version and build information output at startup
- Official removal of previously deprecated legacy metrics

These improvements make version tracking, issue troubleshooting, and operational visibility clearer in production environments.

## Heterogeneous Devices and Vendor Ecosystem Progress

HAMi continues to evolve around the **unified management and scheduling capabilities of multiple GPU/AI accelerator types**.

During the v2.8.0 cycle, the community has continued advancing in the following directions:

- Adaptation and capability enhancement for different GPU/AI accelerator device models
- Continued support and feature additions for domestic GPU/AI chips
- Continuous integration of related features and bug fixes (see GitHub PR records for details)

These improvements further enhance HAMi's availability and expansion space in heterogeneous compute environments.

## Upstream and Downstream Ecosystem Integration Progress

HAMi is not just an independent project but also continues to co-evolve with key components in the Kubernetes AI ecosystem. Current major integration directions include:

- **Kueue**: The HAMi community has contributed enhancement capabilities to the Kueue project, enabling native support for HAMi's device resource management and scheduling model, providing heterogeneous device scheduling support for batch AI job queue management
- **vLLM**: Fixed compatibility issues in multi-card scenarios (see related issues [#1461](https://github.com/Project-HAMi/HAMi/issues/1461) and [#1381](https://github.com/Project-HAMi/HAMi/issues/1381))

These ecosystem integrations help users build more complete compute scheduling and resource management solutions in real AI workloads.

## Community and Project Progress

HAMi is not just a code repository but also a continuously evolving open-source community and project organization.

During the v2.8.0 cycle, the community has remained active in the following areas:

- Real-world usage feedback from users and vendors, such as the [DaoCloud user case](https://www.cncf.io/case-studies/daocloud/) of using HAMi to build GPU clouds, published on the CNCF official website

The HAMi community welcomes more developers, users, and ecosystem partners to participate in the project and jointly advance GPU virtualization and device scheduling capabilities.

## Summary

HAMi v2.8.0 is a significant version update focused on **standardization, production readiness, and ecosystem alignment**.

By introducing DRA, enhancing scheduling high availability capabilities, aligning with mainstream device plugins and runtime standards, and continuously expanding heterogeneous device and ecosystem integration, HAMi is steadily moving toward a more mature and sustainable GPU resource management and scheduling platform.
