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

### 中国网络环境下的镜像源 {#image-source}

Chart 默认使用上游镜像仓库（`global.imageSource=upstream`）。在中国网络环境下，若从上游仓库拉取镜像缓慢或失败，可设置 `global.imageSource=cn`。使用前，先通过上面的 `helm show values` 命令确认所选 Chart 版本包含 `global.imageSource`。

:::warning DaoCloud 镜像服务的可用性

DaoCloud 公共镜像服务（`m.daocloud.io`）可能出现拥堵或限流。选择 `cn` 不保证镜像拉取更快或一定成功。如果仍然拉取失败，可改用能够访问的上游仓库，或将所需镜像复制到自有仓库，并配置对应的镜像 registry 和 repository 参数。

:::

使用 `global.imageSource=cn` 时，需保持 `global.imageRegistry` 为空（默认值）。非空的 `global.imageRegistry` 优先级更高，会禁用镜像源选择。

将以下配置合并到 `my-values.yaml`，保留已有的其他 `global` 配置：

```yaml
global:
  imageSource: cn
```

也可在后文的安装命令中追加 `--set global.imageSource=cn`。

对于受支持的默认镜像引用，`cn` 为 kube-scheduler 和默认固定摘要的 certgen 镜像选择阿里云镜像源，为 HAMi、mock-device-plugin 和 Lupine 服务端、客户端镜像选择 [DaoCloud 镜像源](https://github.com/DaoCloud/public-image-mirror)。自定义仓库不会自动改写。镜像覆盖配置和例外情况见 [Chart values 参数表](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md)。

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

保留 `devicePlugin.nvidiaDriverRoot=auto` 即可自动探测驱动路径。插件读取 GPU Operator 的 `/run/nvidia/validations/driver-ready`；文件不存在时，按宿主机安装驱动处理。若 HAMi 早于 GPU Operator 完成验证启动，等待 GPU Operator 就绪后重启 HAMi 设备插件 DaemonSet。

设备插件 Pod 必须使用 NVIDIA runtime，才能加载驱动库并发现 GPU。可将 NVIDIA 设为节点默认运行时，或配置 `devices.nvidia.runtimeClassName`。CDI 的配置和前置条件见[配置 CDI](./configure-cdi.md)，驱动路径覆盖及挂载行为见 [Chart values 参数表](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md)。

## 验证安装 {#verify-installation}

以下命令使用 `kube-system` 命名空间、`hami` release 和默认资源名称。自定义安装时，使用实际的命名空间、release 标签值和 Chart 渲染的资源名称。例如，使用默认命名配置的 `gpu` release 会创建 `gpu-hami-scheduler` 和 `gpu-hami-device-plugin`。

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

后续配置修改按[升级指南](./upgrade.md)操作。配置项说明见[配置指南](../userguide/configure.md)，异常排查见[故障排查](../troubleshooting/troubleshooting.md)。
