---
title: 使用 Helm 部署 HAMi
sidebar_label: 使用 Helm 部署 HAMi
translated: true
---

本指南介绍如何准备 NVIDIA GPU 节点、使用 Helm 安装 HAMi，并通过示例 Pod 验证显存限制。其他设备请参阅对应的[设备指南](../installation/prerequisites.md#按设备查找前置条件)。

## 先决条件 {#prerequisites}

- 满足[集群要求](../installation/prerequisites.md#集群要求)，包括 Kubernetes、Helm、`kubectl` 和安装权限。
- 按 [GPU Operator 或宿主机安装流程](../installation/prerequisites.md#准备-nvidia-gpu-节点)准备 NVIDIA 驱动和 Container Toolkit。驱动需支持 GPU 型号和工作负载使用的 CUDA 版本。

## 安装步骤 {#installation}

### 准备 NVIDIA GPU 节点 {#configure-nvidia-container-toolkit}

按[准备 NVIDIA GPU 节点](../installation/prerequisites.md#准备-nvidia-gpu-节点)配置驱动、Toolkit 和容器运行时。根据驱动与 Toolkit 的管理方式、RuntimeClass 和设备分配策略，选择指南中的 HAMi values，并保存为 `hami-nvidia-values.yaml`，供下方 Helm 命令使用。

使用 GPU Operator 时，关闭其 NVIDIA Device Plugin，并在安装 HAMi 前完成 RuntimeClass 和 Toolkit 就绪检查。GPU Operator 25.10+ 配合 HAMi 的 `envvar` 策略时，使用指南中的 `devicePlugin.runtimeClassName=nvidia` 配置。使用 CDI 时，按[为 HAMi 启用 NVIDIA CDI 支持](../installation/configure-cdi.md)完成配置。

### 为 NVIDIA GPU 节点打标签 {#label-your-nodes}

HAMi 的 NVIDIA Device Plugin 默认使用 `gpu=on` 节点标签。为需要由 HAMi 管理的节点添加标签：

```bash
kubectl label nodes <node-name> gpu=on
```

如果自定义了 `devicePlugin.nvidiaNodeSelector`，使用与选择器匹配的标签。

### 使用 Helm 部署 HAMi {#deploy-hami-using-helm}

检查 Kubernetes 服务端版本：

```bash
kubectl version
```

添加 Helm 仓库：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
```

将 `scheduler.kubeScheduler.image.tag` 设为与服务端匹配的版本。例如，Kubernetes v1.29.0 对应的安装命令为：

```bash
helm install hami hami-charts/hami -n kube-system \
  --values hami-nvidia-values.yaml \
  --set scheduler.kubeScheduler.image.tag=v1.29.0
```

检查 `hami-device-plugin` 和 `hami-scheduler` Pod 是否处于 `Running` 和 `Ready` 状态：

```bash
kubectl get pods -n kube-system
```

## 演示 {#demo}

### 提交演示任务 {#submit-demo-task}

容器现在可通过 `nvidia.com/gpu` 资源类型申请 NVIDIA vGPU：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 1 # 申请 1 个 vGPU
          nvidia.com/gpumem: 10240 # 每个 vGPU 包含 10240 MiB 显存（可选）
```

等待 Pod 就绪：

```bash
kubectl wait --for=condition=Ready pod/gpu-pod --timeout=120s
```

### 验证容器内资源限制 {#verify-in-container-resource-control}

执行查询命令：

```bash
kubectl exec -it gpu-pod -- nvidia-smi
```

预期输出：

```text
[HAMI-core Msg(28:140561996502848:libvgpu.c:836)]: Initializing.....
Wed Apr 10 09:28:58 2024
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 550.54.15              Driver Version: 550.54.15      CUDA Version: 12.4     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  Tesla V100-PCIE-32GB           On  |   00000000:3E:00.0 Off |                    0 |
| N/A   29C    P0             24W /  250W |       0MiB /  10240MiB |      0%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+

+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI        PID   Type   Process name                              GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|  No running processes found                                                             |
+-----------------------------------------------------------------------------------------+
[HAMI-core Msg(28:140561996502848:multiprocess_memory_limit.c:434)]: Calling exit handler 28
```

## 清理

```bash
kubectl delete pod gpu-pod
```

## 后续步骤

- [验证 HAMi](./verify-hami) - 进一步验证原生 GPU 环境和 HAMi
- [配置 HAMi](../userguide/configure) - 资源限制、调度策略等配置
- [设备共享](../key-features/device-sharing) - 了解 GPU 共享机制
