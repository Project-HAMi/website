---
title: 启用 Mthreads GPU 共享
sidebar_label: GPU 共享
translated: true
---

## 简介

本组件支持复用摩尔线程 GPU 设备，并为此提供以下几种与 vGPU 类似的复用功能，包括：

**GPU 共享**: 每个任务可以只占用一部分显卡，多个任务可以共享一张显卡

**可限制分配的显存大小**: 你现在可以用显存单位数（例如 32 个单位，即 16 GiB）来分配 GPU，本组件会确保任务使用的显存不会超过分配数值

**可限制分配的算力核组比例**: 你现在可以用算力核组数量（例如 8 个）来分配 GPU，本组件会确保任务使用的算力不会超过分配数值

## 注意事项

1. 暂时不支持多卡切片，多卡任务只能分配整卡

2. 一个 pod 只能使用一个 GPU 生成的切片，即使该 pod 中有多个容器

3. 支持独占模式，只指定`mthreads.com/vgpu`即为独占申请

4. 本特性目前已在 MTT S4000 和 MTT S5000 设备上测试通过。MTT S5000 集群在安装 HAMi 时需将 `devices.mthreads.memoryPerCard` 设置为 `[160]`，参见下文[开启 GPU 复用](#开启-gpu-复用)。

## 卡片规格

两种卡型号每卡均提供 16 个算力核组。显存以 512 MiB 为单位申请，有效取值取决于卡的容量：

| 卡型号    | 显存   | `sgpu-memory` 总单位数 | 有效 `sgpu-memory` 取值       |
| --------- | ------ | ---------------------- | ----------------------------- |
| MTT S4000 | 48 GiB | 96                     | 2、4、8、16、32、64、96       |
| MTT S5000 | 80 GiB | 160                    | 2、4、8、16、32、64、128、160 |

取值不在有效列表内的请求会被准入 webhook 拒绝。每卡容量由集群级的 `devices.mthreads.memoryPerCard` chart 参数控制，两种卡型号混布的集群需要按型号划分独立节点池。

## 节点需求

- [MT CloudNative Toolkits > 1.9.0](https://docs.mthreads.com/cloud-native/cloud-native-doc-online/)
- 驱动版本 >= 1.2.0
- MTT S5000 使用 sGPU 时：MT Container Toolkit >= 2.1.0 且 MTML >= 2.1.0，并通过摩尔线程 GPU Operator 启用 sGPU。完整安装步骤参见[在 Mthreads MTT S5000 上使用 HAMi](../../installation/how-to-use-mthreads-s5000.md)。

## 开启 GPU 复用

- 部署'gpu-manager'，摩尔线程的 GPU 共享需要配合厂家提供的'MT-CloudNative Toolkit'一起使用，联系设备提供方获取

:::note

（可选），部署完之后，卸载掉 mt-mutating-webhook 与 mt-scheduler 组件，因为这部分功能将由 HAMi 调度器提供。在运行摩尔线程 GPU Operator 的 MTT S5000 集群上，请按 [MTT S5000 安装指南](../../installation/how-to-use-mthreads-s5000.md)的说明通过 ClusterPolicy 关闭厂商组件。

:::

- 在安装 HAMi 时配置参数 `devices.mthreads.enabled=true`

```bash
helm install hami hami-charts/hami --set scheduler.kubeScheduler.image.tag={your kubernetes version} --set devices.mthreads.enabled=true -n kube-system
```

- 在 MTT S5000 集群上，还需在 values 文件中设置每卡显存容量：

```yaml
devices:
  mthreads:
    enabled: true
    # MTT S5000 每卡 80 GiB 显存 = 160 x 512 MiB 单位。
    # chart 默认值（96）对应 MTT S4000，S5000 必须覆盖该值。
    memoryPerCard:
      - 160
```

```bash
helm install hami hami-charts/hami -n kube-system -f values.yaml
```

## 运行 GPU 任务

通过指定`mthreads.com/vgpu`, `mthreads.com/sgpu-memory` and `mthreads.com/sgpu-core`这 3 个参数，可以确定容器申请的切片个数，对应的显存和算力核组

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

:::note

每个 `mthreads.com/sgpu-memory` 单位代表 512 MiB 显存。各卡型号的有效取值见[卡片规格](#卡片规格)。

:::

:::note

查看更多的[用例](https://github.com/Project-HAMi/HAMi/tree/release-v2.6/examples/mthreads/).

:::
