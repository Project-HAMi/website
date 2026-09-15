---
title: 在 Google Kubernetes Engine 上安装 HAMi
sidebar_label: GKE 上的 HAMi
translated: true
---

本文介绍在 **GKE Standard** 的 `UBUNTU_CONTAINERD` 节点上，使用 NVIDIA GPU Operator 安装 HAMi 所需的 GKE 配置。GKE Autopilot 不支持 GPU Operator。

通用节点要求见[安装前提条件](./prerequisites.md)。完成下文配置后，按 [GPU Operator 安装指南](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/getting-started.html)和[通过 Helm 在线安装](./online-installation.md)部署组件。CDI 配置见 [NVIDIA CDI 支持](./configure-cdi.md)。

## 选择驱动管理方式

GKE 可以为 GPU 节点安装 NVIDIA 驱动。准备节点池前，先确定由 GKE 还是 GPU Operator 管理驱动。两种安装方式见 [NVIDIA 的 GKE 指南](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/google-gke.html)。

无论选择哪种方式，都需要在 GPU 节点池的 `--node-labels` 中设置 `gke-no-default-nvidia-gpu-device-plugin=true`，禁用 GKE 自带的 NVIDIA Device Plugin。保留其他所需标签，包括 HAMi 使用的 `gpu=on`。同时设置 GPU Operator 的 `devicePlugin.enabled=false`，由 HAMi 负责 GPU 注册。

### 由 GPU Operator 安装驱动

在节点池的 `--accelerator` 选项中设置 `gpu-driver-version=disabled`，关闭 GKE 自动驱动安装。通过 `driver.enabled=true` 和 `toolkit.enabled=true` 启用 Operator 的驱动和 Toolkit 组件。

### 使用 GKE 安装的驱动

安装 GPU Operator 前，确认节点上的驱动已安装。新建或替换节点时，按 [Google 驱动安装器流程](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/google-gke.html#using-the-google-driver-installer)准备驱动。

:::note 自动驱动安装

在 GKE `1.34.10-gke.1328000` 的 Ubuntu 节点上，GKE 的 NVIDIA Device Plugin Pod 也包含驱动安装器。`gke-no-default-nvidia-gpu-device-plugin=true` 标签会阻止整个 Pod 运行，包括驱动安装。因此，不能仅依赖 `gpu-driver-version=default` 为带有此标签的新节点安装驱动，需要按上述流程单独准备驱动安装器。

:::

将以下配置合并到 GPU Operator 的 values 文件中：

```yaml
driver:
  enabled: false
hostPaths:
  driverInstallDir: /home/kubernetes/bin/nvidia
toolkit:
  installDir: /home/kubernetes/bin/nvidia
```

GKE 使用 `/home/kubernetes/bin/nvidia` 存放驱动文件和安装 Toolkit。合并配置时，保留其他 Toolkit 设置，包括下一节的 `toolkit.env`。

在 GKE 将 `nvidia-smi` 安装到 `/home/kubernetes/bin/nvidia/bin/nvidia-smi` 的 Ubuntu 节点上，GPU Operator 还需要通过 `/usr/bin/nvidia-smi` 识别宿主机驱动。如果该路径不存在，在**安装 GPU Operator 前**应用[驱动路径 DaemonSet](/examples/gke-nvidia-driver-path.yaml)：

```bash
kubectl apply -f https://project-hami.io/examples/gke-nvidia-driver-path.yaml
kubectl rollout status -n kube-system daemonset/gke-nvidia-driver-path
```

此 DaemonSet 选择带有 `gpu=on` 标签的 Ubuntu 节点，创建符号链接，不替换已有文件。保留此 DaemonSet 和驱动安装器，以便准备替换节点。

将 HAMi 的 `devicePlugin.nvidiaDriverRoot` 设置为 `/`。驱动文件虽然位于 `/home/kubernetes/bin/nvidia`，设备节点仍位于 `/dev`，因此安装目录不能用作运行时的驱动根目录。使用 CDI 时，将 [CDI 配置](./configure-cdi.md#配置-helm-chart)中的 `devicePlugin.nvidiaHookPath` 设置为 `/home/kubernetes/bin/nvidia/toolkit/nvidia-ctk`。

安装 GPU Operator 后，检查宿主机驱动的识别结果：

```bash
kubectl exec -n gpu-operator daemonset/nvidia-container-toolkit-daemonset \
  -c nvidia-container-toolkit-ctr -- cat /run/nvidia/validations/driver-ready
```

输出应包含 `IS_HOST_DRIVER=true`、`NVIDIA_DRIVER_ROOT=/` 和 `NVIDIA_DEV_ROOT=/`。

## 指定 containerd 配置来源

在 **GKE 1.33 及以上版本**中，将以下设置添加到 GPU Operator 的 values 文件：

```yaml
toolkit:
  env:
    - name: RUNTIME_CONFIG_SOURCE
      value: file
```

此设置让 Toolkit 直接读取 containerd 配置文件，规避可能导致 containerd 配置错误、Operator 容器无法启动的 [GKE 已知问题](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/google-gke.html#prerequisites)。无论是否启用 CDI，都需要应用此设置，并保留其他所需的 `toolkit.env` 项。

## 允许关键优先级 Pod

在 `kube-system` 之外的命名空间中，GKE 要求通过 ResourceQuota 允许优先级为 `system-node-critical` 或 `system-cluster-critical` 的 Pod。

安装 GPU Operator 前，如果目标命名空间尚不存在，先创建命名空间：

```bash
kubectl create namespace gpu-operator
```

将以下内容保存为 `critical-pods-quota.yaml`：

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: critical-pods
spec:
  hard:
    pods: "100"
  scopeSelector:
    matchExpressions:
      - operator: In
        scopeName: PriorityClass
        values:
          - system-node-critical
          - system-cluster-critical
```

将配额应用到 Operator 的命名空间：

```bash
kubectl apply -n gpu-operator -f critical-pods-quota.yaml
```

如果将 HAMi 安装到 `kube-system` 之外的命名空间，也需要在安装前创建目标命名空间并应用相同配额。

## 下一步

1. 按 [GPU Operator 安装指南](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/getting-started.html)，使用上述配置准备的 values 文件安装 Operator，并确认组件就绪。
2. 如果使用 CDI，按节点的驱动根目录和 Toolkit 路径完成 [NVIDIA CDI 配置](./configure-cdi.md)。
3. 按[通过 Helm 在线安装](./online-installation.md)，传入准备好的 HAMi values 文件，安装 HAMi 并验证安装结果。
