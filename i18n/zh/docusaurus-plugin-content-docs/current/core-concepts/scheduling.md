---
title: 调度
description: HAMi 调度器如何过滤卡，并用 binpack 或 spread 选出一张。
translated: true
---

每来一个 Pod，HAMi 调度器都要回答两个问题：放到哪个节点，用这个节点上的哪张卡。它分两步来回答：先**过滤**，找出能放下这个 Pod 的卡，再**排序**，按策略从中挑出最合适的一张。

## 过滤

一张卡能接收这个 Pod，需要满足：

- 卡是健康的
- 有空闲槽位，并且剩余的显存和算力满足申请
- 如果 Pod 指定了卡的型号或 UUID，这张卡要符合

`gpucores: 100` 的容器还需要一张没有其他任务使用的卡。各项额度见[设备共享](../key-features/device-sharing.md)。

要指定卡的型号或某张卡，使用下面的 Pod 注解：

| Pod 注解                   | 作用                               |
| -------------------------- | ---------------------------------- |
| `nvidia.com/use-gputype`   | 只使用这些型号，例如 `"A100,V100"` |
| `nvidia.com/nouse-gputype` | 不使用这些型号                     |
| `nvidia.com/use-gpuuuid`   | 只使用这些 UUID 对应的卡           |
| `nvidia.com/nouse-gpuuuid` | 不使用这些 UUID 对应的卡           |

## 排序

![binpack 和 spread 会把同一个新 Pod 放到哪里](/img/docs/zh/core-concepts/scheduling-policies.svg)

调度器根据节点和卡已经用掉的槽位、显存和算力给它们打分，再按策略挑选：

- **binpack** 选择还放得下的最忙的节点或卡。Pod 集中在更少的卡上，整台节点可以空出来留给大任务。
- **spread** 选择最空闲的节点或卡。Pod 分散开，每张卡上竞争的 Pod 更少。

节点和卡的策略分开设置。默认情况下，节点用 `binpack`，卡用 `spread`：HAMi 先填满一个节点再用下一个，在节点内部把 Pod 分散到各张卡上。

安装 HAMi 时设置默认策略：

```yaml
scheduler:
  defaultSchedulerPolicy:
    nodeSchedulerPolicy: binpack
    gpuSchedulerPolicy: spread
```

用注解为单个 Pod 覆盖默认策略：

```yaml
metadata:
  annotations:
    hami.io/node-scheduler-policy: spread
    hami.io/gpu-scheduler-policy: binpack
```

### 拓扑感知和互斥

除了 binpack 和 spread，卡的策略还可以按下面两种方式选卡：

- **拓扑感知**（`topology-aware`）：卡与卡之间的连接有快有慢，可以用 `nvidia-smi topo -m` 查看。申请多张卡的 Pod，会分到彼此连接最好的一组卡。只申请一张卡的 Pod，会分到和其他卡连接最差的那张，把连接好的卡留给多卡任务。使用前要先在 device plugin 上开启拓扑打分，见 [GPU 拓扑感知调度](../developers/gpu-topology-scheduling.md)。
- **互斥**（`mutex`）：只把当前没有其他容器使用的卡分给 Pod。

## 了解更多

- [调度策略](../userguide/nvidia-device/scheduling-policy.md)：带示例的使用说明
- [分配到特定设备类型](../userguide/nvidia-device/specify-device-type-to-use.md)和[分配到特定设备](../userguide/nvidia-device/specify-device-uuid-to-use.md)
- [调度策略设计](../developers/scheduling.md)：打分的计算方法
