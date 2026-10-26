---
title: 启用沐曦 GPU 共享
sidebar_label: GPU 共享
translated: true
---

**HAMi 目前支持复用沐曦 GPU 设备，提供与 vGPU 类似的复用功能**，包括：

- **GPU 共享**: 每个任务可以只占用一部分显卡，多个任务可以共享一张显卡

- **可限制分配的显存大小**: 你现在可以用显存值（例如 4G）来分配 GPU，本组件会确保任务使用的显存不会超过分配数值

- **可限制计算单元数量**: 你现在可以指定任务使用的算力比例（例如 60 即代表使用 60% 算力）来分配 GPU，本组件会确保任务使用的算力不会超过分配数值

## 需求

- MetaX Driver >= 2.32.0
- MetaX GPU Operator >= 0.10.2
- Kubernetes >= 1.23

### 开启复用沐曦设备

- 部署 MetaX GPU Operator (联系你的设备提供方获取)
- 按[在线安装指南](../../../installation/online-installation.md)部署 HAMi。HAMi 侧配置使用 [Chart values 表](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md)中的 `devices.metax.*`，资源名称需与单独部署的厂商插件保持一致。

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
      command: ["sleep", "infinity"]
      resources:
        limits:
          metax-tech.com/sgpu: 1 # 请求 1 个 GPU
          metax-tech.com/vcore: 60 # 每个 GPU 使用 60% 的计算核
          metax-tech.com/vmemory: 4 # 每个 GPU 需要 4 GiB 设备显存
```

:::note

你可以在 [examples 文件夹](https://github.com/Project-HAMi/HAMi/tree/release-v2.6/examples/metax/sgpu)中找到更多示例。

:::
