---
title: 动态资源分配
translated: true
---

# 动态资源分配

## 介绍

HAMi 已经在 NVIDIA 设备上支持了 K8s [DRA](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)（动态资源分配）功能。
通过安装 hami-k8s-dra-driver 你的集群调度器可以发现节点上的 Nvidia GPU 设备。

## 前提条件

* 底层容器运行时（例如 containerd 或 CRI-O）启用 [CDI](https://github.com/cncf-tags/container-device-interface?tab=readme-ov-file#how-to-configure-cdi)

## 安装

Nvidia dra driver 内置在 HAMi 中，无需单独安装，只需要在[安装 HAMi DRA](../../installation/how-to-use-hami-dra.md) 时指定 `--set hami-dra-webhook.drivers.nvidia.enabled=true` 参数即可。更多信息请参考[安装 Nvidia DRA driver](https://github.com/Project-HAMi/HAMi-DRA?tab=readme-ov-file#installation)

## 验证安装

验证安装成功，请使用以下命令查看 GPU 设备：
```bash
kubectl get resourceslices.resource.k8s.io -A
```