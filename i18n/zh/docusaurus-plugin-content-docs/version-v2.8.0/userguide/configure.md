---
title: 配置
translated: true
---

# 全局配置

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

2. 修改 Helm Chart：更新 [ConfigMap](https://raw.githubusercontent.com/archlitchi/HAMi/refs/heads/master/charts/hami/templates/scheduler/device-configmap.yaml) 中的相应值，然后重新应用 Helm Chart 以重新生成 ConfigMap。

| 参数 | 类型 | 描述 | 默认值 |
| --- | ---- | --- | ----- |
| `nvidia.deviceMemoryScaling` | 浮点数 | NVIDIA 设备显存缩放比例，允许大于 1（启用虚拟设备显存，实验性功能）。对于一块拥有 _M_ 显存的 NVIDIA GPU，若设置为 _S_，则由该 GPU 拆分出的 vGPU 在 Kubernetes 中将获得 `S * M` 的显存。 | `1` |
| `nvidia.deviceSplitCount` | 整数 | 单块 GPU 可分配的最大任务数。 | `10` |
| `nvidia.migstrategy` | 字符串 | 设置为 `"none"` 表示忽略 MIG 功能，设置为 `"mixed"` 表示以独立资源方式分配 MIG 设备。 | `"none"` |
| `nvidia.disablecorelimit` | 字符串 | 设置为 `"true"` 表示禁用核心限制，设置为 `"false"` 表示启用核心限制。 | `"false"` |
| `nvidia.defaultMem` | 整数 | 当前任务默认使用的设备显存（MB）。若为 `0`，则表示使用设备 100% 显存。 | `0` |
| `nvidia.defaultCores` | 整数 | 当前任务默认预留的 GPU 核心百分比。`0` 表示只要显存够就可用任何 GPU；`100` 表示独占整块 GPU。 | `0` |
| `nvidia.defaultGPUNum` | 整数 | 默认分配的 GPU 数量。若设为 `0`，则会被过滤。如果 Pod 的资源未显式设置 `nvidia.com/gpu`，则 webhook 会检查是否设置了 `nvidia.com/gpumem`、`resource-mem-percentage` 或 `nvidia.com/gpucores`，若设置了其中任一项，则自动添加默认值的 `nvidia.com/gpu`。 | `1` |
| `nvidia.resourceCountName` | 字符串 | vGPU 数量的资源名。 | `"nvidia.com/gpu"` |
| `nvidia.resourceMemoryName` | 字符串 | vGPU 显存大小的资源名。 | `"nvidia.com/gpumem"` |
| `nvidia.resourceMemoryPercentageName` | 字符串 | vGPU 显存比例的资源名。 | `"nvidia.com/gpumem-percentage"` |
| `nvidia.resourceCoreName` | 字符串 | vGPU 核心的资源名。 | `"nvidia.com/cores"` |
| `nvidia.resourcePriorityName` | 字符串 | vGPU 任务优先级的资源名。 | `"nvidia.com/priority"` |

## Chart 配置：参数

您可以通过使用 `-set` 设置以下参数来自定义您的 vGPU 支持，例如

```bash
helm install hami hami-charts/hami --set devicePlugin.deviceMemoryScaling=5 ...
```

| 参数 | 类型 | 描述 | 默认值 |
| --- | ---- | --- | ----- |
| `devicePlugin.service.schedulerPort` | 整数 | 调度器 webhook 服务的 NodePort 端口。 | `31998` |
| `scheduler.defaultSchedulerPolicy.nodeSchedulerPolicy` | 字符串 | GPU 节点调度策略：`"binpack"` 表示尽可能将任务分配到同一个 GPU 节点；`"spread"` 表示尽可能将任务分配到不同的 GPU 节点。 | `"binpack"` |
| `scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy` | 字符串 | GPU 调度策略：`"binpack"` 表示尽可能将任务分配到同一个 GPU；`"spread"` 表示尽可能将任务分配到不同的 GPU。 | `"spread"` |

## Pod 配置：注解

| 参数 | 类型 | 描述 | 示例 |
| --- | ---- | --- | ----- |
| `nvidia.com/use-gpuuuid` | 字符串 | 如果设置了此字段，则该 Pod 分配的设备 **必须** 是此字符串中定义的 GPU UUID 之一。 | `"GPU-AAA,GPU-BBB"` |
| `nvidia.com/nouse-gpuuuid` | 字符串 | 如果设置了此字段，则该 Pod 分配的设备 **不能** 是此字符串中定义的 GPU UUID。 | `"GPU-AAA,GPU-BBB"` |
| `nvidia.com/nouse-gputype` | 字符串 | 如果设置了此字段，则该 Pod 分配的设备 **不能** 是此字符串中定义的 GPU 类型。 | `"Tesla V100-PCIE-32GB, NVIDIA A10"` |
| `nvidia.com/use-gputype` | 字符串 | 如果设置了此字段，则该 Pod 分配的设备 **必须** 是此字符串中定义的 GPU 类型之一。 | `"Tesla V100-PCIE-32GB, NVIDIA A10"` |
| `hami.io/node-scheduler-policy` | 字符串 | GPU 节点调度策略：`"binpack"` 表示将 Pod 分配到已有负载的 GPU 节点上执行，`"spread"` 表示分配到不同的 GPU 节点上执行。 | `"binpack"` 或 `"spread"` |
| `hami.io/gpu-scheduler-policy` | 字符串 | GPU 卡调度策略：`"binpack"` 表示将 Pod 分配到同一块 GPU 卡上执行，`"spread"` 表示分配到不同的 GPU 卡上执行。 | `"binpack"` 或 `"spread"` |
| `nvidia.com/vgpu-mode` | 字符串 | 指定该 Pod 希望使用的 vGPU 实例类型。 | `"hami-core"` 或 `"mig"` |

## 容器配置：环境变量

| 参数 | 类型 | 描述 | 默认值 |
| --- | ---- | --- | ----- |
| `GPU_CORE_UTILIZATION_POLICY` | 字符串 | 定义 GPU 核心使用策略：<ul><li>`"default"`：默认使用策略。</li><li>`"force"`：强制将核心使用率限制在 `"nvidia.com/gpucores"` 设定值以下。</li><li>`"disable"`：在任务运行期间忽略 `"nvidia.com/gpucores"` 设置的使用限制。</li></ul> | `"default"` |
| `CUDA_DISABLE_CONTROL` | 布尔值 | 若为 `"true"`，容器内将不会启用 HAMi-core，导致无资源隔离与限制（用于调试）。 | `false` |
