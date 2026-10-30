---
title: 升级 HAMi
---

:::warning 适用版本

本文仅适用于从 HAMi v2.10 升级到新版 Chart，不建议从其他版本直接按本文操作。如果当前使用的是更早版本，请先参考 [v2.10 升级文档](../../version-v2.10.0/installation/upgrade.md)，将 HAMi 升级至 v2.10，再按本文继续升级。

:::

## 升级影响

:::info 现有工作负载与 HAMi-core

HAMi 升级会替换 hami-scheduler 和 hami-device-plugin，并重新生成设备配置，**但不会影响正在运行的 GPU 工作负载，无需因此停止或迁移现有任务**。不过，正在使用 HAMi-core 的工作负载不会自动切换到新版本。HAMi-core 在 Pod 创建时注入，运行中的进程不会重新加载该库。需要使用新版 HAMi-core 的工作负载，应在升级完成后执行滚动重启或重新创建 Pod。

:::

:::warning 升级期间暂停提交新任务

升级期间建议暂停提交新的 HAMi GPU 工作负载，待 hami-scheduler、hami-device-plugin 和 admission webhook 完成更新后再恢复。组件滚动切换时可能出现短暂不可用或配置版本不一致，新任务可能因此调度失败或注入异常。

:::

其他厂商的 device plugin 不在本文档讨论范围内，请参阅 [HAMi 支持的设备](../userguide/device-supported.md)。

## 升级前准备

### 配置变量

配置所需的变量来方便部署。接下来给出示例，请按照实际环境修改。

```bash
export namespace=kube-system
export release=hami
export hami_chart_dir="${HOME}/hami-upgrade/HAMi"
```

### 确认 HAMi 版本

升级前确认当前安装的是 HAMi 2.10：

```bash
helm list -n "${namespace}" --filter "^${release}$"
```

### 备份当前配置

升级前保存当前 release 的用户配置：

```bash
helm get values "${release}" -n "${namespace}" -o yaml > previous-values.yaml
```

直接修改过的设备 ConfigMap 不会记录在 Helm values 中。升级前还应保存其中的 `data.device-config.yaml`，用于迁移手工修改和回滚后核对配置。

以下命令以 `hami-scheduler-device` 为例；如果修改过 release 名称或名称覆盖配置，请替换为实际的 ConfigMap 名称：

```bash
kubectl get configmap hami-scheduler-device -n "${namespace}" \
  --allow-missing-template-keys=false \
  -o jsonpath='{.data.device-config\.yaml}' > previous-device-config.yaml
```

确认 `previous-device-config.yaml` 包含当前设备配置，并保留这份备份。迁移时只提取仍需保留的设置，不要将整份备份作为新版配置恢复。

### 获取 Chart

包含迁移变更的 Chart 尚未发布到 Helm 仓库。请使用 HAMi 提交 [`def0bf8`](https://github.com/Project-HAMi/HAMi/commit/def0bf82074ca7aff940800c18d5d3402eef5cff) 或包含该提交的后续提交。以下命令以 `def0bf8` 为例，后续校验和升级均使用 `${hami_chart_dir}` 中的 Chart：

```bash
git clone https://github.com/Project-HAMi/HAMi.git "${hami_chart_dir}"
git -C "${hami_chart_dir}" checkout def0bf82074ca7aff940800c18d5d3402eef5cff
```

:::warning 未发布的 Chart 与镜像版本

该提交中的 Chart 是开发版本，不是已发布版本，其 `version` 和 `appVersion` 可能仍沿用上一版本。固定 Chart 提交不会固定后文使用的 `latest` 镜像标签。

:::

## 迁移并创建 values

从 v2.10 升级时，需要核对 Chart values 的字段路径、类型、默认值和配置含义变化。以下以 v2.10.0 到本文示例提交 `def0bf8` 的 Chart values 为基准。请先基于备份的 values 创建 `my-values.yaml`，按下文完成迁移和渲染校验，再执行升级。使用更晚的提交时，还需核对其后续 values 变更。

### 创建 values.yaml

从 `previous-values.yaml` 创建 `my-values.yaml`，作为整理升级配置的起点：

```bash
cp previous-values.yaml my-values.yaml
```

本文使用 `latest` 标签的 HAMi 镜像。Chart 默认使用 `IfNotPresent` 拉取策略，仅修改标签会继续使用节点上缓存的旧镜像。请在 `my-values.yaml` 中设置标签，并将 scheduler extender、HAMi device plugin 和 monitor 的拉取策略改为 `Always`：

```yaml
global:
  imageTag: latest
scheduler:
  extender:
    image:
      pullPolicy: Always
devicePlugin:
  image:
    pullPolicy: Always
  monitor:
    image:
      pullPolicy: Always
```

`Always` 会在容器启动时向镜像仓库解析标签对应的镜像。`latest` 仍是可变标签，不能保证不同时间启动的容器使用同一构建；远端标签更新也不会自动重启已有 Pod。

如果旧 values 中单独设置过 `scheduler.extender.image.tag`、`devicePlugin.image.tag` 或 `devicePlugin.monitor.image.tag`，请删除这些覆盖。

复制后，请按下文说明整理其他字段和设备字段，不要直接将旧配置全部用于升级。其他仍需保留的自定义设置也应写入 `my-values.yaml`。升级后不要直接恢复整个旧 ConfigMap，以免覆盖新版默认配置。

### 迁移其他字段

先核对 `previous-values.yaml` 中的非设备配置。需要迁移的自定义设置应写入 `my-values.yaml`，已删除的路径必须移除。字段路径未变，也可能存在类型、默认值或配置含义变化，应按下表调整 values。

#### 镜像与 scheduler

| 字段 | values 变化 | 迁移方式 |
| --- | --- | --- |
| `scheduler.patch.image` | 路径已删除，新 Chart 会拒绝渲染 | 删除旧路径，将仍需保留的自定义设置迁移到 `scheduler.patch.imageNew`。与旧默认值相同的设置无需迁移；已配置 `imageNew` 时，核对后合并，避免覆盖已有设置 |
| `scheduler.kubeScheduler.image`、`scheduler.patch.imageNew` | 默认镜像分别改为 `registry.k8s.io/kube-scheduler` 和 `registry.k8s.io/ingress-nginx/kube-webhook-certgen`，certgen 同时更新版本并固定 digest | 核对镜像仓库访问条件及自定义镜像覆盖。需要国内镜像源时参考[在线安装](./online-installation.md)，不要只修改仓库地址而保留不匹配的 repository 或 digest |
| `scheduler.service.type` | 默认值从 `NodePort` 改为 `ClusterIP` | 依赖 NodePort 的外部采集、webhook 自定义 URL 或其他调用方，应显式设置 `NodePort` 并保留所需端口；仅需集群内访问时使用新默认值 |
| `scheduler.service.httpTargetPort` | 默认值从 `443` 改为 `9443`；`scheduler.service.httpPort` 仍默认为 `443` | 不需要自定义容器端口时删除旧覆盖。需要保留自定义值时，确保它与 `scheduler.extenderPort` 不同 |
| `scheduler.service.monitorTargetPort` | 默认值从数字 `9395` 改为命名端口 `metrics` | 没有固定端口需求时删除旧覆盖；自定义监控端口时，核对它与 `scheduler.metricsBindAddress` 一致 |

- `podSecurityPolicy.enabled` 的路径未变。在 Kubernetes `1.25` 及以上，证书 Job 不再允许启用此项；如果旧 values 设置为 `true`，请改为 `false`。
- `scheduler.patch.imageNew` 是 webhook 证书 Job 的镜像配置，不继承 `global.imageTag`。不要将前文 HAMi 镜像的 `latest` 设置复制到这里。

#### Device plugin 与 monitor

| 字段 | values 变化 | 迁移方式 |
| --- | --- | --- |
| `devicePlugin.monitor.resyncInterval` | 路径保留，但不再控制缓存目录清理 | 原先为清理宽限期设置的值应配置到 `devicePlugin.vgpuCache.gracePeriod`。如果还需要保留 monitor 的同步和内存映射释放行为，同时保留 `resyncInterval` |
| `devicePlugin.nvidiaDriverRoot` | 默认值从 `null` 改为 `auto`，根据 GPU Operator 的驱动就绪信息识别路径；没有该信息时按宿主机驱动处理 | 核对驱动安装方式。`auto` 模式下 device plugin 必须通过 NVIDIA runtime 获得驱动库和设备；使用显式驱动路径的部署应保留相应覆盖 |
| `devicePlugin.passDeviceSpecsEnabled` | 默认值从 `false` 改为 `true` | 如果需要保留原有不向 kubelet 返回设备规格的行为，显式设置 `false`；仅使用 CDI 策略时此字段不生效 |
| `devicePlugin.tolerations` | 默认增加对 `nvidia.com/gpu:NoSchedule` 污点的容忍 | 核对 DaemonSet 的节点覆盖范围；已有自定义列表会替换默认列表，需要此项容忍时将其合并到自定义列表中 |
| `devicePlugin.monitor.metricsBindAddress`、`devicePlugin.monitor.probes.enabled` | monitor 默认启用存活和就绪探针，通过 Pod IP 访问 `/metrics`；监听地址不允许使用 loopback | 将旧 `monitor.extraArgs` 中的监听地址配置整理到 `metricsBindAddress`，确保探针和 Service 可访问该地址。排障时可关闭探针，但这不会解除 loopback 地址校验 |
| `devicePlugin.extraEnvs`、`devicePlugin.monitor.extraEnvs` | 空默认值从 `{}` 改为 `[]`，自定义环境变量仍需使用 Kubernetes EnvVar 列表 | 空覆盖可删除；自定义项使用包含 `name` 和 `value` 或 `valueFrom` 的列表，不要写成键值映射 |

- `devicePlugin.vgpuCache.gracePeriod` 默认为 `5m`，表示缓存目录自最后修改以来至少保留的时长，不是清理扫描间隔。
- `devicePlugin.monitor.resyncInterval` 仍用于 monitor 的 Pod informer 同步，以及 Pod 不存在时释放内存映射的宽限期，两者独立配置。

### 迁移设备字段

Enflame、Kunlun、Vastai 和 Biren 的标准资源名现在由对应的设备字段自动加入 scheduler extender。这四类设备的 `customresources` 只保留额外资源，默认为空列表。旧 values 中复制过去的标准资源项应删除。

迁移前，先核对 `previous-values.yaml`，以及 `previous-device-config.yaml` 中曾手工修改过的设备配置。以升级前所用 Chart 版本的默认配置为基准，只将与默认值不同、升级后仍需保留的设置写入新 values。

- 对于旧 values 中的设备字段，按下方各厂商的字段映射迁移到新路径，并删除旧路径。
- 对于直接修改过的 ConfigMap 配置，找到对应的 Helm values 字段后再迁移，不要将 ConfigMap 的内容整体复制到 values 中。下方表格中的旧字段指旧 Helm values 路径，不是 ConfigMap 字段路径。
- 与旧版本默认值相同的设备字段应从 `my-values.yaml` 中删除，不必写入对应的新路径，让新 Chart 使用其默认配置。

不要仅凭值是否为 `0`、`false` 或空字符串判断是否需要迁移；应与旧版本默认值比较。迁移后应删除表中标记为已删除或已替换的旧字段；仍兼容的字段按对应说明处理。Chart 会拒绝校验列表中的旧字段，但未被校验覆盖的旧字段可能被静默忽略，因此不能仅凭渲染成功判断迁移是否完成。

#### NVIDIA

包含 NVIDIA 资源字段和 NVIDIA Device Plugin 配置字段：

| v2.10 字段                               | 最新版字段                                    |
| ---------------------------------------- | --------------------------------------------- |
| `resourceName`                           | `devices.nvidia.resourceCountName`            |
| `resourceMem`                            | `devices.nvidia.resourceMemoryName`           |
| `resourceMemPercentage`                  | `devices.nvidia.resourceMemoryPercentageName` |
| `resourceCores`                          | `devices.nvidia.resourceCoreName`             |
| `resourcePriority`                       | `devices.nvidia.resourcePriorityName`         |
| `devicePlugin.deviceSplitCount`          | `devices.nvidia.deviceSplitCount`             |
| `devicePlugin.deviceMemoryScaling`       | `devices.nvidia.deviceMemoryScaling`          |
| `devicePlugin.deviceCoreScaling`         | `devices.nvidia.deviceCoreScaling`            |
| `devicePlugin.preConfiguredDeviceMemory` | `devices.nvidia.preConfiguredDeviceMemory`    |
| `devicePlugin.enableNumaTopology`        | `devices.nvidia.enableNumaTopology`           |
| `devicePlugin.runtimeClassName`          | `devices.nvidia.runtimeClassName`             |
| `devicePlugin.createRuntimeClass`        | `devices.nvidia.createRuntimeClass`           |

如果需要保留原有配置效果，还需核对以下 NVIDIA values 的默认值：

| 字段 | 默认值与配置方式 |
| --- | --- |
| `devicePlugin.monitor.disableHAMiCoreForWholeGPU` | 新增且默认为 `true`。显存、算力缩放均为 `1` 时，符合整卡条件的非 MIG 容器默认绕过 HAMi-core，由 monitor 直接通过 NVML 采集指标。依赖整卡任务继续加载 HAMi-core 时，显式设为 `false` |
| `devices.nvidia.limitDelivery` | 默认使用 `file`，除环境变量外，还将限额文件只读挂载到容器的 `/overrideEnv`。检查应用是否占用该路径；需要仅通过环境变量传递限额时设为 `env` |
| `devices.nvidia.adoptExistingMIGInstances` | 默认不接管 HAMi 未记录创建的 MIG 实例。若原先依赖接管预先创建的实例，应先核对实例归属；只有由 HAMi 独占管理节点 MIG 布局时才启用此项，详见[动态 MIG 生命周期](../developers/dynamic-mig-lifecycle.md) |

#### Cambricon

| v2.10 字段         | 最新版字段                             |
| ------------------ | -------------------------------------- |
| `mluResourceName`  | `devices.cambricon.resourceCountName`  |
| `mluResourceMem`   | `devices.cambricon.resourceMemoryName` |
| `mluResourceCores` | `devices.cambricon.resourceCoreName`   |

#### Hygon

[HAMi#2969](https://github.com/Project-HAMi/HAMi/pull/2969) 将 Hygon 设备的 DCU 命名统一改为 HCU，涉及资源名称、配置和注解。建议将 HCU（原 DCU）device plugin 升级到 Hygon 官方提供的最新版本 [k8s-hcu-device-plugin](https://github.com/HYGON-AI/k8s-hcu-device-plugin)。更新信息和配置说明见[启用 Hygon HCU 共享](../userguide/hygon-device/enable-hygon-hcu-sharing.md)。

| v2.10 字段 | v2.10 默认值 | 最新版字段 | 最新版默认值 |
| --- | --- | --- | --- |
| `dcuResourceName` | `hygon.com/dcunum` | `devices.hygon.resourceCountName` | `hygon.com/hcunum` |
| `dcuResourceMem` | `hygon.com/dcumem` | `devices.hygon.resourceMemoryName` | `hygon.com/hcumem` |
| `dcuResourceCores` | `hygon.com/dcucores` | `devices.hygon.resourceCoreName` | `hygon.com/hcucores` |

如果曾使用 v2.10 之后的开发版，`hcuResourceName`、`hcuResourceMem` 和 `hcuResourceCores` 也需迁移到表中对应的 `devices.hygon.*` 路径；新 Chart 同样拒绝这些旧字段。

删除与 v2.10 默认值相同的旧字段后，Chart 会使用新的 `hygon.com/hcu*` 资源名。升级时应核对 HCU device plugin 实际暴露的资源名，并同步调整后续提交的工作负载中的资源请求，使其与 Chart 配置一致。仅通过 Helm 渲染校验不能确认 Hygon 设备迁移完成。

#### MetaX

| v2.10 字段               | 最新版字段                          |
| ------------------------ | ----------------------------------- |
| `metaxResourceName`      | `devices.metax.resourceVCountName`  |
| `metaxResourceCore`      | `devices.metax.resourceVCoreName`   |
| `metaxResourceMem`       | `devices.metax.resourceVMemoryName` |
| `metaxsGPUTopologyAware` | `devices.metax.sgpuTopologyAware`   |

`metaxsGPUTopologyAware` 在 v2.10 中使用字符串，默认值为 `"false"`；新字段 `devices.metax.sgpuTopologyAware` 使用布尔值，默认值为 `false`。Chart 仍兼容字符串形式的 `"true"` 和 `"false"`，迁移时建议使用不带引号的布尔值。旧值为默认的 `"false"` 时，删除旧字段即可；旧值为 `"true"` 时，将新字段设为 `true`。

#### Enflame

| v2.10 字段                     | 最新版字段                              |
| ------------------------------ | --------------------------------------- |
| `enflameResourceNameDRSGCU`    | `devices.enflame.resourceNameDRSGCU`    |
| `enflameResourceNameGCUMemory` | `devices.enflame.resourceNameGCUMemory` |
| `enflameResourceNameGCUCore`   | `devices.enflame.resourceNameGCUCore`   |

#### Kunlunxin

| v2.10 字段                  | 最新版字段                           |
| --------------------------- | ------------------------------------ |
| `kunlunResourceName`        | `devices.kunlun.resourceCountName`   |
| `kunlunResourceVCountName`  | `devices.kunlun.resourceVCountName`  |
| `kunlunResourceVMemoryName` | `devices.kunlun.resourceVMemoryName` |

#### Vastai

| v2.10 字段           | 最新版字段                         |
| -------------------- | ---------------------------------- |
| `vastaiResourceName` | `devices.vastai.resourceCountName` |

#### Biren

| v2.10 字段          | 最新版字段                        |
| ------------------- | --------------------------------- |
| `birenResourceName` | `devices.biren.resourceCountName` |

#### Ascend

| 旧配置 | 新配置或处理方式 |
| --- | --- |
| `devices.ascend.hamiVnpuCore: true` | 建议改为 `devices.ascend.hamiVnpuMode: hami-core`；`false` 对应 `template`。旧布尔字段仍兼容，显式设置的 `hamiVnpuMode` 优先 |
| `devices.ascend.enpu`（v2.10 之后开发版字段） | 已删除，改用 `devices.ascend.hamiVnpuMode: enpu`；残留旧字段会导致校验失败 |
| `devices.ascend.vnpuDeviceSplitCount`（v2.10 之后开发版字段） | 改为 `devices.ascend.deviceSplitCount`，必须是正整数。此字段用于 hami-core 和 ENPU 模式，默认值为 `10`，并要求 Ascend device plugin 支持 `vnpus.deviceSplitCount` |
| 手工修改的 `vnpus.configs` | 迁移到 `devices.ascend.configs`；整份列表会替换默认列表。全局模式、运行时和环境变量覆盖设置使用对应的 `devices.ascend.*` 与 `scheduler.overwriteEnv`，不要恢复整个旧 `vnpus` 配置 |

Ascend device plugin 需要单独升级并核对配置，HAMi Chart 不会代为部署。模式和配套版本要求见[启用 Ascend 共享](../userguide/ascend-device/enable-ascend-sharing.md)。

### 迁移示例

假设之前安装时使用了 `override-values.yaml`，内容如下：

```yaml
resourceName: nvidia.com/gpu
devicePlugin:
  deviceSplitCount: 20
  disablecorelimit: "true"
```

其中，`resourceName` 与 v2.10 默认值相同，不需要保留；`deviceSplitCount` 从默认的 `10` 改为了 `20`，需要迁移；`disablecorelimit` 是自定义设置，但路径不变，需要原样保留。

此外，曾在 `hami-scheduler-device` ConfigMap 的 `data.device-config.yaml` 中，将以下字段从默认的 `0` 改为 `4096`（这里只展示相关片段）：

```yaml
nvidia:
  defaultMemory: 4096
```

v2.10 的 Chart 模板将 `defaultMemory` 固定为 `0`，当时无法通过单独的 values 字段修改它。[HAMi#3152](https://github.com/Project-HAMi/HAMi/pull/3152) 将这类配置开放为 values 字段，现在可以将这项手工修改迁移到 `devices.nvidia.defaultMemory`。

整理后的 `my-values.yaml` 如下：

```yaml
devices:
  nvidia:
    deviceSplitCount: 20
    defaultMemory: 4096
devicePlugin:
  disablecorelimit: "true"
```

这份文件只保留需要覆盖的设置：迁移后的设备字段、从 ConfigMap 中提取的自定义配置，以及路径不变的自定义设置。`resourceName` 的旧路径和对应的新路径都不需要写入，交由新 Chart 提供默认值。

`scheduler.overwriteEnv` 和其他 `devicePlugin` 设置仍使用原路径，包括 `enabled`、镜像、`deviceListStrategy`、`migStrategy`、`disablecorelimit` 和 `nodeConfiguration`；如有自定义值，同样保留在原路径下。

如果之前使用了 `device-config.content` 或 Chart 内的 `files/device-config.yaml`，它们会整体替代自动生成的设备配置，不会与 `devices.*` 合并。若要改用 `devices.*` 管理配置，需要先整理并迁移其中仍需保留的设置，再移除原有的整份配置覆盖。

### 校验迁移后的配置

使用升级前准备中获取的本地 Chart，渲染迁移后的配置：

```bash
helm template "${release}" "${hami_chart_dir}/charts/hami" \
  --namespace "${namespace}" \
  --values my-values.yaml
```

## 执行升级

使用迁移后的 values 和 Chart 默认值重新渲染 release：

```bash
helm upgrade "${release}" "${hami_chart_dir}/charts/hami" \
  --namespace "${namespace}" \
  --reset-values \
  --values my-values.yaml
```

`--reset-values` 会丢弃 release 中保存的旧 values。所有需要保留的覆盖都必须写入 `my-values.yaml`，或通过其他 `--values` 文件传入。

这次迁移不要使用 `--reuse-values` 或 `--reset-then-reuse-values`。这些选项会将旧 values 中的已删除字段带入新 Chart，可能导致渲染失败；未被校验覆盖的旧字段也不会因此恢复生效。

## 升级后验证

### 检查工作负载

```bash
kubectl get pods -n "${namespace}" \
  -l "app.kubernetes.io/instance=${release}"
kubectl rollout status deployment -n "${namespace}" \
  -l "app.kubernetes.io/instance=${release},app.kubernetes.io/component=hami-scheduler" \
  --timeout=5m
kubectl rollout status daemonset -n "${namespace}" \
  -l "app.kubernetes.io/instance=${release},app.kubernetes.io/component=hami-device-plugin" \
  --timeout=5m
```

Pod 应处于 `Running` 状态，Deployment 和 DaemonSet 应完成滚动更新。

### 测试设备分配

用一个小型 Pod 验证 GPU 分配：

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test-pod
  namespace: default
spec:
  containers:
  - name: test
    image: nvidia/cuda:12.2.0-runtime-ubuntu22.04
    command: ["nvidia-smi"]
    resources:
      limits:
        nvidia.com/gpu: 1
  restartPolicy: Never
EOF

kubectl logs -n default gpu-test-pod
kubectl delete pod -n default gpu-test-pod
```

随后检查节点资源和 HAMi 注解：

```bash
kubectl describe nodes | grep -A 5 "Allocated resources"
kubectl get nodes -o yaml | grep -A 10 "hami.io"
```

## 回滚

先查看 release 历史：

```bash
helm history "${release}" -n "${namespace}"
```

回滚到上一个版本：

```bash
helm rollback "${release}" -n "${namespace}"
```

也可以指定 revision：

```bash
helm rollback "${release}" <revision-number> -n "${namespace}"
```

Helm 回滚使用历史 release 中保存的清单，不包含直接修改集群 ConfigMap 的记录。如果升级前手工修改过设备配置，回滚后应对照 `previous-device-config.yaml` 核对并恢复必要字段，不要直接覆盖整个 ConfigMap。保留迁移后的 `my-values.yaml`，再次升级时继续使用其中已整理的配置。

如果回滚后仍有工作负载异常，先恢复维护窗口前的 GPU 工作负载，再检查 scheduler、device plugin 和节点日志。

## 获取帮助

如果升级过程中遇到问题：

1. 查看[故障排查指南](../troubleshooting/troubleshooting.md)
2. 检查 scheduler 和 device plugin 日志
3. 查看 [GitHub Issues](https://github.com/Project-HAMi/HAMi/issues)
4. 在[社区讨论区](https://github.com/Project-HAMi/HAMi/discussions)提问

## 另请参阅

- [发布记录](/changelog)
- [安装指南](./online-installation.md)
- [卸载指南](./uninstall.md)
- [HAMi 支持的设备](../userguide/device-supported.md)
- [HAMi 文档](../core-concepts/introduction.md)
