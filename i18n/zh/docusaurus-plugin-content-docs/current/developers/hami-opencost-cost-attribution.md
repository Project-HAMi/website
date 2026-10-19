---
id: hami-opencost-cost-attribution
title: 基于 HAMi 的 OpenCost GPU 成本按份额分摊
sidebar_label: OpenCost 成本分摊
translated: true
---

## 概述

HAMi 通过将一张物理 GPU 划分为显存和算力切片，让多个 Pod 共享同一张卡。[OpenCost](https://www.opencost.io/) 等 Kubernetes 成本工具根据 `nvidia.com/gpu` 资源请求分摊 GPU 成本，而 HAMi 始终以整数设备数量上报该资源。即使一个 Pod 只预留了四分之一张卡，它仍会请求 `nvidia.com/gpu: 1`，因此每个共用该卡的 Pod 都会按整张卡计费。四个 Pod 共享一张 GPU，却会被计为四张 GPU 的费用。

本文档描述了一种设计方案，利用 HAMi 已有的指标，按每个 Pod 实际占有的物理 GPU 份额分摊成本。该方案对应 [issue #3073](https://github.com/Project-HAMi/HAMi/issues/3073) 中 HAMi 侧的工作，以及 OpenCost 的问题报告 [opencost/opencost#3828](https://github.com/opencost/opencost/issues/3828)。

## 动机

### 目标

- 在共享同一张物理 GPU 的 Pod 之间分摊成本，使各 Pod 的费用与未预留资源的空闲成本之和等于整张卡的价格。
- 对 GPU 显存和 GPU 算力分别定价，因为两者可以独立租用，而且一个 Pod 的显存份额与算力份额可能不同。
- 根据仅在容器运行期间存在的指标对 Pod 计费，避免对已预留资源但从未运行的 Pod 收费。

### 非目标

- 不在 HAMi 中新增运行时组件。成本核算由针对 HAMi 指标的 OpenCost 查询和记录规则实现，本文档负责说明其设计。
- 第一个里程碑不涉及非 NVIDIA 设备的成本模型。
- 不自动分摊未设置算力上限且存在竞争时的算力成本。未设置核心限制的 Pod 将作为一类特殊情况明确说明，绝不会在未作说明的情况下按零算力计费。

## 背景

### HAMi Pod 如何申请 GPU 切片

Pod 通过以下三个资源限制申请一张卡的切片：

```yaml
resources:
  limits:
    nvidia.com/gpu: 1 # 可见一张 GPU
    nvidia.com/gpucores: 25 # 使用该卡 25% 的算力
    nvidia.com/gpumem-percentage: 25 # 使用该卡 25% 的显存
```

通过装箱调度，可以让四个这样的 Pod 同时运行在同一张物理卡上。

### 为什么仅靠 `nvidia.com/gpu` 无法准确计费

OpenCost 的 GPU 请求查询读取 `nvidia_com_gpu` 资源，并将其视为整卡使用量。它不读取 `gpucores` 或 `gpumem`，因此无法识别四个 Pod 正在共享一张卡。结果是费用可能达到实际应计费用的四倍，用户只能手动修正。

### HAMi 已经记录了哪些数据

与本方案相关的指标分为两类。

调度器预留指标在调度器的过滤阶段根据缓存的分配信息生成：

- `hami_vgpu_memory_allocated_bytes`：按命名空间、节点、Pod 和设备 UUID 区分。
- `hami_vgpu_core_allocated_ratio`：使用相同的标签。对于 NVIDIA，该值是 0 到 100 范围内的百分比，而不是 0 到 1 的比例。
- `hami_gpu_memory_allocated_bytes` 和 `hami_node_gpu_memory_allocated_ratio`：按设备记录，结合两者可计算出整张卡的显存总量。

这些预留时间序列是 Pod 级别的，而不是容器级别的。`PodManager` 仅保存每个 Pod 汇总后的设备使用情况，每种设备类型对应一条记录。因此，在 v2.10.0 及更早版本中，这些指标所携带的 `container_index` 标签始终为 0，并已在 [#2898](https://github.com/Project-HAMi/HAMi/pull/2898) 中移除。本设计面向当前 master 分支，始终按 Pod 级别处理预留数据。在 v2.10.0 及更早版本中，该标签虽然存在，但值是固定的，因此同样适用这种 Pod 级别的处理方式。

vGPUmonitor 运行时指标由监控 DaemonSet 生成，且仅在容器运行期间存在：

- `hami_container_device_utilization_ratio`：按命名空间、Pod、容器、虚拟设备索引和设备 UUID 区分。
- `hami_vgpu_memory_used_bytes`：使用相同的标签。

预留指标在过滤阶段计算，因此只能说明切片已被预留，不能证明 Pod 已经运行。Pod 可能通过过滤后仍无法启动。这些指标也不包含 Pod UID。运行时指标仅在容器运行期间存在，因此它们的存在本身就表明 Pod 已经启动。

## 设计细节

### 计费数据来源

计费以运行时指标的存在为前提。这些指标仅在容器运行期间存在，因此在过滤阶段预留了切片、却从未运行的 Pod 不会被收费。两种策略都遵循这一前提。

在满足此前提后，两种策略从不同来源读取份额，因为只有调度器记录了切片的预留大小。实测策略从运行时指标获取两个维度的份额。预留策略从调度器预留指标获取份额，但仍然只对运行时指标表明容器存在的时间窗口计费。调度器预留指标还提供整卡总量以及对账所需的空闲余量。

### 成本模型

GPU 显存和 GPU 算力分别定价后相加：

```text
pod_cost_per_hour = core_price_per_hour * core_fraction
                  + mem_price_per_hour  * mem_fraction
```

`core_fraction` 和 `mem_fraction` 的取值范围均为 0 到 1。当算力限制和显存限制不同时，不存在一个通用的单一份额，因此始终分别处理这两个维度。

### 对账恒等式

对于每张物理卡，各 Pod 的费用与空闲成本之和必须等于整张卡的价格：

```text
idle_cost_per_hour = core_price_per_hour * (1 - sum(core_fraction over pods on the card))
                   + mem_price_per_hour  * (1 - sum(mem_fraction  over pods on the card))

sum(pod_cost_per_hour over pods on the card) + idle_cost_per_hour
  == physical_gpu_price_per_hour
```

空闲成本按各维度的剩余份额计算：分别对算力和显存中未计入任何 Pod 费用的部分定价。它既涵盖没有任何 Pod 预留的容量，也涵盖实测策略下 Pod 切片内已预留但未使用的容量。由于每个维度的空闲份额严格定义为 1 减去该维度的份额总和，两种策略都能保证恒等式成立：在整张卡被完全预留时，预留份额之和为 1，空闲成本为 0；而当实测份额之和小于 1 时，空闲成本会相应增加，因此即使一张卡已被完全预留但使用不足，核算出的总成本也不会低于整卡价格。

对于每张卡，每个维度的份额总和都限制在 0 到 1 范围内，以保证空闲成本非负，并防止 Pod 费用之和超过整卡价格。显存受物理容量约束，因为已使用字节数不能超过整卡总量。在资源竞争或采样噪声的影响下，实测算力份额之和可能短暂超过 1；当一张卡上各容器的原始比例之和超过 1 时，处理流程会按比例归一化，使该维度的总和恰好为 1，从而将空闲成本的下限保持为 0，并保留各 Pod 之间的相对份额。如果归一化所需舍弃的量超过可配置的容差，则将该时间区间标记为无法分摊，而不是根据失真的份额计费。

### 分摊策略

本设计定义了两种策略。它们使用相同的成本模型和对账恒等式，区别仅在于如何确定份额。

预留策略。`core_fraction` 和 `mem_fraction` 来自调度器预留指标。例如，预留 25% 算力的 Pod，其算力份额为 0.25。在整张卡被完全预留时，各 Pod 的份额之和为 1，空闲份额为 0。这是第一个里程碑的目标，也是最容易理解和核算的策略。

实测策略。`core_fraction` 来自计费窗口内 `hami_container_device_utilization_ratio` 的平均值，并归一化到 0 到 1；`mem_fraction` 则由 `hami_vgpu_memory_used_bytes` 除以整卡显存总量得到。这些值反映预留切片内的实际使用量，其总和不会达到 1，差额对应预留切片内的空闲容量。

### 无算力限制及算力竞争的处理

在 HAMi 中，`gpucores` 为 0 或未设置表示不限制算力，而不是算力为零。这类 Pod 可以使用整张卡的算力，并与共用该卡的其他 Pod 竞争。仅根据分配信息无法推导出它的实际算力份额。

这些 Pod 需要作为单独的一类处理。在预留策略下，可以将它们排除在算力分摊之外并标记为无法分摊，也可以采用可配置的回退方案，例如在共享该卡且未设置算力限制的 Pod 之间，均分该卡尚未预留的算力。绝不会在未作说明的情况下按零算力计费。在实测策略下，算力份额根据一段时间内的实测利用率确定，但前提是运行时确实为该容器采集了这一指标。

是否采集该指标由具体配置决定。`hami_container_device_utilization_ratio` 从 HAMi-core 的 `utilization_watcher` 线程写入的共享区域读取，而该线程仅在容器的 SM 限制处于有效范围内时启动。该限制由 `CUDA_DEVICE_SM_LIMIT` 指定，HAMi 根据 `nvidia.com/gpucores` 设置它。若 Pod 设置了 `gpucores: 0`，或者在只申请部分显存的同时未设置 `gpucores`，则不会启动 watcher 线程，整个时间窗口内都会上报 0。申请整张卡全部显存的 Pod 不受此影响，因为准入阶段会为其注入 `gpucores: 100`。算力限制的执行由 `GPU_CORE_UTILIZATION_POLICY` 单独控制；当 Helm chart 的 `gpuCorePolicy` 值不是 `default` 时，会将该值注入此环境变量，其他可选值为 `force` 和 `disable`。SM 限制的具体有效边界在不同 HAMi-core 版本之间发生过变化，因此部署环境在采用实测策略前，应确认其自身未设置算力限制的工作负载能够产生非零指标。如果指标始终上报 0，则将该 Pod 标记为无法分摊，而不是按零算力计费。第一个里程碑仅使用显式的非零限制，以完全避开这一情况。

### 关联数据时的 Pod 身份识别

两类指标都不携带 Pod UID，而且粒度不同。预留时间序列是 Pod 级别的，标签包括 `namespace`、`node`、`pod`、`device_uuid`。运行时时间序列是容器级别的，标签包括 `namespace`、`pod`、`container`、`vdevice_index`、`device_uuid`，不包含 `node`。

因此，不需要映射容器索引，也不要求 kube-state-metrics 提供容器索引。数据关联在 Pod 级别按物理卡进行。首先，在每个 `(namespace, pod, device_uuid)` 分组内，跨 `container` 和 `vdevice_index` 对运行时时间序列求和，得到每个 Pod 在每张卡上的一个运行时值，与调度器汇总预留数据的粒度一致。然后，将聚合后的时间序列与预留时间序列按 `(namespace, pod, device_uuid)` 关联。关联键不包含 `node`，因为 `(namespace, pod)` 已能在集群内标识一个 Pod，而预留时间序列已经携带了用于报表展示的节点信息。随后，kube-state-metrics 按 `(namespace, pod)` 提供工作负载归属和 Pod 生命周期信息，这与其暴露的数据粒度一致，因此这一侧也无需进行容器级别的映射。

本设计曾考虑向 HAMi 指标添加 `pod_uid` 标签，但最终未采用：它不能省去上述 Pod 级别的聚合，还会提高这些高流量时间序列的基数。

这一方案尚未解决的情况是：在同一次抓取窗口内，一个 Pod 在相同命名空间中以相同名称被重新创建。如果实践证明这种情况会导致分摊错误，则可以采用已记录的回退方案，添加 `pod_uid` 标签。

### 分摊逻辑的执行位置与避免重复计费

分摊逻辑通过针对 HAMi 指标的 OpenCost 查询和记录规则执行。OpenCost 自定义成本插件会添加独立的成本记录，并不会替换原生 GPU 成本，因此集成时必须避免对同一张卡重复计费。相关的 GenAI 和 MIG 效率插件（[opencost/opencost-plugins#69](https://github.com/opencost/opencost-plugins/pull/69)）涉及不同的范围；本方案关注的是通过软件共享 NVIDIA GPU 时，按 HAMi 分配的资源份额分摊成本。

## 验证

成本核算逻辑已编码为 Prometheus 记录规则，并通过 `promtool` 对合成时间序列进行单元测试。测试数据模拟了第一个里程碑的工作负载：一张卡由四个各占 25% 份额的 Pod 共享，第二张卡由一个对照 Pod 独占。测试断言了各 Pod 的份额、费用以及两张卡上的对账恒等式，且已通过。这样可以在投入 GPU 资源之前验证查询和模型。

包含这些清单、查询、记录规则、`promtool` 测试以及部署和报告脚本的复现工具不属于本 PR。它目前位于 HAMi fork 的一个分支中，即 [`Eshiv-Pandey/HAMi` 的 `opencost-repro/` 目录](https://github.com/Eshiv-Pandey/HAMi/tree/docs/opencost-repro/opencost-repro)，这里引用它仅用于说明上述验证结果的来源。是否应将其纳入上游、以及放在何处，仍由跟踪 issue 中的讨论决定。下一步是在具有代表性的多租户 GPU 集群上实际运行，记录两种策略下的真实利用率。

## 剩余工作

- 在多租户 GPU 集群上运行复现工具，记录两种策略下的实测利用率。
- 扩展 `promtool` 测试，加入实测份额总和超过 1 的超额使用时间区间，覆盖算力和显存两个维度中的按比例归一化以及标记为无法分摊的回退处理。
- 在更广泛地使用前，将未设置算力限制时的回退方案和 init 容器的资源释放行为明确为经过实测的策略。
- 与 OpenCost 社区共同确定集成逻辑的存放位置，以及如何避免与原生 GPU 成本重复计费。
