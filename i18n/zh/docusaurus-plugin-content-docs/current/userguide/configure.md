---
title: 配置
sidebar_label: 配置
---

本文说明 HAMi 的重点 Helm values，以及设备、节点和工作负载配置之间的关系。安装命令见[安装指南](../installation/online-installation.md)，备份与字段迁移见[升级指南](../installation/upgrade.md)。

## 查找参数 {#values-reference}

完整参数、类型、默认值和说明见 [Chart 参数参考](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values)，默认配置见 [values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml)。

以上链接指向开发分支。使用已发布 Chart 时，通过 `helm show values hami-charts/hami --version <chart-version>` 查看对应版本，并在文档站选择匹配的版本。Next 可能包含尚未发布的配置。

## 应用 values {#apply-values}

将安装所需的覆盖配置保存在 values 文件中，通过 Helm 的 `--values` 传入。安装时，省略的字段使用 Chart 默认值；映射与默认值合并，列表则完整替换对应列表。升级时是否沿用旧值取决于命令参数，按[升级流程](../installation/upgrade.md)操作。

| 配置范围 | Values | 用途 |
| --- | --- | --- |
| 镜像 | `global.imageRegistry`、`global.imagePullSecrets`、组件的 `image` 配置 | 设置仓库、凭据和镜像。组件标签优先于共享的 HAMi 标签；kube-scheduler 使用独立标签。各全局字段的生效组件见参数参考。 |
| 调度器 | `scheduler.defaultSchedulerPolicy`、`scheduler.replicas`、`scheduler.leaderElect` | 设置调度策略和可用性。多个副本需要启用 leader election。 |
| NVIDIA 运行时与节点 | `devices.nvidia.runtimeClassName`、`devicePlugin.nvidiaNodeSelector`、`devicePlugin.nvidiaDriverRoot` | 匹配安装时准备的运行时、节点标签和宿主机驱动布局。 |
| 设备共享 | `devices.<vendor>` | 设置资源名称、共享限制和厂商设备配置。 |
| NVIDIA 节点覆盖 | `devicePlugin.nodeConfiguration` | 设置节点参数或引用自行管理的 ConfigMap。 |
| 平台与安全 | `platform.openshift`、`openshift.securityContextConstraints`、`selinux` | 设置平台权限和宿主机目录标签。 |

驱动与运行时配置见[前置条件](../installation/prerequisites.md)和 [NVIDIA 驱动发现](../installation/online-installation.md#nvidia-driver-discovery)。性能分析和缓存清理见 [Chart 运维](./chart-operations.md)。

## 设备配置 {#device-configuration}

Chart 根据 `devices.<vendor>` 生成设备 ConfigMap 中的 `device-config.yaml`。使用默认 release 名称时，该 ConfigMap 为 `hami-scheduler-device`。`devices.ascend.configs` 输出为 `vnpus.configs`，`devices.iluvatar.configs` 输出为 `iluvatars`。

### NVIDIA

设置共享数量和默认资源请求：

```yaml
devices:
  nvidia:
    deviceSplitCount: 20
    defaultMemory: 4096
    defaultCores: 50
```

`deviceSplitCount` 控制每张物理 GPU 上报的虚拟设备数量。未请求绝对显存或显存百分比时，`defaultMemory` 提供默认显存分配量，单位为 MiB；`defaultCores` 提供默认算力百分比。`defaultMemory: 0` 在未请求显存时使用整张 GPU 的显存；`defaultCores: 0` 不限制默认算力使用。`deviceCoreScaling` 和 `deviceMemoryScaling` 支持小数，节点配置可以覆盖共享参数。

`migProfileAllowlist` 的每个条目包含 `models` 和 `profiles` 列表。以下示例完整替换默认列表，使用其他型号时也需要包含其条目：

```yaml
devices:
  nvidia:
    migProfileAllowlist:
      - models: ["A100-SXM4-80GB"]
        profiles: ["1g.10gb", "2g.20gb"]
```

### MIG 管理与资源限制传递

| 参数 | 默认值 | 使用场景 |
| --- | --- | --- |
| `devices.nvidia.adoptExistingMIGInstances` | `false` | 在 `mig` 模式下，允许 HAMi 在插件启动时接管没有自身创建记录的 MIG 实例，以便复用或销毁这些实例。仅在 HAMi 独立管理节点 MIG 布局时启用。为 `false` 时，这些实例保持不变。 |
| `devices.nvidia.limitDelivery` | `file` | 设置向 HAMi-core 传递限制的方式。`file` 同时设置环境变量并将限制文件只读挂载到 `/overrideEnv`；`env` 仅设置环境变量。此设置不适用于 `mig` 模式。 |

文件传递方式让通过 SSH、`su -`、`sudo` 或 cron 等方式启动、未继承容器原始环境变量的进程也能由 HAMi-core 读取限制。节点配置 `limitdelivery` 覆盖全局值，Pod 注解 `hami.io/limit-delivery` 的优先级高于两者。无效值被忽略，没有有效设置时使用 `file`。

### MThreads

同时使用 48 GiB 和 80 GiB 显存的显卡时，以 512 MiB 为单位列出两种容量：

```yaml
devices:
  mthreads:
    memoryPerCard: [96, 160]
```

### Ascend

`devices.ascend.hamiVnpuMode` 设置全局默认模式，在调度器配置中输出为 `vnpus.hamiVnpuMode`。为空时使用 `template`；若同时设置已弃用的 `devices.ascend.hamiVnpuCore: true`，则使用 `hami-core`。显式模式优先于旧开关。直接配置调度器时，`vnpus.hamiVnpuCore` 也遵循相同回退规则。不支持的模式会被拒绝。将原来的 `devices.ascend.enpu: true` 替换为 `devices.ascend.hamiVnpuMode: enpu`。

设备插件上报的 `hami-vnpu-core` 和 `hami.io/enpu` 节点注解分别通过 `"true"` 或 `"false"` 覆盖对应能力；没有注解时使用全局模式。ENPU 需要配套设备插件支持。混合集群可将全局模式设为 `template`，再通过单独部署的 Ascend 设备插件节点配置 `hamiVnpuMode: enpu` 只在目标节点启用。插件会发布 `hami.io/enpu` 注解；单独修改 Node 注解不会改变插件模式，且会被下一次上报覆盖。

Pod 使用 `huawei.com/vnpu-mode: enpu` 显式选择 ENPU。调度器也接受 `ubs-virt` 和 `vcann-rt`，与配套[设备插件的 `podUsesENPU`](https://github.com/maverick-woo/ascend-device-plugin/blob/5afdaec52dfd628a05066bfbbf0f39e2c47e3281/internal/server/server.go#L116-L125) 一致。新工作负载使用 `enpu`。三个名称使用相同的单 DIE 准入、精确显存分配和策略隔离规则。

Pod 上的 `huawei.com/enpu-policy` 覆盖 `devices.ascend.enpuPolicy`。准入时会将选定策略记录到 Pod，后续修改默认值不会改变已有租户的策略。无效策略会被拒绝。

`devices.ascend` 在`device-config.yaml` 中输出为 `vnpus`。其 `configs` 列表包含芯片定义和分区模板：

| 字段                 | 含义                                                            |
| -------------------- | --------------------------------------------------------------- |
| `chipName`           | 芯片型号标识。                                                  |
| `commonWord`         | 设备后端使用的设备标识。                                        |
| `resourceName`       | NPU 数量的 Kubernetes 资源名称。                                |
| `resourceMemoryName` | NPU 显存的 Kubernetes 资源名称。                                |
| `resourceCoreName`   | NPU 算力的 Kubernetes 资源名称。                                |
| `memoryAllocatable`  | 可分配显存，使用后端单位。                                      |
| `memoryCapacity`     | 物理显存容量，使用后端单位。                                    |
| `memoryFactor`       | 显存单位转换倍率。                                              |
| `aiCore`             | AI Core 容量。                                                  |
| `aiCPU`              | AI CPU 容量。                                                   |
| `superPod`           | 是否使用 super-pod 模式。                                       |
| `templates`          | 分区定义，包含 `name`、`memory`、`aiCore`，以及可选的 `aiCPU`。 |

完整默认列表见 [values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml)。将需要的列表复制到 values 文件中再修改。列表条目不会按型号或芯片名称合并。

### Iluvatar

`devices.iluvatar.configs` 是芯片定义列表，在 `device-config.yaml` 中输出为 `iluvatars`。每个条目使用以下字段：

| 字段                 | 含义                                 |
| -------------------- | ------------------------------------ |
| `chipName`           | 芯片型号标识。                       |
| `commonWord`         | 设备后端使用的设备标识。             |
| `resourceCountName`  | 虚拟设备数量的 Kubernetes 资源名称。 |
| `resourceMemoryName` | 设备显存的 Kubernetes 资源名称。     |
| `resourceCoreName`   | 设备算力的 Kubernetes 资源名称。     |

完整默认列表见 [values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml)。将需要的列表复制到 values 文件中再修改。列表条目不会按型号或芯片名称合并。

### 资源名称与其他厂商

Enflame、Kunlun、Vastai 和 Biren 的 scheduler extender 标准资源来自具名资源字段。其 `customresources` 仅包含额外资源，默认为 `[]`。启用厂商后，即使该列表为空，标准资源仍会包含在内；同一厂商内的重复名称会被去重。

其他通过 `customresources` 设置 extender 资源的厂商，在修改资源名称或芯片定义时，需要同步更新列表。厂商安装和示例见[设备指南](../installation/prerequisites.md#device-prerequisites)。启用调度支持不代表 Chart 会部署该厂商的设备插件。

### 完整替换设备配置 {#device-config-overrides}

Chart 按以下顺序选择首个可用配置源：

1. 非空的 `device-config.content`。
2. Chart 内置的 `files/device-config.yaml`。
3. 根据 `devices.<vendor>` 生成的配置。

`device-config.content` 替换所有厂商的完整配置，不与 `devices.*` 合并。仅修改个别字段时，优先使用对应 values。MIG allowlist、Ascend `configs` 和 Iluvatar `configs` 等列表均完整替换默认列表，不按型号或芯片名称合并。

## NVIDIA 节点配置 {#node-configuration}

NVIDIA 节点配置保存在 `hami-device-plugin` ConfigMap 的 `config.json` 中。匹配节点的设置覆盖对应的全局设备参数。通过 `devicePlugin.nodeConfiguration.config` 设置完整 JSON，或通过 `devicePlugin.nodeConfiguration.externalConfigName` 引用自行管理的 ConfigMap；后者优先。

| JSON 字段 | 含义 |
| --- | --- |
| `name` | Kubernetes 节点名称，或用于回退的 `"*"`。 |
| `operatingmode` | `hami-core`、`mig` 或 `remote`；`remote` 将节点作为 Lupine GPU 服务端。 |
| `devicememoryscaling` | 设备显存超分配比例。 |
| `devicecorescaling` | 设备算力超分配比例；`null` 保留全局值。 |
| `libcudaloglevel` | HAMi-core 日志级别；`null` 保留全局值。`0` 和 `1` 仅记录错误，`2` 增加警告和消息，`3` 增加 info，`4` 增加 debug。 |
| `reportnodecapacity` | 是否在 Node capacity 和 allocatable 中上报 GPU 显存与算力；`null` 沿用 `devicePlugin.reportNodeCapacity`。 |
| `limitdelivery` | 节点级 HAMi-core 限制传递方式，取值为 `file` 或 `env`。 |
| `devicesplitcount` | 同一设备允许共享的最大任务数。 |
| `filterdevices.uuid` | 不注册到 HAMi 的设备 UUID。 |
| `filterdevices.index` | 不注册到 HAMi 的设备索引。 |

`nodelabelselector` 支持 Kubernetes `matchLabels` 和 `matchExpressions`。每个条目只能设置 `name` 或 `nodelabelselector` 其中之一。

设备 UUID 或索引匹配过滤条目时，该设备不会注册到 HAMi。

以下是 `gpu-node-1` 的覆盖配置示例，并非完整的默认 JSON。替换为实际节点名称；值为 `null` 的字段保留全局设置。JSON 字符串会替换完整的 `config.json`，其中应包含所有需要的节点条目：

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
            "devicecorescaling": null,
            "libcudaloglevel": null,
            "reportnodecapacity": null,
            "devicesplitcount": 20,
            "filterdevices": {
              "uuid": [],
              "index": []
            }
          }
        ]
      }
```

引用已有的节点 ConfigMap 时，设置其名称。ConfigMap 必须位于 HAMi 所在命名空间，并包含 `config.json` 数据项：

```yaml
devicePlugin:
  nodeConfiguration:
    externalConfigName: hami-node-config
```

仅修改节点 JSON 不会自动触发设备插件滚动更新。加载新配置的重启方法见[重新加载配置](./chart-operations.md#configuration-reload)。

### 节点匹配规则

设备插件依次查找：

1. `name` 等于节点名称的条目。
2. 没有名称匹配时，所有 `nodelabelselector` 匹配节点标签的条目。
3. 没有标签匹配时，`name` 为 `"*"` 的条目。
4. 均不匹配时，使用全局设备配置。

同一级匹配多个条目时，按列表顺序应用；后面的条目覆盖其设置的字段。资源设置中的 `null`、`0` 和 `false` 不会覆盖前面条目的非零值或 `true`；空的 `operatingmode` 和 `filterdevices` 也会被忽略。

同时设置 `name` 与 `nodelabelselector`、两者均未设置、选择器为空或无效的条目会被忽略，并记录错误。`config.json` 加载失败时，例如字段类型错误，不应用任何条目并记录错误。

设备插件启动时读取节点标签。标签发生变化后需要重启设备插件。应选择节点注册时已有的标签，例如节点组或 kubelet `--node-labels` 设置的标签，避免依赖控制器在注册后添加的标签。

以下示例中，带有 `gpu.example.com/pool=mig` 标签的节点使用 MIG；型号标签为 `t4` 或 `l4` 的节点使用 `hami-core`，拆分数量为 `4`；其他节点使用拆分数量 `10`。同时匹配两个选择器时，后一个条目覆盖前一个条目的设置，结果为 `hami-core` 和拆分数量 `4`。将 JSON 写入设备插件 ConfigMap 的 `config.json`；通过 Helm 管理时，设置 `devicePlugin.nodeConfiguration.config`。

<!-- prettier-ignore -->
```json
{
  "nodeconfig": [
    {
      "nodelabelselector": {
        "matchLabels": {
          "gpu.example.com/pool": "mig"
        }
      },
      "operatingmode": "mig"
    },
    {
      "nodelabelselector": {
        "matchExpressions": [
          {
            "key": "gpu.example.com/model",
            "operator": "In",
            "values": [
              "t4",
              "l4"
            ]
          }
        ]
      },
      "operatingmode": "hami-core",
      "devicesplitcount": 4
    },
    {
      "name": "*",
      "devicesplitcount": 10
    }
  ]
}
```

## 调度策略 {#scheduling-policies}

设置全局调度策略：

```yaml
scheduler:
  defaultSchedulerPolicy:
    nodeSchedulerPolicy: binpack
    gpuSchedulerPolicy: spread
```

`binpack` 倾向集中分配，`spread` 倾向分散分配。GPU 策略还支持 `mutex`，选择没有其他工作负载的 GPU。下方 Pod 策略注解会覆盖这些默认值。

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
