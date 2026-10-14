---
title: 配置参数参考
sidebar_label: 配置
translated: true
---

本页列出 HAMi Helm values、NVIDIA 节点配置、Pod 注解和容器环境变量。参数表包含字段名称、类型、默认值及其作用。

在 values 文件中设置 Helm 参数。未设置的字段使用 Chart 默认值，列表替换完整的默认列表。`nil` 表示未设置，对应 YAML 中的 `null`。安装命令见[在线安装](../installation/online-installation.md)，配置备份和字段迁移见[升级 HAMi](../installation/upgrade.md)。

## 设备配置：ConfigMap

设备参数按厂商放在 `devices.<vendor>` 下。Chart 根据这些 values 生成 `hami-scheduler-device` ConfigMap 中的 `device-config.yaml`。

### NVIDIA

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `devices.nvidia.createRuntimeClass` | bool | `false` | 启用设备插件时，创建 `devices.nvidia.runtimeClassName` 指定的 NVIDIA RuntimeClass。 |
| `devices.nvidia.defaultCores` | int | `0` | 未指定算力请求时使用的 GPU 算力百分比；`0` 表示不限制算力使用。 |
| `devices.nvidia.defaultGPUNum` | int | `1` | Pod 请求 NVIDIA 显存或算力、但未指定 GPU 数量时，注入的 GPU 数量。 |
| `devices.nvidia.defaultMemory` | int | `0` | 未指定绝对显存或显存百分比时使用的显存量，单位为 MiB；`0` 表示使用整张 GPU 的显存。 |
| `devices.nvidia.deviceCoreScaling` | number | `1` | 上报 NVIDIA GPU 算力时使用的倍率；节点配置可覆盖该值。 |
| `devices.nvidia.deviceMemoryScaling` | number | `1` | 上报 NVIDIA GPU 显存时使用的倍率；节点配置可覆盖该值。 |
| `devices.nvidia.deviceSplitCount` | int | `10` | 每张物理 NVIDIA GPU 上报的最大虚拟设备数量；节点配置可覆盖该值。 |
| `devices.nvidia.enableNumaTopology` | bool | `false` | 向 kubelet 上报物理 GPU 的 NUMA 拓扑；启用后可能影响 TopologyManager 准入。 |
| `devices.nvidia.gpuCorePolicy` | string | `"default"` | HAMi-core GPU 算力使用策略：`default`、`force` 或 `disable`。 |
| `devices.nvidia.libCudaLogLevel` | int | `1` | HAMi-core CUDA 日志级别：`0` 为错误，`1` 为警告，`3` 为信息，`4` 为调试。 |
| `devices.nvidia.memoryFactor` | int | `1` | 设备后端转换显存请求时使用的显存单位倍率。 |
| `devices.nvidia.migProfileAllowlist` | list | 完整列表见 [values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml)。 | 按 GPU 型号设置允许使用的 MIG profile。每个条目包含 `models` 和 `profiles` 列表；设置该字段会替换完整的默认列表。 |
| `devices.nvidia.preConfiguredDeviceMemory` | int | `0` | 无法查询 GPU 显存时使用的显存量，单位为 MB；`0` 表示自动检测。节点配置可覆盖该值。 |
| `devices.nvidia.resourceCoreName` | string | `"nvidia.com/gpucores"` | 设备算力的 Kubernetes 扩展资源名称。 |
| `devices.nvidia.resourceCountName` | string | `"nvidia.com/gpu"` | 设备数量的 Kubernetes 扩展资源名称。 |
| `devices.nvidia.resourceMemoryName` | string | `"nvidia.com/gpumem"` | 设备显存的 Kubernetes 扩展资源名称。 |
| `devices.nvidia.resourceMemoryPercentageName` | string | `"nvidia.com/gpumem-percentage"` | NVIDIA 显存百分比请求的 Kubernetes 扩展资源名称。 |
| `devices.nvidia.resourcePriorityName` | string | `"nvidia.com/priority"` | NVIDIA 分配优先级的 Kubernetes 扩展资源名称。 |
| `devices.nvidia.runtimeClassName` | string | `""` | NVIDIA 设备插件 Pod 使用的 RuntimeClass，也会注入 NVIDIA 工作负载 Pod。 |

例如，设置每张 NVIDIA GPU 的共享数量、默认显存和算力：

```yaml
devices:
  nvidia:
    deviceSplitCount: 20
    defaultMemory: 4096
    defaultCores: 50
```

`deviceCoreScaling` 和 `deviceMemoryScaling` 支持小数。`defaultMemory` 的单位为 MiB，`defaultCores` 为百分比。

`migProfileAllowlist` 的每个条目包含 GPU 型号列表 `models` 和允许的 profile 列表 `profiles`。下面的示例替换整个默认白名单；需要支持其他型号时，也应加入对应条目。将其合入已有的 `devices.nvidia` 部分：

```yaml
devices:
  nvidia:
    migProfileAllowlist:
      - models: ["A100-SXM4-80GB"]
        profiles: ["1g.10gb", "2g.20gb"]
```

### Cambricon

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `devices.cambricon.resourceCoreName` | string | `"cambricon.com/mlu.smlu.vcore"` | 设备算力的 Kubernetes 扩展资源名称。 |
| `devices.cambricon.resourceCountName` | string | `"cambricon.com/vmlu"` | 设备数量的 Kubernetes 扩展资源名称。 |
| `devices.cambricon.resourceMemoryName` | string | `"cambricon.com/mlu.smlu.vmemory"` | 设备显存的 Kubernetes 扩展资源名称。 |

### Hygon

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `devices.hygon.memoryFactor` | int | `1` | 设备后端转换显存请求时使用的显存单位倍率。 |
| `devices.hygon.resourceCoreName` | string | `"hygon.com/hcucores"` | 设备算力的 Kubernetes 扩展资源名称。 |
| `devices.hygon.resourceCountName` | string | `"hygon.com/hcunum"` | 设备数量的 Kubernetes 扩展资源名称。 |
| `devices.hygon.resourceMemoryName` | string | `"hygon.com/hcumem"` | 设备显存的 Kubernetes 扩展资源名称。 |

### MetaX

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `devices.metax.resourceCountName` | string | `"metax-tech.com/gpu"` | 设备数量的 Kubernetes 扩展资源名称。 |
| `devices.metax.resourceVCoreName` | string | `"metax-tech.com/vcore"` | 虚拟设备算力的 Kubernetes 扩展资源名称。 |
| `devices.metax.resourceVCountName` | string | `"metax-tech.com/sgpu"` | 虚拟设备数量的 Kubernetes 扩展资源名称。 |
| `devices.metax.resourceVMemoryName` | string | `"metax-tech.com/vmemory"` | 虚拟设备显存的 Kubernetes 扩展资源名称。 |
| `devices.metax.sgpuTopologyAware` | bool | `false` | 启用 MetaX sGPU 拓扑感知分配。 |

### Enflame

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `devices.enflame.customresources` | list | `["enflame.com/drs-gcu","enflame.com/gcu-memory","enflame.com/gcu-core","enflame.com/gcu"]` | 该厂商转发给 scheduler extender 的资源名称；修改设备配置中的资源名称时，同步更新此列表。 |
| `devices.enflame.enabled` | bool | `true` | 是否启用此可选 Chart 功能。 |
| `devices.enflame.resourceNameDRSGCU` | string | `"enflame.com/drs-gcu"` | Enflame DRS GCU 数量的 Kubernetes 扩展资源名称。 |
| `devices.enflame.resourceNameGCU` | string | `"enflame.com/gcu"` | Enflame 物理 GCU 数量的 Kubernetes 扩展资源名称。 |
| `devices.enflame.resourceNameGCUCore` | string | `"enflame.com/gcu-core"` | Enflame GCU 算力的 Kubernetes 扩展资源名称。 |
| `devices.enflame.resourceNameGCUMemory` | string | `"enflame.com/gcu-memory"` | Enflame GCU 显存的 Kubernetes 扩展资源名称。 |

### MThreads

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `devices.mthreads.customresources` | list | `["mthreads.com/vgpu"]` | 该厂商转发给 scheduler extender 的资源名称；修改设备配置中的资源名称时，同步更新此列表。 |
| `devices.mthreads.enabled` | bool | `true` | 是否启用此功能。 |
| `devices.mthreads.memoryPerCard` | list | `[96]` | 每种 MThreads 显卡型号的显存整数数组，单位为 512 MiB；混合型号环境应列出所有型号。`96` 表示 48 GiB，`160` 表示 80 GiB。 |
| `devices.mthreads.resourceCoreName` | string | `"mthreads.com/sgpu-core"` | 设备算力的 Kubernetes 扩展资源名称。 |
| `devices.mthreads.resourceCountName` | string | `"mthreads.com/vgpu"` | 设备数量的 Kubernetes 扩展资源名称。 |
| `devices.mthreads.resourceMemoryName` | string | `"mthreads.com/sgpu-memory"` | 设备显存的 Kubernetes 扩展资源名称。 |

对于同时使用 48 GiB 和 80 GiB 显存的 MThreads 显卡，按 512 MiB 为单位列出两种显存大小：

```yaml
devices:
  mthreads:
    memoryPerCard: [96, 160]
```

### Kunlunxin

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `devices.kunlun.customresources` | list | `["kunlunxin.com/xpu","kunlunxin.com/vxpu","kunlunxin.com/vxpu-memory"]` | 该厂商转发给 scheduler extender 的资源名称；修改设备配置中的资源名称时，同步更新此列表。 |
| `devices.kunlun.enabled` | bool | `true` | 是否启用此功能。 |
| `devices.kunlun.resourceCountName` | string | `"kunlunxin.com/xpu"` | 设备数量的 Kubernetes 扩展资源名称。 |
| `devices.kunlun.resourceVCountName` | string | `"kunlunxin.com/vxpu"` | 虚拟设备数量的 Kubernetes 扩展资源名称。 |
| `devices.kunlun.resourceVMemoryName` | string | `"kunlunxin.com/vxpu-memory"` | 虚拟设备显存的 Kubernetes 扩展资源名称。 |

### AWS Neuron

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `devices.awsneuron.customresources` | list | `["aws.amazon.com/neuron","aws.amazon.com/neuroncore"]` | 该厂商转发给 scheduler extender 的资源名称；修改设备配置中的资源名称时，同步更新此列表。 |
| `devices.awsneuron.resourceCoreName` | string | `"aws.amazon.com/neuroncore"` | 设备算力的 Kubernetes 扩展资源名称。 |
| `devices.awsneuron.resourceCountName` | string | `"aws.amazon.com/neuron"` | 设备数量的 Kubernetes 扩展资源名称。 |

### AMD

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `devices.amd.customresources` | list | `["amd.com/gpu","amd.com/gpumem","amd.com/gpucores"]` | 该厂商转发给 scheduler extender 的资源名称；修改设备配置中的资源名称时，同步更新此列表。 |
| `devices.amd.resourceCoreName` | string | `"amd.com/gpucores"` | 设备算力的 Kubernetes 扩展资源名称。 |
| `devices.amd.resourceCountName` | string | `"amd.com/gpu"` | 设备数量的 Kubernetes 扩展资源名称。 |
| `devices.amd.resourceMemoryName` | string | `"amd.com/gpumem"` | 设备显存的 Kubernetes 扩展资源名称。 |

### Vastai

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `devices.vastai.customresources` | list | `["vastaitech.com/va"]` | 该厂商转发给 scheduler extender 的资源名称；修改设备配置中的资源名称时，同步更新此列表。 |
| `devices.vastai.enabled` | bool | `true` | 是否启用此可选 Chart 功能。 |
| `devices.vastai.resourceCountName` | string | `"vastaitech.com/va"` | 设备数量的 Kubernetes 扩展资源名称。 |

### Biren

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `devices.biren.customresources` | list | `["birentech.com/gpu"]` | 该厂商转发给 scheduler extender 的资源名称；修改设备配置中的资源名称时，同步更新此列表。 |
| `devices.biren.enabled` | bool | `true` | 是否启用此可选 Chart 功能。 |
| `devices.biren.resourceCountName` | string | `"birentech.com/gpu"` | 设备数量的 Kubernetes 扩展资源名称。 |

### Ascend

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `devices.ascend.configs` | list | 完整列表见 [values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml)。 | Ascend 芯片配置和分区模板；设置该字段会替换完整的默认芯片列表。 |
| `devices.ascend.customresources` | list | `["huawei.com/Ascend910A","huawei.com/Ascend910A-memory","huawei.com/Ascend910A-core","huawei.com/Ascend910B2","huawei.com/Ascend910B2-memory","huawei.com/Ascend910B2-core","huawei.com/Ascend910B3","huawei.com/Ascend910B3-memory","huawei.com/Ascend910B3-core","huawei.com/Ascend910B4","huawei.com/Ascend910B4-memory","huawei.com/Ascend910B4-core","huawei.com/Ascend910B4-1","huawei.com/Ascend910B4-1-memory","huawei.com/Ascend910B4-1-core","huawei.com/Ascend310P","huawei.com/Ascend310P-memory","huawei.com/Ascend310P-core","huawei.com/Ascend910C","huawei.com/Ascend910C-memory","huawei.com/Ascend910C-core"]` | 该厂商转发给 scheduler extender 的资源名称；修改设备配置中的资源名称时，同步更新此列表。 |
| `devices.ascend.enabled` | bool | `false` | 在 scheduler 及其 extender 资源列表中启用 Ascend。 |
| `devices.ascend.extraArgs` | list | `[]` | Ascend 设备插件的启动参数；当前 Chart 模板未使用此字段。 |
| `devices.ascend.hamiVnpuCore` | bool | `false` | 全局启用 `hami-vnpu-core` 软分区；节点注解优先。 |
| `devices.ascend.image` | string | `""` | 当前 Chart 未使用此字段；Ascend 设备插件需单独部署。 |
| `devices.ascend.imagePullPolicy` | string | `"IfNotPresent"` | Ascend 设备插件的镜像拉取策略；当前 Chart 模板未使用此字段。 |
| `devices.ascend.nodeSelector.ascend` | string | `"on"` | Ascend 设备插件 node selector 的标签值；当前 Chart 模板未使用此字段。 |
| `devices.ascend.runtimeClassName` | string | `""` | 注入 Ascend 工作负载 Pod 的 RuntimeClass。 |
| `devices.ascend.tolerations` | list | `[]` | Ascend 设备插件的 tolerations；当前 Chart 模板未使用此字段。 |

`devices.ascend` 在 `device-config.yaml` 中输出为 `vnpus`。其 `configs` 列表包含芯片定义和分区模板：

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

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `devices.iluvatar.configs` | list | 完整列表见 [values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml)。 | Iluvatar 芯片配置，包含 `chipName`、`commonWord` 和资源名称；设置该字段会替换完整的默认芯片列表。 |
| `devices.iluvatar.customresources` | list | `["iluvatar.ai/BI-V100-vgpu","iluvatar.ai/BI-V100.vCore","iluvatar.ai/BI-V100.vMem","iluvatar.ai/BI-V150-vgpu","iluvatar.ai/BI-V150.vCore","iluvatar.ai/BI-V150.vMem","iluvatar.ai/MR-V100-vgpu","iluvatar.ai/MR-V100.vCore","iluvatar.ai/MR-V100.vMem","iluvatar.ai/MR-V50-vgpu","iluvatar.ai/MR-V50.vCore","iluvatar.ai/MR-V50.vMem"]` | 该厂商转发给 scheduler extender 的资源名称；修改设备配置中的资源名称时，同步更新此列表。 |
| `devices.iluvatar.enabled` | bool | `false` | 在 scheduler 及其 extender 资源列表中启用 Iluvatar。 |

`devices.iluvatar.configs` 是芯片定义列表，在 `device-config.yaml` 中输出为 `iluvatars`。每个条目使用以下字段：

| 字段                 | 含义                                 |
| -------------------- | ------------------------------------ |
| `chipName`           | 芯片型号标识。                       |
| `commonWord`         | 设备后端使用的设备标识。             |
| `resourceCountName`  | 虚拟设备数量的 Kubernetes 资源名称。 |
| `resourceMemoryName` | 设备显存的 Kubernetes 资源名称。     |
| `resourceCoreName`   | 设备算力的 Kubernetes 资源名称。     |

完整默认列表见 [values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml)。将需要的列表复制到 values 文件中再修改。列表条目不会按型号或芯片名称合并。

### Remote GPU

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `devices.remotegpu.defaultPort` | int | `14833` | 服务器节点标签未指定端口时使用的 Lupine 端口；Chart 管理的服务器也使用此端口。 |
| `devices.remotegpu.enabled` | bool | `false` | 启用由 Lupine 提供的 Remote GPU 资源调度。 |
| `devices.remotegpu.libImage` | string | `nil` | 为 Remote GPU 客户端提供 HAMi-core 的镜像。`null` 使用设备插件镜像；空字符串禁用客户端资源限制。 |
| `devices.remotegpu.resourceCountName` | string | `"nvidia.com/remote-gpu"` | 设备数量的 Kubernetes 扩展资源名称。 |
| `devices.remotegpu.resourceMemoryName` | string | `"nvidia.com/remote-gpu-memory"` | 设备显存的 Kubernetes 扩展资源名称。 |
| `devices.remotegpu.server.enabled` | bool | `true` | 在带有空值 `hami.io/lupine-server` 标签的节点上运行 Lupine 服务器。 |
| `devices.remotegpu.server.image.pullPolicy` | string | `"IfNotPresent"` | Kubernetes 容器镜像拉取策略。 |
| `devices.remotegpu.server.image.registry` | string | `"ghcr.io"` | 容器镜像仓库地址；设置了 `global.imageRegistry` 时优先使用全局地址。 |
| `devices.remotegpu.server.image.repository` | string | `"lupinemachines/lupine-server"` | 容器镜像仓库名称。 |
| `devices.remotegpu.server.image.tag` | string | `"cuda-13.3.1-ubuntu24.04"` | 容器镜像标签。 |
| `devices.remotegpu.server.resources` | object | `{}` | 容器的 Kubernetes CPU 和内存 requests、limits。 |
| `devices.remotegpu.server.runtimeClassName` | string | `""` | 为 Chart 管理的 Lupine 服务器选择 NVIDIA 容器运行时的 RuntimeClass。 |
| `devices.remotegpu.server.tolerations` | list | `[]` | 用于容忍节点 taint 的 Kubernetes Pod tolerations。 |
| `devices.remotegpu.sessionImage` | string | `""` | 服务器会话 relay Pod 的镜像；空值禁用会话 relay。镜像必须提供 `socat`。 |

### 完整设备配置文件

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `device-config.content` | string | `""` | 完整替换 `device-config.yaml`，优先于 Chart 内的 `files/device-config.yaml` 和 values 生成的配置。非空内容不会与结构化默认值合并。 |

`device-config.content` 替换所有厂商的配置。仅修改个别字段时，使用上方的 `devices.<vendor>` 参数。Chart 存在 `files/device-config.yaml` 时，优先使用该文件而非 values 生成的设备配置。

## 节点配置：ConfigMap

NVIDIA 节点配置保存在 `hami-device-plugin` ConfigMap 的 `config.json` 中。匹配节点的设置覆盖对应的全局设备参数。通过 `devicePlugin.nodeConfiguration.config` 设置完整 JSON，或通过 `devicePlugin.nodeConfiguration.externalConfigName` 引用自行管理的 ConfigMap；后者优先。

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

以下 values 为 `gpu-node-1` 设置设备参数。替换为实际节点名称；JSON 字符串会替换完整的 `config.json`，其中应包含所有需要的节点条目：

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

引用已有的节点 ConfigMap 时，设置其名称。ConfigMap 必须位于 HAMi 所在命名空间，并包含 `config.json` 数据项：

```yaml
devicePlugin:
  nodeConfiguration:
    externalConfigName: hami-node-config
```

仅修改节点 JSON 不会自动触发设备插件滚动更新。加载新配置的重启方法见[升级 HAMi](../installation/upgrade.md#configmap-changes)。

## Chart 配置：参数

### 全局设置

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `fullnameOverride` | string | `""` | 覆盖完整的 release 资源名称前缀。 |
| `global.annotations` | object | `{}` | Chart 管理的资源的附加注解。 |
| `global.gpuHookPath` | string | `"/usr/local"` | HAMi 安装 vGPU hook 文件的宿主机父目录。 |
| `global.imagePullSecrets` | list | `[]` | 全局 Docker 镜像拉取 Secret。 |
| `global.imageRegistry` | string | `""` | 覆盖组件镜像定义中的 registry。 |
| `global.imageTag` | string | `"v2.10.0"` | 组件镜像标签为空时使用的 HAMi 镜像标签。 |
| `global.labels` | object | `{}` | Chart 管理的资源的附加标签。 |
| `global.managedNodeSelector.usage` | string | `"gpu"` | 启用受管理的 node selector 时，注入的 `usage` 节点标签值。 |
| `global.managedNodeSelectorEnable` | bool | `false` | 将 `global.managedNodeSelector` 注入 admission webhook 处理的 Pod。 |
| `nameOverride` | string | `""` | 覆盖资源名称和标签中使用的 Chart 名称。 |
| `namespaceOverride` | string | `""` | 覆盖 Chart 管理的命名空间级资源所使用的命名空间。 |

### 调度器

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `scheduler.admissionWebhook.customURL.enabled` | bool | `false` | 是否启用自定义 URL。 |
| `scheduler.admissionWebhook.customURL.host` | string | `"127.0.0.1"` | 自定义 URL 的主机。 |
| `scheduler.admissionWebhook.customURL.path` | string | `"/webhook"` | 自定义 URL 的路径。 |
| `scheduler.admissionWebhook.customURL.port` | int | `31998` | 自定义 URL 的端口。 |
| `scheduler.admissionWebhook.enabled` | bool | `true` | 是否启用 admission webhook。 |
| `scheduler.admissionWebhook.failurePolicy` | string | `"Ignore"` | Webhook 调用失败时使用的 Kubernetes admission webhook 策略。 |
| `scheduler.admissionWebhook.manageNamespaceSelector` | bool | `true` | Chart 是否生成并管理 webhook 的 `namespaceSelector` 字段。 |
| `scheduler.admissionWebhook.namespaceSelector.matchExpressions` | list | `[]` | 用于匹配 webhook 的命名空间标签表达式，追加到 Chart 排除规则之后。 |
| `scheduler.admissionWebhook.namespaceSelector.matchLabels` | object | `nil` | 启用 `manageNamespaceSelector` 时，匹配 webhook 所需的命名空间标签。 |
| `scheduler.admissionWebhook.objectSelector.matchExpressions` | list | `[]` | 用于匹配 webhook 的 Pod 标签表达式，追加到 Chart 排除规则之后。 |
| `scheduler.admissionWebhook.reinvocationPolicy` | string | `"Never"` | Kubernetes admission webhook 再次调用策略。 |
| `scheduler.admissionWebhook.whitelistNamespaces` | list | `nil` | 不匹配 HAMi admission webhook 的命名空间名称。 |
| `scheduler.certManager.enabled` | bool | `false` | 是否使用 cert-manager 生成自签名证书。 |
| `scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy` | string | `"spread"` | GPU 调度策略。 `binpack` 尽量将任务放到同一 GPU，`spread` 将任务分散到不同 GPU，`mutex` 选择没有其他工作负载的 GPU。 |
| `scheduler.defaultSchedulerPolicy.nodeSchedulerPolicy` | string | `"binpack"` | 节点调度策略。 `binpack` 尽量将任务放到同一 GPU 节点，`spread` 将任务分散到不同 GPU 节点。 |
| `scheduler.extender.extraArgs` | list | `["--debug","-v=4"]` | Scheduler extender 的附加启动参数。 |
| `scheduler.extender.image.pullPolicy` | string | `"IfNotPresent"` | Kubernetes 容器镜像拉取策略。 |
| `scheduler.extender.image.pullSecrets` | list | `[]` | 用于组件镜像的已有 image-pull Secret 名称。 |
| `scheduler.extender.image.registry` | string | `"docker.io"` | 容器镜像仓库地址；设置了 `global.imageRegistry` 时优先使用全局地址。 |
| `scheduler.extender.image.repository` | string | `"projecthami/hami"` | 容器镜像仓库名称。 |
| `scheduler.extender.image.tag` | string | `""` | 容器镜像标签；空值使用 `global.imageTag`。 |
| `scheduler.extender.resources` | object | `{}` | 容器的 Kubernetes CPU 和内存 requests、limits。 |
| `scheduler.extenderHTTPTimeout` | int | `30` | 生成的 scheduler 配置中，HAMi extender 的 `httpTimeout`，单位为秒。适用于 Kubernetes 1.22 及以上的 KubeSchedulerConfiguration 和较早版本的 Policy 格式。应大于 `scheduler.nodeLockRetryTimeout`。 |
| `scheduler.extenderPort` | int | `9444` | Scheduler Pod 内 extender filter 和 bind endpoint 使用的回环端口。 |
| `scheduler.forceOverwriteDefaultScheduler` | bool | `true` | 将匹配 Pod 的默认 Kubernetes scheduler 名称替换为 `schedulerName`。 |
| `scheduler.kubeBurst` | string | `""` | 访问 kube-apiserver 的客户端 burst；空值保留程序默认值 `10`。 |
| `scheduler.kubeQPS` | string | `""` | 访问 kube-apiserver 的客户端 QPS；空值保留程序默认值 `5`。 |
| `scheduler.kubeScheduler.enabled` | bool | `true` | 是否在 scheduler Pod 内运行 kube-scheduler 容器。 |
| `scheduler.kubeScheduler.extraArgs` | list | `["--policy-config-file=/config/config.json","-v=4"]` | Kubernetes 1.22 之前的旧版 Policy 配置使用的 kube-scheduler 参数。 |
| `scheduler.kubeScheduler.extraNewArgs` | list | `["--config=/config/config.yaml","-v=4"]` | Kubernetes 1.22 及以上版本使用的 kube-scheduler 参数。 |
| `scheduler.kubeScheduler.image.pullPolicy` | string | `"IfNotPresent"` | Kubernetes 容器镜像拉取策略。 |
| `scheduler.kubeScheduler.image.pullSecrets` | list | `[]` | 用于组件镜像的已有 image-pull Secret 名称。 |
| `scheduler.kubeScheduler.image.registry` | string | `"registry.cn-hangzhou.aliyuncs.com"` | 容器镜像仓库地址；设置了 `global.imageRegistry` 时优先使用全局地址。 |
| `scheduler.kubeScheduler.image.repository` | string | `"google_containers/kube-scheduler"` | 容器镜像仓库名称。 |
| `scheduler.kubeScheduler.image.tag` | string | `""` | Kube-scheduler 镜像标签；空值根据目标 Kubernetes 版本确定标签。 |
| `scheduler.kubeScheduler.resources` | object | `{}` | 容器的 Kubernetes CPU 和内存 requests、limits。 |
| `scheduler.kubeTimeout` | string | `""` | 访问 kube-apiserver 的超时，单位为秒；空值保留程序默认值，`0` 表示无超时。 |
| `scheduler.leaderElect` | bool | `true` | 启用 scheduler leader election。 |
| `scheduler.livenessProbe` | bool | `false` | 启用 scheduler liveness probe。 |
| `scheduler.metricsBindAddress` | string | `":9395"` | Scheduler Prometheus 指标的监听地址。 |
| `scheduler.networkPolicy.enabled` | bool | `false` | 将 scheduler HTTP 入站流量限制到指定的设备插件和 kube-system 来源。启用前，验证 CNI 对使用 hostNetwork 的 API-server 流量的处理方式。 |
| `scheduler.nodeLockExpire` | string | `"5m"` | 失效的节点分配锁可以被回收前的等待时间。 |
| `scheduler.nodeLockRetryTimeout` | string | `""` | Bind 重试获取节点分配锁的最长时间。空值保留程序默认值 `28s`；`0` 禁用重试。 |
| `scheduler.nodeName` | string | `""` | 将 scheduler Pod 绑定到此节点；空值由 Kubernetes 选择节点。 |
| `scheduler.overwriteEnv` | string | `"false"` | 向未请求对应设备资源的容器注入 `NVIDIA_VISIBLE_DEVICES=none` 或空的 `ASCEND_VISIBLE_DEVICES`。Pod 和容器注解可覆盖此默认行为。 |
| `scheduler.patch.enabled` | bool | `true` | 是否使用 kube-webhook-certgen 生成自签名证书。 |
| `scheduler.patch.image.pullPolicy` | string | `"IfNotPresent"` | Kubernetes 容器镜像拉取策略。 |
| `scheduler.patch.image.pullSecrets` | list | `[]` | 用于组件镜像的已有 image-pull Secret 名称。 |
| `scheduler.patch.image.registry` | string | `"docker.io"` | 容器镜像仓库地址；设置了 `global.imageRegistry` 时优先使用全局地址。 |
| `scheduler.patch.image.repository` | string | `"jettech/kube-webhook-certgen"` | 容器镜像仓库名称。 |
| `scheduler.patch.image.tag` | string | `"v1.5.2"` | 容器镜像标签。 |
| `scheduler.patch.imageNew.pullPolicy` | string | `"IfNotPresent"` | Kubernetes 容器镜像拉取策略。 |
| `scheduler.patch.imageNew.pullSecrets` | list | `[]` | 用于组件镜像的已有 image-pull Secret 名称。 |
| `scheduler.patch.imageNew.registry` | string | `"docker.io"` | 容器镜像仓库地址；设置了 `global.imageRegistry` 时优先使用全局地址。 |
| `scheduler.patch.imageNew.repository` | string | `"liangjw/kube-webhook-certgen"` | 容器镜像仓库名称。 |
| `scheduler.patch.imageNew.tag` | string | `"v1.1.1"` | 容器镜像标签。 |
| `scheduler.patch.nodeSelector` | object | `{}` | Kubernetes Pod 调度所需的节点标签。 |
| `scheduler.patch.podAnnotations` | object | `{}` | Pod 模板的附加注解。 |
| `scheduler.patch.priorityClassName` | string | `""` | 创建和更新 admission 证书的 Job 所使用的 PriorityClass。 |
| `scheduler.patch.runAsUser` | int | `2000` | 创建和更新 admission 证书的 Job 所使用的用户 ID。 |
| `scheduler.patch.tolerations` | list | `[]` | 用于容忍节点 taint 的 Kubernetes Pod tolerations。 |
| `scheduler.podAnnotations` | object | `{}` | Pod 模板的附加注解。 |
| `scheduler.podDisruptionBudget.minAvailable` | int | `1` | 主动中断期间可用 scheduler Pod 的最小数量；仅在 `scheduler.leaderElect=true` 且 `scheduler.replicas` 大于 `1` 时生成。 |
| `scheduler.replicas` | int | `1` | 启用 leader election 时的 scheduler 副本数；未启用时使用一个副本。 |
| `scheduler.service.annotations` | object | `{}` | 附加 Kubernetes 注解。 |
| `scheduler.service.httpPort` | int | `443` | HTTP 端口。 |
| `scheduler.service.httpTargetPort` | int | `9443` | 处理 webhook 和 NUMA refit HTTP 请求的 scheduler 容器端口。 |
| `scheduler.service.labels` | object | `{}` | 附加 Kubernetes 标签。 |
| `scheduler.service.monitorPort` | int | `31993` | Monitor 端口。 |
| `scheduler.service.monitorTargetPort` | string | `"metrics"` | Monitor 目标端口。 |
| `scheduler.service.schedulerPort` | int | `31998` | Scheduler NodePort。 |
| `scheduler.service.type` | string | `"ClusterIP"` | Service 类型。 |
| `scheduler.tolerations` | list | `[]` | 用于容忍节点 taint 的 Kubernetes Pod tolerations。 |
| `schedulerName` | string | `"hami-scheduler"` | 分配给 HAMi 处理的 Pod 的 scheduler 名称。 |

### NVIDIA 设备插件

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `devicePlugin.deviceListStrategy` | string | `"envvar"` | 通过 `DEVICE_LIST_STRATEGY` 传入的 NVIDIA 设备传递方式。 可选值为 `envvar`、`volume-mounts` 和 `cdi-annotations`。 |
| `devicePlugin.disablecorelimit` | string | `"false"` | 传给 NVIDIA 设备插件 `disable-core-limit` 参数的值。 `"true"` 关闭算力限制，`"false"` 启用算力限制。 |
| `devicePlugin.enabled` | bool | `true` | 部署 NVIDIA 设备插件 DaemonSet 及其配套资源。 |
| `devicePlugin.extraArgs` | list | `["-v=4"]` | 设备插件的附加启动参数。 |
| `devicePlugin.extraEnvs` | object | `{}` | 设备插件的附加环境变量。 |
| `devicePlugin.gdrcopyEnabled` | bool | `nil` | 设置 `GDRCOPY_ENABLED`；`null` 表示不设置该环境变量。 |
| `devicePlugin.gdsEnabled` | bool | `nil` | 设置 `GDS_ENABLED`；`null` 表示不设置该环境变量。 |
| `devicePlugin.gpuOperatorToolkitReady.enabled` | bool | `false` | 启动设备插件前，等待 GPU Operator 的 Toolkit 就绪标记。 |
| `devicePlugin.gpuOperatorToolkitReady.hostPath` | string | `"/run/nvidia/validations"` | 包含 GPU Operator Toolkit 就绪标记的宿主机目录。 |
| `devicePlugin.gpuOperatorToolkitReady.securityContext.privileged` | bool | `true` | 以 Kubernetes 特权安全上下文运行容器。 |
| `devicePlugin.gpuOperatorToolkitReady.securityContext.runAsUser` | int | `0` | 容器进程的用户 ID。 |
| `devicePlugin.hostNetwork` | bool | `false` | NVIDIA 设备插件 Pod 使用宿主机网络。 |
| `devicePlugin.hostPID` | bool | `true` | NVIDIA 设备插件 Pod 共享宿主机 PID 命名空间。 |
| `devicePlugin.hostPIDBroker.enabled` | bool | `false` | 允许 HAMi-core 通过设备插件获取宿主机进程 ID；需要启用 `hostPID`。 |
| `devicePlugin.image.pullPolicy` | string | `"IfNotPresent"` | Kubernetes 容器镜像拉取策略。 |
| `devicePlugin.image.pullSecrets` | list | `[]` | 用于组件镜像的已有 image-pull Secret 名称。 |
| `devicePlugin.image.registry` | string | `"docker.io"` | 容器镜像仓库地址；设置了 `global.imageRegistry` 时优先使用全局地址。 |
| `devicePlugin.image.repository` | string | `"projecthami/hami"` | 容器镜像仓库名称。 |
| `devicePlugin.image.tag` | string | `""` | 容器镜像标签；空值使用 `global.imageTag`。 |
| `devicePlugin.libPath` | string | `"/usr/local/vgpu"` | NVIDIA 设备插件挂载的宿主机库文件目录。 |
| `devicePlugin.migStrategy` | string | `"none"` | NVIDIA 设备插件的 MIG 策略：`none` 或 `mixed`。 |
| `devicePlugin.mofedEnabled` | bool | `nil` | 设置 `MOFED_ENABLED`；`null` 表示不设置该环境变量。 |
| `devicePlugin.monitor.ctrPath` | string | `"/usr/local/vgpu/containers"` | vGPU monitor 读取 HAMi 容器分配记录的宿主机路径。 |
| `devicePlugin.monitor.extraArgs` | list | `["-v=4"]` | Monitor 的附加启动参数。 |
| `devicePlugin.monitor.extraEnvs` | object | `{}` | Monitor 的附加环境变量。 |
| `devicePlugin.monitor.image.pullPolicy` | string | `"IfNotPresent"` | Kubernetes 容器镜像拉取策略。 |
| `devicePlugin.monitor.image.pullSecrets` | list | `[]` | 用于组件镜像的已有 image-pull Secret 名称。 |
| `devicePlugin.monitor.image.registry` | string | `"docker.io"` | 容器镜像仓库地址；设置了 `global.imageRegistry` 时优先使用全局地址。 |
| `devicePlugin.monitor.image.repository` | string | `"projecthami/hami"` | 容器镜像仓库名称。 |
| `devicePlugin.monitor.image.tag` | string | `""` | 容器镜像标签；空值使用 `global.imageTag`。 |
| `devicePlugin.monitor.resources` | object | `{}` | 容器的 Kubernetes CPU 和内存 requests、limits。 |
| `devicePlugin.monitor.resyncInterval` | string | `"5m"` | vGPU monitor 重新同步容器分配记录的间隔。 |
| `devicePlugin.monitor.securityContext.allowPrivilegeEscalation` | bool | `false` | 允许容器进程获得额外权限。 |
| `devicePlugin.monitor.securityContext.capabilities.add` | list | `["SYS_ADMIN"]` | 为容器添加的 Linux capabilities。 |
| `devicePlugin.monitor.securityContext.capabilities.drop` | list | `["ALL"]` | 从容器移除的 Linux capabilities。 |
| `devicePlugin.nodeConfiguration.config` | string | `"{\n  \"nodeconfig\": [\n    {\n      \"name\": \"your-node-name\",\n      \"operatingmode\": \"hami-core\",\n      \"devicememoryscaling\": 1,\n      \"devicesplitcount\": 10,\n      \"preconfigureddevicememory\": 0,\n      \"enablenumatopology\": false,\n      \"migstrategy\": \"none\",\n      \"filterdevices\": {\n        \"uuid\": [],\n        \"index\": []\n      },\n      \"enablegetpreferredallocation\": false\n    }\n  ]\n}\n"` | 完整的 JSON 节点配置。`externalConfigName` 优先；节点设置覆盖对应的全局设备配置。 |
| `devicePlugin.nodeConfiguration.externalConfigName` | string | `""` | 已有的节点配置 ConfigMap。设置后，Chart 使用该 ConfigMap，不再创建自己的节点 ConfigMap。 |
| `devicePlugin.numaRefit.caFile` | string | `""` | 用于验证 scheduler refit TLS 的、已挂载的 CA 证书包路径。 |
| `devicePlugin.numaRefit.caSecret` | string | `""` | 包含 `ca.crt` 的 Secret；`caFile` 为空时挂载该 Secret，用于验证 refit TLS。 |
| `devicePlugin.numaRefit.enabled` | bool | `false` | 允许通过 scheduler 执行 NUMA 对齐 refit；还需启用 `devices.nvidia.enableNumaTopology` 和节点的 `enablegetpreferredallocation`。 |
| `devicePlugin.numaRefit.schedulerEndpoint` | string | `""` | 发送 refit 请求的 scheduler URL；空值使用集群内 scheduler Service 的 URL。 |
| `devicePlugin.numaRefit.tlsInsecure` | bool | `true` | 跳过 scheduler refit 请求的 TLS 证书验证。 |
| `devicePlugin.nvidiaDriverRoot` | string | `"auto"` | 宿主机上的 NVIDIA 驱动根目录。`auto` 读取 GPU Operator 的驱动就绪信息；信息不存在时使用 `/`。 |
| `devicePlugin.nvidiaHookPath` | string | `nil` | NVIDIA CDI hook 路径；`null` 表示不设置 `NVIDIA_CDI_HOOK_PATH`。 |
| `devicePlugin.nvidiaNodeSelector.gpu` | string | `"on"` | NVIDIA 设备插件 DaemonSet 要求的节点标签 `gpu` 的值。 |
| `devicePlugin.passDeviceSpecsEnabled` | bool | `true` | 通过 `PASS_DEVICE_SPECS` 向 kubelet 传递设备规格。 |
| `devicePlugin.pluginPath` | string | `"/var/lib/kubelet/device-plugins"` | 包含 kubelet 设备插件 socket 的宿主机目录。 |
| `devicePlugin.podAnnotations` | object | `{}` | Pod 模板的附加注解。 |
| `devicePlugin.resources` | object | `{}` | 容器的 Kubernetes CPU 和内存 requests、limits。 |
| `devicePlugin.securityContext.allowPrivilegeEscalation` | bool | `true` | 允许容器进程获得额外权限。 |
| `devicePlugin.securityContext.capabilities.add` | list | `["SYS_ADMIN"]` | 为容器添加的 Linux capabilities。 |
| `devicePlugin.securityContext.capabilities.drop` | list | `["ALL"]` | 从容器移除的 Linux capabilities。 |
| `devicePlugin.securityContext.privileged` | bool | `true` | 以 Kubernetes 特权安全上下文运行容器。 |
| `devicePlugin.service.annotations` | object | `{}` | 附加 Kubernetes 注解。 |
| `devicePlugin.service.httpPort` | int | `31992` | HTTP 端口。 |
| `devicePlugin.service.labels` | object | `{}` | 附加 Kubernetes 标签。 |
| `devicePlugin.service.type` | string | `"NodePort"` | Service 类型。 |
| `devicePlugin.tolerations` | list | `[{"effect":"NoSchedule","key":"nvidia.com/gpu","operator":"Exists"}]` | 设备插件 Pod 的 tolerations。 |
| `devicePlugin.updateStrategy.rollingUpdate.maxUnavailable` | int | `1` | 滚动更新期间允许不可用的 NVIDIA 设备插件 Pod 数量。 |
| `devicePlugin.updateStrategy.type` | string | `"RollingUpdate"` | NVIDIA 设备插件的 Kubernetes DaemonSet 更新策略。 |

### Mock 设备插件

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `mockDevicePlugin.enabled` | bool | `false` | 部署用于 scheduler 测试的 mock 设备插件。 |
| `mockDevicePlugin.image.pullPolicy` | string | `"IfNotPresent"` | Kubernetes 容器镜像拉取策略。 |
| `mockDevicePlugin.image.pullSecrets` | list | `[]` | 用于组件镜像的已有 image-pull Secret 名称。 |
| `mockDevicePlugin.image.registry` | string | `"docker.io"` | 容器镜像仓库地址；设置了 `global.imageRegistry` 时优先使用全局地址。 |
| `mockDevicePlugin.image.repository` | string | `"projecthami/mock-device-plugin"` | 容器镜像仓库名称。 |
| `mockDevicePlugin.image.tag` | string | `"1.0.1"` | 容器镜像标签。 |

### 指标

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `legacyMetrics` | bool | `false` | 在当前 scheduler 和 vGPU monitor 指标之外，同时提供旧版指标名称。 |
| `prometheus.enabled` | bool | `false` | 生成 Prometheus Operator ServiceMonitor 资源；需要安装 ServiceMonitor CRD。 |

### 平台与安全

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `openshift.securityContextConstraints.create` | bool | `true` | 启用 OpenShift 支持时，创建设备插件 SCC 及其 use ClusterRole。只有 SCC 和 `system:openshift:scc:<name>` ClusterRole 均已存在时才设为 `false`，例如内置的 `privileged` SCC。 |
| `openshift.securityContextConstraints.name` | string | `"hami-device-plugin"` | 授予已启用设备插件 ServiceAccount 的 SCC。`create=false` 时，对应的 `system:openshift:scc:<name>` ClusterRole 必须已存在。使用内置 `privileged` SCC 时必须设置 `create=false`。 |
| `platform.openshift` | bool | `false` | 生成 OpenShift 安全约束和平台专用的设备插件设置。 |
| `podSecurityPolicy.enabled` | bool | `false` | 在支持 PodSecurityPolicy 的 Kubernetes 版本上创建相应资源。 |
| `selinux.enabled` | bool | `false` | 为启用 SELinux 的节点重新标记共享宿主机 vGPU 目录。 |
| `selinux.level` | string | `"s0"` | 共享宿主机 vGPU 目录使用的 SELinux level。 |
| `selinux.type` | string | `"container_file_t"` | 共享宿主机 vGPU 目录使用的 SELinux type。 |

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
