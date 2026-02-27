---
title: 启用寒武纪 MLU 共享
translated: true
---

## 简介

本组件支持复用寒武纪 MLU 设备，并为此提供以下几种与 vGPU 类似的复用功能，包括：

***MLU 共享***: 每个任务可以只占用一部分显卡，多个任务可以共享一张显卡

***可限制分配的显存大小***: 你现在可以用显存值（例如 3000M）来分配 MLU，本组件会确保任务使用的显存不会超过分配数值

***可限制分配的算力大小***: 你现在可以用百分比来分配 MLU 的算力，本组件会确保任务使用的算力不会超过分配数值

***指定 MLU 型号***：当前任务可以通过设置 annotation("cambricon.com/use-mlutype","cambricon.com/nouse-mlutype") 的方式，来选择使用或者不使用某些具体型号的 MLU

## 节点需求

* neuware-mlu370-driver > 5.10
* cntoolkit > 2.5.3

## 开启 MLU 复用

* 通过 helm 部署本组件，参照[主文档中的开启 vgpu 支持章节](https://github.com/Project-HAMi/HAMi/blob/master/README_cn.md#kubernetes开启vgpu支持)

* 使用以下指令，为 MLU 节点打上 label

```bash
kubectl label node {mlu-node} mlu=on
```

* 从您的设备提供商处获取 cambricon-device-plugin，并配置以下两个参数：

`mode=dynamic-smlu`, `min-dsmlu-unit=256`

它们分别代表开启 MLU 复用功能，与设置最小可分配的显存单元为 256M，您可以参考设备提供方的文档来获取更多的配置信息。

* 部署配置后的`cambricon-device-plugin`

```bash
kubectl apply -f cambricon-device-plugin-daemonset.yaml
```

## 运行 MLU 任务

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: binpack-1
  labels:
    app: binpack-1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: binpack-1
  template:
    metadata:
      labels:
        app: binpack-1
    spec:
      containers:
        - name: c-1
          image: ubuntu:18.04
          command: ["sleep"]
          args: ["100000"]
          resources:
            limits:
              cambricon.com/vmlu: "1"
              cambricon.com/mlu.smlu.vmemory: "20"
              cambricon.com/mlu.smlu.vcore: "10"
```

## 注意事项

1. 在 init container 中无法使用 MLU 复用功能，否则该任务不会被调度

2. 只有申请单 MLU 的任务可以指定显存`mlu.smlu.vmemory`和算力`mlu.smlu.vcore`的数值，若申请的 MLU 数量大于 1，则所有申请的 MLU 都会被整卡分配
