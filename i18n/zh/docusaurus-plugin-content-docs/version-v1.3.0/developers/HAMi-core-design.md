---
title: HAMi-core design
---

## Introduction

HAMi-core is a hook library for CUDA environment, it is the in-container gpu resource controller, it has been adopted by [HAMi](https://github.com/HAMi-project/HAMi), [volcano](https://github.com/volcano-sh/devices)

![HAMi-core 架构图，显示 GPU 资源控制器设计](../resources/hami-arch.png)

## Features

HAMi-core has the following features:

1. Virtualize device memory

    ![nvidia-smi 输出示例，显示 HAMi-core 虚拟化后的 GPU 内存](../resources/sample_nvidia-smi.png)

1. Limit device utilization by self-implemented time shard

1. Real-time device utilization monitor

## Design

HAMi-core operates by Hijacking the API-call between CUDA-Runtime(libcudart.so) and CUDA-Driver(libcuda.so), as the figure below:

![HAMi-core 位置图，显示 CUDA Runtime 和 Driver 之间的 API 调用拦截](../resources/hami-core-position.png)
