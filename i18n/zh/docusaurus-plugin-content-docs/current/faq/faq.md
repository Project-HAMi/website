---
title: 常见问题
---

## 支持的设备厂商及具体型号

| **GPU 厂商** | **GPU 型号** | **粒度** | **多 GPU 支持** |
| --- | --- | --- | --- |
| NVIDIA | 几乎所有主流消费级和数据中心 GPU | 核心 1%，显存 1M | 支持。多 GPU 仍可通过虚拟化进行拆分和共享。 |
| 昇腾 | 910A、910B2、910B3、310P | 最小粒度取决于卡类型模板。参考[官方模板](https://www.hiascend.com/document/detail/zh/mindx-dl/50rc1/AVI/cpaug/cpaug_0005.html)。 | 支持，但当 `npu > 1` 时不支持拆分，整卡独占。 |
| 海光 | 全部 | 核心 1%，显存 1M | 支持，但当 `dcu > 1` 时不支持拆分，整卡独占。 |
| 寒武纪 | 370、590 | 核心 1%，显存 256M | 支持，但当 `mlu > 1` 时不支持拆分，整卡独占。 |
| 天数智芯 | 全部 | 核心 1%，显存 256M | 支持，但当 `gpu > 1` 时不支持拆分，整卡独占。 |
| 摩尔线程 | MTT S4000 | 核心为 1 个核心组，显存 512M | 支持，但当 `gpu > 1` 时不支持拆分，整卡独占。 |
| 魅特思 | MXC500 | 不支持拆分，只能整卡分配。 | 支持，但所有分配均为整卡。 |

## 什么是 vGPU？为什么看到 10 个 vGPU 却无法在同一张卡上分配两个 vGPU？

**简要说明：**

vGPU 通过逻辑划分方式提升 GPU 利用率，使多个任务共享同一块物理 GPU。设置 `deviceSplitCount: 10` 表示该 GPU 最多可同时服务 10 个任务，但并不允许一个任务使用该 GPU 上的多个 vGPU。

### vGPU 的概念

vGPU 是通过虚拟化在物理 GPU 上创建的逻辑实例，使多个任务可共享同一个物理 GPU。例如配置为 `deviceSplitCount: 10`，表示该物理 GPU 最多可被分配给 10 个任务。这种分配并不会增加物理资源，仅改变逻辑可见性。

**为什么无法在同一张卡上分配两个 vGPU？**

1. **vGPU 的含义** vGPU 是物理 GPU 的不同任务视图，并非物理资源的划分。当任务请求 `nvidia.com/gpu: 2`，它被理解为需要两张物理 GPU，而非同一张卡上的两个 vGPU。

2. **资源分配机制** vGPU 的设计初衷是让多个任务共享一张 GPU，而不是让单个任务绑定多个 vGPU。`deviceSplitCount: 10` 表示最多有 10 个任务可以并发共享此 GPU，并不支持一个任务使用多个 vGPU。

3. **容器与节点视图一致性** 容器中的 GPU UUID 与节点上的物理 GPU UUID 是一致的，即反映的是同一块 GPU。虽然可见多个 vGPU，但这些是逻辑视图而非独立资源。

4. **设计目的** vGPU 的设计是为了 **让一张 GPU 可供多个任务共享**，而不是 **让一个任务使用多个 vGPU**。vGPU 超售的目标是提升资源利用率，而非扩展单个任务的计算能力。

## HAMi 的 `nvidia.com/priority` 字段仅支持两级，如何在资源紧张时实现多级用户自定义优先级的排队调度？

**简要说明：**

HAMi 的两级优先级用于同一张卡内任务的运行时抢占。若需支持多级用户自定义的任务调度优先级，可将 HAMi 与 **Volcano** 集成，利用其队列调度功能实现多级任务分配与抢占。

---

HAMi 原生的 `nvidia.com/priority` 字段（0 为高优先级，1 为低/默认）是为 **单卡内运行时抢占场景** 设计的。例如一个低优先级训练任务正在运行，若此时有高优先级的推理任务到来，高优先级任务会暂停低优任务，占用资源，完成后低优任务再恢复。此机制仅适用于单设备上的资源抢占，并非用于调度系统中多个任务队列的优先级排序。

若需在资源不足、多个任务排队等待的场景中，按照用户提交的多级优先级进行调度，HAMi 本身不具备此能力。

但你仍然可以通过与调度器 **Volcano** 集成来实现：

1. **Volcano 实现多级调度优先级**：
   - Volcano 支持定义多个具有不同优先级的队列；
   - 可根据队列优先级决定任务的资源分配顺序，并可对任务间进行抢占，支持 HAMi 管理的 vGPU 资源。

2. **HAMi 管理 GPU 共享与运行时优先级**：
   - HAMi 可通过其 [volcano-vgpu-device-plugin](https://github.com/Project-HAMi/volcano-vgpu-device-plugin) 与 Volcano 集成；
   - Volcano 负责任务队列排序，HAMi 则负责实际运行时的 GPU 共享与抢占逻辑。

**总结**：HAMi 的优先级机制用于卡内任务的运行时抢占；若要实现多级任务调度优先级，应结合 **Volcano 与 HAMi** 使用。

## 与其他开源工具的集成情况

**已支持**：

- **Volcano**：通过 [`volcano-vgpu-device-plugin`](https://github.com/Project-HAMi/volcano-vgpu-device-plugin) 与 Volcano 集成，实现 GPU 资源调度与管理。
- **Koordinator**：支持与 Koordinator 集成，实现端到端的 GPU 共享。通过在节点部署 HAMi-core 并在 Pod 中配置 label 和资源请求，Koordinator 能够利用 HAMi 的 GPU 隔离能力。

  配置说明参见：[Device Scheduling - GPU Share With HAMi](https://koordinator.sh/docs/user-manuals/device-scheduling-gpu-share-with-hami/)

**暂不支持**：

- **KubeVirt 与 Kata Containers**：由于它们依赖虚拟化进行资源隔离，而 HAMi 的 GPU 插件依赖直接挂载 GPU，无法兼容。若要支持需重构设备分配逻辑，但会增加性能开销，HAMi 当前优先支持高性能直挂场景。

## 为什么我的 Pod 输出中有 `[HAMI-core Warn(...)]` 日志？可以关闭吗？

这是正常日志，可忽略。如需关闭，可在容器中设置环境变量 `LIBCUDA_LOG_LEVEL=0`。

## HAMi 支持多节点、多 GPU 分布式训练吗？支持跨节点和跨 GPU 吗？

**简要说明：**

HAMi 支持多节点多 GPU 分布式训练，单个 Pod 可使用同节点多个 GPU，跨节点则通过多个 Pod 配合分布式框架实现。

### 多节点多 GPU 分布式训练

在 Kubernetes 中，HAMi 支持通过在不同节点运行多个 Pod，结合分布式框架（如 PyTorch、TensorFlow、Horovod），实现多节点多 GPU 协同训练。每个 Pod 使用本地 GPU，通过 NCCL、RDMA 等高性能网络通信。

### 跨节点与跨 GPU 场景

1. **跨节点**：多个 Pod 分布在不同节点上，节点间通过网络同步梯度和参数；
2. **跨 GPU**：单个 Pod 可使用所在节点内的多个 GPU。

一个 Pod 无法跨节点。需采用多 Pod 分布式训练，由分布式框架协调。

## HAMi 插件、Volcano 插件、NVIDIA 官方插件三者的关系与兼容性

**简要说明：**

同一节点只能启用一个 GPU 插件，避免资源冲突。

### 插件关系说明

三种插件都用于 GPU 资源管理，但适用场景及资源汇报方式不同：

- **HAMi 插件**
  - 使用扩展资源名 `nvidia.com/gpu`；
  - 支持 HAMi 的 GPU 管理能力（如 vGPU 拆分、自定义调度）；
  - 适用于复杂资源管理场景。

- **Volcano 插件**
  - 使用扩展资源名 `volcano.sh/vgpu-number`；
  - 为 Volcano 提供 vGPU 虚拟化资源；
  - 适合分布式任务、细粒度调度场景。

- **NVIDIA 官方插件**
  - 使用扩展资源名 `nvidia.com/gpu`；
  - 提供基本 GPU 分配功能；
  - 适合直接使用物理 GPU 的稳定场景。

### 是否可共存

- **HAMi 与 NVIDIA 插件**：不建议共存，会产生资源冲突；
- **HAMi 与 Volcano 插件**：理论上可共存，但推荐只启用一个；
- **NVIDIA 与 Volcano 插件**：理论上可共存，但不建议混合使用。

## 为什么 Node Capacity 中只有 `nvidia.com/gpu` 而没有 `nvidia.com/gpucores` 或 `nvidia.com/gpumem`？

**简要说明：**

Kubernetes 的 Device Plugin 每次只能上报一种资源类型。HAMi 将核心数和显存信息以 Node 注解方式记录供调度器使用。

### Device Plugin 的设计限制

- Device Plugin 接口（如 Registration、ListAndWatch）仅允许每个插件实例上报一个资源；
- 这简化了资源管理，但限制了同时上报多个指标（如核心和显存）。

### HAMi 的实现

- HAMi 将 GPU 详细信息（如算力、显存、型号）存储为 **节点注解**，供调度器解析；
- 示例：

  ```yaml
  hami.io/node-nvidia-register: GPU-fc28df76-54d2-c387-e52e-5f0a9495968c,10,49140,100,NVIDIA-NVIDIA L40S,0,true:GPU-b97db201-0442-8531-56d4-367e0c7d6edd,10,49140,100,...
  ```

### 后续问题说明

**为什么使用 `volcano-vgpu-device-plugin` 时 Node Capacity 中会出现 `volcano.sh/vgpu-number` 和 `volcano.sh/vgpu-memory`？**

- `volcano-vgpu-device-plugin` 创建了[三个独立的 Device Plugin 实例](https://github.com/Project-HAMi/volcano-vgpu-device-plugin/blob/2bf6dfe37f7b716f05d0d3210f89898087c06d99/pkg/plugin/vgpu/mig-strategy.go#L65-L85)，分别向 kubelet 注册 `volcano.sh/vgpu-number`、`volcano.sh/vgpu-memory`、`volcano.sh/vgpu-cores` 三种资源。kubelet 接收注册后，自动将资源写入 Capacity 和 Allocatable。
- **提示**：`volcano.sh/vgpu-memory` 资源受 Kubernetes 扩展资源数量限制（最大 32767）。对于大显存 GPU（如 A100 80GB），需要配置 --gpu-memory-factor 参数避免超限。

## 为什么某些国产厂商不需要单独安装运行时？

某些国产厂商（例如：**海光**、**寒武纪**）的 Device Plugin 插件已内置了设备发现与挂载的能力，因此不再需要额外的运行时组件。相比之下，**NVIDIA** 和 **昇腾** 等厂商的插件则依赖运行时来完成以下功能：

- 环境变量和软件依赖配置；
- 设备节点挂载；
- 高级功能（如拓扑感知、NUMA、性能隔离等）支持。

**简要总结：**

当官方插件无法满足高级功能（如缺少必要信息）或引入配置复杂性时，**HAMi 会选择自研 Device Plugin 插件**，以确保调度器获取完整资源信息。

HAMi 的调度器需要从节点获取足够的 GPU 信息来完成资源调度和设备分配。主要通过以下三种方式：

1. **Patch 节点注解（Annotations）**；
2. **通过标准 Device Plugin 接口上报资源给 kubelet**；
3. **直接修改节点的 `status.capacity` 与 `status.allocatable` 字段**。

**为什么 HAMi 要自研插件？举例如下：**

- **昇腾插件问题**：官方插件需为每种卡类型部署不同插件，HAMi 将其抽象为统一模板，简化集成；
- **NVIDIA 插件问题**：无法支持如 GPU 核心/显存比例限制、GPU 资源超售、NUMA 感知等高级功能，HAMi 需定制插件实现这些调度优化功能。

## HAMi 如何强制执行 GPU 显存和算力限制？

HAMi 通过 `/etc/ld.so.preload` 将 `libvgpu.so` 注入容器。该库拦截 CUDA 显存分配调用，当超过 `nvidia.com/gpumem` 限制时返回 OOM；算力限制通过令牌桶算法对 kernel launch 调用进行节流。绕过 CUDA 库的应用（如 Docker-in-Docker、直接调用驱动 API）不受管控。完整的拦截流程参见 [GPU 虚拟化](../core-concepts/gpu-virtualization)。

## HAMi vGPU 与 NVIDIA MIG 有何区别？各适用于什么场景？

HAMi vGPU 是纯软件方案，无硬件要求。NVIDIA MIG 是硬件分区，仅支持 Ampere 及更新架构的 GPU（A100、H100、A30）。

| 属性           | HAMi vGPU                     | NVIDIA MIG                                 |
| -------------- | ----------------------------- | ------------------------------------------ |
| 硬件要求       | 任意 NVIDIA GPU，驱动 v440+   | Ampere 及更新架构（A100、H100、A30、H200） |
| 隔离机制       | 用户态库拦截                  | 硬件引擎分区                               |
| 显存限制       | 软限制（CUDA API 级别）       | 硬限制（硬件强制）                         |
| 算力限制       | 软限制（libvgpu.so 内部节流） | 硬限制（独立 SM 分区）                     |
| 分区粒度       | 1 MiB 显存，1% 算力           | 固定 MIG 配置（如 1g.10gb）                |
| 动态重配置     | 支持，无需排空节点            | 需要重新配置 MIG 配置文件                  |
| 多租户噪声隔离 | 尽力而为                      | 强隔离                                     |

当 GPU 不支持 MIG、工作负载需要灵活的显存大小、或需要无需排空节点的动态重打包时，使用 HAMi vGPU。当硬隔离是合规或 SLA 要求时，使用 MIG。HAMi 也通过 `mig-parted` 支持动态 MIG；参见[动态 MIG 支持](../userguide/nvidia-device/dynamic-mig-support)。

## 为什么容器内 nvidia-smi 显示的显存比宿主机少？

`libvgpu.so` 拦截了 `nvmlDeviceGetMemoryInfo` 及相关调用，返回 `nvidia.com/gpumem` 限制值而非物理显存。这是预期行为：根据上报显存大小进行分配的工作负载（如 vLLM）将只使用其配额。宿主机的 `nvidia-smi` 始终显示物理显存。参见 [GPU 虚拟化](../core-concepts/gpu-virtualization)。

## 为什么 nvidia.com/gpumem 限制未生效？ {#why-is-my-nvidiagpumem-limit-not-enforced}

最常见的四种原因：设置了 `CUDA_DISABLE_CONTROL=true`、工作负载运行在 Docker-in-Docker 中、应用直接调用 GPU 驱动（绕过了 `libvgpu.so`）、或节点上 `nvidia-container-runtime` 未设为默认运行时。解决步骤参见[排障手册](../troubleshooting/troubleshooting.md)。

## HAMi 是替换 kube-scheduler 还是与其并行运行？

HAMi 作为 [scheduler extender](https://github.com/kubernetes/design-proposals-archive/blob/main/scheduling/scheduler_extender.md) 与 kube-scheduler 并行运行，不会替换它。MutatingWebhook 仅在请求 HAMi 资源的 Pod 上设置 `schedulerName: hami-scheduler`；所有其他 Pod 仍走默认调度器路径。参见[架构](../core-concepts/architecture)。

## HAMi 是否支持 vLLM？多 GPU 张量并行有哪些已知限制？

单 GPU vLLM 使用 `nvidia.com/gpumem` 无需额外配置。对于 vLLM 0.18 以上版本的多 GPU 张量并行（`tensor_parallel_size > 1`），需要 HAMi v2.9.0 或更高版本。早期版本因共享 CUDA 设备显存状态文件导致 NCCL 初始化失败（参见 [#1764](https://github.com/Project-HAMi/HAMi/issues/1764) 和 [#1853](https://github.com/Project-HAMi/HAMi/issues/1853)）。在 Volcano 环境中，应逐 Pod 设置 `tensor_parallel_size`，而非跨所有 Pod 设置。如遇到 CUDA graph 捕获错误，可尝试 `--enforce-eager`。

## HAMi 是否兼容 NVIDIA GPU Operator 和 DCGM 指标？

HAMi 的设备插件和 GPU Operator 的设备插件都向 kubelet 上报 `nvidia.com/gpu`，在同一节点上同时运行会导致冲突。需禁用 GPU Operator 的设备插件：

```yaml
devicePlugin:
  enabled: false
```

DCGM Exporter 不受影响，继续正常上报物理级计数器。HAMi 的每容器虚拟指标是独立的；参见 [GPU 利用率指标](../developers/gpu-utilization-metrics)。

## 如何为 HAMi vGPU 指标设置 Prometheus 和 Grafana 监控？

每个节点上的 `hami-device-plugin` Pod 在端口 `31992`（可通过 `devicePlugin.monitorPort` 配置）上暴露每容器 vGPU 指标。完整的设置步骤（包括 Prometheus 采集配置和 Dashboard 导入）参见 [Grafana Dashboard](../userguide/monitoring/grafana-dashboard)。
