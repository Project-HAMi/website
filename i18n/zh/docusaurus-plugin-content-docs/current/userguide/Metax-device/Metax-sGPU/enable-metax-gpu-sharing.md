---
title: 启用 Metax GPU 共享
translated: true
---

## 介绍

**我们目前支持复用沐曦GPU设备，提供与vGPU类似的复用功能**，包括：

***GPU 共享***: 每个任务可以只占用一部分显卡，多个任务可以共享一张显卡

***可限制分配的显存大小***: 你现在可以用显存值（例如4G）来分配GPU，本组件会确保任务使用的显存不会超过分配数值

***可限制计算单元数量***: 你现在可以指定任务使用的算力比例（例如60即代表使用60%算力）来分配GPU，本组件会确保任务使用的算力不会超过分配数值

### 需求

* Metax Driver >= 2.32.0
* Metax GPU Operator >= 0.10.2
* Kubernetes >= 1.23

### 开启复用沐曦设备

* 部署Metax GPU Operator (请联系您的设备提供方获取)
* 根据readme.md部署HAMi

### 运行沐曦任务

一个典型的沐曦任务如下所示：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04 
      imagePullPolicy: IfNotPresent
      command: ["sleep","infinity"]
      resources:
        limits:
          metax-tech.com/sgpu: 1 # requesting 1 GPU 
          metax-tech.com/vcore: 60 # each GPU use 60% of total compute cores
          metax-tech.com/vmemory: 4 # each GPU require 4 GiB device memory
```

> **注意：** 您可以在 examples 文件夹中找到更多示例。
