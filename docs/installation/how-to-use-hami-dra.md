---
title: How to Use HAMi DRA
translated: true
---

# HAMi DRA for Kubernetes

## Introduction
HAMi has provided support for K8s [DRA](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/) (Dynamic Resource Allocation).
By installing the [HAMi DRA webhook](https://github.com/Project-HAMi/HAMi-DRA) in your cluster, you can get a consistent user experience in DRA mode that matches the traditional usage.

## Prerequisites
* Kubernetes version >= 1.34 with DRA Consumable Capacity [featuregate](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/) enabled

## Installation

You can use the following commands to add the HAMi chart repository and update dependencies:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm dependency build
```

Then install with the following command:
```bash
helm install hami hami-charts/hami --set dra.enable=true -n hami-system
```

> **Note:** *DRA mode is not compatible with traditional mode. Do not enable both at the same time.*

## Supported Devices
The implementation of DRA functionality requires support from the corresponding device's DRA Driver. Currently supported devices include:
* [NVIDIA GPU](../userguide/NVIDIA-device/dynamic-resource-allocation.md)

Please refer to the corresponding page to install the device driver.