---
title: Tutorials
slug: /
---

Hands-on tutorials for learning HAMi by doing. Each lab is a step-by-step exercise with real, captured outputs: you build a cluster, install HAMi, and verify GPU partitioning behavior yourself.

## Concepts

Background knowledge that the labs build on.

- [GPU Software Stack Overview](./concepts/gpu-stack.md): the 5 layers from hardware to Kubernetes scheduling
- [Understanding GPU Drivers](./concepts/gpu-driver.md): kernel modules, NVML, and how to troubleshoot from the bottom up
- [HAMi Cluster Architecture](./concepts/hami-architecture.md): every component in a HAMi cluster and what breaks without it

## Labs

- [Lab 1: Online Installation](./labs/online-install.md): build a GPU Kubernetes cluster from scratch on a cloud VM and install HAMi
- [Lab 2: Local Fake GPU Setup](./labs/local-fake-gpu.md): learn the HAMi control plane on a laptop, no GPU required
- [Lab 3: GPU Partitioning](./labs/gpu-partitioning.md): run multiple Pods on one GPU with enforced VRAM and compute limits
- [Lab 4: GPU Slicing with DRA](./labs/hami-dra.md): the same outcome through Kubernetes-native Dynamic Resource Allocation (experimental)

## Requirements

Lab 2 runs on any laptop. Labs 1, 3, and 4 use one cloud VM with an NVIDIA T4 (about $0.55/hour on GCP); Labs 3 and 4 continue from the cluster Lab 1 builds, so a single VM session covers all three.
