---
title: HAMi-core design
---

HAMi-core is a hook library designed for the CUDA environment.
It functions as an in-container GPU resource controller and has been adopted by projects
like [HAMi](https://github.com/HAMi-project/HAMi) and [Volcano](https://github.com/volcano-sh/devices).

![HAMi-core architecture diagram showing GPU resource controller design](/img/docs/common/developers/hami-core-design/hami-arch.png)

## Features

HAMi-core offers the following key features:

1. Virtualize the device memory

   ![nvidia-smi output showing virtualized GPU memory with HAMi-core](/img/docs/common/developers/hami-core-design/sample-nvidia-smi.png)

2. Limit the device utilization

   Implements a custom time-slicing mechanism to control GPU usage.

3. Monitor the device utilization in real time

## Design

HAMi-core works by intercepting API calls between the CUDA Runtime (`libcudart.so`) and
the CUDA Driver (`libcuda.so`), as shown below:

![HAMi-core position diagram showing API call interception between CUDA Runtime and Driver](/img/docs/common/developers/hami-core-design/hami-core-position.png)
