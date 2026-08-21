---
title: "实验 17: RTX PRO 6000 动态 MIG 生命周期"
description: "构建固定版本的 HAMi，并验证按 Pod 创建 MIG、混合规格、选择性回收、重启恢复和跨 GPU 调度。"
sidebar_label: "实验 17: 动态 MIG 生命周期"
lab:
  level: Advanced
  duration: 约 90 分钟
  environment: 配备 8 张 NVIDIA RTX PRO 6000 Blackwell GPU 的单节点 Kubernetes 服务器
  cost: 需要可计费的多 GPU 硬件
  authors:
    - shkatara
    - saiyam1814
  verified: "2026-08-11"
tags:
  - GPU 分区
  - nvidia
  - hami
toc_max_heading_level: 2
---

:::caution[翻译进行中]

本实验的完整中文翻译尚未完成。为避免命令、固定提交版本、安全警告和实测输出在翻译期间产生偏差，请暂时使用[英文版实验](/tutorials/labs/dynamic-mig-rtx-pro)。

英文版包含完整的端到端操作：构建 HAMi 提交 `634bf2b32e68`、备份与受控交接、MIG Manager 所有权警告、`operatingmode` 与 `migStrategy` 的区别、单个 `1g.24gb` 请求、四个位置饱和、`1g.24gb` 与 `2g.48gb` 混合部署、相邻 CUDA 工作负载持续运行时的选择性回收、设备插件重启后的 UUID 稳定性、第五个 Pod 溢出到第二张 GPU，以及清理和运维陷阱。

:::

## 验证环境

| 组件        | 实测值                                           |
| ----------- | ------------------------------------------------ |
| GPU         | 8 × NVIDIA RTX PRO 6000 Blackwell Server Edition |
| NVIDIA 驱动 | `610.43.02`                                      |
| Kubernetes  | `v1.35.6`                                        |
| 操作系统    | Ubuntu 24.04.4 LTS                               |
| HAMi 源码   | `634bf2b32e68e07d3fbcbd6da1ee079392fc07c1`       |

:::danger[只能有一个 MIG 硬件状态管理者]

NVIDIA GPU Operator MIG Manager 与 HAMi Dynamic MIG 都会创建和销毁 GI/CI。两者不得同时管理同一张物理 GPU。迁移现有节点前，请遵循固定版本的 [Dynamic MIG 迁移指南](https://github.com/Project-HAMi/HAMi/blob/634bf2b32e68e07d3fbcbd6da1ee079392fc07c1/docs/develop/dynamic-mig-migration.md)。

:::
