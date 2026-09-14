---
title: 快速部署
sidebar_label: 快速部署
translated: true
---

本指南介绍如何使用 Helm 安装 HAMi，并以 NVIDIA GPU 为例运行 Pod、检查容器可见的显存容量。

## 先决条件 {#prerequisites}

- 满足[集群要求](../installation/prerequisites.md#集群要求)，包括 Kubernetes、Helm、`kubectl` 和安装权限。
- NVIDIA GPU：按下方步骤准备节点。驱动需支持 GPU 型号和工作负载使用的 CUDA 版本。
- 其他设备：从[设备前置条件目录](../installation/prerequisites.md#device-prerequisites)进入对应文档，完成驱动、容器运行时、节点标签等环境配置，再回到本文的[使用 Helm 部署 HAMi](#deploy-hami-using-helm)章节继续安装。安装时需使用设备文档要求的 Helm 参数。

## 安装步骤 {#installation}

### 准备 NVIDIA GPU 节点 {#configure-nvidia-container-toolkit}

按照[前置条件中的节点准备步骤](../installation/prerequisites.md#准备-nvidia-gpu-节点)，通过 GPU Operator 或在宿主机上安装 NVIDIA 驱动和 Container Toolkit，并配置容器运行时。

根据驱动和 Toolkit 的管理方式、RuntimeClass 及设备分配策略，调整该文档中的 HAMi values，并保存为 `hami-nvidia-values.yaml`。后续 Helm 安装命令会使用这个文件。

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

将 `scheduler.kubeScheduler.image.tag` 设为与服务端匹配的版本。下方示例使用 Kubernetes v1.29.0，执行前需按设备补充安装参数：

- NVIDIA GPU：在下方命令中添加 `--values hami-nvidia-values.yaml`，使用前面准备的配置文件。
- 其他设备：在下方命令中添加对应设备文档要求的 `--values` 或 `--set` 参数。

```bash
helm install hami hami-charts/hami -n kube-system \
  --set scheduler.kubeScheduler.image.tag=v1.29.0
```

检查 `hami-scheduler` 和所用设备的 Device Plugin Pod 是否处于 `Running` 和 `Ready` 状态。NVIDIA Device Plugin 的 Pod 名称包含 `hami-device-plugin`：

```bash
kubectl get pods -n kube-system
```

## NVIDIA GPU 示例 {#demo}

其他设备的资源名称和验证方式请参阅[对应设备文档](../installation/prerequisites.md#device-prerequisites)。

### 提交演示任务 {#submit-demo-task}

以下 Pod 通过 `nvidia.com/gpu` 申请 1 个 vGPU，并通过 `nvidia.com/gpumem` 将显存设为 10240 MiB。将配置保存为 `gpu-pod.yaml`：

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
          nvidia.com/gpumem: 10240 # 每个 vGPU 的显存为 10240 MiB（可选）
```

创建 Pod 并等待就绪：

```bash
kubectl apply -f gpu-pod.yaml
kubectl wait --for=condition=Ready pod/gpu-pod --timeout=120s
```

如果等待超时，查看 Pod 状态和 `Events` 中的错误信息，排查调度或容器启动问题。Pod 就绪后再执行下一步。

```bash
kubectl describe pod gpu-pod
```

### 检查容器可见的显存容量 {#verify-in-container-resource-control}

在容器中运行 `nvidia-smi`：

```bash
kubectl exec -it gpu-pod -- nvidia-smi
```

检查输出中 `Memory-Usage` 一栏的总显存是否为配置的 `10240MiB`。以下是输出示例，GPU 型号、驱动版本和时间以实际环境为准：

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

## 清理 {#cleanup}

验证完成后，删除示例 Pod：

```bash
kubectl delete pod gpu-pod
```

## 后续步骤 {#next-steps}

- [验证 HAMi](./verify-hami) - 进一步验证原生 GPU 环境和 HAMi
- [配置 HAMi](../userguide/configure) - 资源限制、调度策略等配置
- [设备共享](../key-features/device-sharing) - 了解 GPU 共享机制
