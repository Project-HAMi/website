---
title: 启用 Hygon DCU 共享
translated: true
---

## 介绍

**我们现在通过实现大多数设备共享功能支持 hygon.com/dcu，就像 nvidia-GPU 一样**，包括：

***DCU 共享***：每个任务可以分配一部分 DCU，而不是整个 DCU 卡，因此 DCU 可以在多个任务之间共享。

***设备显存控制***：DCU 可以分配特定类型（如 Z100）的设备显存大小，并确保不超过边界。

***设备计算核心限制***：DCU 可以分配一定百分比的设备核心（如 hygon.com/dcucores:60 表示此容器使用该设备的 60% 计算核心）。

***DCU 类型规范***：您可以通过设置 "hygon.com/use-dcutype" 或 "hygon.com/nouse-dcutype" 注释来指定某个任务使用或避免使用哪种类型的 DCU。

## 先决条件

* dtk 驱动程序 >= 24.04

## 启用 DCU 共享支持

* 部署 dcu-vgpu-device-plugin [这里](https://github.com/Project-HAMi/dcu-vgpu-device-plugin)

## 运行 DCU 任务

Hygon DCU 现在可以通过容器请求，使用 `hygon.com/dcunum`、`hygon.com/dcumem` 和 `hygon.com/dcucores` 资源类型：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: alexnet-tf-gpu-pod-mem
  labels:
    purpose: demo-tf-amdgpu
spec:
  containers:
    - name: alexnet-tf-gpu-container
      image: pytorch:resnet50
      workingDir: /root
      command: ["sleep","infinity"]
      resources:
        limits:
          hygon.com/dcunum: 1 # 请求一个 GPU
          hygon.com/dcumem: 2000 # 每个 dcu 需要 2000 MiB 设备显存
          hygon.com/dcucores: 60 # 每个 dcu 使用总计算核心的 60%

```

## 在容器内启用 vDCU

您需要在容器内启用 vDCU 才能使用它。

```bash
source /opt/hygondriver/env.sh
```

使用以下命令检查是否已成功启用 vDCU

```bash
hy-virtual -show-device-info
```

如果您有如下输出，则表示您已在容器内成功启用 vDCU。

```yaml
Device 0:
 Actual Device: 0
 Compute units: 60
 Global memory: 2097152000 bytes
```

像往常一样启动您的 DCU 任务

## 注意事项

1. 如果您的镜像不是 'dtk-embedded-image'，则需要在任务运行后安装 `pciutiils`、`libelf-dev`、`kmod`，否则，像 `hy-smi` 或 `hy-virtual` 这样的 dcu 工具可能无法正常工作。

2. 不支持在 init 容器中共享 DCU，init 容器中带有 "hygon.com/dcumem" 的 Pod 将永远不会被调度。

3. 每个容器只能获取一个 vdcu。如果您想挂载多个 dcu 设备，则不应设置 `hygon.com/dcumem` 或 `hygon.com/dcucores`。
