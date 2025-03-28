---
title: 介绍 HAMi
---

## 什么是 HAMi？

HAMi（异构 AI 计算虚拟化中间件），之前称为 k8s-vGPU-scheduler，是一种创新解决方案，
旨在管理 Kubernetes 集群内的异构 AI 计算设备。这个一站式中间件能够实现各种 AI 设备的共享，
同时确保不同任务之间的资源隔离。通过提高异构计算设备的利用率，
HAMi 提供了一个统一的复用接口，以满足不同设备类型的需求。

<!-- truncate -->

## 为什么选择 HAMi？

### Kubernetes 本机 API 兼容性

HAMi 的突出特点之一是其与 Kubernetes 原生 API 的兼容性。这意味着用户可以在
不修改现有配置的情况下升级到 HAMi，从而实现无缝过渡，同时保持 Kubernetes 的默认行为。

### 开放和中立

HAMi 是一个涉及来自各个领域利益相关者的协作倡议，包括互联网服务、金融、制造业和云服务提供商。
目标是建立云原生计算基金会（CNCF）下的开放治理，确保 HAMi 对所有用户保持中立和可访问。

### 避免供应商锁定

使用 HAMi，用户可以与主流云服务提供商集成，而无需绑定到专有供应商的编排。
这种灵活性允许组织选择他们偏好的云解决方案，同时利用 HAMi 的功能。

### 资源隔离

HAMi 在容器内提供强大的资源隔离。每个在容器中运行的任务都被限制在其分配的资源范围内，
防止任何任务超出其配额。这种严格的隔离增强了计算环境中的安全性和稳定性。

### 支持多种异构计算设备

HAMi 在支持各种异构计算设备方面表现出色。无论是来自不同制造商的 GPU、MLU 还是 NPU，
HAMi 都促进了设备共享，并在不同的硬件平台上最大化资源效率。

### 统一管理

为了简化运营，HAMi 提供了一套统一的监控系统，以及如箱装和扩散的可配置调度策略。
这种全面的管理方法简化了对资源的监管，并提升了整体系统性能。

## 结语

总之，HAMi 代表了在 Kubernetes 环境中管理异构 AI 计算资源的重大进步。它与现有系统的兼容性、
对开放治理的承诺以及强大的资源管理能力，使其成为寻求优化其 AI 计算基础设施的组织不可或缺的工具。

加入我们，一起踏上使用 HAMi 实现更高效和灵活的 AI 计算的旅程吧！

引用:
[1] https://project-hami.io
