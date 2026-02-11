---
title: 配置
translated: true
---

# 全局配置

## 设备配置：ConfigMap

**注意：**
以下列出的所有配置都在 hami-scheduler-device ConfigMap 中管理。
您可以通过以下方法之一更新这些配置：

1. 直接编辑 ConfigMap：如果 HAMi 已成功安装，您可以使用 kubectl edit 命令手动更新 hami-scheduler-device ConfigMap。

    ```bash
    kubectl edit configmap hami-scheduler-device -n <namespace>
    ```

    更改后，重启相关的 HAMi 组件以应用更新的配置。

2. 修改 Helm Chart：更新 [ConfigMap](https://raw.githubusercontent.com/archlitchi/HAMi/refs/heads/master/charts/hami/templates/scheduler/device-configmap.yaml) 中的相应值，然后重新应用 Helm Chart 以重新生成 ConfigMap。

* `nvidia.deviceMemoryScaling`：
  浮点类型，默认值：1。NVIDIA 设备内存缩放比例，可以大于 1（启用虚拟设备内存，实验性功能）。对于具有 *M* 内存的 NVIDIA GPU，如果我们将 `nvidia.deviceMemoryScaling` 参数设置为 *S*，则通过此 GPU 分割的 vGPU 在 Kubernetes 中将总共获得 `S * M` 内存。
* `nvidia.deviceSplitCount`：
  整数类型，默认值：10。分配给单个 GPU 设备的最大任务数。
* `nvidia.migstrategy`：
  字符串类型，"none" 表示忽略 MIG 功能，"mixed" 表示通过独立资源分配 MIG 设备。默认值为 "none"。
* `nvidia.disablecorelimit`：
  字符串类型，"true" 表示禁用核心限制，"false" 表示启用核心限制，默认值：false。
* `nvidia.defaultMem`：
  整数类型，默认值：0。当前任务的默认设备内存，以 MB 为单位。'0' 表示使用 100% 设备内存。
* `nvidia.defaultCores`：
  整数类型，默认值：0。为当前任务保留的 GPU 核心百分比。如果分配为 0，则可能适合任何具有足够设备内存的 GPU。如果分配为 100，则将独占使用整个 GPU 卡。
* `nvidia.defaultGPUNum`：
  整数类型，默认值：1，如果配置值为 0，则配置值将不生效并被过滤。当用户未在 Pod 资源中设置 nvidia.com/gpu 这个键时，webhook 应检查 nvidia.com/gpumem、resource-mem-percentage、nvidia.com/gpucores 这三个键，任意一个键有值，webhook 应将 nvidia.com/gpu 键和此默认值添加到资源限制映射中。
* `nvidia.resourceCountName`：
  字符串类型，vgpu 数量资源名称，默认值："nvidia.com/gpu"。
* `nvidia.resourceMemoryName`：
  字符串类型，vgpu 内存大小资源名称，默认值："nvidia.com/gpumem"。
* `nvidia.resourceMemoryPercentageName`：
  字符串类型，vgpu 内存比例资源名称，默认值："nvidia.com/gpumem-percentage"。
* `nvidia.resourceCoreName`：
  字符串类型，vgpu 核心资源名称，默认值："nvidia.com/cores"。
* `nvidia.resourcePriorityName`：
  字符串类型，vgpu 任务优先级名称，默认值："nvidia.com/priority"。

## Chart 配置：参数

您可以通过使用 `-set` 设置以下参数来自定义您的 vGPU 支持，例如

```bash
helm install hami hami-charts/hami --set devicePlugin.deviceMemoryScaling=5 ...
```

* `devicePlugin.service.schedulerPort`：
  整数类型，默认值：31998，调度器 webhook 服务的 nodePort。
* `scheduler.defaultSchedulerPolicy.nodeSchedulerPolicy`：字符串类型，默认值为 "binpack"，
  表示 GPU 节点调度策略。"binpack" 表示尽量将任务分配到同一 GPU 节点，而 "spread" 表示尽量将任务分配到不同的 GPU 节点。
* `scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy`：字符串类型，默认值为 "spread"，表示 GPU 调度策略。
  "binpack" 表示尽量将任务分配到同一 GPU，而 "spread" 表示尽量将任务分配到不同的 GPU。

## Pod 配置：注解

* `nvidia.com/use-gpuuuid`：

  字符串类型，例如 "GPU-AAA,GPU-BBB"

  如果设置，分配给此 Pod 的设备必须是此字符串中定义的 UUID 之一。

* `nvidia.com/nouse-gpuuuid`

  字符串类型，例如 "GPU-AAA,GPU-BBB"

  如果设置，分配给此 Pod 的设备将不在此字符串中定义的 UUID 中。

* `nvidia.com/nouse-gputype`：

  字符串类型，例如 "Tesla V100-PCIE-32GB, NVIDIA A10"

  如果设置，分配给此 Pod 的设备将不在此字符串中定义的类型中。

* `nvidia.com/use-gputype`

  字符串类型，例如 "Tesla V100-PCIE-32GB, NVIDIA A10"

  如果设置，分配给此 Pod 的设备必须是此字符串中定义的类型之一。

* `hami.io/node-scheduler-policy`

  字符串类型，"binpack" 或 "spread"

  binpack：调度器将尝试将 Pod 分配到已使用的 GPU 节点进行执行。

  spread：调度器将尝试将 Pod 分配到不同的 GPU 节点进行执行。

* `hami.io/gpu-scheduler-policy`

  字符串类型，"binpack" 或 "spread"

  binpack：调度器将尝试将 Pod 分配到同一 GPU 卡进行执行。

  spread：调度器将尝试将 Pod 分配到不同的 GPU 卡进行执行。

* `nvidia.com/vgpu-mode`

  字符串类型，"hami-core" 或 "mig"

  此 Pod 希望使用的 vgpu 实例类型

## 容器配置：环境变量

* `GPU_CORE_UTILIZATION_POLICY`：

  字符串类型，"default", "force", "disable"

  默认值："default"

  "default" 表示默认的利用策略

  "force" 表示容器将始终限制核心利用率低于 "nvidia.com/gpucores"

  "disable" 表示容器将在任务执行期间忽略 "nvidia.com/gpucores" 设置的利用限制

* `CUDA_DISABLE_CONTROL`：

  布尔类型，"true","false"

  默认值：false

  "true" 表示在容器内将不使用 HAMi-core，因此在该容器中将没有资源隔离和限制，仅用于调试。
