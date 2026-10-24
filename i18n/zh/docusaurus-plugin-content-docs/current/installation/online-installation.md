---
sidebar_label: 通过 Helm 在线安装
title: 通过 Helm 在线安装
---

使用官方 Helm Chart 安装新的 HAMi release。已有 release 按[升级指南](./upgrade.md)操作。

## 安装前准备

完成[集群与设备前置条件](./prerequisites.md)，按设备指南准备驱动、容器运行时、节点标签和所需 values。NVIDIA 环境将适用的运行时与 GPU Operator 配置保存为 `hami-nvidia-values.yaml`。其他厂商可能需要单独部署设备插件；在 HAMi 中启用厂商支持，不代表 Chart 会安装其设备插件。

## 添加 Helm 仓库 {#add-hami-repo}

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update hami-charts
helm search repo hami-charts/hami --versions
```

选择 Chart 版本，并使用匹配的文档版本。Next 对应开发分支，可能包含已发布 Chart 尚不支持的配置。

## 准备 values

查看所选版本的默认配置：

```bash
helm show values hami-charts/hami --version <chart-version>
```

创建 `my-values.yaml`，写入此次安装需要的覆盖配置。NVIDIA 环境从前置条件中准备的配置文件开始。共享限制、调度策略和配置优先级见[配置指南](../userguide/configure.md)。

## 部署 HAMi {#deploy-hami}

以下示例使用 `kube-system` 命名空间和 `hami` release。按实际情况替换名称，将 `<chart-version>` 替换为上一步选择的版本：

```bash
helm install hami hami-charts/hami \
  --namespace kube-system \
  --version <chart-version> \
  --values my-values.yaml
```

Chart 自动检测 Kubernetes 服务端版本，并选择匹配的 kube-scheduler 镜像。需要覆盖标签时，在 values 中设置 `scheduler.kubeScheduler.image.tag`。该镜像不使用 `global.imageTag`。

### NVIDIA 驱动发现 {#nvidia-driver-discovery}

`devicePlugin.nvidiaDriverRoot=auto` 时，设备插件读取 `/run/nvidia/validations/driver-ready`。文件不存在时，HAMi 按宿主机安装驱动处理，驱动根目录与设备根目录均使用 `/`。若 HAMi 早于 GPU Operator 完成验证启动，等待 GPU Operator 就绪后重启 HAMi 设备插件 DaemonSet。

探测结果描述设备插件返回给运行时的宿主机路径：`NVIDIA_DRIVER_ROOT` 用于生成的 CDI 配置；`devicePlugin.passDeviceSpecsEnabled=true` 时，`NVIDIA_DEV_ROOT` 用于 `DeviceSpec.HostPath`。插件自身通过 NVIDIA Container Toolkit 注入容器的驱动库和设备节点初始化 NVML、发现 GPU。为此 Chart 仅以只读方式挂载 GPU Operator 验证目录。设备插件 Pod 必须使用 NVIDIA runtime，可将其设为节点默认运行时，或通过 `devices.nvidia.runtimeClassName` 指定。

CDI 配置必须引用宿主机驱动布局，容器内部布局可能与之不同。`devicePlugin.deviceListStrategy` 包含 `cdi-*` 策略时，Chart 还会将宿主机根目录只读挂载到 `/host`。宿主机安装驱动时直接使用此挂载；GPU Operator 安装驱动时再拼接 `/run/nvidia/driver`。显式设置 `devicePlugin.nvidiaDriverRoot` 可改为仅挂载驱动根目录。

## 验证安装 {#verify-installation}

检查调度器和所选设备的设备插件 Pod：

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/instance=hami
kubectl rollout status deployment/hami-scheduler -n kube-system
```

使用 Chart 管理的 NVIDIA 设备插件时，再检查：

```bash
kubectl rollout status daemonset/hami-device-plugin -n kube-system
```

组件就绪仅说明启动完成。运行 [NVIDIA 示例](../get-started/deploy-with-helm.md#demo)或[设备指南](./prerequisites.md#device-prerequisites)中的验证步骤，检查设备分配和工作负载行为。单独部署的设备插件使用其自身的资源名称和命名空间。

后续配置修改按[升级指南](./upgrade.md)操作。性能分析和缓存清理见 [配置指南](../userguide/configure.md)，异常排查见[故障排查](../troubleshooting/troubleshooting.md)。
