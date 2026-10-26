---
title: 配置
sidebar_label: 配置
---

本文按配置对象说明 HAMi 的常用配置和修改方式。完整参数、默认值和限制以 [Chart values 参数表](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values)为准，配置示例见 [values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml)。

| 配置对象 | 修改位置 |
| --- | --- |
| [Scheduler 及配套组件](#scheduler-configuration) | Helm values 中的 `scheduler.*` 等 |
| [各厂商 Device Plugin 与设备参数](#device-configuration) | Helm values 中的 `devicePlugin.*`、`devices.<vendor>.*`，以及独立部署的厂商插件配置 |
| [节点 ConfigMap](#node-configuration) | `devicePlugin.nodeConfiguration` |
| [Pod 的 labels 与 annotations](#pod-configuration) | 业务 Pod 的 `metadata` |
| [容器环境变量](#container-environment) | 业务容器的 `env` |

本文对应 Next 开发版本，以上源码链接指向开发分支。使用已发布 Chart 时，选择匹配版本的文档，并查看该版本的默认值：

```bash
helm show values hami-charts/hami --version <chart-version>
```

将所需配置合并到 `my-values.yaml`，通过 `--values my-values.yaml` 传入 Helm。映射可以局部覆盖，列表会整体替换；合并示例时，同一顶层键只保留一份。首次部署见[安装指南](../installation/online-installation.md)，已有部署的配置更新见[升级指南](../installation/upgrade.md)。

## Scheduler 及配套组件的 Chart 配置 {#scheduler-configuration}

Scheduler 的常见调整包括部署位置、副本数和默认调度策略。例如，将两个副本部署到带有 `hami.io/scheduler=true` 标签的节点：

```yaml
scheduler:
  nodeSelector:
    hami.io/scheduler: "true"
  leaderElect: true
  replicas: 2
  defaultSchedulerPolicy:
    nodeSchedulerPolicy: binpack
    gpuSchedulerPolicy: spread
```

多副本必须启用 `leaderElect`，并准备足够的匹配节点和资源。`nodeSelector` 控制 scheduler Pod 的部署位置，不是业务 GPU Pod 的节点选择条件。

### 默认调度策略 {#scheduling-policies}

`nodeSchedulerPolicy` 控制节点选择，默认 `binpack`；`gpuSchedulerPolicy` 控制节点内的设备选择，默认 `spread`。`binpack` 倾向集中分配，`spread` 倾向分散分配。Pod 注解可以覆盖这些默认值，其他策略及组合方式见[调度策略](./nvidia-device/scheduling-policy.md)。

镜像、CPU 和内存资源、Webhook 范围、证书、服务端口和监控通常可以保留默认配置。需要调整时，在 [Chart values 参数表](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values)中查找 `global.*`、`scheduler.*` 和 `prometheus.*`；性能分析参数也在该表中说明。

## 各厂商 Device Plugin 与设备参数的 Chart 配置 {#device-configuration}

`devicePlugin.*` 管理 HAMi Chart 部署的 **NVIDIA Device Plugin 和 vGPU monitor**。`devices.<vendor>.*` 配置各厂商的调度支持和设备参数，不能据此认为 Chart 会部署对应厂商的插件。

### NVIDIA

常见调整是插件所在节点、RuntimeClass 和单卡共享数量。例如，使用已有的 `nvidia` RuntimeClass，在 `gpu=on` 的节点部署插件，并将每卡共享数量设为 `20`：

```yaml
devicePlugin:
  enabled: true
  nvidiaNodeSelector:
    gpu: "on"
devices:
  nvidia:
    runtimeClassName: nvidia
    deviceSplitCount: 20
```

RuntimeClass 和驱动需先按[前置条件](../installation/prerequisites.md)准备。其他常见共享参数位于 `devices.nvidia` 下：

| 字段 | 默认值 | 用途 |
| --- | --- | --- |
| `deviceSplitCount` | `10` | 每张物理 GPU 的共享数量上限；MIG 模式由实际实例容量限制。 |
| `deviceMemoryScaling` | `1` | 上报显存容量的倍率；大于 `1` 允许显存超分配，不增加物理显存，不适用于 MIG。 |
| `defaultMemory` | `0` | 未申请正值的绝对显存或显存百分比时，每卡默认分配的显存，单位 MiB；`0` 表示整卡显存。 |
| `defaultCores` | `0` | 未填写算力请求时的默认算力百分比；`0` 不预留算力。启用 Webhook 时，未指定显存或申请全部显存的整卡请求会将算力请求自动设为 `100`（即 100%）。 |

驱动路径、插件镜像、监控、缓存清理及其他共享参数，按需查阅 [Chart values 参数表](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values)中的 `devicePlugin.*` 和 `devices.nvidia.*`。MIG 和 NUMA 配置分别见[动态 MIG 支持](./nvidia-device/dynamic-mig-support.md)与 [NUMA 对齐](./nvidia-device/numa-alignment.md)。

### 其他厂商

其他厂商插件通常需要独立部署。HAMi Chart 中的配置入口如下，字段含义以 [Chart values 参数表](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values)为准；插件自身的镜像、启动参数和节点配置见对应设备指南。

| 厂商与设备指南 | HAMi Chart 配置入口 |
| --- | --- |
| [Ascend](./ascend-device/enable-ascend-sharing.md) | `devices.ascend.*` |
| [寒武纪 Cambricon](./cambricon-device/enable-cambricon-mlu-sharing.md) | `devices.cambricon.*` |
| [海光 Hygon](./hygon-device/enable-hygon-hcu-sharing.md) | `devices.hygon.*` |
| [摩尔线程 MThreads](./mthreads-device/enable-mthreads-gpu-sharing.md) | `devices.mthreads.*` |
| [天数智芯 Iluvatar](./iluvatar-device/enable-iluvatar-gpu-sharing.md) | `devices.iluvatar.*` |
| [沐曦 MetaX](./metax-device/metax-sgpu/enable-metax-gpu-sharing.md) | `devices.metax.*` |
| [燧原 Enflame](./enflame-device/enable-enflame-gcu-sharing.md) | `devices.enflame.*` |
| [昆仑芯 Kunlunxin](./kunlunxin-device/enable-kunlunxin-schedule.md) | `devices.kunlun.*` |
| [AMD](./amd-device/enable-amd-gpu-sharing.md) | `devices.amd.*` |
| [AWS Neuron 前置条件](../installation/prerequisites.md#device-prerequisites) | `devices.awsneuron.*` |
| [瀚博 Vastai](./vastai/enable-vastai-sharing.md) | `devices.vastai.*` |
| [壁仞 Biren](./biren-device/enable-biren-sharing.md) | `devices.biren.*` |

例如，纯 Ascend 集群可以关闭 NVIDIA 插件，并启用 Ascend 调度支持：

```yaml
devicePlugin:
  enabled: false
devices:
  ascend:
    enabled: true
```

此配置不会部署 Ascend 插件，仍需按设备指南单独安装。修改厂商资源名称或芯片配置时，还需核对 `customresources`，保证 HAMi、厂商插件与业务 Pod 使用的资源名一致。设备型号、模板等列表会整体替换，不会按型号合并。

### 设备 ConfigMap 的生成与生效 {#device-config-overrides}

默认 release 名称为 `hami` 时，Chart 将全局设备参数写入 `hami-scheduler-device` ConfigMap 的 `device-config.yaml`。

:::warning 不要手动修改全局设备 ConfigMap

不要通过 `kubectl edit`、`kubectl patch` 或集群管理界面直接修改全局 `device-config.yaml`。应修改 Helm values 中的 `devices.<vendor>.*`，再通过 Helm 更新部署。

手工修改不会同步 Helm values，也不会触发 Chart 配置变更对应的组件滚动更新；后续 Helm 升级或回滚还可能覆盖这些修改。

:::

如需替换完整文件，可使用 `device-config.content`，具体规则见 [Chart values 参数表](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values)。它不与 `devices.*` 合并，且需保持资源名一致，因为 kube-scheduler 的 extender 资源列表仍由 values 生成。

通过 Helm 修改生成的设备配置会更新 scheduler 和 NVIDIA 插件的 Pod 模板。默认 `RollingUpdate` 自动更新插件 Pod；使用 `OnDelete` 时需手动删除旧 Pod。独立部署的厂商插件按各自流程更新。

## 节点 ConfigMap 配置 {#node-configuration}

NVIDIA 节点配置用于覆盖特定节点的运行模式、共享参数和设备过滤。它与全局设备配置是两个不同的 ConfigMap：

| ConfigMap（默认 release 名称） | 数据项               | 配置来源                                |
| ------------------------------ | -------------------- | --------------------------------------- |
| `hami-scheduler-device`        | `device-config.yaml` | `devices.*` 等全局 Chart 配置           |
| `hami-device-plugin`           | `config.json`        | `devicePlugin.nodeConfiguration.config` |

### 通过 values 配置节点

以下是 [values.yaml 中节点配置示例](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml)的简化版本，将 `gpu-node-1` 换成实际节点名称：

```yaml
devicePlugin:
  nodeConfiguration:
    config: |
      {
        "nodeconfig": [
          {
            "name": "gpu-node-1",
            "operatingmode": "hami-core",
            "devicesplitcount": 20,
            "filterdevices": {
              "uuid": [],
              "index": []
            }
          }
        ]
      }
```

此示例让该节点使用 `hami-core` 模式，每卡最多共享 `20` 个容器。`filterdevices.uuid` 和 `filterdevices.index` 填写要排除的设备 UUID 或索引，命中任意列表的设备都不会注册到 HAMi。其他参数沿用全局设置。

`config` 会替换整个 `config.json`，多个节点应放在同一个 `nodeconfig` 列表中。匹配优先级是：节点名 `name` → 标签选择器 `nodelabelselector` → `name: "*"` → 全局配置。每项只能设置名称或标签选择器之一。同一级的多个匹配条目按顺序应用；资源字段的零值、`false`、`null` 不会清除已有非零值或 `true`。

更多节点字段、标签选择器示例和覆盖规则，见 [Chart values 参数表](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values)中的 `devicePlugin.nodeConfiguration.config` 及其链接的源码示例。

### 外部 ConfigMap 与重新加载 {#configuration-reload}

若由其他运维工具管理节点配置，可通过以下 values 引用已有 ConfigMap：

```yaml
devicePlugin:
  nodeConfiguration:
    externalConfigName: hami-node-config
```

该对象必须与插件 Pod 位于同一命名空间，并包含 `config.json` 数据项。`externalConfigName` 优先于 `config`。

仅修改节点 JSON 或外部 ConfigMap 内容，**不会自动更新插件 Pod**。节点标签变化后也需要重启插件，以重新匹配配置。默认 `RollingUpdate` 策略下执行：

```bash
kubectl -n kube-system rollout restart daemonset/hami-device-plugin
kubectl -n kube-system rollout status daemonset/hami-device-plugin --timeout=5m
```

命令中的资源名和命名空间按实际部署替换。使用 `OnDelete` 时需按维护安排手动删除旧插件 Pod。重新加载节点配置不表示已有业务容器的资源限制也已改变。

## Pod 配置：labels 与 annotations {#pod-configuration}

标签和注解写在 Pod 的 `metadata` 中。Deployment、StatefulSet、Job 等工作负载应写在 **`spec.template.metadata`** 下，注解值使用字符串。

| 位置 | 键 | 用途或示例 |
| --- | --- | --- |
| label | `hami.io/webhook` | `"ignore"` 跳过 HAMi Webhook，不再自动填入调度器及设备默认值。 |
| annotation | `hami.io/node-scheduler-policy` | `"binpack"` 或 `"spread"`，覆盖全局节点策略。 |
| annotation | `hami.io/gpu-scheduler-policy` | 覆盖节点内设备策略，如 `"binpack"`、`"spread"`。 |
| annotation | `nvidia.com/use-gpuuuid` / `nvidia.com/nouse-gpuuuid` | 指定允许或排除的 GPU UUID，多个值以逗号分隔。 |
| annotation | `nvidia.com/use-gputype` / `nvidia.com/nouse-gputype` | 指定允许或排除的 GPU 型号，如 `"A100,Tesla V100"`。 |
| annotation | `nvidia.com/vgpu-mode` | 选择 `"hami-core"` 或 `"mig"` 模式。 |
| annotation | `hami.io/overwrite-env` | `"true"` 对未申请设备的容器隐藏 NVIDIA 或 Ascend 设备，覆盖全局默认行为。 |

例如，下面的 Deployment 片段让 Pod 优先分散到不同节点，并选择 A100 GPU：

```yaml
spec:
  template:
    metadata:
      annotations:
        hami.io/node-scheduler-policy: "spread"
        nvidia.com/use-gputype: "A100"
    spec:
      containers:
        - name: worker
          image: ubuntu:22.04
          command: ["sleep", "infinity"]
          resources:
            limits:
              nvidia.com/gpu: 1
              nvidia.com/gpumem: 4096
              nvidia.com/gpucores: 50
```

示例假设使用默认资源名称、`memoryFactor: 1`，且 Webhook 已启用；镜像和命令按业务替换。资源数量仍需在容器 `resources` 中申请，注解不能代替资源请求。

更多策略见[调度策略](./nvidia-device/scheduling-policy.md)，厂商专用注解见各厂商设备指南。`nvidia.com/*` 注解不通用于其他厂商。HAMi 自动写入的设备分配和绑定状态注解由组件维护，不应复制到新 Pod 或手工修改。

## 容器配置：环境变量 {#container-environment}

以下变量用于 **NVIDIA HAMi-core 模式的业务容器**，写在容器的 `env` 中，不是插件的 `devicePlugin.extraEnvs`。

| 环境变量 | 用途 |
| --- | --- |
| `GPU_CORE_UTILIZATION_POLICY` | `default` 根据同卡竞争情况限制算力；`force` 始终执行申请的算力限制；`disable` 不执行运行时算力限制。`0` 和 `100` 算力不执行此限流。 |
| `CUDA_DISABLE_CONTROL` | `"true"` 关闭 HAMi-core 控制，失去对应的运行时资源隔离与限制，不应用于依赖隔离的共享任务。 |
| `LIBCUDA_LOG_LEVEL` | `"0"`、`"1"` 仅记录错误，`"2"` 增加警告和消息，`"3"` 增加 info，`"4"` 增加 debug。 |

例如，在业务容器中增加以下配置：

```yaml
env:
  - name: GPU_CORE_UTILIZATION_POLICY
    value: "force"
  - name: LIBCUDA_LOG_LEVEL
    value: "3"
```

此示例假设全局 `devices.nvidia.gpuCorePolicy` 保持 `default`；若全局设为 `force` 或 `disable`，Webhook 会注入同名变量，应检查准入后的 Pod 配置。GPU 显存和算力仍通过 `resources.limits` 申请，手工修改运行时限制不会同步调度器的资源记账。

全局算力策略、日志级别、整卡容器的 hook 行为及限制传递方式，见 [Chart values 参数表](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values)中的 `devices.nvidia.*` 和 `devicePlugin.monitor.disableHAMiCoreForWholeGPU`。通过 SSH、`su -` 等方式启动进程时，保留默认 `limitDelivery: file`，可让未继承容器环境变量的进程仍从只读文件读取限制。
