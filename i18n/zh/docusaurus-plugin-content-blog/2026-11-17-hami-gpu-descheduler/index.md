---
title: "HAMi GPU Descheduler：自动整理 Kubernetes 集群的 GPU 碎片"
date: "2026-11-17"
slug: hami-gpu-descheduler
description: "GPU 碎片化会让集群 67% 的显存闲置，新 Pod 却一直 Pending。本文介绍碎片化的成因，以及 HAMi GPU Descheduler 如何归整分散的 vGPU 工作负载、找回连续可用的 GPU 容量。"
authors: [rootsongjc, louiclille]
tags: ["HAMi", "GPU", "Kubernetes", "Descheduler"]
---

GPU 是 Kubernetes 集群里最昂贵的资源，因此大多数团队会选择共享使用。借助 [HAMi](https://github.com/Project-HAMi/HAMi)，一张物理 GPU 可以被切分成多个虚拟 GPU 分配给不同的 Pod，每个 Pod 都拥有独立的显存和算力隔离。

但共享也带来了一个长期运行的集群迟早会遇到的问题：**GPU 碎片化**。弹性伸缩、滚动升级、失败重试，Pod 不断创建销毁，每次都会在 GPU 上留下小块碎片。某一天，一个新 Pod 申请一整张 GPU，监控面板显示集群还有大量空闲显存，这个 Pod 却一直 `Pending`。容量明明存在，只是散落成了无法使用的碎片。

本文解释 GPU 碎片化的成因、手工治理为什么困难，以及 [HAMi GPU Descheduler](https://github.com/Project-HAMi/gpu-descheduler) 如何自动化地解决这个问题。

<!-- truncate -->

## 问题：有容量，却没有位置

考虑一个两节点集群，每个节点通过 HAMi 共享 4 张 GPU，8 个 Pod 各持有小块 vGPU：

- 节点 A：`a` 30%、`b` 40%、`c` 25%、`d` 45%
- 节点 B：`e` 35%、`f` 20%、`g` 40%、`h` 30%

全集群只用了 33% 的显存，67% 空闲。此时一个新 Pod 申请**一整张 GPU**：任何一张卡上都没有完整的 100% 空闲，调度器无法放置，Pod 只能留在 `Pending` 状态，而你大部分的 GPU 资源正在闲置。

![GPU 碎片化整理前后对比](/img/blog/hami-gpu-descheduler/zh/gpu-fragmentation.svg#light-only) ![GPU 碎片化整理前后对比](/img/blog/hami-gpu-descheduler/zh/gpu-fragmentation-dark.svg#dark-only)

这与内存或磁盘的碎片化是同一种现象，区别在于：内存碎片可以靠分配器合并解决，GPU 碎片不能。一个需要整卡的 Pod（例如不做模型并行的推理服务）只能落在一张完全空闲的设备上，分散在不同 GPU 上的碎片无法拼凑成一张整卡。GPU 碎片也并非只挡住整卡申请：任何 vGPU 申请，只要超过了所有设备上最大的单块空闲容量，都会无法落位。比如申请一张 GPU 的 70%，而每张卡的空闲显存都散成 40% 加 30% 的碎块，同样放置不了，整卡申请只是最容易看清的情形。

## 碎片化从哪里来

碎片化不是 Bug，而是集群动态运行的必然结果：

- **弹性伸缩。** 缩容时删除的 Pod 分散在多个节点上，留下大量半空的 GPU。
- **滚动升级。** 新版本的 Pod 落在有空余的节点上，旧版本离开后留下空洞。
- **失败重试。** 训练任务每次重启可能调度到不同节点。
- **混合负载。** 申请 20% 到 40% 显存的推理 Pod 与需要整卡的任务交错分布。

几周之后，集群就会从紧凑布局漂移成散乱布局：总利用率看起来健康，连续的空闲容量却在悄悄消失。更麻烦的是，被碎片挡住的往往正是最重要的任务：小 Pod 总能塞进缝隙，申请份额更大的大模型训练与微调反而最难落位。

## 手工治理为什么痛苦

手工治理的思路人尽皆知：找到碎片、`kubectl delete pod` 删掉可以迁移的 Pod、等控制器重建，期望它们落在合适的位置，必要时用节点选择器固定。反复操作，直到某张卡的空闲容量足以放下等待中的 Pod。

偶尔做一次没问题，但代价是真实的：

- 每次驱逐都是一次人工决策，你必须清楚哪些负载可以容忍中断。
- 重建的 Pod 重新走调度器，可能又被摊开，整理成果归零。
- 没有任何意图记录，布局很快再次劣化，同样的操作周而复始。

团队真正需要的是一种声明式、一次性的操作：“把这些负载归整到那个节点的 GPU 上”。这正是 HAMi GPU Descheduler 提供的能力。

## HAMi GPU Descheduler

[HAMi GPU Descheduler](https://github.com/Project-HAMi/gpu-descheduler) 是面向 HAMi 虚拟化 Kubernetes 集群的 GPU 碎片整理工具。它通过两个机制归整分散在各节点的 vGPU 工作负载：**Mutating Admission Webhook** 和 **`HamiPodPlacement` CRD**。它扮演的角色与操作系统中的磁盘碎片整理工具一样：把散落的负载归拢到一起，恢复每张设备上连续可用的空闲容量。它与 HAMi Scheduler 互补：调度器负责 GPU 资源的虚拟化、调度与隔离，descheduler 负责把已分配的资源摆放得更紧凑。

![HAMi GPU Descheduler 归整碎片化 vGPU 工作负载的流程](/img/blog/hami-gpu-descheduler/zh/how-it-works.svg#light-only) ![HAMi GPU Descheduler 归整碎片化 vGPU 工作负载的流程](/img/blog/hami-gpu-descheduler/zh/how-it-works-dark.svg#dark-only)

整个流程是这样的：

1. 创建一个 `HamiPodPlacement`，描述期望的放置：目标节点、GPU 设备、适用的 Pod，可选地指定一个需要驱逐腾位的 Pod。
2. 若设置了 `evictPod`，descheduler 会驱逐该 Pod 并等待；负载所属的控制器（Deployment、StatefulSet 等）将其重建。
3. 当目标 Pod（新建的或重建的）进入准入阶段，webhook 将它与 `HamiPodPlacement` 匹配（`reqID` 加 `podSelector`），并注入规划好的放置。
4. Pod 被调度到你指定的节点和 GPU 设备上。每个 `HamiPodPlacement` 恰好被一个 Pod 消费，保证了操作的幂等与可审计。

放置以 CRD 表达，碎片整理于是成为又一个普通的 Kubernetes 操作：声明式、可进 Git 审查、可自动化。

## 整理这个集群

回到开篇那个两节点集群。要腾空节点 B 并在节点 A 上腾出连续容量，六次一次性放置就够了：Pod `e`、`f`、`g`、`h` 从节点 B 搬到节点 A，`c` 和 `d` 在节点 A 内部重新固定，让 8 个 Pod 归拢到 GPU 0 到 2 上。以 Pod `e` 为例：

```yaml
apiVersion: scheduling.hami.placement.com/v1
kind: HamiPodPlacement
metadata:
  name: consolidate-e
  namespace: default
spec:
  reqID: "defrag-e-0001" # 最短 5 个字符，仅消费一次
  podSelector:
    matchLabels:
      app: inference
  nodeName: gpu-node-a
  gpuDevices:
    - gpu-1 # 或 gpu-1/70 表示 GPU 1 的 70%
  evictPod: inference-e-6cd5964877-zdb5z # 需要驱逐并重新放置的 Pod
```

关于 `podSelector` 有一点要注意：它决定哪个 Pod 消费这次放置，而“先通过准入的那个匹配 Pod”会消费它。如果命名空间里所有 Pod 都带着 `app: inference` 标签，消费放置的可能就不是 `e`，而是它的某个同门。ReplicaSet 的 `pod-template-hash` 之类的标签解决不了这个问题：同一个 ReplicaSet 的所有副本都带相同的值，先被准入的同门仍可能消费这次放置。请使用只有被搬迁工作负载才携带的标签，让选择器匹配不到别的 Pod；多副本工作负载则一次只搬一个副本，并避免在有兄弟 Pod 正在创建时进行搬迁。

### `evictPod` 是什么、怎么用

`evictPod` 是把“放置”变成“搬迁”的字段。它的值是同一个命名空间里一个现存 Pod 的名字，回答的是一个问题：为了让这次放置成立，哪个正在运行的 Pod 应该让出它现在占用的 GPU？

随后的流程是这样的。descheduler 驱逐这个 Pod 并等待；负载所属的控制器（Deployment、StatefulSet 等）重建该 Pod；重建的 Pod 进入准入阶段，匹配上 `reqID` 与 `podSelector`，webhook 把它固定到你规划的 `nodeName` 和 `gpuDevices` 上。不设置这个字段时，放置只影响之后创建的 Pod，是一种规划工具；设置之后，你就能主动搬移已经在运行的工作负载，而这正是碎片整理所需要的。

这个字段是可选的，原因也很实际。驱逐发生在目的地校验之前，所以添加之前务必确认 `nodeName` 和 `gpuDevices` 指向一个有足够空位的有效目的地，否则 Pod 被驱逐后无处可去。另外，descheduler 只等待替代 Pod、从不自行创建 Pod，因此被驱逐的负载必须由控制器管理。请有意识地使用 `evictPod`，一次搬一个 Pod。

每个 Pod 被驱逐、重建、并固定到节点 A 的特定 GPU 上，布局逐渐收敛为示意图中“整理后”的状态：8 个 Pod 打包进 3 张 GPU，新 Pod 占用第 4 张，**节点 B 完全腾空**，不增加任何容量，找回 4 张整卡。集群显存利用率从 33% 提升到 43%，提升完全来自那个原本无法启动的新 Pod。

腾空的节点可以缩容降本，也可以转而承接需要整卡的大模型训练任务。

:::warning 驱逐之前

主动驱逐会终止正在运行的 Pod，可能短暂降低可用性。负载必须由控制器（Deployment、StatefulSet 等）管理，确保被驱逐的 Pod 会被重建；开始整理前，请检查负载的就绪状态与中断保护。

:::

## 快速上手

使用 Helm 部署（要求 HAMi Scheduler v2.10.0+，Kubernetes v1.24+，推荐 v1.28+）：

```bash
git clone https://github.com/Project-HAMi/gpu-descheduler.git
cd gpu-descheduler
helm install gpu-descheduler ./chart --namespace kube-system --create-namespace
```

确认 webhook 正常运行：

```bash
kubectl get pods -n kube-system -l app=gpu-descheduler-webhook -w
```

webhook 还在 8083 端口提供 REST API，用于查看集群 GPU 状态和放置记录，这是决定整理什么的依据。这个端口没有通过 Service 暴露，需要先把它转发到本机（命令会一直阻塞，请在单独的终端里运行）：

```bash
kubectl port-forward -n kube-system deploy/gpu-descheduler-webhook 8083:8083
```

然后查询 API：

```bash
# 查看节点、GPU 设备与健康状态
curl -s http://localhost:8083/api/v1/cluster-info

# 查看当前 Placement CRD 缓存与分配记录
curl -s http://localhost:8083/api/v1/placements
```

目标 Pod 必须使用 `schedulerName: hami-scheduler`，且其标签要匹配 `HamiPodPlacement` 中的 `podSelector`。完整流程见[用户指南](/zh/docs/next/userguide/hami-gpu-descheduler)。

## 结语

GPU 碎片化是一个随集群动态性增长的可用性与成本问题：容量存在却无法使用，而人工治理脆弱且无据可查。HAMi GPU Descheduler 把碎片整理变成一次声明式的 Kubernetes 操作：驱逐、重建、固定，放置意图以 CRD 表达，由准入 webhook 强制执行。

这一能力源自真实的生产痛点：社区用户 [tsingst](https://github.com/tsingst) 在 [HAMi issue #2072](https://github.com/Project-HAMi/HAMi/issues/2072) 中提出了节点内碎片整理的需求；[易鑫集团](https://www.yxqiche.com/)的工程师 hukaihan 与 [vesta-mlp](https://github.com/vesta-mlp) 完成了 webhook 加 CRD 方案的设计与主要实现，并将代码开源贡献给 HAMi 社区；仓库公开后，[spencercjh](https://github.com/spencercjh)、[moezdil](https://github.com/moezdil)、[archlitchi](https://github.com/archlitchi) 等维护者和用户持续参与评审与完善。感谢每一位参与其中的社区成员。在社区的规划里，节点内整理只是第一步，跨节点乃至集群级的碎片整理也在讨论与规划之中。

如果你在动态集群中用 HAMi 共享 GPU，请留意那些申请较大显存份额却一直 `Pending` 的 Pod，整卡申请只是其中最容易看清的情形。然后试试 descheduler：

- **代码与发布：** [github.com/Project-HAMi/gpu-descheduler](https://github.com/Project-HAMi/gpu-descheduler)
- **用户指南：**[使用 HAMi GPU Descheduler 归整 GPU 资源碎片](/zh/docs/next/userguide/hami-gpu-descheduler)

## 延伸阅读

- [HAMi GPU Descheduler 用户指南](/zh/docs/next/userguide/hami-gpu-descheduler)
- [HAMi issue #2072：vGPU 资源节点内碎片化整理](https://github.com/Project-HAMi/HAMi/issues/2072)
- [HAMi 项目](https://github.com/Project-HAMi/HAMi)
