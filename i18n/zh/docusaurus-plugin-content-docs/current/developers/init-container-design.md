---
title: Init 容器 GPU 资源核算
---

## 问题概述

当一个 Pod 中的 init 容器和应用容器都申请了 GPU 资源时，HAMi 会同时为它们分配资源。但 Kubernetes 会按顺序运行 init 容器，并等它们全部完成后才启动应用容器，所以 init 容器和应用容器从来不会同时运行。

注意：本设计只涉及 init 容器和应用容器。Sidecar 容器不在本文讨论范围内，会在单独的 PR 中处理。

## HAMi 当前存在的问题

`device.Resourcereqs()` 为每个容器生成一个请求条目，顺序是**先 init 容器，再应用容器**。

**1. 准入：`fitResourceQuota`（`webhook.go`）**

```
for _, ctr := range pod.Spec.Containers {
    memoryReq += memReq * req
}

```

代码从未引用 `pod.Spec.InitContainers`，配额检查完全看不到 init 容器的 GPU 请求。

**2. 调度：`calcScore` / `fitInDevices`（`score.go`）**

```
for ctrid, n := range resourceReqs {
    fit, reason := fitInDevices(node, n, task, nodeInfo, &score.Devices)
}
```

`calcScore` 在每次循环中都把**同一个 `node` 对象**传给 `fitInDevices`，并把每个容器的请求永久累加到该节点记录的用量上。这部分累加会带到*下一个*容器的检查中，既不会重置，也不知道 init 容器会在应用容器启动前结束。

**示例：** 一个 Pod 的 init 容器申请 20Gi，应用容器申请 10Gi，节点上有 24Gi 空闲。调度器按同时需要 `20 + 10 = 30Gi` 来检查，于是拒绝了这个 Pod，而实际上该 Pod 在任何时刻的用量都不会超过 20Gi。

**3. 用量记录：`AddPod`/`AddUsage`/`getNodesUsage`**

```
for _, ctrdevice := range ctrdevices {
    res[memName] += int64(ctrdevice.Usedmem)
}
```

命名空间配额统计和节点容量汇总都会把每个容器记录的用量直接相加，并不知道其中一些条目来自早已结束的容器。

这三个问题的根源相同：HAMi 中没有任何地方知道“init 容器按顺序执行，并在应用容器启动前结束”。但它们分布在三条独立的代码路径上，每一条都需要单独处理这件事。

## 核心思路

可以把 Pod 想象成一间厨房：一位厨师（**init 容器**）备好食材后离开，然后另一位厨师（**应用容器**）才开始做菜。两人从来不会同时在厨房里。

![init 容器和应用容器的运行时间从不重叠](/img/docs/zh/developers/init-container-design/timeline-init-vs-app.svg)

所以，Pod 在任意时刻 GPU 占用的正确计算公式是：

```
effective = max( sum(app container requests), max(single init container request) )
```

## 方案

在所有资源维度上统一应用这个公式，包括 GPU 数量、显存、算力，并且按设备 UUID 分别计算（对于多 GPU 的 Pod，如果 init 容器和应用容器落在不同的物理设备上，不能把这些设备上的用量合并计算）：

- **准入配额检查**：计算出这个有效值，并与命名空间配额比较。
- **调度器适配与打分**：init 容器各自在一份全新的节点状态副本上独立评估，应用容器在另一份副本上累加评估，最后按设备 UUID 用同样的 `max()` 合并。
- **用量记录**：按设备存储这个有效值，而不是各容器用量的简单求和；并且在通过 `pod.Status` 确认 Pod 的 init 容器已经结束后，自动收缩为只统计应用容器的用量，确认之前绝不收缩。

Pod 注解保持不变，因为 device plugin 仍然需要完整的逐容器设备列表，才能知道每个容器使用的是哪块物理 GPU。改动只涉及核算。

### 场景示例

假设 GPU 集群中只有一个节点 `node1`，节点上有一块 24Gi 的 GPU，命名空间配额为 `nvidia.com/gpumem: 24Gi`。

#### 场景 1：准入阶段拦截永远无法满足的 init 容器请求

- **Pod 请求：** init 容器 `convert-weights` 申请 30Gi，应用容器 `server` 申请 4Gi。
- **修改前：** 允许创建，只检查了 `server` 的 4Gi。
- **修改后：** 拒绝创建，`max(4Gi, 30Gi) = 30Gi` 超过了 24Gi 的配额。

#### 场景 2：本可以调度的 Pod 不再被误拒

- **节点状态：** 空闲，可用 24Gi。
- **Pod 请求：** init 容器 20Gi，应用容器 10Gi。
- **修改前：** 被拒绝，提示 "0 nodes fit"，调度器要求 `20+10=30Gi`。
- **修改后：** 调度成功，有效用量为 `max(10,20)=20Gi`，还剩 4Gi 余量。

#### 场景 3：记录的用量与实际一致

- **节点状态：** 场景 2 中的 Pod 已绑定并正在运行。
- **修改前：** 记录 `Used = 30Gi`，超过了节点的全部容量。
- **修改后：** 记录 `Used = 20Gi`，与实际峰值一致。

#### 场景 4：init 容器结束后用量随之收缩

- **新的 Pod 请求：** 12Gi，在 `model-warmup` 运行期间提交。
- **修改前：** 一直被拒绝，记录的用量永远不知道 init 容器已经结束，始终停留在 30Gi。
- **修改后：** 确认 `convert-weights` 进入 `Terminated` 状态后，记录的用量降到 10Gi；空闲 `24-10=14Gi`，12Gi 的 Pod 可以调度。

![错误算法与正确算法对比](/img/docs/zh/developers/init-container-design/before-after-math.svg)

## 设计细节

### 按资源、按设备计算的公式

```
effective_gpu_count[uuid] = max( sum(app count requests on uuid),  max(init count requests on uuid) )
effective_mem[uuid]       = max( sum(app memory requests on uuid), max(init memory requests on uuid) )
effective_cores[uuid]     = max( sum(app core requests on uuid),   max(init core requests on uuid) )
```

按 UUID 计算也顺带解决了 init 容器和应用容器落在不同物理设备上的问题：每个设备都有自己的有效值。

### 准入配额检查

1. 每种资源的 `initReq` = 所有 init 容器中的**最大值**。
2. 每种资源的 `appReq` = 所有应用容器的**总和**。
3. `effectiveReq = max(appReq, initReq)`；超过配额则拒绝。

**GPU 数量：** 目前的配额检查**只限制显存和算力**，GPU 数量并不是独立的配额维度。仍然会为数量计算 `effectiveReq`（第 1–2 步），让调度器和用量记录有一致的值可用，但 `FitQuota` 不会拿它和命名空间配额比较。像显存和算力那样让 `FitQuota` 也检查数量，可以作为以后的扩展，不在本次改动范围内。

**显存系数：** 只在算出的有效值上应用**一次**，而不是逐容器应用。

```
effective_mem = max(app_mem_sum, init_mem_peak)
if memoryFactor > 1:
    quota_check_mem = effective_mem * memoryFactor
```

### 调度器适配与打分

1. **init 阶段：** 每个 init 容器在一份新深拷贝的节点状态上独立适配，记录每个设备上出现过的**最大**用量。
2. **应用容器阶段：** 应用容器在另一份新副本上累加适配。
3. **合并：** 按设备 UUID 和资源计算 `effective_usage[uuid][resource] = max(app_cumulative, init_peak)`。超过容量则排除该节点。

### 用量记录（配额与节点容量）

存储用量之前，先把原始的逐容器 `PodDevices` 折叠成仅用于核算的视图：

```
collapsed = CollapseInitContainerUsage(pod, podDevices)
```

传给 `PodManager.AddPod` / `QuotaManager.AddUsage` 的是这个折叠后的结果，而不是原始结构。

**每次 Pod 更新时：**

1. 解码注解，还原每个容器对应的设备 UUID。
2. 根据 `pod.Spec` 判断每个容器是 init 容器还是应用容器。
3. 重新执行 `CollapseInitContainerUsage`（确认 init 容器结束后改为 `AppContainersOnly`）。
4. 只应用新旧存储值之间的**差值**。

**删除时**，`TakeAndDeletePod` 返回的正是当前存储的值（可能已经收缩过），`RmUsage` 也精确减去这个值。新增和删除始终操作同一个数字，因此不会出现偏差。

### init 容器结束后收缩

![一个 Pod 的完整生命周期](/img/docs/zh/developers/init-container-design/pod-lifecycle-journey.svg)

**条件：** 所有 init 容器都设置了 `Status.Terminated`（已结束，不论退出码）。每次协调时都基于对象的当前状态检查，而不依赖观察到某个特定的 `Phase` 值。不要求 `Phase == Running`，因为实践发现这个状态并不可靠（不一定会在 `Succeeded` 之前出现）。

所有 init 容器都结束后，有两种收缩动作和一种不处理（保持）的情况：

- **Pod 进入终止阶段（`Succeeded` 或 `Failed`）：** Pod 中的所有容器，包括 init 容器和应用容器，都已结束。无论退出码如何，用量都收缩为零，因为 Pod 中已经没有任何东西在使用 GPU。与 `Running` 不同，`Succeeded`/`Failed` 是真正的终止状态，之后不会再发生转换，所以这里可以放心使用 `Phase`。
- **所有 init 容器都以 `ExitCode: 0` 退出，Pod 尚未终止：** 应用容器已经启动或正在启动，收缩为只统计应用容器的用量。
- **有 init 容器以非零退出码退出，Pod 尚未终止：** Pod 可能还会重启（取决于 restartPolicy），它仍然持有已分配的 GPU 设备，所以此时不收缩用量。之后 Pod 要么重启并最终成功，要么被彻底终止（phase 变为 Failed），后者会触发收缩。

```
for each uuid:
if pod.Status.Phase in (Succeeded, Failed):
    new_usage[uuid] = 0
else if all init containers terminated with ExitCode == 0:
    new_usage[uuid] = sum of app-container usage values on uuid only
                      (the same per-container fields, e.g. Usedmem,
                      that AddUsage/getNodesUsage already collapse;
                      not raw requests)
else :
   // No shrink. Init containers are still running, or one failed and the pod hasn't ended yet.
   //
   // Gap: if an earlier init container already succeeded, we still hold its memory until the whole pod ends, it's not released early.
   //
   // TODO(future): release memory as each init container finishes, not just at the end. Track which init container index last succeeded
   // (they run in order), and only count what's left after that.
        continue

delta[uuid] = new_usage[uuid] - old_usage[uuid]
apply delta[uuid] to QuotaManager and PodManager
```

准入和调度决策仍然以请求量为依据；Pod 运行之后，记录值（也就是配额和节点容量核算用来比较的那个数）始终来自 `AddUsage`/`getNodesUsage` 已经在跟踪的同一组用量字段。`CollapseInitContainerUsage` 只在 Pod 新增时确定这个值，之后由收缩逻辑替换它，所以存储值本来就不是 Pod 启动时的那个值。真正保证的是新增和删除之间的对称：更新时只应用新值与当前存储值之间的差值，删除时精确减去当时存储的值，不论是否收缩过。

收缩**只会**在 `pod.Status` 确认完成之后执行。

**幂等性：** `PodManager` 为每个 Pod 保存一个布尔值 `initContainerResourceReleased`（默认为 `false`），它只用于保护 init 容器的收缩步骤：

```
if all initContainers terminated with ExitCode == 0 and !initContainerResourceReleased:
    shrink usage to app-containers-only
    initContainerResourceReleased = true
```

**已知缺陷：** 目前没有任何逻辑会把 `initContainerResourceReleased` 重置为 `false`。如果 Pod sandbox 重启后 kubelet 重新运行 init 容器，而缓存中还是同一个 Pod UID，那么在这一轮新的 init 周期里，用量仍停留在只统计应用容器的收缩状态，init 容器的 GPU 用量就被少算了。要修复这个问题，需要在新一轮普通 init 容器周期开始时重置该标志，并恢复包含 init 容器的用量；普通的应用容器或 sidecar 重启则不应触发重置。这部分尚未实现。

终止阶段的释放不会作为单独的状态持久化，而是每次协调时直接根据 `pod.Status.Phase` 重新计算：

```
if pod.Status.Phase in (Succeeded, Failed):
    usage = 0
```

## 与 Kubernetes ResourceQuota 的交互

如果命名空间配置了 `ResourceQuota`（例如 `requests.nvidia.com/gpumem`），内置的 `ResourceQuota` 校验准入控制器会在 HAMi 的 mutating webhook 运行完毕（已修改或拒绝 Pod）之后、任何调度器看到 Pod 之前对其进行检查。它使用同样的公式 `max(sum(app), max(init))`，但只在 Pod 创建时计费一次，并在 Pod 处于非终止状态期间一直保留这笔计费（Pod 进入 `Succeeded`/`Failed` 或被删除后才释放）。它不会在 init 容器结束时做出反应，因此本设计中的收缩只会释放 HAMi 内部的容量，`ResourceQuota` 的计费并不会在那时释放。

因此会出现这种情况：同样的 Pod 在没有配额时运行正常，设置配额后却无法创建。例如配额为 10000，Pod A（init 8000，应用 5000）只要处于非终止状态，就会一直被计为 8000，即使它的 init 容器已经退出。此时 Pod B（有效值 5000）在 HAMi 看到它之前就会被拒绝，报错 `exceeded quota: ... used: 8k`。这是 Kubernetes 的正常行为，HAMi 无法改变。
