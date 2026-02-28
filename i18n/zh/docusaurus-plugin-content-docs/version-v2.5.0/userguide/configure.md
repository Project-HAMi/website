---
title: 配置
translated: true
---

## 设备配置：ConfigMap

:::note
以下列出的所有配置都在 hami-scheduler-device ConfigMap 中管理。
:::

您可以通过以下方法之一更新这些配置：

1. 直接编辑 ConfigMap：如果 HAMi 已成功安装，您可以使用 kubectl edit 命令手动更新 hami-scheduler-device ConfigMap。

   ```bash
   kubectl edit configmap hami-scheduler-device -n <namespace>
   ```

   更改后，重启相关的 HAMi 组件以应用更新的配置。

2. 修改 Helm Chart：更新
   [ConfigMap](https://raw.githubusercontent.com/archlitchi/HAMi/refs/heads/master/charts/hami/templates/scheduler/device-configmap.yaml)
   中的相应值，然后重新应用 Helm Chart 以重新生成 ConfigMap。

   | 参数名 | 类型 | 描述 | 默认值 |
   |-------|-----|------|-------|
   | `nvidia.deviceMemoryScaling` | 浮点 | NVIDIA 设备显存缩放比例，可以大于 1（启用虚拟设备显存，实验性功能）。对于具有 *M* 内存的 NVIDIA GPU，若 `nvidia.deviceMemoryScaling` 设置为 *S*，则 vGPU 在 Kubernetes 中将总共获得 `S * M` 内存。 | 1 |
   | `nvidia.deviceSplitCount` | 整数 | 分配给单个 GPU 设备的最大任务数。 | 10 |
   | `nvidia.migstrategy` | 字符串 | "none" 表示忽略 MIG 功能，"mixed" 表示通过独立资源分配 MIG 设备。 | "none" |
   | `nvidia.disablecorelimit` | 字符串 | "true" 表示禁用核心限制，"false" 表示启用核心限制。 | "false" |
   | `nvidia.defaultMem` | 整数 | 当前任务的默认设备显存（MB）。'0' 表示使用 100% 设备显存。 | 0 |
   | `nvidia.defaultCores` | 整数 | 为当前任务保留的 GPU 核心百分比。0 适用于任何具有足够设备显存的 GPU，100 表示独占整个 GPU。 | 0 |
   | `nvidia.defaultGPUNum` | 整数 | 默认 GPU 设备数量，若配置值为 0，则无效并被过滤。若 `nvidia.com/gpu` 未设置，则 webhook 检查 `nvidia.com/gpumem`、`resource-mem-percentage`、`nvidia.com/gpucores`，任一有值则添加 `nvidia.com/gpu`。 | 1 |
   | `nvidia.resourceCountName` | 字符串 | vGPU 数量资源名称。 | "nvidia.com/gpu" |
   | `nvidia.resourceMemoryName` | 字符串 | vGPU 显存大小资源名称。 | "nvidia.com/gpumem" |
   | `nvidia.resourceMemoryPercentageName` | 字符串 | vGPU 显存比例资源名称。 | "nvidia.com/gpumem-percentage" |
   | `nvidia.resourceCoreName` | 字符串 | vGPU 核心资源名称。 | "nvidia.com/cores" |
   | `nvidia.resourcePriorityName` | 字符串 | vGPU 任务优先级名称。 | "nvidia.com/priority" |

## Chart 配置：参数

您可以通过使用 `-set` 设置以下参数来自定义您的 vGPU 支持，例如

```bash
helm install hami hami-charts/hami --set devicePlugin.deviceMemoryScaling=5 ...
```

| 参数名 | 类型 | 描述 | 默认值 |
|-------|-----|------|-------|
| `devicePlugin.service.schedulerPort` | 整数 | 调度器 webhook 服务的 nodePort。 | 31998 |
| `scheduler.defaultSchedulerPolicy.nodeSchedulerPolicy` | 字符串 | GPU 节点调度策略："binpack" 表示尽量将任务分配到同一 GPU 节点，"spread" 表示尽量将任务分配到不同的 GPU 节点。 | "binpack" |
| `scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy` | 字符串 | GPU 调度策略："binpack" 表示尽量将任务分配到同一 GPU，"spread" 表示尽量将任务分配到不同的 GPU。 | "spread" |

## Pod 配置：注解

| 参数名 | 类型 | 描述 | 示例值 |
|-------|-----|------|-------|
| `nvidia.com/use-gpuuuid` | 字符串 | 如果设置，分配给此 Pod 的设备必须是此字符串中定义的 UUID 之一。 | "GPU-AAA,GPU-BBB" |
| `nvidia.com/nouse-gpuuuid` | 字符串 | 如果设置，分配给此 Pod 的设备将不在此字符串中定义的 UUID 中。 | "GPU-AAA,GPU-BBB" |
| `nvidia.com/nouse-gputype` | 字符串 | 如果设置，分配给此 Pod 的设备将不在此字符串中定义的类型中。 | "Tesla V100-PCIE-32GB, NVIDIA A10" |
| `nvidia.com/use-gputype` | 字符串 | 如果设置，分配给此 Pod 的设备必须是此字符串中定义的类型之一。 | "Tesla V100-PCIE-32GB, NVIDIA A10" |
| `hami.io/node-scheduler-policy` | 字符串 | GPU 节点调度策略："binpack" 表示尽量分配到已使用的 GPU 节点，"spread" 表示尽量分配到不同的 GPU 节点。 | "binpack" 或 "spread" |
| `hami.io/gpu-scheduler-policy` | 字符串 | GPU 设备调度策略："binpack" 表示尽量分配到同一 GPU 卡，"spread" 表示尽量分配到不同的 GPU 卡。 | "binpack" 或 "spread" |
| `nvidia.com/vgpu-mode` | 字符串 | 此 Pod 希望使用的 vGPU 实例类型："hami-core" 或 "mig"。 | "hami-core" 或 "mig" |

## 容器配置：环境变量

| 参数名 | 类型 | 描述 | 默认值 |
|-------|-----|-----|--------|
| `GPU_CORE_UTILIZATION_POLICY` | 字符串 | 核心利用策略：<ul><li>"default"：默认利用策略</li><li>"force"：限制核心利用率低于 `nvidia.com/gpucores`</li><li>"disable"：忽略 `nvidia.com/gpucores` 的利用限制</li></ul> | `"default"` |
| `CUDA_DISABLE_CONTROL` | 布尔值 | 是否在容器内禁用 HAMi-core：<ul><li>"true"：无资源隔离和限制，仅用于调试</li><li>"false"：启用 HAMi-core</li></ul> | `false` |
