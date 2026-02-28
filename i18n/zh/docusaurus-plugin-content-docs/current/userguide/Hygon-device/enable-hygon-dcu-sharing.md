---
title: 启用 Hygon DCU 共享
translated: true
---

## 简介

本组件支持复用海光 DCU 设备，并为此提供以下几种与 vGPU 类似的复用功能，包括：

***DCU 共享***: 每个任务可以只占用一部分显卡，多个任务可以共享一张显卡

***可限制分配的显存大小***: 你现在可以用显存值（例如 3000M）来分配 DCU，本组件会确保任务使用的显存不会超过分配数值

***可限制计算单元数量***: 你现在可以指定任务使用的算力比例（例如 60 即代表使用 60% 算力）来分配 DCU，本组件会确保任务使用的算力不会超过分配数值

***指定 DCU 型号***：当前任务可以通过设置 annotation("hygon.com/use-dcutype","hygon.com/nouse-dcutype") 的方式，来选择使用或者不使用某些具体型号的 DCU

## 节点需求

* dtk driver >= 24.04
* hy-smi v1.6.0

## 开启 DCU 复用

* 部署[dcu-vgpu-device-plugin](https://github.com/Project-HAMi/dcu-vgpu-device-plugin)

## 运行 DCU 任务

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
          hygon.com/dcunum: 1 # 请求一个 DCU
          hygon.com/dcumem: 2000 # 每个 DCU 包含 2000M 设备显存
          hygon.com/dcucores: 60 # 每个 DCU 分配 15% 的设备核心

```

## 容器内开启虚拟 DCU 功能

使用 vDCU 首先需要激活虚拟环境

```
source /opt/hygondriver/env.sh
```

随后，使用 hdmcli 指令查看虚拟设备是否已经激活

```
hy-virtual -show-device-info
```

若输出如下，则代表虚拟设备已经成功激活

```
Device 0:
 Actual Device: 0
 Compute units: 60
 Global memory: 2097152000 bytes
```

接下来正常启动 DCU 任务即可

## 注意事项

1. 在 init container 中无法使用 DCU 复用功能，否则该任务不会被调度

2. 每个容器最多只能使用一个虚拟 DCU 设备，如果您希望在容器中挂载多个 DCU 设备，则不能使用`hygon.com/dcumem`和`hygon.com/dcucores`字段
