---
title: 升级 HAMi
---

## 升级影响

HAMi 升级会替换 scheduler 和 device plugin，并重新生成设备配置，但不会影响正在运行的 GPU 工作负载，无需因此停止或迁移现有任务。不过，正在使用 HAMi-core 的工作负载不会自动切换到新版本。HAMi-core 在 Pod 创建时注入，运行中的进程不会重新加载该库。需要使用新版 HAMi-core 的工作负载，应在升级完成后执行滚动重启或重新创建 Pod。

升级期间建议暂停提交新的 HAMi GPU 工作负载，待 scheduler、device plugin 和 admission webhook 完成更新后再恢复。组件滚动切换时可能出现短暂不可用或配置版本不一致，新任务可能因此调度失败或注入异常。

## 升级前准备

### 确认 HAMi 版本

升级前确认当前安装的是 HAMi 2.10：

```bash
helm list -n kube-system | grep hami
```

### 备份 Helm values

升级前保存当前 release 的用户配置：

```bash
helm get values hami -n kube-system -o yaml > previous-values.yaml
```

## 迁移并创建 values

从 v2.10 升级到最新版 Chart 时，设备相关字段统一迁移到 `devices.<vendor>`。请先基于备份的 values 创建 `my-values.yaml`，完成字段迁移和渲染校验，再执行升级。

### 创建 values.yaml

从 `previous-values.yaml` 创建 `my-values.yaml`，保留所有安装仍然需要的设置：

```bash
cp previous-values.yaml my-values.yaml
```

如果曾直接修改 ConfigMap，请自行记录这些 values 之外的配置，并迁移到 Helm values 或新的配置文件中。升级后不要直接恢复整个旧 ConfigMap，以免覆盖新版默认配置。

### 迁移设备字段

只迁移实际使用和覆盖过的字段。旧字段即使值为 `0`、`false` 或空值，也会导致新 Chart 渲染失败。

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
| `hcuResourceName`  | `devices.hygon.resourceCountName`  |
| `hcuResourceMem`   | `devices.hygon.resourceMemoryName` |
| `hcuResourceCores` | `devices.hygon.resourceCoreName`   |

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

### 保留原有路径的设置

`scheduler.overwriteEnv` 和其他 `devicePlugin` 设置仍使用原路径，包括 `enabled`、镜像、`deviceListStrategy`、`migStrategy`、`disablecorelimit` 和 `nodeConfiguration`。

例如，原来这样覆盖 NVIDIA 字段：

```yaml
resourceName: nvidia.com/gpu
devicePlugin:
  deviceSplitCount: 20
```

迁移后应写成：

```yaml
devices:
  nvidia:
    resourceCountName: nvidia.com/gpu
    deviceSplitCount: 20
```

Enflame、Kunlun、Vastai 和 Biren 的标准资源名现在由对应的设备字段自动加入 scheduler extender。这四类设备的 `customresources` 只保留额外资源，默认为空列表。旧 values 中复制过去的标准资源项应删除。

### 校验迁移后的配置

更新 Helm 仓库，并使用新版本 Chart 渲染一次配置：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update

helm template hami hami-charts/hami \
  --namespace kube-system \
  --version 2.11.0 \
  --values my-values.yaml \
  > /dev/null
```

## 执行升级

使用迁移后的 values 和 Chart 默认值重新渲染 release：

```bash
helm upgrade hami hami-charts/hami \
  --namespace kube-system \
  --version 2.11.0 \
  --reset-values \
  --values my-values.yaml
```

`--reset-values` 会丢弃 release 中保存的旧 values。所有需要保留的覆盖都必须写入 `my-values.yaml`，或通过其他 `--values` 文件传入。

这次迁移不要使用 `--reuse-values` 或 `--reset-then-reuse-values`。旧 values 中的已删除字段会被带入新 Chart，导致渲染失败。

## 升级后验证

### 检查工作负载

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/instance=hami
kubectl rollout status deployment/hami-scheduler -n kube-system
kubectl rollout status daemonset/hami-device-plugin -n kube-system
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
helm history hami -n kube-system
```

回滚到上一个版本：

```bash
helm rollback hami -n kube-system
```

也可以指定 revision：

```bash
helm rollback hami <revision-number> -n kube-system
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
