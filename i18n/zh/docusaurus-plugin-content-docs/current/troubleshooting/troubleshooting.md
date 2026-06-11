---
title: 排障手册
translated: true
---

## GPU 显存限制未生效 {#gpu-memory-limit-not-enforced}

如果容器超过了 `nvidia.com/gpumem` 限制，请检查以下原因：

- **设置了 `CUDA_DISABLE_CONTROL=true`** — 完全禁用 HAMi-core 的限制功能。请从生产工作负载中移除该设置。
- **Docker-in-Docker (DinD)** — 内层容器不会继承 `/etc/ld.so.preload` hostPath 挂载。HAMi 的限制在 DinD 内部不生效。
- **直接调用驱动 API** — 直接调用 NVML 或 CUDA Driver API 的工作负载会绕过 `libvgpu.so`。
- **`nvidia-container-runtime` 未设为默认运行时** — 使用以下命令验证：

  ```bash
  containerd config dump | grep default_runtime_name
  ```

  输出必须显示 `nvidia`。如未显示，请按照[前置条件](../installation/online-installation)指南操作。

- 如果在使用 NVIDIA 镜像的设备插件时不请求 vGPU，机器上的所有 GPU 可能会在容器内暴露。
- 目前，A100 MIG 仅支持 "none" 和 "mixed" 模式。
- 目前无法调度带有 "nodeName" 字段的任务；请改用 "nodeSelector"。
- 目前仅支持计算任务；不支持视频编解码处理。
- 我们将 `device-plugin` 环境变量名称从 `NodeName` 更改为 `NODE_NAME`，如果你使用镜像版本 `v2.3.9`，可能会遇到 `device-plugin` 无法启动的情况，有两种方法可以解决：
  - 手动执行 `kubectl edit daemonset` 修改 `device-plugin` 环境变量从 `NodeName` 为 `NODE_NAME`。
  - 使用 helm 升级到最新版本，`device-plugin` 镜像的最新版本是 `v2.3.10`，执行 `helm upgrade hami hami/hami -n kube-system`，它将自动修复。
