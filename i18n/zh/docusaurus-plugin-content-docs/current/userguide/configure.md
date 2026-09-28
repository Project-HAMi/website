---
title: 全局配置
sidebar_label: 配置
translated: true
---

通过 Helm values 设置设备共享参数、调度策略和节点配置。将需要保留的设置写入 `my-values.yaml`，并在安装或升级 HAMi 时传入该文件。

以下示例使用 `kube-system` 命名空间中的 `hami` release，请替换为实际安装使用的名称。手工编辑由 Helm 管理的 ConfigMap 可能被后续升级覆盖，只适合临时排查问题。

## 设备配置：ConfigMap

在 values 文件的 `devices.<vendor>` 下设置设备参数，例如 `devices.nvidia` 或 `devices.mthreads`。Helm 根据这些 values 生成 `hami-scheduler-device` ConfigMap 中的 `device-config.yaml`。

### 设置设备共享参数

以下示例允许每张 NVIDIA GPU 最多被 20 个任务共享。当工作负载未指定显存或算力请求时，默认请求 4096 MiB 显存和 50% 算力。示例还设置了 MThreads 显卡的显存大小：

```yaml
devices:
  nvidia:
    deviceSplitCount: 20
    defaultMemory: 4096
    defaultCores: 50
  mthreads:
    memoryPerCard: [96, 160]
```

通过 Helm 应用该文件：

```bash
helm upgrade --install hami hami-charts/hami \
  --namespace kube-system \
  --values my-values.yaml
```

将安装环境所需的设置保存在每次传给 Helm 的 values 文件中。未设置的字段使用 Chart 默认值；列表会替换整个默认列表。例如，设置 `devices.ascend.configs` 会替换完整的 Ascend 芯片列表。

`devices.mthreads.memoryPerCard` 是整数数组，默认值为 `[96]`。每个元素表示一种显卡型号的显存大小，单位为 512 MiB：`96` 表示 48 GiB，`160` 表示 80 GiB。只有一种型号时也应使用数组。

### 设置 MIG profile 白名单

将以下设置合入 `my-values.yaml` 中已有的 `devices.nvidia` 部分：

```yaml
devices:
  nvidia:
    migProfileAllowlist:
      - models: ["A100-SXM4-80GB"]
        profiles: ["1g.10gb", "2g.20gb"]
```

这会替换整个白名单。需要支持其他 GPU 型号时，也应写入对应条目。合并示例时，文件中只保留一个 `devices` 键和一个 `nvidia` 键。

完整字段和默认值见 [Chart 参数说明](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md)。也可以导出 Chart 的默认 values：

```bash
helm show values hami-charts/hami > chart-defaults.yaml
```

如果厂商使用 `devices.<vendor>.customresources`，应确保该列表与设备参数和芯片定义中的资源名称一致。

### 使用完整的设备配置文件

需要自行提供 `device-config.yaml` 时，将完整文件内容写入 `device-config.content`。这会替换整个文件，包括所有厂商的配置，不会与 `devices.*` 合并。修改个别参数时，使用 `devices.<vendor>`。

Chart 按以下顺序选择配置文件：

1. 非空的 `device-config.content`。
2. Chart 中的 `files/device-config.yaml`，如果存在。
3. 根据 `devices.*` values 生成的文件。

使用前两种来源时，修改 `devices.*` 不会改变设备配置文件。使用完整替换文件时，应将其与其他安装配置一起纳入版本控制。

Helm 升级改变设备配置时，scheduler 和 Chart 管理的 NVIDIA 设备插件会自动滚动更新。独立部署的设备插件按照各自的更新和重启流程处理。

## 节点配置：ConfigMap

通过节点配置，可以为指定节点设置 NVIDIA 设备参数。匹配节点的配置优先于对应的全局设备参数。`hami-device-plugin` ConfigMap 中的 `config.json` 保存这些设置。

可以将 JSON 保存在 Helm values 中，也可以引用自行管理的 ConfigMap。同时设置两者时，`devicePlugin.nodeConfiguration.externalConfigName` 优先于 `devicePlugin.nodeConfiguration.config`。都未设置时，使用 Chart 的默认节点配置。

### 将节点配置保存到 values

将以下内容加入 `my-values.yaml`：

```yaml
devicePlugin:
  nodeConfiguration:
    config: |
      {
        "nodeconfig": [
          {
            "name": "gpu-node-1",
            "operatingmode": "hami-core",
            "devicememoryscaling": 1,
            "devicesplitcount": 20,
            "filterdevices": {
              "uuid": [],
              "index": []
            }
          }
        ]
      }
```

将 `gpu-node-1` 替换为实际 Kubernetes 节点名称。JSON 字符串会替换完整的 `config.json`，因此需要包含所有节点条目。

通过 Helm 应用该文件。仅修改节点 JSON 不会自动触发滚动更新，需要重启 NVIDIA 设备插件以加载改动：

```bash
kubectl rollout restart daemonset/hami-device-plugin -n kube-system
kubectl rollout status daemonset/hami-device-plugin -n kube-system
```

### 使用自行管理的节点 ConfigMap

将完整 JSON 文档保存为 `node-config.json`，并在 HAMi 所在命名空间创建 ConfigMap：

```bash
kubectl create configmap hami-node-config \
  --namespace kube-system \
  --from-file=config.json=node-config.json
```

将其名称加入 `my-values.yaml`：

```yaml
devicePlugin:
  nodeConfiguration:
    externalConfigName: hami-node-config
```

Chart 会使用该 ConfigMap，并跳过创建自己的节点 ConfigMap。它的管理和备份独立于 Helm release。修改其中的内容后，使用前述命令重启 NVIDIA 设备插件。

### 节点配置字段

| JSON 字段             | 含义                           |
| --------------------- | ------------------------------ |
| `name`                | Kubernetes 节点名称。          |
| `operatingmode`       | `hami-core` 或 `mig`。         |
| `devicememoryscaling` | 设备显存超分配比例。           |
| `devicecorescaling`   | 设备算力超分配比例。           |
| `devicesplitcount`    | 同一设备允许共享的最大任务数。 |
| `filterdevices.uuid`  | 不注册到 HAMi 的设备 UUID。    |
| `filterdevices.index` | 不注册到 HAMi 的设备索引。     |

设备 UUID 或索引匹配过滤条目时，该设备不会注册到 HAMi。

## Chart 配置：参数

在同一份 values 文件中设置部署和调度器选项。也可以在 Helm 命令中使用 `--set` 覆盖字段。以下示例将 NVIDIA 显存超分配比例设为 5：

```bash
helm upgrade --install hami hami-charts/hami \
  --namespace kube-system \
  --values my-values.yaml \
  --set devices.nvidia.deviceMemoryScaling=5
```

需要保留的设置应写入 values 文件。常用 Chart 选项如下：

| 参数 | 类型 | 描述 | 默认值 |
| --- | --- | --- | --- |
| `scheduler.service.schedulerPort` | 整数 | 调度器 Webhook 服务的 NodePort。 | `31998` |
| `scheduler.defaultSchedulerPolicy.nodeSchedulerPolicy` | 字符串 | `binpack` 尽量将任务放到同一 GPU 节点；`spread` 将任务分散到不同 GPU 节点。 | `"binpack"` |
| `scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy` | 字符串 | `binpack` 尽量将任务放到同一 GPU；`spread` 将任务分散到不同 GPU；`mutex` 选择没有其他工作负载的 GPU。 | `"spread"` |
| `devicePlugin.deviceListStrategy` | 字符串 | 设备传递方式：`envvar`、`volume-mounts` 或 `cdi-annotations`。 | `"envvar"` |
| `devicePlugin.migStrategy` | 字符串 | NVIDIA 设备插件的 MIG 策略：`none` 或 `mixed`。 | `"none"` |
| `devicePlugin.disablecorelimit` | 字符串 | 是否关闭 NVIDIA 设备插件的算力限制。 | `"false"` |

`devices.nvidia.runtimeClassName` 设置 NVIDIA 设备插件 Pod 和 NVIDIA 工作负载 Pod 的 RuntimeClass。如果需要 Chart 创建该 RuntimeClass，将 `devices.nvidia.createRuntimeClass` 设为 `true`。Ascend 使用 `devices.ascend.runtimeClassName`，对应的 RuntimeClass 需单独创建。

## Pod 配置：注解

| 参数 | 类型 | 描述 | 示例 |
| --- | --- | --- | --- |
| `nvidia.com/use-gpuuuid` | 字符串 | 如果设置了此字段，则该 Pod 分配的设备**必须**是此字符串中定义的 GPU UUID 之一。 | `"GPU-AAA,GPU-BBB"` |
| `nvidia.com/nouse-gpuuuid` | 字符串 | 如果设置了此字段，则该 Pod 分配的设备**不能**是此字符串中定义的 GPU UUID。 | `"GPU-AAA,GPU-BBB"` |
| `nvidia.com/nouse-gputype` | 字符串 | 如果设置了此字段，则该 Pod 分配的设备**不能**是此字符串中定义的 GPU 类型。 | `"Tesla V100-PCIE-32GB, NVIDIA A10"` |
| `nvidia.com/use-gputype` | 字符串 | 如果设置了此字段，则该 Pod 分配的设备**必须**是此字符串中定义的 GPU 类型之一。 | `"Tesla V100-PCIE-32GB, NVIDIA A10"` |
| `hami.io/node-scheduler-policy` | 字符串 | GPU 节点调度策略：`"binpack"` 表示将 Pod 分配到已有负载的 GPU 节点上执行，`"spread"` 表示分配到不同的 GPU 节点上执行。 | `"binpack"` 或 `"spread"` |
| `hami.io/gpu-scheduler-policy` | 字符串 | GPU 卡调度策略：`"binpack"` 表示将 Pod 分配到同一块 GPU 卡上执行，`"spread"` 表示分配到不同的 GPU 卡上执行。 | `"binpack"` 或 `"spread"` |
| `hami.io/device-scoring-weights` | 字符串 | 物理设备评分中虚拟设备槽位、设备核心和设备显存利用率的相对权重。必须提供全部三个权重，值必须为非负整数，并且至少有一个权重大于零。 | `"slot=1,core=1,memory=3"` |
| `nvidia.com/vgpu-mode` | 字符串 | 指定该 Pod 希望使用的 vGPU 实例类型。 | `"hami-core"` 或 `"mig"` |

## 容器配置：环境变量

| 参数 | 类型 | 描述 | 默认值 |
| --- | --- | --- | --- |
| `GPU_CORE_UTILIZATION_POLICY` | 字符串 | 定义 GPU 算力使用策略：<ul><li>`"default"`：默认使用策略。</li><li>`"force"`：强制将算力使用率限制在 `"nvidia.com/gpucores"` 设定值以下。</li><li>`"disable"`：在任务运行期间忽略 `"nvidia.com/gpucores"` 设置的使用限制。</li></ul> | `"default"` |
| `CUDA_DISABLE_CONTROL` | 布尔值 | 若为 `"true"`，容器内将不会启用 HAMi-core，导致无资源隔离与限制（用于调试）。 | `false` |

## 升级已有安装

Helm 升级可能覆盖手工修改过的、由 Chart 管理的 ConfigMap。升级前，备份 values 和 ConfigMap，再将需要保留的设置写入 values 文件。

### 备份当前配置

导出 release 中用户传入的 values 和设备 ConfigMap：

```bash
helm get values hami -n kube-system -o yaml > previous-values.yaml
kubectl get configmap hami-scheduler-device -n kube-system -o yaml > device-config-backup.yaml
```

如果使用节点配置，也应备份对应的 ConfigMap。使用外部 ConfigMap 时，将 `hami-device-plugin` 替换为实际名称：

```bash
kubectl get configmap hami-device-plugin -n kube-system -o yaml > node-config-backup.yaml
```

### 更新 values 文件

根据备份的 values 准备 `my-values.yaml`，保留安装环境所需的设置，并按下表将旧设备字段移到当前路径。移动字段值后，删除旧字段。

Chart 会拒绝以下旧字段，即使字段值为 `0`、`false` 或空值：

| 旧 Helm 字段                             | 当前 Helm 字段                                |
| ---------------------------------------- | --------------------------------------------- |
| `resourceName`                           | `devices.nvidia.resourceCountName`            |
| `resourceMem`                            | `devices.nvidia.resourceMemoryName`           |
| `resourceMemPercentage`                  | `devices.nvidia.resourceMemoryPercentageName` |
| `resourceCores`                          | `devices.nvidia.resourceCoreName`             |
| `resourcePriority`                       | `devices.nvidia.resourcePriorityName`         |
| `mluResourceName`                        | `devices.cambricon.resourceCountName`         |
| `mluResourceMem`                         | `devices.cambricon.resourceMemoryName`        |
| `mluResourceCores`                       | `devices.cambricon.resourceCoreName`          |
| `hcuResourceName`                        | `devices.hygon.resourceCountName`             |
| `hcuResourceMem`                         | `devices.hygon.resourceMemoryName`            |
| `hcuResourceCores`                       | `devices.hygon.resourceCoreName`              |
| `metaxResourceName`                      | `devices.metax.resourceVCountName`            |
| `metaxResourceCore`                      | `devices.metax.resourceVCoreName`             |
| `metaxResourceMem`                       | `devices.metax.resourceVMemoryName`           |
| `metaxsGPUTopologyAware`                 | `devices.metax.sgpuTopologyAware`             |
| `enflameResourceNameDRSGCU`              | `devices.enflame.resourceNameDRSGCU`          |
| `enflameResourceNameGCUMemory`           | `devices.enflame.resourceNameGCUMemory`       |
| `enflameResourceNameGCUCore`             | `devices.enflame.resourceNameGCUCore`         |
| `kunlunResourceName`                     | `devices.kunlun.resourceCountName`            |
| `kunlunResourceVCountName`               | `devices.kunlun.resourceVCountName`           |
| `kunlunResourceVMemoryName`              | `devices.kunlun.resourceVMemoryName`          |
| `vastaiResourceName`                     | `devices.vastai.resourceCountName`            |
| `birenResourceName`                      | `devices.biren.resourceCountName`             |
| `devicePlugin.deviceSplitCount`          | `devices.nvidia.deviceSplitCount`             |
| `devicePlugin.deviceMemoryScaling`       | `devices.nvidia.deviceMemoryScaling`          |
| `devicePlugin.deviceCoreScaling`         | `devices.nvidia.deviceCoreScaling`            |
| `devicePlugin.preConfiguredDeviceMemory` | `devices.nvidia.preConfiguredDeviceMemory`    |
| `devicePlugin.enableNumaTopology`        | `devices.nvidia.enableNumaTopology`           |
| `devicePlugin.runtimeClassName`          | `devices.nvidia.runtimeClassName`             |
| `devicePlugin.createRuntimeClass`        | `devices.nvidia.createRuntimeClass`           |

其他设置，例如 `scheduler.overwriteEnv`、`devicePlugin.enabled`、镜像、`devicePlugin.deviceListStrategy`、`devicePlugin.migStrategy`、`devicePlugin.disablecorelimit` 和 `devicePlugin.nodeConfiguration`，保留原路径。

如果手工修改过 ConfigMap，只将需要保留的字段转入对应的 Helm values。节点设置可保存到 `devicePlugin.nodeConfiguration.config` 或自行管理的 ConfigMap。恢复整个旧 ConfigMap 可能覆盖新 Chart 的默认值。

### 应用配置

使用 Chart 默认值和安装环境所需的全部自定义设置升级：

```bash
helm upgrade hami hami-charts/hami \
  --namespace kube-system \
  --reset-values \
  --values my-values.yaml
```

`--reset-values` 会丢弃 release 之前保存的 values。需要保留的所有自定义设置，都应写入 `my-values.yaml` 或这次命令传入的其他 values 文件。迁移旧字段时，避免使用 `--reuse-values` 和 `--reset-then-reuse-values`，它们可能再次向新 Chart 传入旧字段。

升级后，检查 ConfigMap 和 Pod 的滚动更新状态。如果仅修改了节点配置，需要重启 NVIDIA 设备插件。

## 排查问题时编辑 ConfigMap

临时修改设备配置前，先备份再编辑 ConfigMap：

```bash
kubectl get configmap hami-scheduler-device -n kube-system -o yaml > device-config-backup.yaml
kubectl edit configmap hami-scheduler-device -n kube-system
```

重启 scheduler 和读取该配置的设备插件。以下命令适用于 Chart 管理的 NVIDIA 组件：

```bash
kubectl rollout restart deployment/hami-scheduler -n kube-system
kubectl rollout restart daemonset/hami-device-plugin -n kube-system
```

临时修改节点配置时，编辑节点 ConfigMap 后重启 NVIDIA 设备插件：

```bash
kubectl edit configmap hami-device-plugin -n kube-system
kubectl rollout restart daemonset/hami-device-plugin -n kube-system
```

使用外部 ConfigMap 时，替换为实际名称。手工编辑不会更新 Helm values。下次升级前，将需要保留的改动保存到 values 文件或自行管理的节点 ConfigMap 中。
