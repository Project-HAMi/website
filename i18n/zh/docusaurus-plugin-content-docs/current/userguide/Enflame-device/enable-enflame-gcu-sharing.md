---
title: 启用燧原 GPU 共享
---


## 简介

本组件支持复用燧原 GCU 设备 (S60)，并为此提供以下几种与 vGPU 类似的复用功能，包括：

***GPU 共享***: 每个任务可以只占用一部分显卡，多个任务可以共享一张显卡

***百分比切片能力***: 你现在可以用百分比来申请一个 GCU 切片（例如 20%），本组件会确保任务使用的显存和算力不会超过这个百分比对应的数值

***设备 UUID 选择***: 你可以通过注解指定使用或排除特定的 GCU 设备

***方便易用***:  部署本组件后，只需要部署厂家提供的 gcushare-device-plugin 即可使用

## 节点需求

* Enflame gcushare-device-plugin >= 2.1.6
* driver version >= 1.2.3.14
* kubernetes >= 1.24
* enflame-container-toolkit >=2.0.50

## 开启 GCU 复用

* 部署'gcushare-device-plugin'，燧原的 GCU 共享需要配合厂家提供的'gcushare-device-plugin'一起使用，请联系设备提供方获取

> **注意：** *只需要安装 gcushare-device-plugin，不要安装 gcushare-scheduler-plugin.*

* 在安装 HAMi 时配置参数'devices.enflame.enabled=true'

```
helm install hami hami-charts/hami --set devices.enflame.enabled=true -n kube-system
```

> **说明：** 默认资源名称如下：
>
> * `enflame.com/vgcu` 用于 GCU 数量，这里只能为 1
> * `enflame.com/vgcu-percentage` 用于生成共享 GCU 切片
>
> 你可以通过修改`hami-scheduler-device`配置，来修改这些资源名称

## 设备粒度切分

HAMi 将每个燧原 GCU 划分为 100 个单元进行资源分配。当你请求一部分 GPU 时，实际上是在请求这些单元中的一定数量。

### 显存和核心分配

* 每个 `enflame.com/vgcu-percentage` 单位代表 1% 的算力和 1% 的显存
* 如果不指定显存请求，系统将默认使用 100% 的可用显存
* 内存与核心的分配通过硬限制强制执行，确保任务不会超过其分配的显存与核心

## 运行 GCU 任务

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gcushare-pod-2
  namespace: kube-system
spec:
  terminationGracePeriodSeconds: 0
  containers:
    - name: pod-gcu-example1
      image: ubuntu:18.04
      imagePullPolicy: IfNotPresent
      command:
        - sleep
      args:
        - '100000'
      resources:
        limits:
          enflame.com/vgcu: 1
          enflame.com/vgcu-percentage: 22
```

> **注意：** *查看更多的[用例](https://github.com/Project-HAMi/HAMi/tree/release-v2.6/examples/enflame/).*

## 设备 UUID 选择

你可以通过 Pod 注解来指定要使用或排除特定的 GPU 设备：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: poddemo
  annotations:
    # Use specific GPU devices (comma-separated list)
    enflame.com/use-gpuuuid: "node1-enflame-0,node1-enflame-1"
    # Or exclude specific GPU devices (comma-separated list)
    enflame.com/nouse-gpuuuid: "node1-enflame-2,node1-enflame-3"
spec:
  # ... rest of pod spec
```

> **说明：** 设备 ID 格式为 `{节点名称}-enflame-{索引}`。你可以在节点状态中找到可用的设备 ID。

### 查找设备 UUID

你可以使用以下命令查找节点上的燧原 GCU 设备 UUID：

```bash
kubectl get pod <pod-name> -o yaml | grep -A 10 "hami.io/<card-type>-devices-allocated"
```

或者通过检查节点注解：

```bash
kubectl get node <node-name> -o yaml | grep -A 10 "hami.io/node-register-<card-type>"
```

在节点注解中查找包含设备信息的注解。

## 注意事项

1. 共享模式只对申请一张 GPU 的容器生效（enflame.com/vgcu=1）。

2. 目前暂时不支持一个容器中申请多个 GCU 设备。

3. 任务中使用`efsmi`可以看到全部的显存，但这并非异常，显存会在任务使用过程中被正确限制。
