---
title: 如何在 HAMi 上使用 Kueue
---

# 在 HAMi 中使用 Kueue

本指南将帮助你使用 Kueue 来管理 HAMi vGPU 资源，包括启用 Deployment 支持、配置
ResourceTransformation，以及创建请求 vGPU 资源的工作负载。

## 前置条件

在开始之前，请确保：

- 集群中已安装 HAMi
- 集群中已安装 Kueue

## 快速开始

### 安装 Kueue

如果尚未安装 Kueue，可以使用以下命令进行安装：

```bash
kubectl apply --server-side -f https://github.com/kubernetes-sigs/kueue/releases/download/v0.15.0/manifests.yaml
```

安装完成后，Kueue 控制器将运行在 `kueue-system` 命名空间中。

## 在 Kueue 中启用 Deployment 支持

Kueue 支持管理 Deployment，但你需要在 Kueue 配置中启用 `deployment` 集成。

### 配置 Kueue

编辑 Kueue manager 的配置以启用 Deployment 支持：

```bash
kubectl edit configmap kueue-manager-config -n kueue-system
```

添加如下配置：

```yaml
apiVersion: config.kueue.x-k8s.io/v1beta2
kind: Configuration
integrations:
  frameworks:
    - "deployment"
    - "pod"
```

更新配置后，重启 kueue-manager：

```bash
kubectl rollout restart deployment kueue-manager -n kueue-system
```

## 配置 ResourceTransformation

ResourceTransformation 允许 Kueue 将一种形式的资源请求转换为另一种形式。
对于 HAMi vGPU 资源，这使得 Kueue 可以使用聚合指标
（如 `nvidia.com/total-gpucores` 和 `nvidia.com/total-gpumem`）来跟踪 GPU 资源，
而不是单独的 `nvidia.com/gpu` 请求。

编辑 kueue-manager 配置以添加 ResourceTransformation：

```bash
kubectl edit configmap kueue-manager-config -n kueue-system
```

将 ResourceTransformation 配置添加到同一个 Configuration 对象中：

```yaml
apiVersion: config.kueue.x-k8s.io/v1beta2
kind: Configuration
integrations:
  frameworks:
    - "deployment"
    - "pod"
resources:
  transformations:
  - input: nvidia.com/gpucores
    strategy: Replace
    multiplyBy: nvidia.com/gpu
    outputs:
      nvidia.com/total-gpucores: "1"
  - input: nvidia.com/gpumem
    strategy: Replace
    multiplyBy: nvidia.com/gpu
    outputs:
      nvidia.com/total-gpumem: "1"
```

更新配置后，重启 kueue-manager：

```bash
kubectl rollout restart deployment kueue-manager -n kueue-system
```

### 创建 ResourceFlavor

首先，创建一个 ResourceFlavor：

```yaml
apiVersion: kueue.x-k8s.io/v1beta2
kind: ResourceFlavor
metadata:
  name: hami-flavor
spec:
  nodeLabels:
    gpu: "on"
```

该 ResourceFlavor 仅适用于启用了 vGPU 功能的节点。

### 创建 ClusterQueue

创建一个用于跟踪 HAMi 资源的 ClusterQueue：

```yaml
apiVersion: kueue.x-k8s.io/v1beta2
kind: ClusterQueue
metadata:
  name: hami-queue
spec:
  resourceGroups:
    - coveredResources: ["nvidia.com/gpu", "nvidia.com/total-gpucores", "nvidia.com/total-gpumem"]
      flavors:
        - name: hami-flavor
          resources:
            - name: "nvidia.com/gpu"
              nominalQuota: 80
            - name: "nvidia.com/total-gpucores"
              nominalQuota: 200
            - name: "nvidia.com/total-gpumem"
              nominalQuota: 10240
```

该 ClusterQueue 跟踪以下资源：

* `nvidia.com/total-gpucores`：所有 vGPU 的 GPU 核心总量（每个单位表示 1% 的 GPU 核心）
* `nvidia.com/total-gpumem`：所有 vGPU 的 GPU 显存总量（单位为 MiB）

### 创建 LocalQueue

创建一个引用该 ClusterQueue 的 LocalQueue：

```yaml
apiVersion: kueue.x-k8s.io/v1beta2
kind: LocalQueue
metadata:
  name: hami-local-queue
  namespace: default
spec:
  clusterQueue: hami-queue
```

## 创建请求 vGPU 资源的工作负载

现在，你可以创建请求 vGPU 资源的 Deployment。
Kueue 将通过 ResourceTransformation 自动转换资源请求。

### 基础 vGPU Deployment

下面是一个请求 vGPU 资源的 Deployment 示例：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vgpu-deployment
  labels:
    app: vgpu-app
    kueue.x-k8s.io/queue-name: hami-local-queue
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vgpu-app
  template:
    metadata:
      labels:
        app: vgpu-app
    spec:
      containers:
        - name: vgpu-container
          image: nvidia/cuda:11.8.0-base-ubuntu22.04
          command: ["sleep", "infinity"]
          resources:
            limits:
              nvidia.com/gpu: 1
              nvidia.com/gpucores: 50
              nvidia.com/gpumem: 1024
```

在该示例中：

* `kueue.x-k8s.io/queue-name` 标签将 Deployment 关联到 `hami-local-queue`
* `nvidia.com/gpu: 1` 请求 1 个 vGPU
* `nvidia.com/gpucores: 50` 为每个 vGPU 请求 50% 的 GPU 核心
* `nvidia.com/gpumem: 1024` 为每个 vGPU 请求 1024 MiB 的 GPU 显存

### 请求多个 vGPU 的 Deployment

你也可以创建一个请求多个 vGPU 的 Deployment：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-vgpu-deployment
  labels:
    app: multi-vgpu-app
    kueue.x-k8s.io/queue-name: hami-local-queue
spec:
  replicas: 1
  selector:
    matchLabels:
      app: multi-vgpu-app
  template:
    metadata:
      labels:
        app: multi-vgpu-app
    spec:
      containers:
        - name: vgpu-container
          image: nvidia/cuda:11.8.0-base-ubuntu22.04
          command: ["sleep", "infinity"]
          resources:
            limits:
              nvidia.com/gpu: 2
              nvidia.com/gpucores: 30
              nvidia.com/gpumem: 1024
```

该 Deployment 请求 2 个 vGPU，每个 vGPU 分配 30% 的 GPU 核心和 1024 MiB 的 GPU 显存。

## 验证资源使用情况

要检查 ClusterQueue 中的资源使用情况，可以查看 `status.flavorsReservation` 字段：

```bash
kubectl get clusterqueue hami-queue -o yaml
```

`status.flavorsReservation` 显示当前的资源消耗情况：

```yaml
status:
  flavorsReservation:
  - name: hami-flavor
    resources:
    - name: nvidia.com/total-gpucores
      total: "160"  # 当前使用量：(2 个副本 × 1 GPU × 50 核心) + (1 个副本 × 2 GPU × 30 核心) = 160
    - name: nvidia.com/total-gpumem
      total: "4096"  # 当前使用量：(2 个副本 × 1 GPU × 1024 MiB) + (1 个副本 × 2 GPU × 1024 MiB) = 4096
```

## Resource Transformation 细节

Kueue 的 ResourceTransformation 会自动转换 HAMi vGPU 的资源请求：

* `nvidia.com/gpu` × `nvidia.com/gpucores` → `nvidia.com/total-gpucores`
* `nvidia.com/gpu` × `nvidia.com/gpumem` → `nvidia.com/total-gpumem`

例如：

* 一个 Deployment 有 2 个副本，每个副本请求 `nvidia.com/gpu: 1`、`nvidia.com/gpucores: 50` 和 `nvidia.com/gpumem: 1024`
* 将消耗：`nvidia.com/total-gpucores: 100`（2 个副本 × 1 GPU × 50 核心）以及 `nvidia.com/total-gpumem: 2048`（2 个副本 × 1 GPU × 1024 MiB）

## 示例

完整可运行示例请参见 [示例文件](./examples/defalt_use.md)。
