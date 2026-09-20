---
title: Sidecar 容器 GPU 资源核算
---

本设计已在 v2.10.0 之后的 [HAMi PR #2723](https://github.com/Project-HAMi/HAMi/pull/2723) 中实现。下文的问题描述针对更早的 init 容器核算，方案部分描述的是支持 sidecar 的改动。

## 问题概述

原生 sidecar 容器声明在 `spec.initContainers` 中，并设置了 `restartPolicy: Always`。但和普通 init 容器不同，sidecar 会在 Pod 的整个生命周期内与应用容器一起运行。在 PR #2723 之前，HAMi（参见 [Init 容器 GPU 资源核算](./init-container-design.md)）只根据容器出现在哪个列表中来分类。这部分核算没有检查 `RestartPolicy`，于是 sidecar 被当成了“运行完就退出”的容器，而它实际并不是。

本设计把 sidecar 作为第三类容器来处理。

## PR #2723 之前的问题

**1. 少算：`CollapseInitContainerUsage`（`pkg/device/initContainer.go`）。** 分类依据是索引（`cidx < numInit`），所以 sidecar 会被归入 init 峰值（`max`）这一类。同一张卡上一个 4000 MiB 的 sidecar 加一个 4000 MiB 的应用容器，会被记为 `max(4000, 4000) = 4000`，而实际需求是 8000，调度器因此可能超卖这张卡。

**2. 运行中的 sidecar 会阻止收缩。** 收缩要等所有 init 容器都进入 `Terminated` 状态。运行中的 sidecar 会阻止收缩条件成立，因此普通 init 容器占用的显存会继续被预留，init 设计中的场景 4 也就失效了。

**3. 收缩目标遗漏 sidecar：`AppContainersOnlyDeviceUsage`。** 收缩后的目标值会跳过所有 init 容器，包括 sidecar。sidecar 在两次重启之间以退出码 0 进入终止状态时，可能满足旧的收缩条件，导致它的用量从核算中被丢掉。收缩条件和目标值必须一起改。

## 核心思路

上游公式（即 apiserver 自身的计费方式）：

```text
effective = max( max over non-sidecar init_i ( init_i + sum(sidecars declared before init_i) ),
                 sum(apps) + sum(all sidecars) )
```

设计最初考虑用更简单的 `sidecar_sum + max(init_peak, app_sum)` 作为近似（思路和 init 设计中的假设一致，只是用 `sum(all sidecars)` 代替了与声明顺序相关的那一项）。但实际发现，按声明顺序遍历 `spec.initContainers`、每遇到一个 sidecar 就把它的用量累加进当前峰值，实现起来并不更难。PR #2723 实现了上面这个与顺序相关的公式。其计算形式与 apiserver 一致，但 HAMi 按设备 UUID 分别核算。按设备 UUID 和资源（数量、显存、算力）分别计算：

```text
effective[uuid] = max( max over non-sidecar init_i ( init_i[uuid] + sidecar_sum_so_far[uuid] ),
                        app_sum[uuid] + sidecar_sum[uuid] )
```

其中 `sidecar_sum_so_far` 只累加 `spec.initContainers` 中在当前容器之前声明的 sidecar，第二项中的 `sidecar_sum` 则是所有 sidecar 的总和。如果没有非 sidecar 的 init 容器，第一项为 0；某个 UUID 没有对应条目时，在做 `max()` 和加法之前也按 0 处理。

**分类规则：**

```text
isSidecar(c) := c ∈ spec.initContainers && c.RestartPolicy != nil &&
                *c.RestartPolicy == corev1.ContainerRestartPolicyAlways
```

有了 nil 检查，这条规则在任何环境下都是安全的：字段不存在就意味着没有 sidecar，行为与现在完全一致。不需要按 Kubernetes 版本区分，也不需要新增配置。

## PR #2723 实现的设计

- **准入配额检查：** 按顺序遍历 `spec.initContainers`，累加当前的 sidecar 总和，并把它计入每个非 sidecar init 容器的峰值（`pkg/scheduler/webhook.go` 中的 `fitResourceQuota`）；最终的 `effectiveReq` 是这个峰值与“所有 sidecar 总和加应用容器总和”两者中的较大值；显存系数只在结果上应用一次。
- **调度器适配与打分：** 稳态计算时，sidecar 和应用容器在同一份共享的节点副本上累加适配；每个非 sidecar init 容器使用独立的新副本，这个副本是在遍历到该容器时从共享副本深拷贝出来的，因此只预先计入了在它之前声明的 sidecar；最后按 UUID 用 `max()` 合并。
- **用量记录：** `CollapseInitContainerUsage` 按声明顺序遍历容器，对每个普通 init 容器只累加在它之前声明的 sidecar，而应用容器总量会加上所有 sidecar 的用量。每个条目的槽位数（[HAMi#2623](https://github.com/Project-HAMi/HAMi/pull/2623)）也按同样方式拆分：sidecar 的槽位像应用容器一样累加，非 sidecar init 容器仍然取峰值 1。`getNodesUsage` 只使用存储后的结果，本身不需要修改。新增、更新、删除之间的对称性保持不变。

注解格式不变，但 sidecar 在 `hami.io/vgpu-devices-allocated` 中仍然位于 init 容器区间，并且注解本身不携带“是否为 sidecar”的信息。位置 `i` 在 `i < len(InitContainers)` 时对应 `pod.Spec.InitContainers[i]`，否则对应 `pod.Spec.Containers[i - len(InitContainers)]`。核算逻辑需要检查该容器的 `restartPolicy`，以区分 sidecar 和普通 init 容器，不能只看位置。

### 场景示例（单节点，一块 24Gi GPU）

- **避免超卖：** sidecar 10Gi + 应用容器 10Gi。修改前：记为 `max(10,10) = 10Gi`，之后一个 12Gi 的 Pod 也能调度上来，实际需求达到 32Gi。修改后：记为 20Gi，12Gi 的 Pod 会被拒绝。
- **恢复收缩：** init 容器 20Gi + sidecar 2Gi + 应用容器 10Gi。修改前：sidecar 运行期间无法满足收缩条件，20Gi 继续被预留。修改后：准入时的计费取决于声明顺序——sidecar 声明在 init 容器之前时，计为 `max(2+20, 2+10) = 22Gi`；init 容器声明在前时，计为 `max(20, 2+10) = 20Gi`。无论哪种情况，init 容器以退出码 0 结束后，用量都会收缩到稳态的 `2+10 = 12Gi`。
- 没有 sidecar，或 Pod 已进入终止阶段：与 init 设计的行为完全相同。

## 收缩规则

与 init 设计相同的三条规则，只是限定为非 sidecar 容器：非 sidecar init 容器以退出码 0 结束后，收缩到稳态用量（应用容器 + sidecar）；有非零退出码时保持不变；Pod 进入终止阶段时归零。sidecar 可能在 crash-loop 中反复进入 `Terminated` 状态，但这段间隙内它的用量仍然会被计入，存储的用量不会短暂地变成零——存储值只会在新增、收缩（收缩目标值已包含 sidecar）或进入终止阶段时变化，而容器重启不会触发其中任何一种。不过，按旧的收缩条件，一次以退出码 0 结束的间隙可能会短暂地满足条件并触发收缩，从而永久丢掉 sidecar 的用量；只针对非 sidecar 容器的收缩条件可以避免这个问题。这两种行为都应该用测试固定下来。如果所有 init 容器都是 sidecar（`init_peak = 0`），收缩条件会立即满足，收缩只是重新计算一遍存储值（差值为 0）。`initContainerResourceReleased` 的语义保持不变。PR #2723 用 `SteadyStateDeviceUsage` 替换了 `AppContainersOnlyDeviceUsage`，把 sidecar 纳入收缩后的目标用量。

## 与 Kubernetes ResourceQuota 的交互

apiserver 按与顺序相关的上游公式计费，遍历顺序同样是 `spec.initContainers` 的声明顺序。由于准入阶段计算的是同一个公式，而不是简化版本，本设计最初担心的顺序边界情况——一个接近配额上限的 Pod 在 apiserver 那里按 20Gi 通过，却在 HAMi 这里按 22Gi 被拒——就不会出现：对于同一个 Pod，两边的计算方式是一致的。不过具体数值仍可能不同，因为 HAMi 在检查自己的内部配额缓存之前，会先对自己算出的值应用显存系数。和之前一样，收缩只会释放 HAMi 内部的容量；apiserver 的计费要等到 Pod 结束才会释放。这没有问题，因为 sidecar 占用的那部分本来就要保留这么久。
