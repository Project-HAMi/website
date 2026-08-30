---
title: "HAMi 可组合调度策略：mutex、binpack、spread、numa 如何协同工作"
date: "2026-08-26"
description: "HAMi v2.10.0 让 hami.io/gpu-scheduler-policy 接受有序的、逗号分隔的策略列表。本文解释该特性背后的“先过滤、后排序”求值模型、各策略的语义、常用组合配方，以及上手与验证步骤。"
authors: [rootsongjc]
tags: ["HAMi", "调度", "GPU", "Kubernetes", "云原生"]
---

HAMi 一直通过 `hami.io/gpu-scheduler-policy` 注解提供按 Pod 生效的 GPU 调度策略：`binpack` 尽量把负载堆叠到少数卡上，`spread` 尽量打散，v2.10.0 新增的 `mutex` 则要求独占一张卡。但在 v2.10.0 之前，这个注解只能填**一个**值。

真实集群很少只需要一种行为。一份典型的生产诉求是这样的：推理副本要紧凑装箱，留出整卡空闲；同时每个 Pod 的多卡要落在同一 NUMA 节点上以保证带宽；而时延敏感的那批负载，干脆要独占几张卡。一句话里出现了**三种**策略。在 v2.10.0 之前，你只能选一个，放弃其余。

v2.10.0 补上了这块拼图：`hami.io/gpu-scheduler-policy` 现在接受**有序的、逗号分隔的列表**，过滤型与排序型策略可以组合（[#2621](https://github.com/Project-HAMi/HAMi/pull/2621)，[@mesutoezdil](https://github.com/mesutoezdil)，关闭 [#2010](https://github.com/Project-HAMi/HAMi/issues/2010)）。本文解释组合是如何求值的，以及如何上手与验证。如果你喜欢动手学习，配套的[实验 14：在 GKE 上验证可组合调度策略](/zh/tutorials/labs/composable-scheduler-policies-gke)会在真实集群上逐一复现下文的每个场景。

<!-- truncate -->

## 两类策略：过滤器与排序键

理解这个特性的关键是认识到：HAMi 的 GPU 策略从来就不是同一种东西，它们分属两种角色：

| 策略 | 角色 | 作用 |
| :-- | :-- | :-- |
| `mutex` | **过滤器** | 只有**当前没有任何负载**的卡才是候选，所有已被占用的卡都被筛掉。 |
| `topology-aware` | **过滤器**（仅 NVIDIA） | 只保留 NVLink/NVSwitch 拓扑满足多卡请求的卡，需要先启用拓扑感知调度。 |
| `binpack` | **排序键** | 偏好**使用率最高**的合格卡，让负载集中。 |
| `spread` | **排序键** | 偏好**使用率最低**的合格卡，让负载分散。 |
| `numa` | **排序键** | 偏好 NUMA 节点编号更低的卡，提升 locality。 |

过滤器回答的是每张卡一个是非题：这张卡到底能不能参与；排序键回答的是排序题：在合格卡中谁排第一。两种角色天然不冲突，因此可以组合：**过滤器先运行、缩小候选集，排序键再对幸存者排序**。

策略链表达的正是这件事：

```yaml
# 仅独占 GPU，再紧凑装箱，NUMA 作为 tiebreaker
metadata:
  annotations:
    hami.io/gpu-scheduler-policy: "mutex,binpack,numa"
```

## 调度器如何求值一条策略链

HAMi 调度器在过滤和打分一个节点的 GPU 时，策略链按固定流水线求值：

```mermaid
%% title: HAMi 如何求值一条策略链
flowchart LR
    A["解析注解<br/>切分、去空白、去重"] --> B["过滤器<br/>mutex / topology-aware<br/>筛掉不合格候选"]
    B --> C["按书写顺序排序<br/>binpack → spread → numa"]
    C --> D["全部键持平？<br/>按设备索引决胜"]
    D --> E["仅含过滤器？<br/>回退为 spread"]
```

规则依次是：

1. **解析。** 注解按逗号切分，忽略每一项两侧的空白，重复项被丢弃，只有已知的策略名会生效。
2. **先过滤。** `mutex` 和 `topology-aware` 在任何排序之前的过滤阶段生效。对带 `mutex` 的 Pod 来说，一张卡是否合格只看一个问题：这张卡当前是否一个租户都没有？哪怕卡上只跑着一个很小的负载、剩余显存再多，这张卡也会被整体排除，因此 `mutex` Pod 只能落到完全空闲的卡上。当所有卡都有租户时，Pod 会保持 Pending，原因为 `ExclusiveDeviceAllocateConflict`。
3. **按书写顺序排序。** `binpack`、`spread`、`numa` 构成一个有序的排序键列表。第一个键起决定作用：`binpack,numa` 先按 binpack 排序，只有当 binpack 给两张卡打出相同分数时，才用 NUMA 节点编号决胜负。写成 `numa,binpack` 则优先级相反，列表的顺序就是键的顺序。
4. **确定性决胜。** 如果两张卡在链上的所有键下都比较结果相同，设备索引更小者胜出。因此在空闲集群上，相同的请求会产生相同、可复现的放置结果。
5. **仅含过滤器时回退。** 一条完全不含排序键的链（例如 `"mutex,topology-aware"`）在过滤之后回退为 `spread` 排序。
6. **单值行为不变。** 单独的 `"binpack"`、`"spread"` 或 `"mutex"` 与 v2.10.0 之前的行为完全一致，升级时存量负载无需任何改动。

## 排序键到底在比什么

对 `binpack` 和 `spread` 来说，“最满/最空”不是拍脑袋：调度器根据每张卡已分配的算力和显存计算利用率得分，权重由 slot、core、memory 三项组成（可以用 `hami.io/device-scoring-weights` 注解按 Pod 调整权重）。`binpack` 选**分数最高**的卡，`spread` 选**分数最低**的卡。`numa` 键比较的是 NVML 上报的每张卡所在 NUMA 节点编号。

值得一提的是 v2.10.0 同时修复了一个相关老问题（[#2012](https://github.com/Project-HAMi/HAMi/pull/2012)）：此前即使指定纯 `binpack`/`spread`，NUMA 也是*首要*排序键，导致负载无视实际负载地被钉死在一个 NUMA 节点上。修复后，利用率得分成为主键，NUMA 只做决胜，这正是 `numa` 在策略链中扮演的 tiebreaker 角色。

## 实例：一个 Pod 在四张卡上的选择路径

把上面的流程放进实验 14 的真实场景：一个节点、四块 Tesla T4，一个带 `mutex,binpack` 注解、申请 1 个 vGPU（1000 MiB 切片）的 Pod 待调度。下图每张卡标出了租户数与利用率得分，箭头就是选择路径：

```mermaid
%% title: 一个 mutex,binpack Pod 在四张候选卡上的选择路径
flowchart TB
    POD["待调度 Pod<br/>注解：mutex,binpack<br/>请求：1 个 vGPU，1000 MiB"]

    subgraph CARDS["节点上的 4 张候选卡"]
        direction LR
        G0["GPU 0<br/>已有 2 个租户 · 得分 3.30"]
        G1["GPU 1<br/>已有 1 个租户 · 得分 1.65"]
        G2["GPU 2<br/>完全空闲 · 得分 0.00"]
        G3["GPU 3<br/>完全空闲 · 得分 0.00"]
    end

    POD --> FILTER
    FILTER["第 1 步：mutex 过滤<br/>只保留零租户的卡"]
    G0 -. 被剔除 .-> FILTER
    G1 -. 被剔除 .-> FILTER
    G2 -- 幸存 --> SORT
    G3 -- 幸存 --> SORT
    SORT["第 2 步：binpack 对幸存卡排序<br/>得分高者优先"]
    TIE["第 3 步：两张幸存卡得分同为 0.00<br/>设备索引决胜，GPU 2 胜出"]
    RESULT["Pod 落到 GPU 2"]
    FILTER --> SORT
    SORT --> TIE
    TIE --> RESULT
```

从图中可以读出两件事：

- 最忙的 GPU 0 根本没有进入排序步骤：`mutex` 过滤器先把它剔除了，尽管纯 `binpack` 会以 3.30 的最高分优先选它。过滤先于排序，所以组合链压根不会考虑纯 `binpack` 会选的那张卡。
- 两张幸存卡的得分相同（都是 0.00），`binpack` 无法区分，链继续落到设备索引决胜，确定性地选择 GPU 2。

这些数字来自实测：实验中带一个 1000 MiB 租户的卡得分 `1.651042`，空闲卡得分 `0.000000`，均来自调度器的打分日志。

## 常用配方

| 注解                   | 含义                                                                  |
| :--------------------- | :-------------------------------------------------------------------- |
| `"binpack"`            | 把该 Pod 堆到能放下的最忙的卡上，最大化整卡空闲。                     |
| `"spread"`（默认）     | 放到最空的卡上，最小化邻居间的争抢。                                  |
| `"mutex"`              | 要求一张当前零用户的卡（注意：之后调度的普通 Pod 仍可能加入这张卡）。 |
| `"binpack,numa"`       | 紧凑装箱；装箱打平时偏好 NUMA 编号更低的卡。                          |
| `"mutex,binpack"`      | 独占且紧凑：在空闲卡中选最忙的一张，降低碎片化。                      |
| `"mutex,binpack,numa"` | “时延层”配方：独占卡、空闲卡中紧凑装箱、NUMA 作为决胜。               |

关于 `mutex` 语义的说明：它保证的是**放置时刻**这张卡没有用户。之后调度的普通 Pod 仍可能加入这张卡。若要让卡在负载整个生命周期内保持独占，请申请它的全部资源（显存和算力），或用 `nvidia.com/use-gpuuuid` 显式固定。

## 三步上手

**1. 升级到 HAMi v2.10.0 或更高版本。**

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
helm upgrade hami hami-charts/hami -n kube-system --version 2.10.0
```

集群级默认值仍是节点选择 `binpack`、卡选择 `spread`（chart values 中的 `scheduler.defaultSchedulerPolicy.nodeSchedulerPolicy` / `gpuSchedulerPolicy`），升级不会改变任何默认值。

**2. 给需要组合行为的 Pod 打注解。**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: inference-latency-tier
  annotations:
    hami.io/gpu-scheduler-policy: "mutex,binpack,numa"
spec:
  containers:
    - name: app
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 1 # 1 个 vGPU
          nvidia.com/gpumem: 8000 # 显存配额 8000 MiB
```

**3. 验证决策。** 调度器会把选中的卡写到 Pod 上，因此无需进入容器即可验证放置结果：

```bash
# 选中卡的设备 UUID、厂商、显存切片与算力百分比
kubectl get pod inference-latency-tier \
  -o jsonpath='{.metadata.annotations.hami\.io/vgpu-devices-allocated}'; echo
```

对于保持 Pending 的 `mutex` Pod，`kubectl describe pod` 会显示 `ExclusiveDeviceAllocateConflict` 原因；调度器在过滤时也会为每张候选卡输出一行利用率打分日志（`computer score is`），可以直接观察 `binpack` 与 `spread` 的排序依据：

```bash
kubectl -n kube-system logs deploy/hami-scheduler -c vgpu-scheduler-extender \
  --tail=-1 | grep 'computer score' | tail
```

## 在真实集群上试试

读过滤器与排序键是一回事，亲眼看一个 `mutex` Pod 在你释放一张卡之前一直 Pending，再看 `mutex,binpack` 拒绝纯 `binpack` 本会选中的卡，是另一回事。[实验 14：在 GKE 上验证可组合调度策略](/zh/tutorials/labs/composable-scheduler-policies-gke)在一台挂四块 Tesla T4 的 GKE 节点上跑完整的特性矩阵：默认 `spread`、`binpack` 堆叠、`mutex` 阻塞与释放、组合的 `mutex,binpack` 行为，全部通过分配注解、事件和调度器日志验证。

## 参考资料

- Pull request：[feat: support comma-separated gpu-scheduler-policy combinations (#2621)](https://github.com/Project-HAMi/HAMi/pull/2621)
- Issue：[Composable scheduling policies (#2010)](https://github.com/Project-HAMi/HAMi/issues/2010)
- [调度策略设计文档](/zh/docs/developers/scheduling)
- [配置参考](/zh/docs/userguide/configure)
- 动手实验：[实验 14：在 GKE 上验证可组合调度策略](/zh/tutorials/labs/composable-scheduler-policies-gke)
