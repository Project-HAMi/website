---
title: "HAMi v2.11.0 发布：Remote GPU 调度、AMD GPU 共享、昇腾 ENPU、NUMA Refit 与走向成熟的 Flexible MIG"
date: "2026-11-04"
description: "HAMi v2.11.0 正式发布。本次发布带来基于 Lupine 的 Remote GPU 调度、具备容器级显存与算力限制的完整 AMD Instinct GPU 共享、支持策略隔离的昇腾 ENPU 模式、对齐 CPU 与 GPU 调度的 NUMA refit、包括 CDI 支持在内的 Flexible MIG 重要完善、调度器安全加固、OpenShift 与 SELinux 支持，以及重构后的 Helm Chart。"
tags: ["Release", "GPU", "Kubernetes", "调度"]
authors: [hami_community]
---

HAMi 社区正式发布 **HAMi v2.11.0**。

本次发布要点：

- **Remote GPU**：在没有 GPU、没有 NVIDIA 驱动的客户端节点上运行 CUDA 与 vLLM Pod，使用 [Lupine](https://github.com/lupinemachines) GPU 服务器通过网络提供的 GPU。
- **AMD Instinct GPU 共享**：AMD GPU（ROCm）成为 HAMi 的一等公民，支持按大小或百分比限制显存、限制算力、NUMA 与 XGMI 感知放置、调度策略与队列优先级，全部在容器级强制执行。
- **昇腾 ENPU 模式**：与模板模式、hami-core 并列的第三种切分方式，提供 fixed-share、elastic、best-effort 策略隔离，同时 `hami-vnpu-core` 完成大规模性能优化。
- **NUMA refit**：kubelet Topology Manager 与 HAMi 调度器达成一致，CPU 亲和性与 GPU 放置落在同一 NUMA 节点。
- **Flexible MIG 走向成熟**：动态 MIG 设备支持 CDI 注入、带回退的放置打分、按 Pod 的 profile 偏好。
- **更安全的调度器**：安全审计驱动下的 extender 与 webhook 加固，Filter 路径性能提升。
- **平台与 Chart**：OpenShift 与 SELinux 支持、重构后的 `devices.VENDOR` chart、节点容量资源上报。
- **官网大改版**：信息架构重组、Concepts 章节重绘、`llms.txt`、安装与升级指南重构。

v2.11.0 共合并 220 多个 pull request，来自 50 多位贡献者，其中 **29 位是首次贡献**。

本文将对 v2.11.0 的主要更新进行详细说明。

<!-- truncate -->

## Remote GPU：在任何地方运行 CUDA

不是每个节点都需要 GPU，也不是每个 GPU 节点都应该跑工作负载。借助 Remote GPU（[#3004](https://github.com/Project-HAMi/HAMi/pull/3004)，[@moezdil](https://github.com/moezdil)；设计方案来自 [Lupine](https://github.com/lupinemachines) 项目），HAMi 现在可以把 Pod 调度到由 Lupine GPU 服务器通过网络提供的 GPU 上：

- **无驱动的客户端节点**：客户端节点不需要 GPU，也不需要 NVIDIA 驱动。HAMi 把 Pod 放置到独立的客户端节点，通过 init 容器下发 Lupine 客户端库和 `nvidia-smi`，并注入指向所选服务器的 `LUPINE_SERVER` 环境变量（[@archlitchi](https://github.com/archlitchi)）。
- **GPU 节点变身 Lupine 服务器**：配置了 `operatingmode: remote` 的节点不再把 GPU 作为本地设备上报，而是为 Lupine 运行 GPU，并被打上 `hami.io/lupine-server` 标签（[#3013](https://github.com/Project-HAMi/HAMi/pull/3013)，[@moezdil](https://github.com/moezdil)）。
- **资源池选择**：Lupine 服务器可以按节点标签划分成多个池，Pod 通过 `hami.io/remote-server` 注解请求特定池（[#3195](https://github.com/Project-HAMi/HAMi/pull/3195)，[@asadjan4611](https://github.com/asadjan4611)）。NotReady 的服务器会被排除在放置之外。
- **整机预留 + 每 GPU 显存限制**：`nvidia.com/remote-gpu` 预留整个服务器（GPU 数量不少于请求值），可选的 `nvidia.com/remote-gpu-memory` 设置每 GPU 显存上限，由注入的 HAMi-core 库强制执行。多容器 Pod 保持在同一台服务器上（[@sanket-jadhav-cse](https://github.com/sanket-jadhav-cse)）。
- **运维安全**：等待 Lupine 集群变化的 Pod 会被重新入队而不是直接失败，Lupine 服务器支持可配置的 securityContext，可选的会话中继让用户无需服务器命名空间的转发权限即可 `kubectl port-forward`。[@FouoF](https://github.com/FouoF) 对 remote 模式做了进一步加固。

![Remote GPU（Lupine）架构](/img/blog/hami-v2-11-0-release/zh/remote-gpu-architecture.svg#light-only) ![Remote GPU（Lupine）架构](/img/blog/hami-v2-11-0-release/zh/remote-gpu-architecture-dark.svg#dark-only)

**启用方式**只需要两个 chart 配置和一处节点配置：

```yaml
devices:
  remotegpu:
    enabled: true
    defaultPort: 14833
    resourceCountName: "nvidia.com/remote-gpu"
    resourceMemoryName: "nvidia.com/remote-gpu-memory"

devicePlugin:
  nodeConfiguration:
    config: |
      {
        "nodeconfig": [
          {
            "nodelabelselector": { "matchLabels": { "role": "lupine-server" } },
            "operatingmode": "remote"
          }
        ]
      }
```

上面的 `nodelabelselector` 匹配的是你自行打上的标签；请在启用 remote 模式前（或之后重启 device-plugin）给每个要充当 Lupine 服务器的 GPU 节点打标签：

```bash
kubectl label node <gpu-node> role=lupine-server
```

之后，在无 GPU 节点上的 vLLM Deployment 看起来和普通 HAMi 工作负载完全一样（完整示例见 [remote-gpu examples](https://github.com/Project-HAMi/HAMi/tree/master/examples/remotegpu)）：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-remote-gpu
spec:
  selector:
    matchLabels:
      app: vllm-remote-gpu
  template:
    metadata:
      labels:
        app: vllm-remote-gpu
    spec:
      containers:
        - name: vllm
          image: vllm/vllm-openai:v0.25.1-ubuntu2404
          command: ["vllm", "serve", "Qwen/Qwen3-8B"]
          resources:
            limits:
              memory: 32Gi
              nvidia.com/remote-gpu: 2
              nvidia.com/remote-gpu-memory: 20480 # 每 GPU 20 GiB
```

当前需要了解的限制：客户端节点必须与服务器节点分开部署；支持的镜像为 CUDA 和 vLLM 0.19-0.26；工作负载会预留整个服务器。

## AMD Instinct GPU 共享

HAMi 现在可以在 Kubernetes 上共享并调度 AMD Instinct GPU（ROCm），使用与 NVIDIA 相同的资源模型，并在容器内部强制执行硬限制。v2.10.0 打下了显存、算力、类型与 UUID 的基础；v2.11.0 补齐了完整的特性集（主要由 [@moezdil](https://github.com/moezdil) 完成）：

- **显存隔离**：通过 `amd.com/gpumem` 申请绝对大小，或通过 `amd.com/gpumem-percentage` 申请 VRAM 的百分比（[#3179](https://github.com/Project-HAMi/HAMi/pull/3179)）。限制由 [amd-hami-core](https://github.com/Project-HAMi/amd-hami-core) 执行，它现在还会对 `hipMalloc3D`、数组、内存池与 VMM 封顶，把限额作为设备总量上报，并在设置 `HIP_OVERSUBSCRIBE` 时用托管内存提供 `hipMalloc`。
- **算力隔离**：`amd.com/gpucores` 通过 `HSA_CU_MASK` 设置计算单元份额，RDNA 上的算力请求会向上取整到整个 WGP（[#3174](https://github.com/Project-HAMi/HAMi/pull/3174)）。
- **灵活放置**：选择或排除 GPU 类型与 UUID（`amd.com/use-gputype`、`amd.com/use-gpu-uuid` 及对应的 `nouse-` 注解），用 `amd.com/numa-bind` 把多 GPU Pod 固定在同一 NUMA 节点（[#3186](https://github.com/Project-HAMi/HAMi/pull/3186)），用 `amd.com/link-bind` 要求所有 GPU 通过 XGMI 互联，`topology-aware` 策略则优先选择 XGMI 链路最多的组合（[#3191](https://github.com/Project-HAMi/HAMi/pull/3191)）。
- **高级调度**：支持 `binpack`、`spread`、`mutex` 与 `topology-aware` 策略，通过 `AMD_TASK_PRIORITY` 设置 Pod 队列优先级，在 Fit 阶段检查命名空间 ResourceQuota（[#3180](https://github.com/Project-HAMi/HAMi/pull/3180)），拓扑调度中只选择满足配额的 GPU 组合（[#3361](https://github.com/Project-HAMi/HAMi/pull/3361)，[@Eshiv-Pandey](https://github.com/Eshiv-Pandey)），为 GPU 数量、显存与算力提供默认值并支持设备封锁（[#3192](https://github.com/Project-HAMi/HAMi/pull/3192)），可配置 `runtimeClassName`（[#3194](https://github.com/Project-HAMi/HAMi/pull/3194)），按可分配 GPU 判断节点健康，以及专门的 AMD e2e 测试套件（[#3193](https://github.com/Project-HAMi/HAMi/pull/3193)）。

节点侧，[amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin) v0.0.4 新增 Instinct GPU 的硬件算力分区（SPX、DPX、QPX、CPX）、来自 AMD Device Metrics Exporter 的单 GPU 健康状态、节点注解中的 XGMI 对端信息，以及用于显存超售的 `-device_memory_scaling`。全新的 [amd-dra-driver](https://github.com/Project-HAMi/amd-dra-driver)（v0.1.0 至 v0.4.1）把同样的限制带到 DRA 路径，为每张 GPU 单独下发 `HSA_CU_MASK` 与 `HIP_DEVICE_MEMORY_LIMIT_` 并向 kubelet 上报健康状态，[HAMi-dra](https://github.com/Project-HAMi/HAMi-dra) 则把 `amd.com/gpu` 请求转换为它的 claim。NVIDIA 与 AMD 由同一个调度层统一纳管，HAMi 为异构集群提供了统一的 GPU 共享能力；请参阅 [AMD GPU 指南](/zh/docs/next/userguide/amd-device/enable-amd-gpu-sharing)与[验证状态](/zh/docs/next/userguide/amd-device/verification-status)了解在真实硬件上验证过的范围。

AMD 支持是社区协作的成果：[@moezdil](https://github.com/moezdil) 在 Claven 的协助下打磨了调度器、device plugin、amd-hami-core 与 DRA driver 中的 Instinct 支持；初始设备支持由 [@FouoF](https://github.com/FouoF) 在 DigitalOcean 提供的 AMD 实例上实现；算力分区（SPX、DPX、QPX、CPX）与显存分区的初始工作由 [@fishman](https://github.com/fishman) 完成。特别感谢 **[Vultr](https://www.vultr.com/)** 提供 AMD 测试机器，也感谢 AMD 社区让这一切成为可能。

## 更深入的昇腾切分：ENPU 模式与更快的 HAMi-core

### ENPU：面向昇腾的策略化隔离

v2.11.0 新增了第三种昇腾切分模式：**ENPU**（[#3110](https://github.com/Project-HAMi/HAMi/pull/3110)，[@maverick-woo](https://github.com/maverick-woo)，配套更新了 [ascend-device-plugin](https://github.com/Project-HAMi/ascend-device-plugin)）。带有 `huawei.com/vnpu-mode: enpu` 注解的 Pod 使用现有的昇腾数量、显存与算力资源，且只会被放置到支持 ENPU 的节点上：

- **三种隔离策略**：`fixed-share`、`elastic`、`best-effort`（通过 `huawei.com/enpu-policy` 注解或 chart 默认值 `devices.ascend.enpuPolicy` 选择），并在 admission 阶段持久化，后续修改默认值不会重新分类已有租户。
- **DIE 隔离**：策略不兼容的 ENPU 租户之间、hami-core 与 ENPU 租户之间，会被隔离在不同的物理 DIE 上，包括没有模式注解的存量 hami-core Pod。A3 类硬件上保留单 DIE ENPU 请求，其他模式保持 SuperPod 行为。
- **不做模板取整**：显存与算力配额直接透传，不做硬件模板取整；`devices.ascend.deviceSplitCount` 现在同时控制 `hami-core` 与 `enpu` 模式下每颗 NPU 的虚拟设备槽数（[@spencercjh](https://github.com/spencercjh)）。

```yaml
devices:
  ascend:
    enabled: true
    hamiVnpuMode: "enpu" # template | hami-core | enpu
    enpuPolicy: "elastic" # fixed-share | elastic | best-effort
```

全局模式通过 `devices.ascend.hamiVnpuMode` 选择；来自 Ascend device plugin 的节点能力注解仍然优先。昇腾侧其他更新：chart 暴露 hami-core 模式的槽位容量；**昇腾 950 支持**也在本周期落地：调度器新增 Ascend950DT 整卡调度（[#3316](https://github.com/Project-HAMi/HAMi/pull/3316)，[@panpan0000](https://github.com/panpan0000)），[ascend-device-plugin](https://github.com/Project-HAMi/ascend-device-plugin) 0.2.x 增加 Ascend950DT 设备发现、节点模式覆盖，以及发现失败时保留不健康设备。

### HAMi-core（libvNPU）性能优化

在 LFX Mentorship 2026 Term 3 框架下，[@maverick-woo](https://github.com/maverick-woo) 重构了 [hami-vnpu-core](https://github.com/Project-HAMi/hami-vnpu-core) 的多个核心部分（[@xrwang8](https://github.com/xrwang8) 参与修复）：

- **降低初始化锁竞争**：fork 感知的每进程客户端、同流 worker 读锁快速路径、有界的调度轮次。
- **协作式空间计算策略与可补充透支策略**，实现更细粒度的算力与显存控制。
- **按 NPU 的资源限制**，同时覆盖缓存与运行时 HBM 分配路径，并计入 ACL `HostArgs` 的急切启动。

这些改动面向 910C 多芯片切分场景，让软切分昇腾在并发推理下的性能显著提升。

## NUMA Refit：CPU 与 GPU 调度终于对齐

Kubernetes 的 CPU Manager 和 Topology Manager 会做出 NUMA 本地化的决策，但这些都发生在 HAMi 调度器**已经选定 GPU 之后**。当 kubelet 把分配限制到调度器未选择的 GPU 时，Pod 要么回退，要么带着跨 NUMA 的错位运行。v2.11.0 用 **NUMA refit** 打通了这个缺口（[#2731](https://github.com/Project-HAMi/HAMi/pull/2731)，[@saiyam1814](https://github.com/saiyam1814)，修复 [#2080](https://github.com/Project-HAMi/HAMi/issues/2080)，完成路线图中的 "Numa align (CPU and GPU)" 事项）：

![NUMA refit 流程](/img/blog/hami-v2-11-0-release/zh/numa-refit-flow.svg#light-only) ![NUMA refit 流程](/img/blog/hami-v2-11-0-release/zh/numa-refit-flow-dark.svg#dark-only)

调度器始终掌握主导权：它在 kubelet 允许的设备范围内重跑正常 fit，在一次 patch 中同时更新两份分配注解，并同步迁移内存中的预留，让运行时与账目保持一致。`nvidia.com/use-gpuuuid` 等设备固定会被尊重。该特性默认关闭，按 Pod 选择启用：

```yaml
metadata:
  annotations:
    hami.io/numa-alignment: "strict" # 或 best-effort
```

同时需要在 chart 中设置 `devicePlugin.numaRefit.enabled=true` 与 `devices.nvidia.enableNumaTopology=true`，并在节点配置中开启 `enablegetpreferredallocation`。`strict` 在 refit 无法满足拓扑约束时让分配失败；`best-effort` 保持现有的回退行为。

该特性已在真实硬件上验证（8x NVIDIA RTX PRO 6000 Blackwell Server Edition、驱动 610.43.02、Kubernetes v1.35.6、CPU Manager `static`、Topology Manager `single-numa-node`）：带注解的 Pod 收到 `NumaRefitSucceed` 事件，最终 cpuset、运行时 GPU 与注解都落在同一个 NUMA 节点上。同周期内 [@asadjan4611](https://github.com/asadjan4611) 与 [@AyushSrivastava1818](https://github.com/AyushSrivastava1818) 还完成了一批加固（阶段感知的账目、配额校验、`/refit` 调用方认证），[@saiyam1814](https://github.com/saiyam1814) 修复了 Pod 删除时的 allocLock 问题。详见 [NUMA 对齐指南](/zh/docs/userguide/nvidia-device/numa-alignment)。

## Flexible MIG 走向成熟

Flexible MIG（动态 MIG 实例分配与释放）在 v2.10.0 发布时有已知限制：不支持 CDI、多设备场景未验证。v2.11.0 补齐了这些缺口：

- **动态 MIG 设备支持 CDI**（[#3070](https://github.com/Project-HAMi/HAMi/pull/3070)，[@asadjan4611](https://github.com/asadjan4611)）：HAMi 创建 MIG GI/CI 后，会发布原子化的每 MIG CDI 规范，并把 CDI 设备名返回给支持 CDI 的容器运行时。启动恢复会在 device plugin 服务分配前对账存活的 MIG 实例，分配失败会同时回滚 MIG 与 CDI 资源。v2.10.0 的 CDI 限制就此消除。
- **带回退的放置打分**（[#2855](https://github.com/Project-HAMi/HAMi/pull/2855)，[@maishivamhoo123](https://github.com/maishivamhoo123)）：MIG 放置现在会打分，贪心选择不合适时回退重试；拓扑调度中重复的 MIG 候选会被去重。
- **按 Pod 的 profile 偏好**（[#3014](https://github.com/Project-HAMi/HAMi/pull/3014)，[@maishivamhoo123](https://github.com/maishivamhoo123)）：Pod 可以通过 `nvidia.com/mig-profile-preference` 注解指定偏好的 MIG profile。调度器会优先尝试该 profile，无法分配时回退到正常的选择规则（显存请求、白名单中的 profile、放置约束）。
- **生命周期与监控**：动态 MIG 实例生命周期得到优化（[#3128](https://github.com/Project-HAMi/HAMi/pull/3128)，[@asadjan4611](https://github.com/asadjan4611)），MIG 监控覆盖使用动态 MIG 的 Pod，vGPU 监控能正确发现 MIG 实例，分配会对照已注册的 profile 校验，白名单使用真实 NVML 名称（[@tsingst](https://github.com/tsingst)、[@FouoF](https://github.com/FouoF)、[@archlitchi](https://github.com/archlitchi)、[@moezdil](https://github.com/moezdil)、[@usr-bin-ksh](https://github.com/usr-bin-ksh) 参与贡献）。
- **可靠性**：GPU 出现 XID 错误时，其所有副本与 MIG 切片都会被标记为不健康；hami-core 节点上会自动禁用 MIG，避免生命周期控制冲突。

[@FouoF](https://github.com/FouoF) 还贡献了 `nvidiaDriverRoot` 自动检测（现为默认值，支持 GPU Operator driver-ready 契约）以及 NVML 会话配对修复。

## 更安全的调度器

v2.11.0 落地了安全审计驱动下的第一批调度器 extender 与 webhook 加固（主要由 [@moezdil](https://github.com/moezdil) 完成）：

- extender 的 HTTP 端点（`/filter` 与 `/bind`）只在**本机回环地址上提供服务**（`127.0.0.1:9444`），不再暴露到面向集群的端口。
- extender 在处理请求前**校验 Pod 身份**。
- 带有**伪造的调度器分配注解**的 Pod 会在 admission 被拒绝，并在更新时受到保护。
- 节点锁路径只服务**锁所指定的那个 Pod**，过期锁的恢复被串行化，格式错误的设备分配注解会被拒绝。
- chart 现在要求 **Kubernetes 1.23+**，守护 PSP，并对从第三方拉取的辅助镜像（certgen、Lupine 客户端与服务器镜像、mock device plugin）按 digest 固定；HAMi 自身镜像仍使用 `v2.11.0` 标签。

调度器性能同样有提升：用量快照不再深拷贝整个 Pod（[@togettoyou](https://github.com/togettoyou)），快照只为候选节点构建，并在 CI 中加入基准回归跟踪（[@im-Toqeer-506](https://github.com/im-Toqeer-506)），节点打分尊重 preferred `nodeAffinity`（[@falconlee236](https://github.com/falconlee236)）。

v2.10.0 引入的调度策略，即 PodGroup 感知绑定、`mutex` 策略以及逗号分隔的策略组合，现在有了专门的调度策略 e2e 测试套件（[#2793](https://github.com/Project-HAMi/HAMi/pull/2793)，[@haitwang-cloud](https://github.com/haitwang-cloud)），并通过两处修复保证行为可预期：遇到无法识别的策略注解时保留已配置的策略（[#2769](https://github.com/Project-HAMi/HAMi/pull/2769)，[@IIITManjeet](https://github.com/IIITManjeet)），带填充的策略注解会解析为规范名称（[#2854](https://github.com/Project-HAMi/HAMi/pull/2854)）。

还有两项运维方面的补充（[@im-Toqeer-506](https://github.com/im-Toqeer-506)）：为开启 leader 选举的多副本调度器提供 **PodDisruptionBudget**（[#2773](https://github.com/Project-HAMi/HAMi/pull/2773)），避免节点排空时所有副本同时被驱逐；以及一个**脱敏的诊断包收集器**（`hack/hami-support-bundle.sh`，[#3149](https://github.com/Project-HAMi/HAMi/pull/3149)），为支持场景收集版本、工作负载、事件、HAMi ConfigMap 与限定长度的组件日志，且绝不读取 Secret。

## 平台、Chart 与更多设备

- **OpenShift 与 SELinux 支持**（[#2208](https://github.com/Project-HAMi/HAMi/pull/2208)，[@spencercjh](https://github.com/spencercjh)）：`platform.openshift=true` 创建所需的 SCC，`selinux.enabled` 为 SELinux 强制集群重打主机目录标签。
- **Cluster Autoscaler 支持**（[#2874](https://github.com/Project-HAMi/HAMi/pull/2874)，[@shkatara](https://github.com/shkatara)）：开启 `devicePlugin.reportNodeCapacity` 后，GPU 显存与算力资源会上报到节点 `capacity`/`allocatable`，让 Cluster Autoscaler 的扩容模拟、仪表盘和配额工具看到真实的 GPU 份额，而不是不透明的设备数量。
- **Chart 重构**（[@spencercjh](https://github.com/spencercjh)）：所有厂商配置迁移到 `devices.VENDOR` 之下并完成 helm-docs 文档化，`global.imageSource` 在上游与国内镜像源之间切换，节点配置支持按标签选择器匹配（[@usr-bin-ksh](https://github.com/usr-bin-ksh)）。这对自定义 `values.yaml` 是**破坏性变更**。
- **NVIDIA device plugin**：可选的**宿主机 PID broker**（[#2417](https://github.com/Project-HAMi/HAMi/pull/2417)，[@iemAnshuman](https://github.com/iemAnshuman)）通过 `SO_PEERCRED` 把每个进程的宿主机 PID 交给 HAMi-core，无需挂载宿主机 procfs；启动时发现的 IMEX channel 现在会真正传递到分配响应中（[#2892](https://github.com/Project-HAMi/HAMi/pull/2892)，[@Eshiv-Pandey](https://github.com/Eshiv-Pandey)）。
- **更多设备**：AWS Inferentia1 支持全部四个 NeuronCore（[@asadjan4611](https://github.com/asadjan4611)），恢复寒武纪 MLU 的模型感知调度并把大于 1 的数量按整卡 MLU 计量（[#3218](https://github.com/Project-HAMi/HAMi/pull/3218)，[@B-White84](https://github.com/B-White84)），摩尔线程 S5000 每卡显存单位可配置（[@wjluo](https://github.com/wjluo)），海光 DCU 资源在 chart 与文档中更名为 **HCU**（[@kinglong08](https://github.com/kinglong08)），并更新了默认算力值，使 DTK 26.10+ 在未请求算力资源时像 NVIDIA 一样共享算力（[#3285](https://github.com/Project-HAMi/HAMi/pull/3285)，[@archlitchi](https://github.com/archlitchi)）。其他厂商修复包括：沐曦（多容器 Pod 分散到独占 GPU，[#2837](https://github.com/Project-HAMi/HAMi/pull/2837)）、燧原（DRS profile 算力成本不超出设备预算，[#2810](https://github.com/Project-HAMi/HAMi/pull/2810)）、昆仑芯（拓扑选择不依赖切片顺序，[#2811](https://github.com/Project-HAMi/HAMi/pull/2811)、[#2924](https://github.com/Project-HAMi/HAMi/pull/2924)）、天数智芯（按每卡读取缩放后的算力上限，[#2961](https://github.com/Project-HAMi/HAMi/pull/2961)）。
- **监控**：整卡 Pod 可以绕过 HAMi hook，通过直接 NVML 监控，覆盖带 `CUDA_DISABLE_CONTROL` 与动态 MIG 的 Pod（[@vesta-mlp](https://github.com/vesta-mlp)）；暴露硬件健康与错误指标（[@Gurkaran18](https://github.com/Gurkaran18)）；新增未知 GPU 进程计数指标（[@heuristicwave](https://github.com/heuristicwave)）；调度器暴露 leader 选举与缓存同步指标（[@KunwarSidhu47](https://github.com/KunwarSidhu47)）。
- **原生 sidecar 容器**纳入 GPU 资源计算（[@maishivamhoo123](https://github.com/maishivamhoo123)），支持 Pod 级与容器级的环境变量覆盖（[@peachest](https://github.com/peachest)）。

## Project-HAMi 生态全景

本周期中，与 HAMi 配套发布的周边项目同样有不少进展：

- **[HAMi-core](https://github.com/Project-HAMi/HAMi-core)**（libvgpu.so）：SM 限流器改为按线程数而非 grid 数计费，CUDA graph 与 `cuMemAllocAsync` 的分配按 graph 生命周期跟踪与释放，VMM 映射在跟踪失败时干净回滚，`CUDA_DEVICE_MEMORY_LIMIT` 的后缀严格解析，修复了可能拿到其他进程 PID 的宿主机 PID 探测竞态，并提供与上文 device-plugin 特性配套的宿主机 PID broker 客户端。
- **[HAMi-WebUI](https://github.com/Project-HAMi/HAMi-WebUI) v1.3.0**：`/metrics` 抓取安全且减少页面侧查询扇出，Pod 设备注解可解码 init 容器，修正任务算力利用率，支持按 Pod 与容器名搜索，chart 在 ServiceMonitor 中保留 HAMi 工作负载标签并抓取内置的 kube-state-metrics。
- **[HAMi-dra](https://github.com/Project-HAMi/HAMi-dra)**：chart 0.2.3 带来 webhook PodDisruptionBudget 和加固后的 `nouse-gpuuuid`/`nouse-gputype` CEL 选择器；此后主分支新增 AMD 支持（`drivers.amd`、`amd.com/gpu` claim 转换、`gpumem-percentage`）、`hami.io/skip-dra` 退出开关，以及与 HAMi 和 Prometheus 约定对齐的监控指标标签。
- **[k8s-dra-driver](https://github.com/Project-HAMi/k8s-dra-driver) v0.1.1**：为 DRA 路径提供 vGPU 监控、清理遗留 claim 目录、修复缺失 PCIe root 属性的问题，并在 kind + Mokka 上增加无 GPU 的 e2e 测试。**[ascend-dra-driver](https://github.com/Project-HAMi/ascend-dra-driver)** chart 0.2.0 通过与 claim Prepare/Unprepare 对齐的内部收集器暴露 `/metrics`，为 HAMi vNPU-core 模式增加 DeviceClass，并在 ResourceSlice 中上报真实 UUID。
- **[volcano-vgpu-device-plugin](https://github.com/Project-HAMi/volcano-vgpu-device-plugin) v1.13.0**：kubelet 流重连时保留健康状态，校验分配状态与设备注解，`WatchAndRegister` 随插件干净停止，并更新到最新的 HAMi-core。
- **[gpu-descheduler](https://github.com/Project-HAMi/gpu-descheduler) v0.0.2**：新项目，通过 mutating webhook 与 Placement CRD 把分散在各节点上的 vGPU 工作负载整理归拢；本周期增加多架构构建，并改用 HAMi 的 AMD `use-gpuuuid` 注解键。**[kai-resource-isolator](https://github.com/Project-HAMi/kai-resource-isolator)** 为多副本部署增加 webhook PodDisruptionBudget 与反亲和，并校验 chart 输入。

## 重构与重绘后的官网

与代码发布同步，[project-hami.io](https://project-hami.io/) 完成了上线以来最大的一次改版：

- **全新信息架构**（[@moezdil](https://github.com/moezdil)）：文档侧边栏重组为引导式学习路径，设备矩阵成为唯一的厂商索引（取代按分类罗列），每个厂商指南拥有独立侧边栏。HAMi 仓库内的全部文档统一迁移到官网，内部设计文档移植为公开的开发者章节，并补充了中文翻译。四个过时的内部页面随之移除。
- **重绘的 Concepts 章节**（[@togettoyou](https://github.com/togettoyou)）：旧的 Introduction 页面被 Concepts 分类取代，讲解 device plugin 与 DRA 背景，围绕一个 Pod 的完整旅程重写架构页，覆盖设备共享资源模型与 HAMi-core 的显存、算力隔离原理，全部配以全新绘制的 SVG 图示。配套的图示品牌规范（含暗色模式 token 与 Mermaid 样式）保证新图示视觉一致。
- **面向 LLM 的 `llms.txt`**（[@spencercjh](https://github.com/spencercjh)）：官网现在发布 `llms.txt`，让编码代理与 LLM 工具可以高效消费整套文档。
- **重构的安装与升级指南**：专门的[升级指南](/zh/docs/next/installation/upgrade)重建为带破坏性变更提示的分步流程，离线安装说明重构（[@spencercjh](https://github.com/spencercjh)），用户指南配置页重组，NVIDIA 指南新增功能支持矩阵。
- **平台安装指南**：[@spencercjh](https://github.com/spencercjh) 贡献了 OpenShift、GKE、K3s 指南；[@togettoyou](https://github.com/togettoyou) 贡献了 TKE、ACK、CCE 等国产云指南与 HAMi 实操 Workshop。
- **Grafana 仪表盘整合**（[@togettoyou](https://github.com/togettoyou)），新增 MIG 库存与按 profile 使用面板、资源配额用量对比表和 vGPU 算力面板（[@loiht2](https://github.com/loiht2)）。
- **官网新内容**：赛力斯（Seres）案例、CETC Cloud 加入贡献者名单、ZYT 加入采用者名单，以及社区大使计划。

## v2.10 以来的社区活动

从 v2.10.0 到 v2.11.0 的这段时间，是项目历史上最忙碌的时期之一：

- **[KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China 2026](https://www.lfopensource.cn/kubecon-cloudnativecon-openinfra-summit-pytorch-conference-china/)**（9 月，上海）：HAMi 成为 CNCF 孵化项目后首次参加 KubeCon China，带来两个 keynote、一个 lightning talk、一场万卡生产环境分享，招商银行案例在 keynote 舞台上获得案例大奖。阅读[回顾](/zh/blog/kubecon-china-2026-recap)。
- **LFX Mentorship 2026 Term 3**（9 月至 11 月）：四个学员项目，覆盖 HAMi-core 锁竞争、GPU 显存隔离、可观测性与文档。本周期的成果已经进入 v2.11.0，包括前文的 HAMi-core 性能优化。见[项目介绍](/zh/blog/lfx-mentorship-2026-term-3)。
- **ContainerDays & AI Context Singapore 2026**（10 月 27-28 日）：HAMi 出现在五个环节中，包括 [@rootsongjc](https://github.com/rootsongjc) 与 [@fishman](https://github.com/fishman) 带来的 GPU 调度动手 workshop。阅读[回顾](/zh/blog/containerdays-singapore-2026-recap)。
- **DRA NPU 共享**：社区发布了 [HAMi-DRA NPU 共享](/zh/blog/hami-dra-npu-sharing)深度文章，把 DRA 故事延伸到昇腾 NPU。

## 贡献者

v2.11.0 是 HAMi 主仓库与 Project-HAMi 组织（ascend-device-plugin、hami-vnpu-core、HAMi-core、HAMi-dra、amd-device-plugin、amd-dra-driver、HAMi-WebUI 等）共同贡献的成果。本周期代表性功能负责人包括：

- [@moezdil](https://github.com/moezdil)：Remote GPU 调度器后端与 device-plugin 集成、AMD 特性矩阵、调度器安全加固、发布工程，以及官网信息架构重组
- [@archlitchi](https://github.com/archlitchi)：发布协调、vNPU 模板、remote 客户端工具、监控修复
- [@maverick-woo](https://github.com/maverick-woo)：昇腾 ENPU 调度、hami-vnpu-core 性能优化（空间计算策略、按 NPU 限制、锁竞争优化）
- [@saiyam1814](https://github.com/saiyam1814)：NUMA refit（CPU 与 GPU 调度对齐）
- [@FouoF](https://github.com/FouoF)：Flexible MIG 增强、remote 模式增强、驱动根目录自动检测
- [@asadjan4611](https://github.com/asadjan4611)：动态 MIG 的 CDI 支持、Lupine 资源池、Inferentia 与寒武纪修复、NUMA refit 加固
- [@spencercjh](https://github.com/spencercjh)：OpenShift 与 SELinux 支持、重构为 `devices.VENDOR` 的 chart 与全量 helm-docs、hami-core/ENPU 的 `deviceSplitCount`、`llms.txt`、离线安装与用户指南文档重构、OpenShift/GKE/K3s 安装指南、DCU 更名为 HCU 的文档迁移
- [@maishivamhoo123](https://github.com/maishivamhoo123)：MIG 放置打分与 profile 偏好、原生 sidecar 资源计量
- [@sanket-jadhav-cse](https://github.com/sanket-jadhav-cse)：多容器 Lupine 分配修复
- [@shkatara](https://github.com/shkatara)：节点容量资源上报
- [@im-Toqeer-506](https://github.com/im-Toqeer-506)：调度器性能与基准测试、PodDisruptionBudget、诊断包
- [@togettoyou](https://github.com/togettoyou)：HAMi 侧的调度器深拷贝消除与 chart 文档；官网侧的重绘 Concepts 章节、Grafana 仪表盘整合、HAMi Workshop 教程，以及 TKE/ACK/CCE 安装指南
- [@vesta-mlp](https://github.com/vesta-mlp)：整卡监控绕过 hook
- [@xrwang8](https://github.com/xrwang8)：hami-vnpu-core 配额与调度修复
- [@panpan0000](https://github.com/panpan0000)：Ascend950DT 整卡调度
- [@kinglong08](https://github.com/kinglong08)：海光 DCU 更名为 HCU
- [@wjluo](https://github.com/wjluo)：摩尔线程 S5000 支持
- [@usr-bin-ksh](https://github.com/usr-bin-ksh)：nodeconfig 标签选择器、MIG 白名单

本版本有 29 位贡献者完成首次贡献，包括 [@Kevindua26](https://github.com/Kevindua26)、[@im-Toqeer-506](https://github.com/im-Toqeer-506)、[@togettoyou](https://github.com/togettoyou)、[@Woolgathererer](https://github.com/Woolgathererer)、[@curry30000](https://github.com/curry30000)、[@sanket-jadhav-cse](https://github.com/sanket-jadhav-cse)、[@usr-bin-ksh](https://github.com/usr-bin-ksh)、[@vesta-mlp](https://github.com/vesta-mlp)、[@tsingst](https://github.com/tsingst)、[@loiht2](https://github.com/loiht2)、[@falconlee236](https://github.com/falconlee236)、[@heuristicwave](https://github.com/heuristicwave)。感谢每一位贡献者，也感谢每一位报告问题、测试候选版本的用户。完整名单见 [v2.11.0 Release Notes](https://github.com/Project-HAMi/HAMi/releases/tag/v2.11.0)。

## 升级指南

通过 Helm 升级至 v2.11.0：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
helm upgrade hami hami-charts/hami -n kube-system --version 2.11.0

# 如果你的 values.yaml 自定义过厂商配置，请先迁移到新的 devices.VENDOR 结构，
# 再显式传入。--reset-values 会丢弃 release 中保存的旧值，
# 因此所有需要保留的覆盖项都必须写进 my-values.yaml。
helm upgrade hami hami-charts/hami -n kube-system --version 2.11.0 \
  --reset-values --values my-values.yaml
```

带破坏性变更提示的分步升级流程，请参阅专门的[升级指南](/zh/docs/next/installation/upgrade)。完整安装文档请参考：[https://project-hami.io/zh/docs/installation/online-installation](/zh/docs/installation/online-installation)

:::warning[升级注意事项]

- **Chart 破坏性变更**：厂商配置迁移到了 `devices.VENDOR` 之下。如果你的 `values.yaml` 自定义过厂商设备配置，请在升级前完成迁移；chart 现在一旦发现旧的（已迁移的）字段路径就会渲染失败。
- chart 要求 **Kubernetes 1.23+**。
- **MIG + hami-core**：hami-core 节点上会自动禁用 MIG；若同时依赖两者，请核实节点配置。
- **海光用户**：DCU 资源在 chart 与文档中更名为 HCU。
- **指标弃用**：`hami_container_device_memory_bytes` 指标以及 `hami_resource_quota_used` 的 `limit` 标签已被弃用，请更新依赖它们的看板与告警。
- **指标标签变更**：四个 vGPU 分配指标中恒为 0 的 `container_index`/`containeridx` 标签已移除（[#2898](https://github.com/Project-HAMi/HAMi/pull/2898)）；`hami_host_gpu_*` 的 `device_type` 标签不再带重复的 `NVIDIA` 前缀，从而与调度器的 `hami_gpu_*` 序列一致（[#2991](https://github.com/Project-HAMi/HAMi/pull/2991)）。请调整按这些标签分组或过滤的 PromQL。
- Remote GPU、ENPU 与 NUMA refit **默认全部关闭**，需显式启用。
- 建议在升级前于测试环境验证兼容性。

:::

## 总结

HAMi v2.11.0 是一次关于**消除边界**的版本：本地与远程 GPU 之间的边界（基于 Lupine 的 Remote GPU）、GPU 厂商之间的边界（与 NVIDIA 并列的 AMD Instinct 共享）、CPU 与 GPU 调度之间的边界（NUMA refit）、昇腾上不同切分方式之间的边界（支持策略隔离的 ENPU），以及动态 MIG 与现代容器运行时之间的边界（CDI 支持）。再加上安全加固的调度器、OpenShift/SELinux 支持、重构后的 chart，以及重组重绘后的官网，HAMi 持续拓展统一异构算力调度平台的能力边界。

我们诚挚欢迎更多开发者、用户和生态伙伴参与 HAMi 社区，共同推动 GPU 虚拟化与异构算力调度能力的演进。

---

**相关链接：**

- GitHub Release：[https://github.com/Project-HAMi/HAMi/releases/tag/v2.11.0](https://github.com/Project-HAMi/HAMi/releases/tag/v2.11.0)
- Remote GPU 示例：[https://github.com/Project-HAMi/HAMi/tree/master/examples/remotegpu](https://github.com/Project-HAMi/HAMi/tree/master/examples/remotegpu)
- Lupine：[https://github.com/lupinemachines](https://github.com/lupinemachines)
- hami-vnpu-core：[https://github.com/Project-HAMi/hami-vnpu-core](https://github.com/Project-HAMi/hami-vnpu-core)
- 项目文档：[https://project-hami.io/zh/docs/](/zh/docs/)
- 社区 Discord（推荐）：[https://discord.gg/Amhy7XmbNq](https://discord.gg/Amhy7XmbNq)
- 社区 CNCF Slack：[https://cloud-native.slack.com/archives/C07T10BU4R2](https://cloud-native.slack.com/archives/C07T10BU4R2)
