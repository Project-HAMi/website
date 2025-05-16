---
title: HAMi 核心设计
translated: true
---

## 介绍

HAMi-core 是一个用于 CUDA 环境的钩子库，它是容器内的 GPU 资源控制器，已被 [HAMi](https://github.com/HAMi-project/HAMi) 和 [volcano](https://github.com/volcano-sh/devices) 采用。

![img](../resources/hami-arch.png) 

## 特性

HAMi-core 具有以下特性：
1. 虚拟化设备内存

![image](../resources/sample_nvidia-smi.png)

2. 通过自实现的时间分片限制设备利用率

3. 实时设备利用率监控

## 设计

HAMi-core 通过劫持 CUDA-Runtime(libcudart.so) 和 CUDA-Driver(libcuda.so) 之间的 API 调用来操作，如下图所示：

![img](../resources/hami-core-position.png)