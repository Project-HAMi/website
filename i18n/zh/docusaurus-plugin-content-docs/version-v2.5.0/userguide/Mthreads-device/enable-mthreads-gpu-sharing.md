---
title: 启用 Mthreads GPU 共享
translated: true
---

## 介绍

**我们现在通过实现大多数设备共享功能支持 mthreads.com/vgpu，类似于 nvidia-GPU**，包括：

***GPU 共享***：每个任务可以分配一部分 GPU，而不是整个 GPU 卡，因此 GPU 可以在多个任务之间共享。

***设备内存控制***：可以在某种类型（例如 MTT S4000）上分配一定设备内存大小的 GPU，并确保不超过边界。

***设备核心控制***：可以在某种类型（例如 MTT S4000）上分配有限计算核心的 GPU，并确保不超过边界。

## 重要说明

1. 不支持多卡设备共享。

2. 在一个 Pod 中只能共享一个 mthreads 设备（即使有多个容器）。

3. 仅支持通过指定 mthreads.com/vgpu 分配独占的 mthreads GPU。

4. 这些功能已在 MTT S4000 上测试。

## 先决条件

* [MT CloudNative Toolkits > 1.9.0](https://docs.mthreads.com/cloud-native/cloud-native-doc-online/)
* 驱动版本 >= 1.2.0

## 启用 GPU 共享支持

* 在 mthreads 节点上部署 MT-CloudNative Toolkit（请咨询您的设备提供商以获取其软件包和文档）

> **注意：** 安装后可以移除 mt-mutating-webhook 和 mt-gpu-scheduler（可选）。

* 在安装 HAMi 时设置 'devices.mthreads.enabled = true'

```bash
helm install hami hami-charts/hami --set scheduler.kubeScheduler.imageTag={your kubernetes version} --set device.mthreads.enabled=true -n kube-system
```

## 运行 Mthreads 任务

现在可以通过容器请求 Mthreads GPU，使用 `mthreads.com/vgpu`、`mthreads.com/sgpu-memory` 和 `mthreads.com/sgpu-core` 资源类型：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpushare-pod-default
spec:
  restartPolicy: OnFailure
  containers:
    - image: core.harbor.zlidc.mthreads.com:30003/mt-ai/lm-qy2:v17-mpc 
      imagePullPolicy: IfNotPresent
      name: gpushare-pod-1
      command: ["sleep"]
      args: ["100000"]
      resources:
        limits:
          mthreads.com/vgpu: 1
          mthreads.com/sgpu-memory: 32
          mthreads.com/sgpu-core: 8
```

> **注意1：** 每个 sgpu-memory 单位表示 512M 设备内存
>
> **注意2：** 您可以在 examples 文件夹中找到更多示例