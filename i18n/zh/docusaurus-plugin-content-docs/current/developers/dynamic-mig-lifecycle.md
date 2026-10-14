---
title: 动态 MIG 实例生命周期
sidebar_label: 动态 MIG 生命周期
---

HAMi 会在 Pod 释放动态创建的 NVIDIA MIG 实例后继续保留这些实例。当其他 Pod 请求相同的 profile 和 placement 时，可以避免重复创建 GI/CI。

## 所有权要求

动态 MIG 模式要求 HAMi 是唯一在其管理的 GPU 上创建或销毁 MIG 实例的控制器。不支持在同一块 GPU 上运行其他 MIG 生命周期控制器，因为 HAMi 无法安全地识别或协调外部对布局的更改。

HAMi 会在 `/var/run/hami/dynamic-mig-state` 下为每个动态 MIG 实例写入一条所有权记录。Chart 会从节点挂载该目录，因此记录在 device-plugin 重启后依然保留。记录在实例处于活跃或空闲状态时一直存在，只有在实例被永久销毁后才会被删除。该记录独立于 CDI，在传统的非 CDI 模式下同样有效。

启动时，HAMi 会将每条所有权记录与实际的 MIG UUID、父 GPU、profile、placement、GI ID 和 CI ID 进行校验，然后才将实例恢复为空闲状态。没有有效 HAMi 所有权记录的现有 GI/CI 会被保留，但不会被复用或回收。只有当 HAMi 独占节点上完整的 MIG 布局时，运维人员才可以设置 `devices.nvidia.adoptExistingMIGInstances=true`。这一显式选择会认领未标记的 GI/CI，并为它们创建所有权记录。

## 生命周期

```text
Create ──> Active ──Pod release──> Idle ──matching request──> Active
                                      |
                                      └─placement pressure──> Reclaim ──> Delete
```

- `Active` 实例不会被回收。
- 确认 Pod 释放后，实例变为 `Idle`，不会销毁 GI/CI。
- GPU、profile 切片数和 placement 均相同的请求会复用该空闲实例及其 MIG UUID。
- 如果空闲实例与调度器选定的新 placement 重叠，HAMi 只会销毁造成阻塞的空闲实例，然后创建新的布局。
- 分配失败时，该请求创建的实例仍会被销毁，而不是缓存未完成的结果。
- NVML 出错时采取失败关闭策略。无法销毁的实例会保持错误状态，且不会被复用。

空闲 TTL 和缓存大小限制是可选的路线图扩展。当前的生命周期只在空闲实例的 placement 阻塞新的分配时才回收它们。

## 重启恢复

device-plugin 启动时，HAMi 首先接管活跃 Pod 注解所引用的运行时标识，然后加载持久化的所有权记录，并与实际的 NVML GI/CI 布局进行核对。经过验证、属于 HAMi 且没有活跃 Pod 的实例会被恢复为空闲状态。除非启用显式接管，否则未知实例会被保留。启用接管后，完整的 GI/CI 对会被恢复为空闲状态，没有 CI 的孤立 GI 只会在没有实时 Pod 分配的 GPU 上被移除。繁忙 GPU 上的孤立 GI 始终会被保留。

如果无法验证 Pod 状态、MIG 标识或 NVML 几何布局，启动恢复会返回错误，而不会修改不确定的硬件状态。

## CDI 生命周期

CDI 规范属于 MIG 实例，而不属于 Pod：

- 实例处于 `Active` 或 `Idle` 状态时，CDI 文件一直保留。
- 复用空闲实例时，会复用并校验其现有的 CDI 条目。
- 只有在 GI/CI 被永久销毁后，才会删除 CDI 文件。
- CDI 删除失败时会进入队列，由现有的 reconciler 重试。
- 因 NVML 清理出现暂时性失败而停留在 `Error` 状态的受跟踪实例，会由 reconciliation 重试。只有在硬件销毁成功后，才会删除其 CDI 条目。

传统的非 CDI 分配保持不变。

## 验证

状态机、重启恢复、精确复用、placement 压力回收、活跃实例保护、CDI 保留以及 CDI 清理重试，都可以通过 mock 的 NVML 和 CDI 接口进行测试。发布前，涉及分配的更改还必须按照 HAMi [`CONTRIBUTING.md`](https://github.com/Project-HAMi/HAMi/blob/master/CONTRIBUTING.md) 的要求，在支持 MIG 的 NVIDIA GPU 上验证。
