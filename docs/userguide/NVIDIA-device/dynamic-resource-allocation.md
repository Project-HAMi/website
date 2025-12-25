---
title: Dynamic Resource Allocation
translated: true
---

# Dynamic Resource Allocation

## Introduction

HAMi has supported K8s [DRA](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/) (Dynamic Resource Allocation) on NVIDIA devices.
By installing hami-k8s-dra-driver, your cluster scheduler can discover Nvidia GPU devices on nodes.

## Prerequisites

* The underlying container runtime (e.g., containerd or CRI-O) has [CDI](https://github.com/cncf-tags/container-device-interface?tab=readme-ov-file#how-to-configure-cdi) enabled

## Installation

The Nvidia DRA driver is built into HAMi and does not need to be installed separately. You only need to specify the `--set hami-dra-webhook.drivers.nvidia.enabled=true` parameter when [installing HAMi DRA](../../installation/how-to-use-hami-dra.md). For more information, please refer to [Installing Nvidia DRA driver](https://github.com/Project-HAMi/HAMi-DRA?tab=readme-ov-file#installation)

## Verify Installation

To verify the installation is successful, use the following command to view GPU devices:
```bash
kubectl get resourceslices.resource.k8s.io -A
```