---
title: 在 Microsoft Azure (AKS) 上运行 HAMi
sidebar_label: Microsoft Azure (AKS)
---

本指南提供了在 **Azure Kubernetes Service (AKS)** 上部署和运行 HAMi 的逐步操作说明，以实现跨 NVIDIA GPU 节点池的 GPU 共享和资源虚拟化。

## 概述

Azure Kubernetes Service 提供了多种支持 GPU 的虚拟机系列（例如 `NCv3`、`NCasT4_v3`、`NVadsA10_v5` 和 `NDv4` 系列）。默认情况下，Kubernetes 会将整张物理 GPU 分配给单个容器。HAMi 允许在 AKS 上让多个 Pod 共享同一张物理 GPU，并提供细粒度的显存与算力核心隔离。

## 前提条件

在 AKS 上部署 HAMi 之前，请确保具备以下条件：

- **Azure CLI (`az`)**：已安装并完成身份验证（`az login`）。
- **`kubectl`** 和 **`helm` (v3.0+)**：已在本地安装。
- 一个已创建的 AKS 集群，并配备支持 GPU 的节点池（或按照以下步骤创建）。
- Kubernetes 服务器版本 `>= 1.23`。

## 步骤 1：在 AKS 中创建 GPU 节点池

如果您的集群尚未拥有 GPU 节点，可以使用 Azure CLI 添加 GPU 节点池。

例如，创建一个带有 NVIDIA V100 GPU (`Standard_NC6s_v3`) 的节点池：

```bash
az aks nodepool add \
  --resource-group <MY_RESOURCE_GROUP> \
  --cluster-name <MY_AKS_CLUSTER> \
  --name gpunodes \
  --node-count 2 \
  --node-vm-size Standard_NC6s_v3 \
  --node-taints sku=gpu:NoSchedule \
  --labels gpu=on
```

:::note
常用的 Azure GPU 虚拟机规格包括：
- `Standard_NC6s_v3`（1x NVIDIA Tesla V100 16GB）
- `Standard_NC4as_T4_v3`（1x NVIDIA Tesla T4 16GB）
- `Standard_NV6ads_A10_v5`（1x NVIDIA A10 24GB）
- `Standard_ND96amsr_A100_v4`（8x NVIDIA A100 80GB）
:::

### 标记您的节点

HAMi 仅在带有 `gpu=on` 标签的节点上监控和调度工作负载。如果您的节点池创建时未添加此标签，请手动添加：

```bash
kubectl label nodes <node-name> gpu=on
```

### 安装 NVIDIA 驱动程序

确保 GPU 节点上已安装 NVIDIA 驱动程序。您可以选择：
- 使用 AKS 自动化 GPU 驱动程序配置（在受支持的 Azure Linux / Ubuntu 镜像上启用 `--enable-gpu-driver-daemonset`）。
- 或者安装启用了驱动程序安装的 [NVIDIA GPU Operator](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/index.html)。

## 步骤 2：避免设备插件冲突

AKS 集群可能会自动部署默认的 NVIDIA Kubernetes 设备插件 (`nvidia-device-plugin-daemonset`)。

如果默认的 NVIDIA 设备插件与 HAMi 设备插件同时运行，二者都会尝试向 kubelet 注册 `nvidia.com/gpu`，从而导致重复注册冲突。

1. 检查默认的 NVIDIA 设备插件 DaemonSet 是否正在运行：

   ```bash
   kubectl get ds -n kube-system -l app=nvidia-device-plugin-daemonset
   ```

1. 如果存在，请禁用或删除默认的 DaemonSet，以便 HAMi 能够作为唯一的 GPU 资源注册器运行：

   ```bash
   kubectl delete ds <daemonset-name> -n kube-system
   ```

## 步骤 3：使用 Helm 安装 HAMi

### 添加 HAMi Helm 仓库

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
```

### 确认您的 Kubernetes 版本

获取您的 AKS 集群 Kubernetes 版本：

```bash
kubectl version --short
```

### 创建 AKS 自定义配置文件

创建名为 `custom-aks-values.yaml` 的文件。请确保配置匹配 AKS GPU 节点污点 (`sku=gpu:NoSchedule`) 的容忍度 (`tolerations`)，将 `scheduler.kubeScheduler.image.tag` 设置为匹配您的集群版本，并可选择启用调度器的高可用配置：

```yaml
scheduler:
  leaderElect: true
  replicaCount: 2
  kubeScheduler:
    image:
      # 设置与您的 AKS Kubernetes 服务器版本匹配的标签（例如 v1.29.0）
      tag: "v1.29.0"

devicePlugin:
  tolerations:
    - key: "sku"
      operator: "Equal"
      value: "gpu"
      effect: "NoSchedule"
    - key: "nvidia.com/gpu"
      operator: "Exists"
      effect: "NoSchedule"
```

### 部署 Chart

将 HAMi 部署到 `kube-system` 命名空间：

```bash
helm install hami hami-charts/hami \
  -f custom-aks-values.yaml \
  -n kube-system
```

## 步骤 4：验证安装

### 1. 验证 Pod 状态

检查 HAMi 调度器和设备插件 Pod 是否处于 `Running` 状态：

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/name=hami
```

预期输出：

```text
NAME                                  READY   STATUS    RESTARTS   AGE
hami-device-plugin-xxxxx              1/1     Running   0          2m
hami-device-plugin-yyyyy              1/1     Running   0          2m
hami-scheduler-6d8b97bc49-abcde       1/1     Running   0          2m
hami-scheduler-6d8b97bc49-fghij       1/1     Running   0          2m
```

### 2. 验证节点扩展资源

检查您的 GPU 节点是否已上报 HAMi 虚拟 GPU 资源 (`nvidia.com/gpumem` 和 `nvidia.com/gpucores`)：

```bash
kubectl describe node <gpu-node-name> | grep -E "(nvidia.com/gpu|nvidia.com/gpumem|nvidia.com/gpucores):"
```

预期输出会显示 `nvidia.com/gpu`、`nvidia.com/gpumem`（单位为 MiB）和 `nvidia.com/gpucores`（百分比）：

```text
 nvidia.com/gpu:        1
 nvidia.com/gpumem:     16280
 nvidia.com/gpucores:   100
```

## 步骤 5：运行冒烟测试工作负载

提交一个申请部分显存（例如 4000 MiB）和 40% GPU 算力核心的测试 Pod：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: aks-gpu-test
spec:
  restartPolicy: OnFailure
  tolerations:
    - key: "sku"
      operator: "Equal"
      value: "gpu"
      effect: "NoSchedule"
  containers:
    - name: cuda-test
      image: nvidia/cuda:12.2.0-base-ubuntu22.04
      command: ["nvidia-smi"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 4000
          nvidia.com/gpucores: 40
```

应用 Pod 配置并查看日志：

```bash
kubectl apply -f aks-gpu-test.yaml
kubectl logs aks-gpu-test
```

## AKS 专属注意事项与故障排查

- **节点污点不匹配**：如果 `hami-device-plugin` Pod 处于 `Pending` 状态，请检查 GPU 节点污点（`kubectl describe node <node-name>`），并确保 `values.yaml` 中的 `devicePlugin.tolerations` 包含所有对应的污点。
- **节点自动扩缩容**：如果在 GPU 节点池上启用了 AKS Cluster Autoscaler，新扩容的节点将自动继承创建节点池时定义的标签和污点。请确保在节点池配置中设置了 `gpu=on`。
- **镜像拉取问题**：如果您的 AKS 集群位于受限或专用虚拟网络中，请考虑将 HAMi 容器镜像镜像到 Azure Container Registry (ACR)，并在 `values.yaml` 中配置 `image.repository`。
