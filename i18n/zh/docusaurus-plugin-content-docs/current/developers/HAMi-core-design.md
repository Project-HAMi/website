---
title: HAMi-core 设计
---

HAMi-core是一个为 CUDA 环境设计的 hook 库，作为容器内的 GPU 资源控制器，已被
[HAMi](https://github.com/HAMi-project/HAMi) 和
[Volcano](https://github.com/volcano-sh/devices) 等项目采用。

![img](../resources/hami-arch.png)

## 功能特性

HAMi-core 提供以下核心功能：

1. 设备显存虚拟化

   ![image](../resources/sample_nvidia-smi.png)

2. 限制设备使用率

   通过自定义的时间片机制控制 GPU 使用情况。

3. 实时监控设备使用率

## 设计原理

HAMi-core 通过劫持 CUDA 运行时库（`libcudart.so`）与 CUDA 驱动库（`libcuda.so`）之间的
API 调用来实现其功能，如下图所示：

![img](../resources/hami-core-position.png)
