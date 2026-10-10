---
id: general-technical-review
title: 通用技术评审
translated: true
sidebar_label: 通用技术评审
---

- **项目：** HAMi
- **项目版本：** v2.8.0
- **网站：** https://project-hami.io
- **更新日期：** 2026-04-13
- **模板版本：** v1.0
- **描述：** HAMi 是一个 Kubernetes 中间件，用于在 GPU/NPU 及其他加速器之间实现异构 AI 设备的共享、隔离和调度。

## 第 0 天 - 规划阶段

### 范围

- **路线图与范围流程：** 范围通过 issue/PR 和维护者评审来确定，治理文档维护在 HAMi 社区仓库中。路线图维护在 GitHub issue 中（例如按版本跟踪的 https://github.com/Project-HAMi/HAMi/issues/1615）。每个版本发布后，下一次社区周会会详细讨论后续版本的路线图目标，并在 issue 上为每个目标指定负责人。社区用户可以在这些 issue 下回复，补充或提出功能需求。
  - 设计文档：https://project-hami.io/docs/developers/hami-core-design
  - 治理：https://github.com/Project-HAMi/community/blob/main/governance.md
- **目标用户画像：**
  - **平台工程师：** 在 Kubernetes 1.23+ 集群上将 HAMi 作为中间件部署，支持 NVIDIA 驱动 440+，便于集成到现有平台产品中。GPU 管理与隔离是常见的产品差异化能力，HAMi 提供端到端支持。
  - **MLOps 团队：** 使用 GPU 虚拟化缩短作业等待时间；借助拓扑感知调度和设备类型选择，高效地放置训练与推理工作负载。
  - **个人 AI 工作负载所有者：** 通常只运行少量 GPU；利用共享与复用提升利用率，无需修改应用代码。
  - **IT 运维团队：** 通过 GPU 共享提升集群利用率；在单个集群中整合异构加速器并集成监控，降低维护成本。

- **主要使用场景：** 在 Kubernetes 上为多个工作负载共享和隔离加速器资源（尤其是 GPU 显存/算力），无需修改应用代码。
- **其他支持的使用场景：** 拓扑感知调度、多种调度策略（binpack/spread）、NVIDIA 动态 MIG 支持，以及异构设备支持（例如 NVIDIA、寒武纪、海光、天数智芯、沐曦、燧原，以及昇腾集成参考）。
- **不支持/非目标场景：** HAMi 不是模型服务框架、训练框架或通用集群自动扩缩容器，它专注于加速器的虚拟化与调度。
- **受益的组织：** 运营共享加速器集群的公有云、私有云、企业 AI 平台、电信、金融、教育、制造和互联网公司。
- **终端用户调研：** 正式的问卷式用户调研仍然有限。生产环境采用情况最清晰的公开证据是 **CNCF 终端用户案例**，其中包括多个由社区提交、介绍 HAMi 的案例；[按 HAMi 筛选的案例列表](https://www.cncf.io/case-studies/?_sft_lf-project=hami)是 cncf.io 上持续更新的目录。具有代表性的终端用户包括：
  - [SF Technology](https://www.cncf.io/case-studies/sf-technology/)（顺丰科技）
  - [Ke Holdings Inc.](https://www.cncf.io/case-studies/ke-holdings-inc/)（贝壳）
  - [NIO](https://www.cncf.io/case-studies/nio/)（蔚来）

### 可用性

- **交互模型：** 运维人员和工作负载所有者通过 Helm、Kubernetes Pod 规格、组件 Service 以及由 chart 驱动的调度器/webhook 设置与 HAMi 交互。
  - **生命周期：** 使用 Helm 安装、升级和卸载（见下文**安装**和仓库 README 快速入门）。
  - **工作负载：** 通过 Pod 的 `requests`/`limits` 加上 HAMi 注解来申请共享加速器，并设置切片、设备选择和调度策略。
  - **可观测性：** 通过 HAMi 调度器的指标 HTTP 端点查看集群范围的设备与调度概览；通过 device-plugin 的 vGPU monitor 接口查询 NVIDIA 各 Pod 的实时使用情况（监听端口可通过 Helm 配置，默认值见 README 和[配置页面](https://project-hami.io/docs/userguide/configure)）。

- **用户体验/界面：** 默认体验是 Kubernetes 原生的：`kubectl`、Pod/Node API 以及 YAML/Helm values。如需图形化管理和监控，可部署可选的 **HAMi WebUI**；面向 Grafana 的示例另有文档说明。
  - HAMi WebUI 用户指南：https://project-hami.io/docs/userguide/hami-webui-user-guide
  - 仪表盘示例：https://project-hami.io/docs/userguide/monitoring/device-allocation

- **生产环境集成：** HAMi 是集群内中间件：团队必须已经运行受支持的 Kubernetes 集群。在生产环境中，它通过 mutating admission webhook、scheduler extender 集成（默认的 `kube-scheduler` 或由 chart 管理的调度器）、device plugin 以及适用场景下支持 CDI 的运行时来扩展控制平面。其他批处理/AI 调度生态的文档或跟踪情况如下：
  - **Volcano：** 通过 Volcano vGPU device plugin（基于 HAMi-core 的隔离）实现由 Volcano 管理的 NVIDIA 共享；参见 https://project-hami.io/docs/installation/how-to-use-volcano-vgpu
  - **Koordinator：** 与 HAMi 结合的端到端 GPU 共享；参见 https://koordinator.sh/docs/user-manuals/device-scheduling-gpu-share-with-hami
  - **KAI Scheduler：** GPU 共享隔离的设计与实现仍在演进中；参见 https://github.com/kai-scheduler/KAI-Scheduler/pull/60

### 设计

#### 设计原则

以下原则指导 HAMi 的架构和功能取舍（另见[设计概览](https://project-hami.io/docs/developers/hami-core-design)）：

1. **Kubernetes 原生的控制路径**
   - 加速器通过标准的 Kubernetes 接口来申请、调度和分配：Pod 规格、scheduler extender 协议、device plugin gRPC API 以及准入 webhook。
   - HAMi 避免引入私有控制平面；集群状态保留在 Kubernetes API 以及运维人员已经信任的节点/device plugin 上报路径中。
2. **无需修改应用代码**
   - 工作负载通过资源请求、限制和注解来表达共享与隔离需求，无需为了“适配 HAMi”而重写训练、推理或 HPC 代码。
   - 这降低了平台团队接入现有 AI/ML 作业的阻力。
3. **可插拔的异构设备**
   - 设备相关逻辑位于 device plugin 和容器内控制库中（例如 NVIDIA 使用 HAMi-core，其他厂商使用类似组件）。
   - 在调度侧，HAMi 暴露设备 API；每个设备实现都可以扩展该 API，加入设备特定的调度优化。
   - 新硬件通过扩展这些层来接入，而不是复制整个技术栈。
4. **策略驱动的调度**
   - 放置决策在 scheduler extender 上采用 filter/score 语义，管理员可以一致地引导 binpack、spread、拓扑感知和厂商特定的约束。
   - 决策会通过注解记录在 Pod 上，从而支持针对不同工作负载类别的场景化调度行为。
5. **共享加速器上的硬隔离**
   - 在技术栈支持的情况下，显存和算力上限在容器内强制执行，而不仅仅在准入阶段检查，因此租户无法超出在共享设备上声明的切片。
6. **清晰的职责分离**
   - Mutating admission 负责校验并规范化请求；extender 负责选择节点；device plugin 负责分配和挂载；容器内库负责强制执行限制。
   - 每个阶段的约定都很窄，中间状态写入 Pod/Node 注解，帮助运维人员快速定位问题。

#### 最佳实践

让 HAMi 易于维护、可安全用于生产环境的工程与社区实践：

1. **与 Kubernetes 语义保持一致**
   - 遵循上游 scheduler extender、device plugin 和准入 webhook 的约定；对非标准行为，优先通过明确的发布说明进行弃用，而不是悄悄偏离。
2. **自动化验证**
   - 通过 CI 把关变更（lint、单元测试、chart 打包，以及覆盖真实调度和设备路径的工作流），在合并前发现回归。
3. **在真实环境中测试**
   - 针对有代表性的加速器硬件、驱动和运行时组合验证功能；按厂商记录受支持的矩阵和已知限制。
4. **社区驱动的优先级**
   - 通过公开的 issue、路线图讨论和社区会议，让路线图条目反映运维人员的痛点和贡献者的投入能力（参见“范围”下的**路线图与范围流程**）。
5. **文档与可运维性优先**
   - 随功能一起提供面向用户的文档、示例和 Helm values 注释，让平台团队无需阅读实现就能安装、调优和观测 HAMi。

#### 架构要求

核心组件包括 MutatingWebhook、Scheduler Extender、Device Plugin 和容器内控制库。

- 架构与流程：https://project-hami.io/docs/developers/hami-core-design

#### 环境差异

- PoC/开发/测试/生产：核心部署模型相同（启用 GPU 的 Kubernetes 加 HAMi）；生产环境通常会采用更严格的节点标签、webhook TLS 加固、调度器/设备策略调优以及监控集成。

#### 集群内服务依赖

Kubernetes API server、kube-scheduler/Volcano 调度集成、kubelet device plugin API，以及（可选的）用于 webhook 证书的 cert-manager。

#### IAM 模型

组件的 service account 使用 Kubernetes RBAC，并且 webhook patch 任务和调度器操作只使用必需的最小 API 权限。

#### 主权/合规

数据平面限于集群本地，没有强制使用的外部遥测服务。地区/组织层面的合规情况取决于部署选择。

#### 高可用要求

调度器支持 leader election 和可配置的副本数。

- 工作负载侧：HAMi v2.5 解决了重新安装期间运行中任务崩溃的问题。这不能保证升级或控制平面的瞬时故障不受影响；升级前请停止或重新调度 GPU 工作负载。
- 调度侧：自 HAMi v2.8 起，支持带 leader election 的多副本调度器部署，为调度决策提供高可用。

#### 资源需求（CPU/内存/网络）

可通过 Helm values 按组件配置。chart 默认不设置 `resources`，因此生产集群应显式设置 requests/limits。以下估算是在 Kubernetes 1.20+ 上、启用 NVIDIA 共享且调度变动正常的前提下，针对 HAMi v2.8.0 的实用规划基线。

- **估算假设：** 1 个调度器副本（`kube-scheduler` + HAMi extender），每个 GPU 节点 1 个 device-plugin DaemonSet Pod（`device-plugin` + `vgpu-monitor`），Prometheus 每 15-30 秒抓取一次，且没有异常的 Pod 创建高峰。

| 组件 / 范围 | CPU（建议 request 到典型峰值） | 内存（建议 request 到典型峰值） | 网络（控制/可观测平面） |
| --- | --- | --- | --- |
| 调度器 Pod（每个副本） | 300m-800m | 512Mi-2Gi | 典型 0.2-1 Mbps，Pod 大量变动时突发 2-5 Mbps |
| Device-plugin Pod（每个 GPU 节点） | 150m-600m | 256Mi-1Gi | 每节点 0.05-0.2 Mbps（遥测与控制信令） |
| 指标抓取开销（每个目标，15 秒间隔） | N/A | N/A | 50-300 KiB/次抓取，约 0.03-0.16 Mbps |
| 集群总计（N 个 GPU 节点） | (0.3 到 0.8) + N * (0.15 到 0.6) 核 | (0.5 到 2) + N * (0.25 到 1) GiB | 大致与 N 线性相关，取决于每节点遥测加调度器控制流量 |
| 示例规模（N=20 个 GPU 节点） | 3.3-12.8 核 | 5.5-22 GiB | 典型聚合控制/指标流量 1.2-5 Mbps，大规模调度事件期间有更高的短时突发 |

#### 存储需求

HAMi 没有强制使用的外部数据库。存储主要用于镜像层、日志/指标缓冲，以及调度器/device plugin 组件使用的 hostPath 挂载的运行时路径。以下是用于生产规划的实用容量估算。

- **估算假设：** 默认镜像保留策略、标准的 Kubernetes/容器运行时日志，以及 Pod 变动正常的训练/推理混合工作负载。

| 组件 / 范围 | 估算的存储占用 | 说明 |
| --- | --- | --- |
| 调度器 Pod（每个副本） | 0.2-0.8 GiB 节点本地临时存储 | 主要是镜像层、日志和临时运行时文件 |
| Device-plugin + monitor Pod（每个 GPU 节点） | 0.3-1.2 GiB 节点本地临时存储 | 包括插件/monitor 镜像层、日志以及运行时临时/缓存路径 |
| GPU 节点上 HAMi 使用的宿主机运行时路径 | 在 Pod 临时存储用量之外，建议预留 0.2-1 GiB 空闲空间 | 涵盖 `/var/lib/kubelet/device-plugins`、`/usr/local/vgpu`、`/var/run/cdi` 以及 `/tmp` 下的临时文件 |
| 集群总计（N 个 GPU 节点，1 个调度器副本） | 约 `(0.2 到 0.8) + N * (0.5 到 2.2)` GiB | 合计调度器临时存储、每个 GPU 节点的 Pod 以及宿主机运行时预留 |
| 示例规模（N=20 个 GPU 节点） | 集群范围内约预留 10.2-44.8 GiB | 为稳定运维和升级余量准备的规划区间 |

#### API 设计

- 使用 Kubernetes 原生 API（Pod、Node、注解、准入 webhook、device plugin gRPC）。
- 默认值和可选配置通过 Helm chart values 和配置文档提供。
- 核心工作流不需要自定义 CRD。
- 设备切片的资源名称以 Kubernetes 资源的形式暴露，用户可以直接在 `resources.limits` / `resources.requests` 中申请和限制切片。
- GPU 调度策略和高级行为通过 Pod 注解来表达。
- HAMi 的运行时行为可通过调度器和 device plugin 的 ConfigMap 配置，其中 Helm values 是主要入口。

#### 发布流程

采用语义化版本、带标签的发布、发布分支、自动化的镜像/chart/发布说明工作流，并有文档化的人工验证步骤。

- 发布流程文档：https://github.com/Project-HAMi/HAMi/blob/master/.github/release-process.md

### 安装

- **安装与验证：** 基于 Helm 安装，包含节点标签和 chart values 自定义。
  - 快速入门：https://project-hami.io/docs/installation/online-installation
  - 部署命令示例：

```bash
# 1) Label GPU nodes for HAMi management
kubectl label nodes <gpu-node-name> gpu=on

# 2) Add HAMi Helm repository
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update

# 3) Install HAMi into kube-system
helm install hami hami-charts/hami -n kube-system

# 4) (Optional) Customize values during install
# helm install hami hami-charts/hami -n kube-system -f values.yaml

# 5) Verify core components are running
kubectl get pods -n kube-system | grep -E "hami-scheduler|hami-device-plugin"
```

### 安全

参见单独的[文档](https://github.com/cncf/toc/blob/main/projects/hami/security-assesment/self-assessment.md)

## 第 1 天 - 安装与部署阶段

### 项目安装与配置

- 安装使用 Helm chart，包括调度器策略、资源命名、webhook 选择器、TLS 策略和 device plugin 行为的配置。
  - 安装指南：https://project-hami.io/docs/installation/online-installation
- 运行行为可通过 Helm values 和 ConfigMap 配置（例如调度器和设备策略的 ConfigMap）。
  - 配置指南：https://project-hami.io/docs/userguide/configure

### 项目启用与回滚

- **在运行中的集群里启用/停用：** 通过 Helm 部署/升级/卸载。启用不需要控制平面停机；当 webhook/调度器集成发生变化时，工作负载可能会遇到调度行为的变化。
- **启用后的行为变化：**
  - 对可识别的设备请求进行 Pod 变更。
  - 设备共享工作负载的调度会经由 HAMi 的逻辑和策略。
  - 由 device plugin 负责分配/挂载/环境变量处理，以便在运行时强制执行限制。
- **启用/停用的测试：** 部署和卸载路径通过 e2e 工作流验证；PR 合并前须通过必需的 e2e 检查。
- **资源清理：** Helm 卸载会移除由 chart 管理的资源；默认路径不会引入核心 CRD。

### 发布、升级与回滚规划

- **兼容性节奏：** Kubernetes 及相关依赖通过 CI 和自动化依赖更新（包括 Dependabot）进行跟踪。版本演进遵循文档化的发布流程和发布工作流。
- **回滚流程：** 使用 `helm rollback` 原地回滚；若希望完整重新部署，也可以卸载后用旧版本 chart 重新部署。
- **发布/回滚可能失败的情形：**
  - 回滚了镜像，却没有回滚与之匹配的 chart/配置版本。
  - 没有将自定义 values 和策略 ConfigMap 与工作负载/镜像一起回滚。
  - 未经分阶段验证就进行跨多个版本的回滚（例如两个或更多次版本）。
- **对运行中工作负载的影响：** HAMi v2.5 解决了重新安装期间运行中任务崩溃的问题，但升级和回滚仍可能影响活动的工作负载；升级前请停止或重新调度 GPU 工作负载。新的调度/分配决策也可能随之改变。
- **回滚指标：** 主要指标包括准入/调度错误、Pending Pod 异常增多、device plugin 注册问题以及策略不匹配的症状。在运维上，项目建议尽可能保持在较新的受支持版本上。
- **升级路径测试：** 已有单元/e2e 覆盖；明确的长链路“升级->降级->升级”矩阵仍在演进中，孵化阶段应进一步扩展。
- **弃用沟通：** 弃用信息通过文档和社区会议传达，并在文档中显式标注。典型的过渡期是新旧 API 在随后的一个版本中同时保留，下一个发布周期之后再移除旧 API。
- **Alpha/Beta 能力：** 通过配置开关和 values 暴露；用户通过 chart values 和文档化的设置选择启用。
