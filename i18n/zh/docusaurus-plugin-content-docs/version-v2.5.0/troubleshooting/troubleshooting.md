---
title: 排障手册
translated: true
---

- 如果在使用 NVIDIA 镜像的设备插件时不请求 vGPU，机器上的所有 GPU 可能会在容器内暴露。
- 目前，A100 MIG 仅支持 "none" 和 "mixed" 模式。
- 目前无法调度带有 "nodeName" 字段的任务；请改用 "nodeSelector"。
- 目前仅支持计算任务；不支持视频编解码处理。
- 我们将 `device-plugin` 环境变量名称从 `NodeName` 更改为 `NODE_NAME`，如果您使用镜像版本 `v2.3.9`，可能会遇到 `device-plugin` 无法启动的情况，有两种方法可以解决：
  - 手动执行 `kubectl edit daemonset` 修改 `device-plugin` 环境变量从 `NodeName` 为 `NODE_NAME`。
  - 使用 helm 升级到最新版本，`device-plugin` 镜像的最新版本是 `v2.3.10`，执行 `helm upgrade hami hami/hami -n kube-system`，它将自动修复。