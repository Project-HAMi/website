---
title: 交互式 Manifest 生成器
sidebar_label: Manifest 生成器
---

# 交互式 Manifest 生成器

Project HAMi 支持跨多个硬件制造商的 GPU 虚拟化，包括 NVIDIA、寒武纪 (Cambricon)、海光 (Hygon) 和华为升腾 (Huawei Ascend)。每个设备需要在您的 Pod 或 Deployment `resources.limits` 中使用特定的 Kubernetes 注解，以便正确分配设备内存和核心。

使用下方的交互式工具，为您的用例生成准确的 YAML 配置。您可以将生成的 `resources.limits` 直接复制到您的部署规范中。

import ManifestGenerator from '@site/src/components/ManifestGenerator';

<ManifestGenerator />

## 高级选项 (Advanced Options)

- **特定设备类型 (Specific Device Type)**: 如果您有一个异构集群（例如 A100 和 V100 混合），您可以指定您的 Pod 应该调度到哪种设备型号上。
- **特定设备 UUID (Specific Device UUID)**: 如果您出于性能分析或调试目的，需要将 Pod 绑定到特定的物理设备，您可以提供其 UUID。

> **注意**: 并非所有供应商都支持核心百分比或内存百分比分配。生成器会根据所选设备供应商支持的功能，自动调整其选项。
