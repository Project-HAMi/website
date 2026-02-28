---
title: 术语表 / Terminology
slug: /terminology
---

本文档列出 HAMi 项目中的标准中英文术语对照，确保文档表述一致性。

## GPU 硬件相关 / GPU Hardware

| English | 中文 | 说明 |
| --------- | ------ | ------ |
| VRAM / Video RAM | 显存 | GPU 专用内存，不使用"内存" |
| GPU memory / device memory | 显存 / GPU 显存 | 在中文文档中统一使用"显存"，避免使用"内存"或"GPU 显存" |
| GPU core | GPU 核心 | GPU 计算核心 |
| compute core | 计算核心 | GPU 计算核心的统称 |
| GPU | GPU | 图形处理单元，不翻译 |
| vGPU | vGPU | 虚拟 GPU，不翻译 |
| device | 设备 | 指代 GPU 等计算设备 |
| NVIDIA GPU / NVIDIA device | NVIDIA GPU / NVIDIA 设备 | NVIDIA GPU 设备 |
| 算力 | compute power / compute capability | GPU 计算能力 |

## Kubernetes 相关 / Kubernetes

| English | 中文 | 说明 |
| --------- | ------ | ------ |
| Pod | Pod | 保持原文，不翻译 |
| Node | Node / 节点 | 可用"节点"或保持英文 |
| Namespace | Namespace / 命名空间 | 可用中文或保持英文 |
| scheduler | scheduler / 调度器 | 可用中文或保持英文 |
| device plugin | device plugin / 设备插件 | 可用中文或保持英文 |
| container | 容器 | 容器 |
| deployment | deployment / 部署 | 可用中文或保持英文 |
| ResourceQuota | ResourceQuota / 资源配额 | 可用中文或保持英文 |
| annotation | annotation / 注解 | 可用中文或保持英文 |
| label | label / 标签 | 可用中文或保持英文 |

## HAMi 特有概念 / HAMi-specific

| English | 中文 | 说明 |
| --------- | ------ | ------ |
| deviceSplitCount | deviceSplitCount | 配置参数，保持原文 |
| vgputype | vgputype | GPU 类型配置，保持原文 |
| vcore | vcore | 虚拟核心，保持原文 |
| vmem | vmem | 虚拟内存（虚拟显存），保持原文 |
| gpumem | gpumem | GPU 显存（显存）资源名称，保持原文 |
| gpumem-percentage | gpumem-percentage | GPU 显存百分比，保持原文 |
| HAMi | HAMi | 项目名称，保持原文 |
| volcano-vgpu-device-plugin | volcano-vgpu-device-plugin | 组件名称，保持原文 |

## 资源分配相关 / Resource Allocation

| English | 中文 | 说明 |
| --------- | ------ | ------ |
| allocation | 分配 | 资源分配 |
| request | 请求 | 资源请求 |
| limit | 限制 | 资源限制 |
| usage | 使用 | 资源使用 |
| capacity | 容量 | 资源容量 |
| utilization | 利用率 | 资源利用率 |

## 其他常用术语 / Common Terms

| English | 中文 | 说明 |
| --------- | ------ | ------ |
| cluster | 集群 | Kubernetes 集群 |
| workload | 工作负载 | 运行在集群上的应用 |
| metrics | 指标 | 监控指标 |
| monitoring | 监控 | 系统监控 |
| heterogeneous computing | 异构计算 | 多种计算架构混合使用 |
| virtualization | 虚拟化 | 设备虚拟化 |
| sharing | 共享 | 资源共享 |
| isolation | 隔离 | 资源隔离 |

## 重要说明 / Important Notes

1. **显存 vs 内存**：在 GPU 相关的文档中，必须使用"显存"而非"内存"来指代 GPU 的专用内存。避免使用"GPU 显存"这种说法。
2. **英文术语**：在技术文档中，Pod、vGPU、Node 等术语可以直接使用英文，无需强制翻译。
3. **一致性**：在整个文档集中，同一概念应使用相同的术语，避免频繁切换中英文表述。
4. **上下文**：某些术语在不同上下文中有不同含义，应根据实际情况选择最准确的表述。

## 参考资源 / References

- [NVIDIA 官方文档](https://docs.nvidia.com/)
- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [CNCF 术语表](https://www.cncf.io/resources/glossary/)
