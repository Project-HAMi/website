---
title: 启用燧原 GPU 共享
sidebar_label: GPU 共享
---

## 简介

HAMi 现已支持燧原 **DRS 硬切分**调度，并对齐燧原原生调度器链路。

DRS 是类似 NVIDIA MIG / Ascend VNPU 的硬切分方案。

## 节点需求

- Enflame gcushare-device-plugin >= 2.2.14
- driver version >= 1.8.7
- kubernetes >= 1.24
- enflame-container-toolkit >= 2.0.50

## 开启 DRS 调度

- 部署 `gcushare-device-plugin`，并确保版本支持 DRS（请联系设备提供方获取安装包与文档）

:::note

只需要安装 gcushare-device-plugin，不要安装 gcushare-scheduler-plugin。

:::

按[在线安装指南](../../installation/online-installation.md)部署 HAMi，保持 `devices.enflame.enabled=true`（默认值）。此配置将厂商资源加入内置 scheduler extender，厂商插件或工具包仍需单独安装。完整参数见 [Chart values 表](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md)中的 `devices.enflame.*`。

> **说明：** 默认资源名称包括：
>
> - `enflame.com/drs-gcu`（直接 DRS 切片请求）
> - `enflame.com/gcu-memory`（按显存请求，单位 MiB）
> - `enflame.com/gcu-core`（按算力百分比请求）
>
> 通过 Helm values 中的 `devices.enflame.resourceNameDRSGCU`、`resourceNameGCUMemory` 和 `resourceNameGCUCore` 修改资源名称，并与厂商插件保持一致。不要手工修改全局 ConfigMap，见[全局设备配置](../configure.md#device-config-overrides)。

## 运行 GCU 任务

HAMi 支持两种申请方式：

1. 直接申请 DRS 切片数（`enflame.com/drs-gcu`）
2. 按显存/算力申请（`enflame.com/gcu-memory` + `enflame.com/gcu-core`），由 HAMi 在调度内部换算为 DRS profile。

### 直接申请 DRS 切片

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gcushare-pod-drs
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
        - "100000"
      resources:
        limits:
          enflame.com/drs-gcu: 3
        requests:
          enflame.com/drs-gcu: 3
```

### 按显存/算力申请（统一 API）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gcushare-pod-by-spec
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
        - "100000"
      resources:
        limits:
          enflame.com/gcu-memory: 20480 # MiB
          enflame.com/gcu-core: 40 # 百分比
        requests:
          enflame.com/gcu-memory: 20480
          enflame.com/gcu-core: 40
```

:::note

查看更多的[用例](https://github.com/Project-HAMi/HAMi/tree/master/examples/enflame/)。

:::

## 调度注解

HAMi 在调度阶段会写入与 DRS 兼容的注解，包括：

- `assigned-containers`
- `enflame.com/gcu-assigned`
- `enflame.com/gcu-assigned-index`
- `enflame.com/gcu-assigned-minor`
- `enflame.com/gcu-request-size`

这些注解将由燧原 device-plugin 在 Allocate 阶段继续处理并完成 DRS instance 绑定。
