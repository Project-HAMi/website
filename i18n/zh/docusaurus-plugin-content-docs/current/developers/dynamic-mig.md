---
title: NVIDIA 动态 MIG 实现
sidebar_label: 动态 MIG 实现
translated: true
---

## 介绍

HAMi v2.10 用预留优先的动态 MIG 架构取代了预定义的 `knownMigGeometries` 和整卡模板切换。硬件能力来源于节点，调度器在绑定 Pod 之前预留确切的 MIG placement，NVIDIA device plugin 负责创建和回收对应的 GPU 实例（GI）和计算实例（CI）。

该设计将四项职责分离：

| 权威来源             | 职责                                                 |
| -------------------- | ---------------------------------------------------- |
| 节点上的 NVML        | 上报 profile 的显存、算力、切片数量和合法 placement  |
| HAMi 调度器          | 选择物理 GPU、profile 和 placement，并对预留进行核算 |
| NVIDIA device plugin | 串行化硬件变更，创建、校验、接管和销毁 GI/CI 实例    |
| Pod 注解             | 持久化调度器与 device plugin 共享的分配身份          |

这一模型为每个 Pod 创建硬件隔离的 MIG 设备，同时既不让调度器直接修改 GPU 硬件，也不让 device plugin 在运行时另选 placement。

## 设计目标

- 以节点和 NVML 作为硬件能力的事实来源。
- 预留拓扑，而不仅仅是 MIG 切片总数。
- 严格按调度器接受的 profile 和 placement 创建实例。
- 使用稳定的工作负载元数据进行协调和重启恢复。
- 回收单个 Pod 的实例时不重新配置其他 Pod 拥有的实例。
- 随着 GPU 密度增长，保持调度器/device plugin 共享契约的紧凑。

## 架构

```text
                        Kubernetes control plane

  +----------------+       Node capability       +----------------+
  | Device Plugin  | --------------------------> | HAMi Scheduler |
  |                |                             |                |
  | NVML discovery |       Pod reservation       | Placement      |
  | GI/CI manager  | <-------------------------- | policy         |
  | Reconciler     |                             | Capacity model |
  +-------+--------+                             +--------+-------+
          |                                               |
          | exact GI/CI realization                       | bind
          v                                               v
  +----------------+                             +----------------+
  | NVIDIA GPU     |                             | Workload Pod   |
  | MIG topology   |                             | Allocation     |
  | and instances  |                             | annotation     |
  +----------------+                             +----------------+
```

device plugin 在 NVIDIA 节点注册注解中发布能力。调度器根据活动 Pod 的预留重建拓扑占用情况。Pod 注解是调度阶段与运行阶段之间的持久交接点。

## 能力发现契约

### 策略来自 `migProfileAllowlist`

调度器设备配置为每种型号指定集群策略允许的 profile：

```yaml
nvidia:
  migProfileAllowlist:
    - models: ["A100-SXM4-40GB"]
      profiles: ["1g.5gb", "2g.10gb", "3g.20gb", "7g.40gb"]
    - models: ["RTX PRO 6000 Blackwell Server Edition"]
      profiles: ["1g.24gb", "2g.48gb", "4g.96gb"]
```

[Chart 的默认配置](https://github.com/Project-HAMi/HAMi/blob/v2.10.0/charts/hami/templates/scheduler/device-configmap.yaml)还包含 A30、A100 80 GB、H100、H20、H200 和 B200 的映射。允许列表决定集群允许什么，并不定义容量或完整的几何配置。

自定义的 `device-config.content` 值或外部 ConfigMap 会替换 Chart 默认配置。此类配置必须显式使用 `migProfileAllowlist`。旧的 `knownMigGeometries` 字段不会被自动转换。

### 能力来自 NVML

对于匹配 GPU 上每个允许的 profile，device plugin 会向 NVML 查询 profile 信息和可能的 placement，并在 `hami.io/node-nvidia-register` 中每块 GPU 的 `migProfiles` 数组里发布面向调度器的字段：

```json
{
  "name": "2g.10gb",
  "memoryMB": 9984,
  "core": 29,
  "sliceCount": 2,
  "placements": [
    { "start": 0, "size": 2 },
    { "start": 2, "size": 2 },
    { "start": 4, "size": 2 }
  ]
}
```

| 字段         | 调度器用途                                          |
| ------------ | --------------------------------------------------- |
| `name`       | 跨组件稳定的 profile 标识                           |
| `memoryMB`   | 将 `nvidia.com/gpumem` 需求与实际上报的容量进行匹配 |
| `core`       | 核算该 profile 的算力份额                           |
| `sliceCount` | 对候选 profile 进行确定性排序                       |
| `placements` | 选择合法且不重叠的物理切片区间                      |

profile 名称是策略标签，而其显存、算力和 placement 数据是节点本地的事实。未列入允许列表或 NVML 无法解析的 profile 会被省略。当 placement 已经能表达可调度容量时，仅 device plugin 使用的发现数据（例如最大实例数）不会加入共享的传输格式。

## 调度与预留

对于选择了 `nvidia.com/vgpu-mode: "mig"` 的 Pod，调度按以下顺序进行：

1. 根据活动 Pod 的预留重建每块 GPU 已占用的区间。
2. 按 NVML 上报的显存和切片数量对已发现的候选 profile 排序。
3. 选择能满足容器显存请求的最小 profile。
4. 选择一个确定性的合法 placement，且不与现有或新接受的预留重叠。
5. 在 Pod 绑定之前，立即将该预留计入调度器占用。
6. 将完整的逻辑预留持久化到 Pod 中。

一个 placement 占用半开区间 `[placement.start, placement.start + placement.size)`。如果请求的 profile 上报的所有 placement 都无法在不重叠的前提下放入，那么即使空闲切片总数足够也不行，此时 Pod 会保持 Pending。调度器不会请求切换整卡模板，也不会移动正在运行的 GI。

### Pod 预留契约

调度器向 `hami.io/vgpu-mig-allocations` 写入一个 JSON 数组，每个申请的 MIG 设备对应一个条目：

```json
[
  {
    "containerIndex": 0,
    "deviceIndex": 0,
    "gpuUUID": "GPU-xxxxxxxx",
    "profile": "2g.10gb",
    "placement": { "start": 2, "size": 2 },
    "migUUID": "MIG-xxxxxxxx",
    "gpuInstanceID": 4,
    "computeInstanceID": 0
  }
]
```

调度器写入 `containerIndex`、`deviceIndex`、`gpuUUID`、`profile` 和 `placement`。运行时身份字段最初不存在。实例创建完成后，device plugin 会在同一条记录中补充 `migUUID`、`gpuInstanceID` 和 `computeInstanceID`。

容器索引和设备索引用于区分同一块物理 GPU 上的多次分配。只有三个运行时字段全部存在时，运行时身份才有效；不完整的运行时身份无法通过校验。该注解是内部协议，用户不得生成或修改。

## 运行时创建

在 kubelet `Allocate` 阶段，device plugin 解析正在启动的容器对应的条目，并执行以下操作：

1. 将已跟踪的实例与当前活动 Pod 快照进行协调。
2. 校验预留的 profile 和 placement 仍然存在于 NVML 能力中。
3. 获取按物理 GPU 划分的变更锁。
4. 严格在调度器选定的 placement 上创建 GI，并创建其 CI。
5. 解析 MIG UUID、GI ID 和 CI ID，并将 MIG 设备暴露给容器。
6. 用该运行时身份更新 Pod 的分配注解。

管理器的键由物理 GPU 索引、profile、placement 起点和 placement 大小组成。针对同一预留的重复 `Allocate` 调用会返回同一个受管 MIG UUID。如果多设备分配中途失败，本次尝试创建的实例会被回滚；已接管的实例不会作为回滚的一部分被销毁。

device plugin 绝不会改用其他物理 placement 重试。那样会破坏调度器的拓扑核算，并可能与另一个已接受的预留重叠。

## 协调与回收

device plugin 会定期列出分配到其节点的 Pod。拥有有效预留、未处于删除中且未达到 Succeeded 或 Failed 状态的 Pod 构成期望分配集合。不在该集合中的受管实例会通过精确销毁其 CI 和 GI 来释放。

协调有意保持保守。只有完整的 Kubernetes 列表和有效的分配注解才能授权一次清理。API 失败、格式错误的记录或不完整的运行时身份都会导致跳过破坏性协调，而不是让插件自行推断所有权。

这个收敛循环让 placement 在其 Pod 终止后可以被重新使用，同时保持同一块 GPU 上无关的 placement 不受影响。

## device plugin 重启接管

启动恢复同时使用 Kubernetes 分配状态和 NVML 活动信息：

1. 通过活动 Pod 预留和 GPU 进程状态识别正在承载工作负载的 GPU。
2. 将空闲 GPU 准备为干净的 MIG 就绪状态；这些空闲 GPU 上的旧 GI/CI 实例可能会被移除。
3. 对每条活动的 v2.10 记录，插件根据 NVML 校验注解中的 profile、placement、MIG UUID、GI ID 和 CI ID。
4. 匹配的活动实例会被接管到新管理器的分配映射中。
5. 从重建的所有权状态继续进行常规协调。

如果启动时无法可靠读取分配状态，插件会保留 GPU，而不是执行破坏性的空闲 GPU 清理。旧的 `GPU-UUID[template-slot]` 标识无法被接管，因为它们不能证明物理 placement 和完整的运行时身份。

## 指标与可观测性

调度器通过当前指标导出已创建的实例：

```text
# HELP hami_node_gpu_mig_instance_info Realized MIG instance identity and scheduler placement
# TYPE hami_node_gpu_mig_instance_info gauge
hami_node_gpu_mig_instance_info{compute_instance_id="0",device_index="0",device_uuid="GPU-xxxxxxxx",gpu_instance_id="4",mig_uuid="MIG-xxxxxxxx",node="MIG-NODE-A",placement_size="2",placement_start="2",profile="2g.10gb",zone="vGPU"} 1
```

只有补充了完整运行时身份的预留才会产生该序列。其标签将调度器预留与物理 GPU、placement、MIG UUID、GI ID 和 CI ID 关联起来。`device_uuid` 加上 `gpu_instance_id` 还可以与携带 `UUID` 和 `GPU_I_ID` 的 DCGM 序列关联。

`nodeGPUMigInstance` 是兼容性指标，仅在 `legacyMetrics: true` 时输出；当前 Chart 默认值为 `false`。使用默认 NodePort 服务时，标准的调度器端点为 `<scheduler-ip>:31993/metrics`。

有用的运维信号包括：

- device plugin 的发现日志以及每块 GPU 非空的 `migProfiles`；
- 调度器的 placement 决策，以及在容量或碎片压力下保持 Pending 的 Pod；
- `hami.io/vgpu-mig-allocations` 从逻辑预留到运行时身份的转变；
- 通过 `nvidia-smi` 或 NVML 观察到的 GI/CI；
- 回收与启动接管日志；
- device plugin 重启前后工作负载的持续进展。

## 迁移与所有权边界

### 旧版 HAMi 几何配置实现

v2.9 和 v2.10 协议无法作为混合的调度器/device plugin 组合安全地服务 MIG 工作负载。旧调度器发布并消费 `migtemplate` 和模板/slot 标识；v2.10 消费 `migProfiles`，并要求确切的 profile/placement 预留。

因此首次迁移需要受控的交接：

1. 停止新的 MIG 调度，并逐节点 drain 旧 MIG Pod；
2. 将 `knownMigGeometries` 中所需旧 profile 的并集转换为 `migProfileAllowlist`；
3. 先升级调度器，再升级节点上的 device plugin；
4. 验证能力发布、实例创建、回收和重启接管；
5. 只有在生命周期测试通过后，才解除各节点的 cordon。

迁移后，只要存在合法的空闲 placement，日常的混合 profile 创建不需要切换整卡几何配置。硬件碎片化、MIG 模式变更、驱动维护、回滚，或需要移动活动 GI 的布局，仍可能需要 drain 或重启。

### NVIDIA MIG Manager

MIG Manager 应用节点级或 GPU 级的几何配置，而 HAMi 动态 MIG 根据每个 Pod 的预留创建和销毁 GI/CI 实例。两者修改的是同一份硬件状态，不能同时协调同一块物理 GPU。

GPU Operator 可以继续提供 NVIDIA 驱动、Container Toolkit、DCGM 及其他基础设施。在 HAMi 接管变更所有权之前，先停止 MIG Manager 的协调，并确保没有控制器会重新创建它或重新应用 `nvidia.com/mig.config`。只删除一个 MIG Manager Pod 而不改变其控制器策略，并不能建立这一边界。

当前 Chart 允许列表、迁移检查清单、工作负载示例和验证命令，请参阅[动态 MIG 用户指南](../userguide/nvidia-device/dynamic-mig-support.md)。

## 特别感谢

感谢 @sailorvii 帮助实现了最初的动态 MIG 功能。
