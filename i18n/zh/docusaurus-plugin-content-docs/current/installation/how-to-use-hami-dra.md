---
title: 如何使用 HAMi DRA
translated: true
---

# Kubernetes 的 HAMi DRA

## 介绍
HAMi 已经提供了对 K8s [DRA](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)（动态资源分配）功能的支持。
通过在集群中安装 [HAMi Dra webhook](https://github.com/Project-HAMi/HAMi-DRA) 你可以在 DRA 模式下获得与传统使用方式一致的使用体验。

## 前提条件
* Kubernetes 版本 >= 1.34 并且 DRA Consumable Capacity [featuregate](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/) 启用

## 安装

您可以使用以下命令添加 HAMi 图表仓库并更新依赖：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm dependency build
```

然后用以下命令进行安装：
```bash
helm install hami hami-charts/hami --set dra.enable=true -n hami-system
```

> **注意：** *DRA 模式与传统模式不兼容，请勿同时启用。*

## 支持的设备
DRA 功能的实现需要对应设备的 DRA Driver 提供支持，目前支持的设备包括：
* [NVIDIA GPU](../userguide/NVIDIA-device/dynamic-resource-allocation.md)

请参照对应的页面安装设备驱动。