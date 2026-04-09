---
title: HAMi-core design
---

## Introduction

HAMi-core is a hook library for CUDA environment, it is the in-container gpu resource controller, it has been adopted by [HAMi](https://github.com/HAMi-project/HAMi), [volcano](https://github.com/volcano-sh/devices)

![HAMi-core architecture diagram showing GPU resource controller design](/img/docs/common/developers/hami-core-design/hami-arch.png) 

## Features

HAMi-core has the following features:
1. Virtualize device memory

![nvidia-smi output showing virtualized GPU memory with HAMi-core](/img/docs/common/developers/hami-core-design/sample-nvidia-smi.png)

2. Limit device utilization by self-implemented time shard

3. Real-time device utilization monitor 

## Design

HAMi-core operates by Hijacking the API-call between CUDA-Runtime(libcudart.so) and CUDA-Driver(libcuda.so), as the figure below:

![HAMi-core position diagram showing API call interception between CUDA Runtime and Driver](/img/docs/common/developers/hami-core-design/hami-core-position.png)
