---
title: 启用 Cambricon MLU 共享
translated: true
---

## 介绍

**我们现在通过实现大多数设备共享功能来支持 cambricon.com/mlu，与 nvidia-GPU 类似**，包括：

***MLU 共享***：每个任务可以分配部分 MLU，而不是整个 MLU 卡，因此 MLU 可以在多个任务之间共享。

***设备内存控制***：MLU 可以在某种类型（即 370）上分配一定的设备内存大小，并确保不超过边界。

***MLU 类型指定***：您可以通过设置 "cambricon.com/use-mlutype" 或 "cambricon.com/nouse-mlutype" 注释来指定某个任务使用或避免使用哪种类型的 MLU。

***非常易于使用***：您无需修改任务 yaml 即可使用我们的调度程序。安装后，所有 MLU 任务将自动得到支持。您唯一需要做的就是标记 MLU 节点。

## 前提条件

* neuware-mlu370-driver > 5.0.0
* cambricon-device-plugin > 2.0.9
* cntoolkit > 2.5.3

## 启用 MLU 共享支持

* 联系您的设备提供商以获取 cambricon-device-plugin>2.0.9，在 containers.args 字段中将参数 `mode` 编辑为 'dynamic-smlu'。

```
        args:
            - --mode=dynamic-smlu # 设备插件模式：default, sriov, env-share, topology-aware, dynamic-mim, smlu 或 dynamic-smlu
	...
```

* 部署修改后的 cambricon-device-plugin

* 使用 helm 安装图表，请参阅[此处](https://github.com/Project-HAMi/HAMi#enabling-vgpu-support-in-kubernetes)的“在 Kubernetes 中启用 vGPU 支持”部分

* 为该节点上的每个 MLU 激活 smlu 模式
```
cnmon set -c 0 -smlu on
cnmon set -c 1 -smlu on
...
```

## 运行 MLU 任务

Cambricon MMLUs 现在可以通过容器请求，使用 `cambricon.com/mlu.smlu.vmemory` 和 `cambricon.com/mlu.smlu.vcore` 资源类型：

```
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:18.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          cambricon.com/vmlu: 1 # 请求 1 个 MLU
          cambricon.com/mlu.smlu.vmemory: 20 # 每个 MLU 请求 20% 的 MLU 设备内存
          cambricon.com/mlu.smlu.vcore: 10 # 每个 MLU 请求 10% 的 MLU 设备核心
```

> **注意：** *`vmemory` 和 `vcore` 只能在 `cambricon.com/mlunum=1` 时工作*
