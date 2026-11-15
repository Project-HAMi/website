---
title: 分配到特定设备类型
sidebar_label: 指定设备类型
translated: true
---

import FeatureSupport from '@site/src/components/FeatureSupport';

<FeatureSupport features="cambType" />

要让任务运行在某种型号的 MLU 上，在 Pod 上添加 `cambricon.com/use-mlutype` 注解。要让任务避开某种型号，添加 `cambricon.com/nouse-mlutype` 注解。两个注解都可以填写以逗号分隔的多个值。

HAMi 调度器从节点标签 `Model` 读取 MLU 型号。标签包含注解中的值即为匹配，不区分大小写。如果节点没有 `Model` 标签，或标签中不含 `MLU`，带有这两个注解的 Pod 不会调度到该节点。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mlu-type-pod
  annotations:
    cambricon.com/use-mlutype: "MLU370" # 只运行在 MLU370 上
spec:
  containers:
    - name: c-1
      image: ubuntu:22.04
      command: ["sleep"]
      args: ["100000"]
      resources:
        limits:
          cambricon.com/vmlu: 1 # 请求 1 个 MLU
          cambricon.com/mlu.smlu.vmemory: "20" # 分配 20 x 256 MiB = 5 GiB
          cambricon.com/mlu.smlu.vcore: "10" # 每个 MLU 包含 10% 的计算核心
```

:::note

`cambricon-device-plugin` 的 `--enable-device-type` 参数会让插件按型号上报资源名称，例如 `cambricon.com/mlu370.smlu.vcore`。HAMi 调度器默认读取 `cambricon.com/mlu.smlu.vmemory` 和 `cambricon.com/mlu.smlu.vcore`，节点上报其他名称时，调度器找不到该节点上的 MLU。如果启用这个参数，需要把 HAMi chart 中的 `devices.cambricon.resourceMemoryName` 和 `devices.cambricon.resourceCoreName` 设置为插件上报的名称。

:::
