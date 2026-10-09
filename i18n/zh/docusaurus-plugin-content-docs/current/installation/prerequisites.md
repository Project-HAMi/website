---
title: 前置条件
sidebar_label: 前置条件
translated: true
---

安装 HAMi 前，按以下要求准备 Kubernetes 集群和设备节点。

## 集群要求

- Kubernetes 1.23 或更高版本，且容器运行时工作正常。
- 已安装 Helm 和 `kubectl`，且当前账号有权限安装 HAMi 的集群资源。
- 节点操作系统和内核满足设备驱动要求。驱动及运行时配置见下方设备指南。

## 按设备查找前置条件 {#device-prerequisites}

| 设备 | 前置条件与配置入口 |
| --- | --- |
| NVIDIA GPU | [准备 NVIDIA GPU 节点](#准备-nvidia-gpu-节点) |
| 华为昇腾 NPU | [先决条件](../userguide/ascend-device/enable-ascend-sharing.md#先决条件) |
| AMD GPU | [节点需求](../userguide/amd-device/enable-amd-gpu-sharing.md#节点需求) |
| 寒武纪 MLU | [节点需求](../userguide/cambricon-device/enable-cambricon-mlu-sharing.md#节点需求) |
| 海光 HCU | [节点需求](../userguide/hygon-device/enable-hygon-hcu-sharing.md#节点需求) |
| 摩尔线程 GPU | [节点需求](../userguide/mthreads-device/enable-mthreads-gpu-sharing.md#节点需求) |
| 天数智芯 GPU | [前置条件](../userguide/iluvatar-device/enable-iluvatar-gpu-sharing.md#前置条件) |
| 燧原 GCU | [节点需求](../userguide/enflame-device/enable-enflame-gcu-sharing.md#节点需求) |
| AWS Neuron | [前提条件](../userguide/awsneuron-device/enable-awsneuron-managing.md#前提条件) |
| 昆仑芯 XPU | [整卡调度](../userguide/kunlunxin-device/enable-kunlunxin-schedule.md#前置条件) / [vXPU 共享](../userguide/kunlunxin-device/enable-kunlunxin-vxpu.md#前置条件) |
| 沐曦 GPU | [整卡调度](../userguide/metax-device/metax-gpu/enable-metax-gpu-schedule.md#前提条件) / [sGPU 共享](../userguide/metax-device/metax-sgpu/enable-metax-gpu-sharing.md#需求) |
| 壁仞 GPU | [设备配置](../userguide/biren-device/enable-biren-sharing.md#使用壁仞设备) |
| 瀚博半导体 | [设备配置](../userguide/vastai/enable-vastai-sharing.md#使用瀚博半导体设备) |

## 准备 NVIDIA GPU 节点

为 NVIDIA GPU 节点安装与 GPU 型号、工作负载 CUDA 版本兼容的驱动，并为 Kubernetes 使用的容器运行时配置 NVIDIA Container Toolkit。

### 使用 NVIDIA GPU Operator 准备节点

[NVIDIA GPU Operator](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/getting-started.html) 可自动安装驱动和 Container Toolkit。根据驱动和 Toolkit 的管理方式，选择对应的 Helm values：

| 驱动管理方       | Toolkit 管理方 | GPU Operator Helm values                        |
| ---------------- | -------------- | ----------------------------------------------- |
| GPU Operator     | GPU Operator   | `driver.enabled=true`、`toolkit.enabled=true`   |
| 宿主机或 VM 镜像 | GPU Operator   | `driver.enabled=false`、`toolkit.enabled=true`  |
| 宿主机或 VM 镜像 | 宿主机         | `driver.enabled=false`、`toolkit.enabled=false` |

驱动和 Toolkit 均由宿主机管理时，无需安装 GPU Operator。如果仍需用 Operator 管理其他组件，按上表关闭驱动和 Toolkit 安装。

:::warning

将 GPU Operator 的 `devicePlugin.enabled` 设为 `false`，保留 HAMi 的 NVIDIA Device Plugin。同一节点上已单独部署的 NVIDIA Device Plugin 也需停用，避免向 kubelet 重复注册 `nvidia.com/gpu`。

:::

以下示例使用 GPU Operator **v26.3.3** 和 HAMi 默认的 `envvar` 设备分配策略。安装前，完成以下检查：

- 按 [Operator 支持矩阵](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/platform-support.html)核对操作系统、内核和 Kubernetes 版本。
- 确认集群满足 Operator 安装指南中的 Pod Security Admission 要求。
- 如果集群已有 Node Feature Discovery，设置 `nfd.enabled=false`。

集群已安装 GPU Operator 时，修改现有 Helm values 中的对应配置，并保留其他设置。如果节点上已有 GPU 工作负载，先确认设备注入方式，再修改 `cdi.enabled`。

如果已有安装在 CRI-O 节点上启用了 CDI，关闭 CDI 前，先将这些节点的 `nvidia.com/gpu.deploy.operator-validator` 标签设为 `false`，临时停用 GPU Operator validator。关闭 CDI 后，将标签恢复为 `true`，重新启用 validator。具体步骤见 [GPU Operator 26.3 关闭 CDI 指南](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/cdi.html#disabling-cdi)。

:::note CDI 与运行时选择

自 GPU Operator 25.10 起，CDI 默认启用，`cdi.default` 已废弃且不再生效。本例设置 `cdi.enabled=false`，使用 NVIDIA runtime 和 HAMi 的 `envvar` 策略。详见 [GPU Operator 25.10 发布说明](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/25.10/release-notes.html)。

使用 CDI 时，按[为 HAMi 启用 NVIDIA CDI 支持](./configure-cdi.md)配置容器运行时和 HAMi 的 CDI 参数。

:::

使用 K3s 等内置 containerd 的发行版时，需在 GPU Operator 中指定该发行版的 containerd 配置文件和 socket 路径。详见 [Operator 的 containerd 配置选项](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/getting-started.html#specifying-configuration-options-for-containerd)及 [K3s 运行时配置](https://docs.k3s.io/advanced#nvidia-container-runtime)。

将以下 GPU Operator values 保存为 `gpu-operator-values.yaml`。如果驱动已由宿主机管理，将 `driver.enabled` 改为 `false`：

```yaml
driver:
  enabled: true
toolkit:
  enabled: true
devicePlugin:
  enabled: false
cdi:
  enabled: false
```

安装 GPU Operator：

```bash
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update
helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator --create-namespace \
  --version v26.3.3 \
  --values gpu-operator-values.yaml \
  --wait
```

安装后，检查 GPU Operator 的状态：

```bash
kubectl get clusterpolicies
kubectl get pods,daemonsets -n gpu-operator
```

确认以下结果：

- ClusterPolicy 状态为 `ready`。
- 已启用的驱动和 Toolkit 组件就绪。
- GPU Operator 未运行 NVIDIA Device Plugin DaemonSet 或 Pod。

新准备的节点在 HAMi 的 NVIDIA Device Plugin 启动前，通常还没有 `nvidia.com/gpu` 容量。

### 在宿主机安装驱动和 Toolkit

为每个 NVIDIA GPU 节点安装合适的驱动，并按 [NVIDIA Container Toolkit 安装指南](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)安装和配置 Toolkit。

使用 HAMi 默认的 `envvar` 策略时，将 NVIDIA runtime 设为默认运行时，或在安装 HAMi 时通过 RuntimeClass 选择该运行时。对于运行独立 containerd 服务的节点，执行：

```bash
sudo nvidia-ctk runtime configure --runtime=containerd --set-as-default
sudo systemctl restart containerd
```

对于通过 CRI 适配器使用 Docker 的 Kubernetes 集群，改为配置 Docker：

```bash
sudo nvidia-ctk runtime configure --runtime=docker --set-as-default
sudo systemctl restart docker
```

CRI-O 或由发行版管理的运行时，应按 Toolkit 或发行版文档配置。K3s 会生成 containerd 配置文件，需使用 [K3s 配置选项或模板](https://docs.k3s.io/advanced#configuring-containerd)持久化修改。

### 按节点环境配置 HAMi

使用下方 GPU Operator 配置前，确认 `nvidia` RuntimeClass 存在，且指向节点上已配置的 NVIDIA runtime handler：

```bash
kubectl get runtimeclass nvidia -o yaml
```

以下示例为 HAMi 的 NVIDIA Device Plugin 和 `envvar` 工作负载明确指定该 RuntimeClass。GPU Operator 25.10+ 默认启用 CDI，使用 `NVIDIA_VISIBLE_DEVICES` 的容器需要 NVIDIA runtime。详见 [GPU Operator 25.10+ 故障排查](../troubleshooting/troubleshooting.md#nvidia-toolkit-gpu-operator-25-10)。

:::warning Toolkit 就绪检查

仅当 GPU Operator 管理 Toolkit，且其 validator 会生成 `/run/nvidia/validations/toolkit-ready` 时，启用 `devicePlugin.gpuOperatorToolkitReady.enabled`。安装 HAMi 前，在每个目标 NVIDIA GPU 节点上确认文件存在：

```bash
sudo ls -l /run/nvidia/validations/toolkit-ready
```

文件缺失时，检查该节点上的 Toolkit 和 validator Pod，修复验证失败后再继续。如果 Operator 使用其他验证目录，将 `devicePlugin.gpuOperatorToolkitReady.hostPath` 设为该目录。`toolkit-validation` init 容器没有超时机制：文件一直缺失时，HAMi 的 NVIDIA Device Plugin 会停留在 `Init` 状态。Toolkit 由宿主机管理时，验证运行时配置后关闭这项检查。

:::

GPU Operator 同时管理驱动和 Toolkit 时，将以下 HAMi values 保存为 `hami-nvidia-values.yaml`：

```yaml
devicePlugin:
  runtimeClassName: nvidia
  deviceListStrategy: envvar
  nvidiaDriverRoot: /run/nvidia/driver
  gpuOperatorToolkitReady:
    enabled: true
```

- 驱动由宿主机管理时，将 `devicePlugin.nvidiaDriverRoot` 设为 `/`。路径必须与节点实际目录一致。
- Toolkit 由宿主机管理时，设置 `devicePlugin.gpuOperatorToolkitReady.enabled=false`。启用该选项会等待 Operator 的 Toolkit 就绪标记。
- RuntimeClass 使用其他名称时，将 `devicePlugin.runtimeClassName` 设为对应名称。运行时由宿主机管理且已将 NVIDIA 设为默认运行时时，可省略此配置。
- 使用 CDI 时，按 [NVIDIA CDI 指南](./configure-cdi.md)设置参数，包括驱动根目录和实际的 `nvidia-ctk` hook 路径。

### 为节点打标签

HAMi 的 NVIDIA Device Plugin 默认通过 `devicePlugin.nvidiaNodeSelector: {gpu: "on"}` 选择节点。为 NVIDIA GPU 节点添加对应标签：

```bash
kubectl label nodes <node-name> gpu=on
```

自定义 `devicePlugin.nvidiaNodeSelector` 时，按选择器为节点设置标签。

## 安装 HAMi

节点准备完成后，按 [Helm 在线安装](./online-installation.md)或[离线安装](./offline-installation.md)指南安装 HAMi。

使用上述 NVIDIA 配置时，在安装命令中添加 `--values hami-nvidia-values.yaml`。Chart 会自动选择与 Kubernetes 服务端版本匹配的 scheduler 镜像；需要手动覆盖时，参阅[在线安装指南](./online-installation.md#deploy-hami)。
