---
title: "Kubernetes DRA 会取代 HAMi 吗？"
date: "2026-08-20"
description: "DRA 吸收了 GPU 共享中请求与调度的那一半，HAMi 保留了运行时强制执行的那一半。本文解释两者如何配合、如今跑通 DRA 栈需要什么，以及 2026 年年中该如何选择。"
authors: [mesut_oezdil]
tags: ["HAMi", "DRA", "GPU 共享", "Kubernetes", "调度", "云原生"]
---

:::note

本文译自 [CNCF 博客](https://www.cncf.io/blog/2026/08/07/does-kubernetes-dra-replace-hami/)（2026 年 8 月 7 日），原文作者系 HAMi 项目贡献者。HAMi 已于 2026 年 7 月 15 日被 CNCF 技术监督委员会（TOC）接收为孵化项目。

:::

想在一个 Kubernetes 上共享 GPU 的项目，长期以来只能「绕开」API 去工作，而不是「顺着」API 来工作。设备插件（device plugin）接口能做的事就是数设备，这就是它的全部词汇：`nvidia.com/gpu: 1`，意思是一整张卡，爱要不要。

HAMi 正是在这个词汇贫乏的基础上，构建了一整套流水线（变更型准入 Webhook、调度器扩展器、注解、容器内强制限制），去表达那些词汇表达不了的需求：「给这个 Pod 8000 MiB 显存和 10% 的算力，而且要把限制落到实处。」

后来，词汇变了。**动态资源分配**（Dynamic Resource Allocation，DRA） 在 Kubernetes v1.34 中正式发布（GA），并在 v1.35 起默认开启。借助其中的**可消费容量**（consumable capacity）特性，一个 Pod 现在可以越过任何注解，直接向调度器原生地申请一张设备显存的一个切片。

所以，HAMi 社区里反复被问到的问题是：DRA 会让 HAMi 过时吗？

简短的回答是：不会。但完整的回答取决于你指的是 HAMi 的哪项职责。其中一项，把碎片化请求编码成调度器看得懂的形式，恰恰是 DRA 要吸收掉的；另一项，在容器内以 CUDA 调用粒度强制执行这些配额，则是 DRA 从设计上就无意承担的工作。HAMi 的应对之策也顺势分成了两半：保留强制执行层，并在 DRA 之上用 3 个仓库重建编码层。

下面我们就把这两半拆开看清楚，再看如今跑通 DRA 这套栈需要什么。

<!-- truncate -->

## 当 API 帮不上忙时，GPU 共享是如何工作的

要看清 DRA 改变了什么，先得精确界定它取代的是哪套机器：HAMi 流水线里，哪些部件仅仅因为设备插件 API 太窄而存在。

一个 HAMi 用户会写 3 个扩展资源：

```yaml
resources:
  limits:
    nvidia.com/gpu: 1 # 来自 1 张物理卡的设备 ID
    nvidia.com/gpumem: 8000 # 该卡 VRAM 的 MiB 数
    nvidia.com/gpucores: 10 # 算力的 10%，以 1% 为步进
```

这些对默认调度器而言没有任何含义。扩展资源在 Kubernetes 眼里只是不透明的整数：它能从一个节点的总量里减掉，仅此而已。它不知道 `gpumem` 和 `gpucores` 必须落在同一张物理卡上，也不知道两张各要 8000 MiB 的 Pod 能塞进一张 24 GiB 的卡，而第三张要 12000 MiB 的 Pod 却塞不下（HAMi 的调度器会在过滤阶段以 `CardInsufficientMemory` 事件拒绝它）。于是 HAMi 把 Pod 经由一个变更型 Webhook 引到自己的调度器扩展器，由它过滤节点、为各张卡打分、挑出具体的设备 UUID，并把决策记录在 API 唯一容得下的地方，即一条注解里：

```text
hami.io/vgpu-devices-allocated: GPU-<device-uuid>,NVIDIA,8000,10:
```

节点上的设备插件随后在 `Allocate()` 里读取这条注解，向容器注入 `CUDA_DEVICE_MEMORY_LIMIT_0=8000m` 与 `CUDA_DEVICE_SM_LIMIT=10`，并预加载 `libvgpu.so`，让限制得以生效。这套机制是可行的，而且在生产规模上被验证过（DaoCloud 在 10+ 数据中心、10000+ 张 GPU 上跑着它）。

注意这套设计里有多少是「绕路」：Webhook 之所以存在，是因为调度器解析不了请求；注解之所以存在，是因为 API 没有「哪张卡、多少量」这个字段；而调度器与 kubelet 之间的整套契约，全押在只有 HAMi 组件能读懂的字符串格式上。

那个年代的每一个碎片化 GPU 项目都做了同样的取舍，各有各的私有注解方言。这正是 DRA 被造出来要终结的局面。

## DRA 在底层改变了什么

DRA 用一套**声明**（claims）模型取代了整数计数，其形态刻意做成了像 PersistentVolumeClaim（PVC）的样子。`resource.k8s.io/v1` API 组里的 4 个对象承载了整个流程，每个对象各有不同的所有者：

- **ResourceSlice**：由设备驱动发布。按节点描述真实硬件，并附带结构化属性（型号、显存、架构），让调度器看到的不再是干瘪的计数，而是设备本身。
- **DeviceClass**：由集群管理员编写。定义设备类别，用通用表达式语言（CEL）对上述属性做过滤。
- **ResourceClaim 与 ResourceClaimTemplate**：由负载所有者编写。一个 Claim 按类别、选择器与约束来申请设备；一个 Template 则为每个 Pod 盖出一个 Claim，让每个副本各得其所。

调度器在绑定 Pod 之前，把一个具体的设备分配给某个 Claim，结果作为带类型的 API 对象存在 Claim 的 status 里。把它和上面那条注解字符串对比一下：「哪张卡、多少量」这个决策，现在有了一等公民的安身之处：kubectl 能读、RBAC 能守、其他控制器能基于它继续构建。

时间线对规划很重要。核心 DRA 在 Kubernetes v1.34 中 GA，自 v1.35 起锁定开启。各扩展仍在以各自节奏毕业：优先设备列表（先要一张大卡，退而求其次两张小卡）在 v1.36 转为 stable；可分区设备（partitionable devices）和可消费容量则在 v1.36 进入 beta，截至本文写作时（2026 年 7 月）尚未稳定。

## Consumable capacity：这里真正关键的那块

光有核心 DRA，还不足以给出 HAMi 式的共享。它的基线共享模型是「多个 Pod 引用同一个 ResourceClaim」，即它们共享同一份分配，而非各得一份被记账的切片。真正能与 HAMi 模型对应上的，是**可消费容量**（consumable capacity）：v1.34 以 alpha 引入（`DRAConsumableCapacity` 特性门控），v1.36 起 beta 并默认开启。

它带来两样东西：其一，驱动可以给一台设备打上 `allowMultipleAllocations`，声明来自不同命名空间的独立 Claim 可以同时落在其上；其二，一个 Claim 可以携带**容量请求**，申请设备上某个具名资源的一定数量，而不是整台设备全要。于是调度器对显存做的事，就如同它一直对节点内存做的那样：记账，并保证已授予的容量之和绝不超出设备所声明的总量。

把这些和 HAMi 的扩展资源对齐，映射几乎是机械式的：`nvidia.com/gpumem: 8000` 变成对 memory 的容量请求；`nvidia.com/gpucores: 10` 变成对 compute 的容量请求；HAMi 调度器扩展器的过滤步骤（「这张卡还有没有 8000 MiB 未承诺？」）变成了上游调度器自己的算术。HAMi 用户所熟知的 `CardInsufficientMemory` 拒绝，则变成了一次标准的不可调度 Claim。

正因如此，HAMi 的维护者把 DRA 视为**收敛**而非竞争：上游 Kubernetes 采纳的，正是那个变通方案一路以来所实现的同一套模型，而 HAMi 的 2026 路线图也把「完成 DRA 标准适配」列为目标之一。

## 调度，仍然只是问题的一半

接下来这条边界，决定着你到底还需不需要 HAMi。**DRA（连可消费容量在内）是一个承诺跟踪器。** 它保证调度器不会把设备没有的量许出去。它对一个在运行时撕毁承诺的容器毫无办法，而 GPU 场景里真正伤人的恰恰是这种失效模式：CUDA 才不管 ResourceClaim 写了什么，一个贪婪的 `cudaMalloc()` 循环会高高兴兴地把邻居正指望的那块显存吃掉。

**强制执行（enforcement）是 HAMi 的第二项职责，它住在 [HAMi-core](https://github.com/Project-HAMi/HAMi-core) 里。** HAMi-core 是一个 C 库（`libvgpu.so`），被预加载进容器，拦截 CUDA 与 NVML 调用，从用户态施加已授予的限制。这套行为在任何共享卡上都容易验证：给两个 Pod 各 8000 MiB 的授权，再让其中一个故意越过限额分配。违规者会恰好在它的 8000 MiB 边界处抛出 CUDA OOM，而邻居毫发无损地继续跑，哪怕物理卡上还有空闲显存。配额才是那个限流器，逐容器生效，而这正是一个多团队共享集群所需要的东西。

我同样要诚实地指出它的天花板：这是借助库拦截实现的**软件级强制**。绕过预加载的工作负载（对驱动静态链接、设置 `CUDA_DISABLE_CONTROL`、容器套容器）能逃逸出去。对抗性的多租户场景需要硬件分区（NVIDIA MIG，HAMi 也能动态调度它）；而对于协作团队共享昂贵显卡的场景，拦截是粒度上的赢家：1 MiB 显存步进、1% 算力步进，对阵 MIG 的固定档位。

DRA 里没有任何东西替代这一层。DRA 驱动的职责止步于容器设备接口（CDI）：告诉运行时挂载哪些设备节点、设置哪些环境。进程开始调用 CUDA 之后发生的事，按设计不在其范围内。所以现实的架构是把两者配成一对：DRA 做请求与调度语言，HAMi-core 做运行时肌肉，中间再有一个驱动负责把前者翻译成后者。

## HAMi 如今交付的 DRA 技术栈

那个驱动是存在的，相关的工作散落在值得逐一认识的 3 个仓库里，因为它们各自解决不同的运维问题。

[k8s-dra-driver](https://github.com/Project-HAMi/k8s-dra-driver) 是地基：一个 DRA 驱动，把每张 GPU 的显存与算力以可消费容量形式发布到 ResourceSlice 里，运行在节点上解析分配的 kubelet 插件，并通过 CDI 把容器接好，同时挂上 HAMi-core 的强制执行。项目称其为「首个启用可消费容量的、面向 NVIDIA GPU 的开源 DRA 驱动」。

[HAMi-DRA](https://github.com/Project-HAMi/HAMi-DRA) 回答的是每个平台团队紧接着会问的问题：那些已经按 `nvidia.com/gpu` 和 `nvidia.com/gpumem` 写好的成百上千份清单怎么办？它是一个变更型准入 Webhook，把入站 Pod 里经典的扩展资源剥掉，并即时生成等价的 ResourceClaim，同时保留大家熟悉的 UUID 与设备类型注解以便精准定位。它翻译的资源名是可配置的（chart values 里的 `resourceName`、`resourceMem`、`resourceCores`），所以被改名或厂商专属的资源也能继续工作。

如果这套模式听着眼熟，那确实应该眼熟：HAMi 的传统流水线也是从变更型 Webhook 起步的。而这背后的回报远不止于向后兼容：因为 Webhook 发出的是一份标准 ResourceClaim，并把调度交给它的所有者，**HAMi-DRA 可以不着一处补丁地落入跑着 Volcano、KAI Scheduler 或任何其他调度器的集群。** 传统流水线不得不把自己的扩展器注入调度路径，这意味着每个第三方调度器都需要 HAMi 专属的集成。DRA 抹掉了这种耦合：请求是一个任何 DRA 感知调度器都认得的对象，于是 HAMi 再也不必改动上游。拦截点在迁移中存活了下来；变的只是写进 Pod 里的内容。

伴随 HAMi v2.9，HAMi-DRA v0.2.0 被宣布为生产就绪，发布线随后推进到 v0.2.1。它的平台清单也越过了 NVIDIA，扩展到昇腾（Ascend）与燧原（Enflame），海光 DCU 则通过海光自家的 k8s-dcu-dra-driver 提供文档。

HAMi 本身自 v2.8 起把 [DRA 模式列为一种安装选项](/zh/docs/installation/how-to-use-hami-dra)，可观测性故事也一并延续：DRA monitor 组件默认开启，通过 Prometheus（端口 31995）暴露逐容器的设备指标，于是那些基于 HAMi exporter 搭建的仪表盘能熬过这次切换。孵化公告也把「监控 DRA 消费」作为一等关切交给了团队。

把调度交给集群自己的调度器，有一个值得点名的代价：**HAMi-DRA 不自带调度器，因此无法做拓扑感知的放置决策。** 假设某节点上两张 GPU 由 NVLink 相连（GPU0 与 GPU1、GPU2 高带宽可达，但与 GPU3 不可达），那么一个要两张 GPU 的 Claim，理应优先落在 NVLink 相连的一对上，而不是被切到慢路径两侧。Webhook 表达不了这个，它交给调度器的是计数和容量，而非拓扑约束。对于卡间带宽敏感的负载，你要么留在一个能建模拓扑的调度器上，要么接受放置对带宽「无感」。

安装 Webhook 与驱动是一次 Helm 发布，需先备好 cert-manager 以签发 Webhook 的服务证书（或自带 `certs.custom.crt` 与 `certs.custom.key`）：

```bash
helm repo add hami-dra https://project-hami.github.io/HAMi-DRA
helm repo update
helm install hami-dra hami-dra/hami-dra
# 若 NVIDIA 驱动装在宿主机上而非通过 GPU Operator，则追加：
# --set drivers.nvidia.containerDriver=false
```

若由 GPU Operator 管理驱动，请先用 `devicePlugin.enabled=false` 安装它，因为 DRA 栈取代了设备插件的职责。发布稳定后，你会看到 3 个 Pod：kubelet 插件、Webhook 与 monitor。`kubectl get resourceslice` 确认驱动在发布 GPU 容量；一旦负载落上，`kubectl get resourceclaim` 就能看到调度器所做的分配，它现在在 API 里，而不是一条注解里。

前置条件比传统模式更严，而且每一项都是真门槛：

- **Kubernetes v1.34 或更高，并启用 `DRAConsumableCapacity`。** 在 v1.34 与 v1.35 上该门控是 alpha 且默认关闭，需在控制面设置，这就把不开放 API server 标志的托管集群挡在了门外。该门控在 v1.36 升入 beta 并默认开启，悄悄移除了最大的采纳障碍。
- **支持 CDI 的运行时。** 启用 CDI 的 containerd 或 CRI-O，外加 NVIDIA 驱动 440 或更高。
- **面向你所选芯片的 DRA 驱动。** NVIDIA 是成熟路径；昇腾、燧原与海光 DCU 正在路上。HAMi 的传统模式覆盖的清单要长得多（截至 v2.9 有 12+ 个设备家族，含寒武纪 MLU、天数、摩尔线程、昆仑芯、AWS Neuron、Vastai 等，通过各厂商的设备插件接入）。在驱动清单补齐之前，异构集群仍需留在设备插件路径上。

:::warning 重要提醒

DRA 模式与传统设备插件模式不得在同一集群中同时运行。文档对此表述直白，原因也由上文顺理推出：两个记账人（调度器扩展器与 DRA 调度器）会各自以为拥有同一份显存，而谁也看不到对方的承诺。每个集群只选一种模式。

:::

## 同一份 GPU 切片，新旧两种写法

这种收敛，在 YAML 里最一目了然，以下两例均取自当前 [HAMi DRA 文档](/zh/docs/installation/how-to-use-hami-dra)。

先看 HAMi 用户写了多年的样子。要一张卡、其中 10 GiB 显存、一半算力：

```yaml
resources:
  limits:
    nvidia.com/gpu: 1
    nvidia.com/gpumem: 10240
    nvidia.com/gpucores: 50
```

这段在 DRA 模式下依然原样可用，Webhook 会在准入时把它改写成下面的原生形态，所以无需改动任何清单。

下面是同一份请求的原生写法，写成针对 HAMi DeviceClass 的 ResourceClaim：

```yaml
apiVersion: resource.k8s.io/v1
kind: ResourceClaim
metadata:
  name: gpu-half-claim
spec:
  devices:
    requests:
      - name: gpu
        exactly:
          deviceClassName: hami-core-gpu.project-hami.io
          allocationMode: ExactCount
          count: 1
          capacity:
            requests:
              cores: 50
              memory: "10Gi"
```

Pod 引用该 Claim，而不是列出资源 limits：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test-dra-native
spec:
  containers:
    - name: cuda
      image: nvidia/cuda:13.0.1-base-ubi9
      command: ["sleep", "3600"]
      resources:
        claims:
          - name: gpu
  resourceClaims:
    - name: gpu
      resourceClaimName: gpu-half-claim
  restartPolicy: Never
```

映射是直接的：`nvidia.com/gpu` 变成设备计数，`gpumem` 变成 memory 容量请求，`gpucores` 变成 `cores`。原生形态更长，但这种冗长正是要点所在。旧的三行块对调度器不透明，所以 HAMi 才需要 Webhook、扩展器和注解去作用于它。ResourceClaim 用一种上游调度器读得懂、RBAC 守得住、kubectl 看得见的形态，把同一件事讲出来，无需任何私有注解方言。

无论走哪条路，运行容器里的 `nvidia-smi` 都会报出 10240 MiB（所授予的那个切片，而非物理卡），因为 HAMi-core 做的拦截与过去并无二致。请求语言变了；运行时契约没变。

在做决策树之前，先用一张表把整个对比尽收眼底：

|  | 设备插件模式 | DRA 模式 |
| --- | --- | --- |
| 请求语言 | 扩展资源，不透明整数 | ResourceClaim 容量请求，带类型 API |
| 调度决策 | HAMi 调度器扩展器 | 默认 kube-scheduler |
| 分配记录 | 仅 HAMi 读取的注解字符串 | ResourceClaim status，kubectl 与 RBAC 可见 |
| 准入 Webhook | 必需，把 Pod 引到扩展器 | 可选，HAMi-DRA 翻译遗留 YAML |
| Kubernetes 版本 | 任何受支持版本 | v1.34+ 需特性门控；v1.36 起默认开启 |
| 运行时前置条件 | 标准容器运行时 | 支持 CDI 的 containerd 或 CRI-O，NVIDIA 驱动 440+ |
| 厂商覆盖 | 12+ 个设备家族 | NVIDIA 成熟；昇腾、燧原、海光 DCU 路上 |
| 强制执行 | HAMi-core（`libvgpu.so`） | 同一 HAMi-core，不变 |
| 可观测性 | HAMi exporters | DRA monitor，Prometheus 端口 31995 |
| 生产历练 | 16 个版本，DaoCloud 10000+ GPU | HAMi-DRA v0.2.1，自 v2.9 起生产就绪 |
| 共存 | 绝不在同集群内并存 | 同一约束 |

## 2026 年年中，如何选择

我的判断，来自一个既跑着传统流水线、又一路追踪 DRA 进展的人：

- **托管 Kubernetes，且在 v1.34/v1.35 上拿不到特性门控权限，或任何更老的版本：** 传统模式，毫不犹豫。这是一条带着多年生产历练的路：16 个版本，背后还有独立案例研究报告其带来 3 倍利用率提升。
- **多厂商加速器集群：** 传统模式，直到 DRA 驱动覆盖到你的芯片。这是 HAMi 最宽的护城河，也是 DRA 最后才触及的部分。
- **v1.34+ 上你能掌控控制面的 NVIDIA 集群，以及任何 v1.36 用户：** 现在就在 staging 环境里把 DRA 模式立起来。先用 HAMi-DRA Webhook，这样无需改任何清单；对照你真实的负载组合观察 `kubectl get resourceclaim`，让结果来决定你的生产时间线。你最终会落在一个上游调度器原生就懂的 API 上，而随着优先列表等扩展趋于稳定，其收益会不断复利。

仍剩三个诚实的告诫：可消费容量尚未在 upstream 达到 stable；k8s-dra-driver 自己的 Helm chart 仍标注为 work in progress；DRA 侧的厂商覆盖只是传统模式的一小部分。这些都没有被藏着掖着，且假以时日皆可补齐，方向在两边都已定下，HAMi 的 2026 路线图亦把「完成 DRA 标准适配」列为目标。

Kubernetes 上的 GPU 共享，最初是建在一个只会数数的 API 的缝隙里的。DRA 补上了那条缝，HAMi 留住了那身肌肉。有史以来第一次，请求、调度与强制执行，说起了同一种语言。

感谢以下同事在终稿审阅中给予的宝贵反馈：Mengxuan Li（HAMi）、Jimmy Song（HAMi）、Sarah Christoff（Linkerd）。

## 参考资料

- [Kubernetes 文档，Dynamic Resource Allocation](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)
- [Kubernetes 文档，Feature Gates reference](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/)
- [Kubernetes 文档，Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes 博客，Kubernetes v1.34: DRA has graduated to GA](https://kubernetes.io/blog/2025/09/01/kubernetes-v1-34-dra-updates/)
- [Kubernetes 博客，Kubernetes v1.34: DRA Consumable Capacity](https://kubernetes.io/blog/2025/09/18/kubernetes-v1-34-dra-consumable-capacity/)
- [CNCF 博客，HAMi becomes a CNCF incubating project](https://www.cncf.io/blog/2026/07/15/hami-becomes-a-cncf-incubating-project/)
- [Project HAMi，HAMi 仓库](https://github.com/Project-HAMi/HAMi)
- [Project HAMi，HAMi-core 仓库](https://github.com/Project-HAMi/HAMi-core)
- [Project HAMi，HAMi-DRA 仓库](https://github.com/Project-HAMi/HAMi-DRA)
- [Project HAMi，k8s-dra-driver 仓库](https://github.com/Project-HAMi/k8s-dra-driver)
- [HAMi 文档，How to use HAMi DRA](/zh/docs/installation/how-to-use-hami-dra)
