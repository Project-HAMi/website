---
title: "HAMi v2.10.0 发布：Flexible MIG、可组合调度策略与更广阔的加速器生态"
date: "2026-08-21"
description: "HAMi v2.10.0 正式发布。本次发布带来了动态 Flexible MIG、全新的 mutex 调度策略、NUMA 排序修复与可组合调度策略、PodGroup（gang-scheduling）支持、AMD MI300X 与壁仞设备支持、更深入的昇腾管理（vNPU 与 HAMi-core 异构模式及监控），以及 KAI Scheduler + HAMi-core 集成。"
tags: ["Release", "GPU", "Kubernetes", "调度"]
authors: [hami_community]
---

HAMi 社区正式发布 **HAMi v2.10.0**。本次发布在三个方向上取得进展：**更灵活的调度策略、更广泛的异构加速器覆盖，以及更加丰富的调度器生态**。

v2.10.0 引入了动态 **Flexible MIG**、全新的 **mutex** 调度策略、社区期待已久的 **NUMA 排序修复**、**可组合调度策略**、**PodGroup（gang-scheduling）** 支持，以及更准确的 **init 容器** 资源计量。在设备侧，新增了 **AMD MI300X** 与**壁仞**支持、让基于模板的 vNPU 与 HAMi-core 节点在同一集群共存的**昇腾异构管理**能力，以及 **vNPU HAMi-core 监控**。同时通过全新的 KAI Resource Isolator 伴随项目，首次实现了 **KAI Scheduler + HAMi-core** 集成。

本文将对 v2.10.0 的主要更新进行详细说明。

<!-- truncate -->

## 调度：更灵活、更可组合

### Flexible MIG：无需驱逐节点的动态 MIG

过去在 HAMi 中使用 NVIDIA MIG（Multi-Instance GPU），往往依赖静态 MIG 几何与 `nvidia-mig-parted` 等工具，在变更 profile 前通常需要先 drain 或 cordon 节点。v2.10.0 用 **Flexible MIG** 取代了这一流程，实现按需动态创建与销毁 MIG 实例（[#2378](https://github.com/Project-HAMi/HAMi/pull/2378)，[@FouoF](https://github.com/FouoF)）。

主要亮点：

- **无需驱逐**：MIG 实例随工作负载的进出动态创建与销毁，无需 cordon 节点。
- **NVML 动态发现**：通过 NVML 动态发现 profile，结合拓扑感知的资源预留与 profile 白名单来约束可切分的范围。
- **重启后状态保留**：MIG 预留与运行时身份（原生 GI/CI 状态）可在 device-plugin 恢复与节点重启后保留，并通过 Pod 注解记录。
- **更安全的启动**：device plugin 会避免重置已有活跃工作负载的 GPU。
- **MIG 指标现代化**：DCGM 风格的指标暴露 MIG UUID、profile、实例 ID 与位置坐标。

> **已知限制**：CDI 模式暂不支持与 MIG 同时使用，多设备 MIG 场景仍需进一步验证。建议在生产环境部署前，针对你的实际拓扑进行测试。

### Mutex 调度策略与 NUMA 排序修复

v2.10.0 新增了 **`mutex`** GPU 调度策略（[#2011](https://github.com/Project-HAMi/HAMi/pull/2011)，[@mesutoezdil](https://github.com/mesutoezdil)）。带有 `hami.io/gpu-scheduler-policy: mutex` 注解的 Pod 会被调度到**当前没有任何用户使用的 GPU** 上，从而为该工作负载保证独占的设备访问，非常适合对延迟敏感的推理，或不能共享同一颗 die 的工作负载。

同一改动还修复了一个长期存在、影响 `binpack` 与 `spread` 的排序 bug。此前调度器以 **NUMA 节点作为主排序键**，导致无论实际负载如何，工作负载都被固定到某个 NUMA 节点（[#1806](https://github.com/Project-HAMi/HAMi/issues/1806)）。本次发布后，**设备利用率 Score 成为主排序键，NUMA 仅作为 tiebreaker**，因此 `binpack` 与 `spread` 在多 NUMA 拓扑下的行为恢复正常（[#2011](https://github.com/Project-HAMi/HAMi/pull/2011)）。

```yaml
# 请求独占分配的 GPU
metadata:
  annotations:
    hami.io/gpu-scheduler-policy: "mutex"
```

### 可组合调度策略

单个策略各有用处，但真实集群往往需要多种行为叠加：既要紧凑装箱，又要保持 NUMA 亲和，还要留几张卡独占。v2.10.0 让 `hami.io/gpu-scheduler-policy` 接受**有序的、逗号分隔的列表**，使过滤型与排序型策略可以组合（[#2621](https://github.com/Project-HAMi/HAMi/pull/2621)，[@mesutoezdil](https://github.com/mesutoezdil)，关闭 [#2010](https://github.com/Project-HAMi/HAMi/issues/2010)）：

- `binpack`、`spread`、`numa` 作为**排序键，按书写顺序生效**：`binpack,numa` 先按 binpack 排序，再以 NUMA 作为 tiebreaker。
- `mutex`（以及 NVIDIA 上的 `topology-aware`）作为**过滤器**，在排序前先筛掉不合格的候选设备。
- 比较结果相同的候选按设备索引确定性地排序；仅含过滤器的组合回退为 `spread`。
- 逗号两侧的空白会被忽略，**单个策略值的行为与之前完全一致**。

```yaml
# 仅独占 GPU，再紧凑装箱，NUMA 作为 tiebreaker
metadata:
  annotations:
    hami.io/gpu-scheduler-policy: "mutex,binpack,numa"
```

至此，v2.10 roadmap 中跟踪的调度策略组合工作宣告完成：各策略（`mutex`、`numa`、`topology-aware`、`binpack`、`spread`）既可以单独使用，也可以按任意顺序组合成链。

### PodGroup（gang-scheduling）支持

针对分布式训练等"要么全调度、要么不调度"的工作负载，v2.10.0 新增了 **PodGroup 支持**，使同一 PodGroup 的成员在节点锁竞争时能干净地完成 bind，而不会互相挤掉（[#2066](https://github.com/Project-HAMi/HAMi/pull/2066)，[@lin121291](https://github.com/lin121291)，issue [#1832](https://github.com/Project-HAMi/HAMi/issues/1832)）。

此前，当同一 PodGroup 的多个成员并发 bind 到同一节点时，它们会争抢 `hami.io/mutex.lock` 注解；失败者会立即失败并退回到 kube-scheduler 的退避逻辑。v2.10.0 为 PodGroup 成员（通过 `scheduling.x-k8s.io/pod-group` 标签识别）在 `Bind` 中新增了**重试循环**，并引入新的 `--node-lock-retry-timeout` 参数（默认 28 秒，刻意低于 extender 30 秒的超时）。非 PodGroup 的 Pod 行为保持不变。

### 更准确的 init 容器资源计量

使用 init 容器下载权重或准备数据的 Pod 此前会被多算：调度器将*所有*容器请求相加，把 init 容器当作并行运行来处理。v2.10.0 让 HAMi 对齐了标准 Kubernetes 语义：有效请求变为 `max(Σ 应用容器, max(init 容器))`（[#1773](https://github.com/Project-HAMi/HAMi/pull/1773)，[@maishivamhoo123](https://github.com/maishivamhoo123)）。这消除了依赖 init 容器的 Pod 出现的误报"节点已满"失败与错误的配额拒绝。

## 更广泛的异构加速器支持

### AMD Instinct MI300X vGPU

v2.10.0 新增了对 **AMD Instinct 加速器的软件 vGPU 支持**，已在 **MI300X** 上基于 ROCm 7.0.2 验证（[#2290](https://github.com/Project-HAMi/HAMi/pull/2290)，[@FouoF](https://github.com/FouoF)、[@kenji-mido](https://github.com/kenji-mido)）。

该方案不依赖硬件 SR-IOV，而是通过 glibc `LD_AUDIT` 注入用户态 hook（`libamvgpu.so`），并借助 `HIP_DEVICE_MEMORY_LIMIT` 实施限制。这为显存与算力都提供了硬隔离：

| 维度 | 请求方式 | 行为 |
| :-- | :-- | :-- |
| 显存隔离 | `amd.com/gpumem`（MiB） | 单 GPU 硬限制；使用量不会超过分配值 |
| 算力隔离 | `amd.com/gpucores`（0-100，CU%） | 限制计算单元百分比（如 `25` ≈ 304 CU 设备上的 76 个 CU） |
| 设备数量 | `amd.com/gpu` | GPU 数量 |

```yaml
resources:
  limits:
    amd.com/gpu: "1" # 1 张 GPU
    amd.com/gpumem: "49152" # 48 GiB 显存
    amd.com/gpucores: "30" # 30% 计算单元
```

AMD 支持以独立的 [`amd-device-plugin`](https://github.com/Project-Hami/amd-device-plugin) 组件（`0.0.1`）提供，通过 `postStart` hook 安装 `libamvgpu.so`。**请勿将其与上游 ROCm `k8s-device-plugin` 混用。**

:::warning[要求与限制]

- 工作负载镜像必须基于 **glibc 且 GLIBC ≥ 2.34**（如较新的 `rocm/pytorch` 标签）。**暂不支持 Alpine/musl、Ubuntu 20.04 与 RHEL 8**（[#2265](https://github.com/Project-HAMi/HAMi/issues/2265)）。
- 暂不支持基于 **RDNA/WGP** 的设备。
- 受限于硬件，单 Pod 多 GPU 场景尚未验证。
- 若使用 AMD GPU Operator 安装驱动，请先关闭其内置的 device plugin。

:::

### 壁仞（Biren）设备支持

v2.10.0 新增了对**壁仞**加速器的管理支持（已验证型号：`Biren166M`），由 [@DSFans2014](https://github.com/DSFans2014) 贡献（[#1711](https://github.com/Project-HAMi/HAMi/pull/1711)）。提供两种分配模式：

- **整卡模式（Full-card）**：每个 Pod 独占一整张 GPU。
- **SVI 切分**：将一张卡固定切分为 **2 或 4 个分区**，支持通过注解选择/排除设备 UUID。

```yaml
# 节点需要先打标签：kubectl label node <node-name> biren=on
resources:
  limits:
    birentech.com/gpu: "1"
```

> **注意**：与 NVIDIA/AMD 不同，壁仞**不能**按 Pod 指定显存或算力大小，你得到的是整卡或一个 SVI 分区（2 个分区或 4 个分区）。`biren-device-plugin` DaemonSet 部署在 `biren-gpu` 命名空间。

AMD 与壁仞的加入，使 HAMi 已覆盖更广泛的加速器，包括 NVIDIA、华为昇腾、寒武纪、海光 DCU、壁仞、燧原、沐曦、昆仑芯、天数智芯、AWS Neuron 与瀚博半导体。

## 更灵活的昇腾管理

### 昇腾异构模式：vNPU 与 HAMi-core 同集群共存

HAMi v2.9.0 为昇腾引入了 HAMi-core 模式（基于软件的显存与算力切分）。但此前仍有一个实际限制：Pod 必须显式选择某种模式，集群运维人员实际上要维护两套工作负载配置。

v2.10.0 让昇腾工作负载变为**模式无关（mode-agnostic）**。不带 `huawei.com/vnpu-mode` 注解的 Pod 会跟随其落地节点所支持的模式在同一集群内自动适配：在模板节点上使用**基于模板的硬切分（vNPU）**，在 HAMi-core 节点上使用 **HAMi-core 软切分**（[HAMi #2035](https://github.com/Project-HAMi/HAMi/pull/2035) 与 [ascend-device-plugin #106](https://github.com/Project-HAMi/ascend-device-plugin/pull/106)，[@ouyangluwei163](https://github.com/ouyangluwei163)）。带有显式 `huawei.com/vnpu-mode: hami-core` 注解的 Pod 仍严格绑定到该模式。调度器仅在节点确实不支持 hami-core 时，才会拒绝 hami-core 请求。

这降低了运行混合昇腾机群的复杂度：不再需要为两种切分方式维护两份工作负载清单。

### vNPU HAMi-core 监控

软切分的昇腾资源现在不仅"可分配"，更**可观测**。v2.10.0 为 vNPU HAMi-core 模式开启了内嵌的 Prometheus 指标服务，提供容器级与设备级的可见性：

- **9395 端口的 metrics 服务**，仅在启用 `hami-vnpu-core` 模式时启动（[ascend-device-plugin #93](https://github.com/Project-HAMi/ascend-device-plugin/pull/93)，[@maverick123123](https://github.com/maverick123123)）。
- **容器级 AICore 利用率**：`hami_container_device_utilization_ratio`（按设备 UUID 正确映射，而非回退到第一个设备）。
- **设备级显存**：`hami_host_gpu_memory_used_bytes`（按容器用量聚合，确保共享场景下的准确性）。
- 基于 DCMI 的**进程级 HBM 追踪**，并提供容器级共享内存计量，同时支持多设备（TP>1）推理（[ascend-device-plugin #87](https://github.com/Project-HAMi/ascend-device-plugin/pull/87)；[hami-vnpu-core #10](https://github.com/Project-HAMi/hami-vnpu-core/pull/10)）。
- 通过 ascend-device-plugin chart **支持 Helm 部署**的监控（[#108](https://github.com/Project-HAMi/ascend-device-plugin/pull/108)，[@DSFans2014](https://github.com/DSFans2014)）。

这让软切分昇腾资源从"可分配"迈向"可观测、可运营"。

## 调度器生态

### 通过 KAI Resource Isolator 实现 KAI Scheduler + HAMi-core

v2.10.0 首次推出了一个集成方案：让 **KAI Scheduler** 负责 GPU 共享的调度决策，而 **HAMi-core** 负责容器内的运行时隔离，两者由全新的伴随项目 [KAI Resource Isolator](https://github.com/Project-HAMi/KAI-resource-isolator)（v1.1.0，[@archlitchi](https://github.com/archlitchi)；监控由 [@dttung2905](https://github.com/dttung2905) 贡献）连接。

职责划分非常清晰：

- **KAI Scheduler** 决定*哪个* Pod 获得*多少* GPU 份额。
- **KAI Resource Isolator** 让该决策*真正生效*：DaemonSet（`libsync`）将 HAMi-core 的 `libvgpu.so` 下发到 GPU 节点，**mutating webhook** 把该库注入到共享 Pod 中并修改 `/etc/ld.so.preload`，使 `libvgpu.so` 拦截 CUDA 内存分配调用，强制执行 KAI Scheduler 通过 `CUDA_DEVICE_MEMORY_LIMIT` 设定的显存硬限制。
- 该集成**复用 HAMi 的监控指标**，并与现有的 HAMi Grafana 仪表盘兼容。

需要 KAI Scheduler **≥ 0.17.0**，并设置 `global.gpuSharing=true` 与 `binder.plugins.hamicore.enabled=true`。

:::note[持续完善中]

KAI + HAMi-core 的架构已经就位，isolator 也已发布，但有两个加固 PR 仍在进行中，在生产级硬隔离场景使用前值得跟踪：基于 fraction 的显存强制执行（[#6](https://github.com/Project-HAMi/KAI-resource-isolator/pull/6)）与非 root 容器目录权限（[#22](https://github.com/Project-HAMi/KAI-resource-isolator/pull/22)）。建议在你的 KAI GPU 共享 Pod 中验证显存限制确实生效。HAMi 侧相关的 CRD 工作（[#2014](https://github.com/Project-HAMi/HAMi/pull/2014)）也仍处于 draft 状态。可参阅我们此前的深度文章[《KAI Scheduler + HAMi：GPU 显存硬隔离》](/zh/blog/kai-scheduler-hami-gpu-memory-hard-isolation)。

:::

### Volcano 支持昇腾软切分 vNPU

Volcano 现在可以结合 Ascend device plugin 与 `hami-vnpu-core`，调度并运行昇腾软切分工作负载，把 Volcano 的批量调度能力与 HAMi 的运行时隔离能力结合起来。Volcano 通过其 `deviceshare` 插件（`AscendHAMiVNPUEnable: true`）暴露昇腾 vNPU，支持包括 910A、910B2、910B3、310P 在内的异构昇腾集群。

需要留意的前提条件：需要 **Volcano ≥ 1.14**，**`hami-core` 软切分需要 ≥ 1.16**，且软切分**仅支持 ARM 平台**。详见 [ascend-device-plugin Volcano 指南](https://github.com/Project-HAMi/ascend-device-plugin/blob/main/docs/volcano.md)。

## Chart、构建与运维改进

- **DRA 迁移到独立 chart**（[#2038](https://github.com/Project-HAMi/HAMi/pull/2038)，[@archlitchi](https://github.com/archlitchi)）：DRA 组件从主 HAMi Helm chart 中移除。DRA 现在拥有[独立的 chart/仓库](https://github.com/Project-HAMi/HAMi-dra)，不使用 DRA 的集群不再需要拉取这些组件。
- **握手注解优化**（[#2052](https://github.com/Project-HAMi/HAMi/pull/2052)，[@archlitchi](https://github.com/archlitchi)）：节点清理时现在会完整移除握手注解键，而不是写入带时间戳的 `Deleted_*` 标记，使健康/重置上报保持一致。
- **ubi8 编译镜像**（[#1958](https://github.com/Project-HAMi/HAMi/pull/1958)，[@spencercjh](https://github.com/spencercjh)）：HAMi 与 HAMi-core 的构建阶段迁移到 `nvidia/cuda:13.3.0-cudnn-devel-ubi8`，扩大了 GLIBC 兼容范围，使构建产物能在更广泛的目标发行版上运行。
- **mock-device-plugin NPU 模板**（[mock-device-plugin #18](https://github.com/Project-HAMi/mock-device-plugin/pull/18)，[@Wangmin362](https://github.com/Wangmin362)）：mock 插件现在同时支持新版嵌套格式与旧版扁平 `vnpus` 配置，并注册了昇腾 AI-core 与海光 DCU cores 资源，支持在无硬件环境下测试 NPU vNPU 调度。

## 贡献者

v2.10.0 是 HAMi 主仓库与更广泛的 Project-HAMi 组织（ascend-device-plugin、KAI-resource-isolator、mock-device-plugin、hami-vnpu-core、amd-device-plugin）共同贡献的成果。本周期代表性功能负责人包括：

- [@archlitchi](https://github.com/archlitchi)：发布协调、KAI Resource Isolator、DRA chart 拆分、握手优化
- [@mesutoezdil](https://github.com/mesutoezdil)：mutex 调度策略、NUMA 排序修复、可组合策略链
- [@maverick123123](https://github.com/maverick123123)：昇腾 vNPU HAMi-core 监控
- [@ouyangluwei163](https://github.com/ouyangluwei163)：昇腾异构模式（vNPU + HAMi-core）
- [@FouoF](https://github.com/FouoF)、[@kenji-mido](https://github.com/kenji-mido)：AMD MI300X vGPU、Flexible MIG
- [@DSFans2014](https://github.com/DSFans2014)：壁仞设备支持、vNPU 监控 Helm chart
- [@lin121291](https://github.com/lin121291)：PodGroup gang-scheduling 支持
- [@maishivamhoo123](https://github.com/maishivamhoo123)：init 容器资源计量
- [@Wangmin362](https://github.com/Wangmin362)：mock-device-plugin NPU 模板
- [@spencercjh](https://github.com/spencercjh)：ubi8 编译镜像
- [@dttung2905](https://github.com/dttung2905)：KAI vGPU 监控与非 root 工作负载修复

感谢每一位贡献者的付出，也感谢每一位报告问题、测试候选版本、分享生产反馈的用户。完整贡献者名单可见 [v2.10.0 Release Notes](https://github.com/Project-HAMi/HAMi/releases/tag/v2.10.0)。

## 升级指南

通过 Helm 升级至 v2.10.0：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
helm upgrade hami hami-charts/hami -n kube-system
```

完整安装文档请参考：[https://project-hami.io/zh/docs/installation/online-installation](/zh/docs/installation/online-installation)

:::warning[升级注意事项]

- **DRA 用户**：DRA 不再随主 chart 安装。若依赖 HAMi-DRA，请按 [HAMi-dra](https://github.com/Project-HAMi/HAMi-dra) chart 进行安装。
- **AMD 用户**：请部署独立的 [`amd-device-plugin`](https://github.com/Project-Hami/amd-device-plugin)，并确保工作负载镜像满足 GLIBC 2.34 要求。
- **昇腾用户**：vNPU HAMi-core 监控需启用 `hami-core` 模式；请核实 Volcano 版本（软切分需 ≥ 1.16，仅支持 ARM）。
- 建议在升级前于测试环境验证兼容性。

:::

## 总结

HAMi v2.10.0 是一次面向**调度灵活性、加速器广度与生态深度**的版本更新。借助 Flexible MIG、可组合调度策略（mutex、NUMA 排序修复与逗号分隔的策略链）、gang-scheduling 支持、AMD 与壁仞设备、更深入的昇腾管理与可观测性，以及 KAI Scheduler + HAMi-core 集成，HAMi 持续拓展统一异构算力调度平台的能力边界。

我们诚挚欢迎更多开发者、用户和生态伙伴参与 HAMi 社区，共同推动 GPU 虚拟化与异构算力调度能力的演进。

---

**相关链接：**

- GitHub Release：[https://github.com/Project-HAMi/HAMi/releases/tag/v2.10.0](https://github.com/Project-HAMi/HAMi/releases/tag/v2.10.0)
- KAI Resource Isolator：[https://github.com/Project-HAMi/KAI-resource-isolator](https://github.com/Project-HAMi/KAI-resource-isolator)
- Ascend Device Plugin：[https://github.com/Project-HAMi/ascend-device-plugin](https://github.com/Project-HAMi/ascend-device-plugin)
- AMD Device Plugin：[https://github.com/Project-Hami/amd-device-plugin](https://github.com/Project-Hami/amd-device-plugin)
- 项目文档：[https://project-hami.io/zh/docs/](/zh/docs/)
- 社区 Discord（推荐）：[https://discord.gg/Amhy7XmbNq](https://discord.gg/Amhy7XmbNq)
- 社区 CNCF Slack：[https://cloud-native.slack.com/archives/C07T10BU4R2](https://cloud-native.slack.com/archives/C07T10BU4R2)
