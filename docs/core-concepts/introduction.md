---
title: What is HAMi?
description: What HAMi is, the problem it solves, and its core features.
slug: /
---

HAMi (Heterogeneous AI Computing Virtualization Middleware) is an open source platform for managing heterogeneous AI computing devices in Kubernetes clusters. Formerly known as k8s-vGPU-scheduler, HAMi enables device sharing across multiple containers and workloads.

HAMi is a [Cloud Native Computing Foundation](https://cncf.io/) [Incubating project](https://landscape.cncf.io/?group=projects-and-products&project=incubating&item=orchestration-management--scheduling-orchestration--hami) and is listed in both the [CNCF Landscape](https://landscape.cncf.io/?group=projects-and-products&project=incubating&item=orchestration-management--scheduling-orchestration--hami) and [CNAI Landscape](https://landscape.cncf.io/?group=cnai&item=orchestration-management--scheduling-orchestration--hami).

## The problem

Kubernetes counts GPUs in whole numbers. A Pod that asks for `nvidia.com/gpu: 1` gets an entire card, even when its model needs 2 GiB of a 24 GiB card. The rest of the card's memory and compute cannot go to other Pods. GPU utilization stays low, expensive hardware goes to waste, and other Pods wait for the next free card.

![One GPU without HAMi and with HAMi](/img/docs/en/core-concepts/hami-before-after.svg)

## Key Features

### Device Sharing

- **Multi-device Support**: Compatible with various heterogeneous AI computing devices (GPUs, NPUs, and other accelerators)
- **Shared Access**: Multiple containers can simultaneously share devices for improved resource utilization

See [Device sharing](../key-features/device-sharing.md) and [Device supported by HAMi](../userguide/device-supported.md).

### Memory Management

- **Hard Limits**: Enforce strict memory limits inside containers to prevent resource conflicts
- **Dynamic Allocation**: Allocate device memory on-demand based on workload requirements
- **Flexible Units**: Specify memory allocation in MB or as a percentage of total device memory

See [Device sharing](../key-features/device-sharing.md) and [Device resource isolation](../key-features/device-resource-isolation.md).

### Device Specification

- **Type Selection**: Request specific types of heterogeneous AI computing devices
- **UUID Targeting**: Specify exact devices using device UUID for precise allocation

See [Scheduling](./scheduling.md).

### Ease of Use

- **Transparent to Workloads**: No code changes required inside containers
- **Simple Deployment**: Install and uninstall using Helm with minimal configuration

See [Quick Start](../get-started/deploy-with-helm.md).

### Open Governance

- **Community Driven**: Jointly initiated by organizations across internet, finance, manufacturing, and cloud services
- **Neutral Development**: Managed as an open source project with CNCF

See [Governance](../contributor/governance.md).

## How it works

When a Pod asks for HAMi resources, a webhook routes it to the HAMi scheduler, which picks a node and a card with enough room. On that node, the HAMi device plugin mounts the card and HAMi-Core into the container, and HAMi-Core enforces the container's memory and compute limits. See [Architecture](./architecture.md).

## Next steps

- [Choose your setup](../get-started/choose-your-setup.md), then [Quick Start](../get-started/deploy-with-helm.md)
- [Architecture](./architecture.md): the components and the path a Pod takes
