---
title: Kubernetes 的 HAMi DRA
linktitle: HAMi DRA
translated: true
---

## 介绍

HAMi 已经提供了对 K8s [DRA](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)（动态资源分配）功能的支持。
[HAMi DRA webhook](https://github.com/Project-HAMi/HAMi-DRA) 是一个 Kubernetes mutating webhook，能够自动将 GPU 设备资源请求转换为 DRA ResourceClaim，从而实现 GPU 工作负载的动态资源分配。它可以让你在 DRA 模式下获得与传统 DevicePlugin 使用方式一致的使用体验。

## 功能特性

- **自动资源转换**：将 GPU 资源请求转换为 ResourceClaim
- **资源清理**：自动移除 Pod spec 中的 GPU 资源字段，并创建对应的 ResourceClaim
- **注解支持**：支持通过 Pod 注解进行设备选择（UUID、设备类型）
- **指标监控**：可选的 monitor 组件，通过 Prometheus 采集并暴露 GPU 资源指标

## 前提条件

- Kubernetes 版本 >= 1.34 并且 DRA Consumable Capacity [featuregate](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/) 已启用
- 底层容器运行时（例如 containerd 或 CRI-O）必须启用 [CDI](https://github.com/cncf-tags/container-device-interface?tab=readme-ov-file#how-to-configure-cdi)
- NVIDIA GPU 驱动版本 440 及以上

## 安装

### 1. 安装 cert-manager

HAMi DRA Webhook 依赖 [cert-manager](https://cert-manager.io/docs/installation/) 提供 TLS 证书，需要提前安装：

```bash
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

### 2. 安装 HAMi-DRA

```bash
helm repo add hami-dra https://project-hami.github.io/HAMi-DRA
helm repo update
helm install hami-dra hami-dra/hami-dra
```

如果 GPU 驱动是主机预装的（非 GPU Operator 管理），需额外添加以下参数：

```bash
helm install hami-dra hami-dra/hami-dra \
  --set drivers.nvidia.containerDriver=false
```

### 验证安装

检查所有 Pod 是否正常运行：

```bash
$ kubectl get pods -n hami-system
NAME                                     READY   STATUS    RESTARTS   AGE
hami-dra-driver-kubelet-plugin-bzkr4     1/1     Running   0          73m
hami-hami-dra-monitor-7b484d5f95-bxx6z   1/1     Running   0          74m
hami-hami-dra-webhook-64bfdc6b86-fnwtp   1/1     Running   0          74m
```

检查 GPU 设备是否已发布为 ResourceSlice：

```bash
$ kubectl get resourceslices
NAME                                             NODE         DRIVER                          POOL         AGE
ecs-a10-sh-hami-core-gpu.project-hami.io-nnxrv   ecs-a10-sh   hami-core-gpu.project-hami.io   ecs-a10-sh   73m
```

## 配置

### 设备资源

可以通过 `--set` 参数或自定义 `values.yaml` 配置设备资源名称，默认值为：

```yaml
resourceName: "nvidia.com/gpu"
resourceMem: "nvidia.com/gpumem"
resourceCores: "nvidia.com/gpucores"
```

### Monitor 组件

monitor 组件是可选功能，通过 Prometheus 采集并暴露 GPU 资源指标，默认启用。

通过 NodePort 暴露 monitor 服务：

```yaml
monitor:
  enabled: true
  service:
    type: NodePort
    nodePort:
      metrics: 31995
```

## 支持的设备

DRA 功能的实现需要对应设备的 DRA Driver 提供支持，目前支持的设备包括：

- [NVIDIA GPU](../userguide/nvidia-device/dynamic-resource-allocation)

参照对应的页面安装设备驱动。

## 使用方式

HAMi DRA 支持两种使用模式：**DRA 原生模式**和 **DevicePlugin 兼容模式**。

### DRA 原生模式

创建 ResourceClaim 来请求指定 cores 和 memory 的 GPU：

```yaml
apiVersion: resource.k8s.io/v1
kind: ResourceClaim
metadata:
  name: gpu-half-claim
spec:
  devices:
    requests:
    - name: gpu
      exactly:
        deviceClassName: hami-core-gpu.project-hami.io
        allocationMode: ExactCount
        count: 1
        capacity:
          requests:
            cores: 50
            memory: "10Gi"
```

在 Pod 中引用该 ResourceClaim：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test-dra
spec:
  containers:
  - name: cuda
    image: nvidia/cuda:13.0.1-base-ubi9
    command: ["sleep", "3600"]
    resources:
      claims:
      - name: gpu
  resourceClaims:
  - name: gpu
    resourceClaimName: gpu-half-claim
  restartPolicy: Never
```

### DevicePlugin 兼容模式

HAMi DRA webhook 会自动将 DevicePlugin 风格的资源请求转换为 DRA ResourceClaim，可以使用与传统模式完全相同的资源语法：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test-compatible
spec:
  containers:
  - name: cuda
    image: nvidia/cuda:13.0.1-base-ubi9
    command: ["sleep", "3600"]
    resources:
      limits:
        nvidia.com/gpu: 1
        nvidia.com/gpumem: 10240
        nvidia.com/gpucores: 50
  restartPolicy: Never
```

## 查看监控

HAMi DRA 提供了与传统模式相同的监控功能，安装 HAMi DRA 时会默认启用监控服务，你可以将监控服务通过 NodePort 暴露到外部，或添加 Prometheus 采集来访问监控指标。

你可以在[设备分配监控页面](../userguide/monitoring/device-allocation)查看 HAMi DRA 提供的监控指标。

访问指标：

```bash
curl http://<node-ip>:31995/metrics
```

关于 monitor 的详细配置、指标说明及 Prometheus 集成，请参考 [HAMi DRA Monitor 文档](https://github.com/Project-HAMi/HAMi-DRA/blob/main/docs/MONITOR.md)。
