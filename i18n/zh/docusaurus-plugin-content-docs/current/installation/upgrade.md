---
title: 升级 HAMi
---

:::warning 适用版本

本文仅适用于从 HAMi v2.10 升级到新版 Chart，不建议从其他版本直接按本文操作。如果当前使用的是更早版本，请先参考 [v2.10 升级文档](/zh/docs/installation/upgrade)，将 HAMi 升级至 v2.10，再按本文继续升级。

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
```

### 确认 HAMi 版本

升级前确认当前安装的是 HAMi 2.10：

```bash
helm list -n "${namespace}" --filter "^${release}$"
```

### 备份 Helm values

升级前保存当前 release 的用户配置：

```bash
helm get values "${release}" -n "${namespace}" -o yaml > previous-values.yaml
```

## 迁移并创建 values

从 v2.10 升级到最新版 Chart 时，设备相关字段统一迁移到 `devices.<vendor>`。请先基于备份的 values 创建 `my-values.yaml`，完成字段迁移和渲染校验，再执行升级。

### 创建 values.yaml

从 `previous-values.yaml` 创建 `my-values.yaml`，作为整理升级配置的起点：

```bash
cp previous-values.yaml my-values.yaml
```

复制后，请按下节说明整理设备字段，不要直接将旧配置全部用于升级。其他仍需保留的自定义设置也应写入 `my-values.yaml`。升级后不要直接恢复整个旧 ConfigMap，以免覆盖新版默认配置。

### 迁移设备字段

Enflame、Kunlun、Vastai 和 Biren 的标准资源名现在由对应的设备字段自动加入 scheduler extender。这四类设备的 `customresources` 只保留额外资源，默认为空列表。旧 values 中复制过去的标准资源项应删除。

迁移前，先核对旧 values 文件，以及旧的 `hami-scheduler-device` ConfigMap（实际名称随 release 和命名覆盖配置而变化）中曾手工修改过的设备配置。以升级前所用 Chart 版本的默认配置为基准，只将与默认值不同、升级后仍需保留的设置写入新 values。

- 对于旧 values 中的设备字段，按下方各厂商的字段映射迁移到新路径，并删除旧路径。
- 对于直接修改过的 ConfigMap 配置，找到对应的 Helm values 字段后再迁移，不要将 ConfigMap 的内容整体复制到 values 中。下方表格中的旧字段指旧 Helm values 路径，不是 ConfigMap 字段路径。
- 与旧版本默认值相同的设备字段应从 `my-values.yaml` 中删除，不必写入对应的新路径，让新 Chart 使用其默认配置。

不要仅凭值是否为 `0`、`false` 或空字符串判断是否需要迁移；应与旧版本默认值比较。新 values 中也不能残留下表列出的旧字段，否则新 Chart 会拒绝渲染。

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

#### Cambricon

| v2.10 字段         | 最新版字段                             |
| ------------------ | -------------------------------------- |
| `mluResourceName`  | `devices.cambricon.resourceCountName`  |
| `mluResourceMem`   | `devices.cambricon.resourceMemoryName` |
| `mluResourceCores` | `devices.cambricon.resourceCoreName`   |

#### Hygon

| v2.10 字段         | 最新版字段                         |
| ------------------ | ---------------------------------- |
| `dcuResourceName`  | `devices.hygon.resourceCountName`  |
| `dcuResourceMem`   | `devices.hygon.resourceMemoryName` |
| `dcuResourceCores` | `devices.hygon.resourceCoreName`   |

#### MetaX

| v2.10 字段               | 最新版字段                          |
| ------------------------ | ----------------------------------- |
| `metaxResourceName`      | `devices.metax.resourceVCountName`  |
| `metaxResourceCore`      | `devices.metax.resourceVCoreName`   |
| `metaxResourceMem`       | `devices.metax.resourceVMemoryName` |
| `metaxsGPUTopologyAware` | `devices.metax.sgpuTopologyAware`   |

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

更新 Helm 仓库，并使用新版本 Chart 渲染一次配置：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update

helm template "${release}" hami-charts/hami \
  --namespace "${namespace}" \
  --version 2.11.0 \
  --values my-values.yaml
```

## 执行升级

使用迁移后的 values 和 Chart 默认值重新渲染 release：

```bash
helm upgrade "${release}" hami-charts/hami \
  --namespace "${namespace}" \
  --version 2.11.0 \
  --reset-values \
  --values my-values.yaml
```

`--reset-values` 会丢弃 release 中保存的旧 values。所有需要保留的覆盖都必须写入 `my-values.yaml`，或通过其他 `--values` 文件传入。

这次迁移不要使用 `--reuse-values` 或 `--reset-then-reuse-values`。旧 values 中的已删除字段会被带入新 Chart，导致渲染失败。

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

kubectl logs gpu-test-pod
kubectl delete pod gpu-test-pod
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

如果回滚后仍有工作负载异常，先恢复维护窗口前的 GPU 工作负载，再检查 scheduler、device plugin 和节点日志。

## 获取帮助

如果升级过程中遇到问题：

1. 查看[故障排查指南](../troubleshooting/troubleshooting.md)
2. 检查 scheduler 和 device plugin 日志
3. 查看 [GitHub Issues](https://github.com/Project-HAMi/HAMi/issues)
4. 在[社区讨论区](https://github.com/Project-HAMi/HAMi/discussions)提问

## 另请参阅

- [安装指南](./online-installation.md)
- [卸载指南](./uninstall.md)
- [HAMi 支持的设备](../userguide/device-supported.md)
- [HAMi 文档](../core-concepts/introduction.md)
