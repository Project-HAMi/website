---
title: Kubernetes 的 HAMi DRA
linktitle: HAMi DRA
translated: true
---

## 介绍

HAMi 已经提供了对 K8s [DRA](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)（动态资源分配）功能的支持。
通过在集群中安装 [HAMi DRA webhook](https://github.com/Project-HAMi/HAMi-DRA) 你可以在 DRA 模式下获得与传统使用方式一致的使用体验。

## 前提条件

- Kubernetes 版本 >= 1.34 并且 DRA Consumable Capacity [featuregate](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/) 启用
- 底层容器运行时（例如 containerd 或 CRI-O）必须启用 [CDI](https://github.com/cncf-tags/container-device-interface?tab=readme-ov-file#how-to-configure-cdi)

## 安装

HAMi DRA Webhook 依赖 cert-manager 提供 TLS 证书，需要提前安装：

```bash
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --set crds.enabled=true
```

你可以使用以下命令添加 HAMi 图表仓库并更新依赖：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
```

然后用以下命令进行安装：

```bash
helm -n hami-system install hami hami-charts/hami \
  --set dra.enabled=true \
  --create-namespace
# 若 GPU 驱动是主机预装的（非 GPU Operator 管理），需额外指定 `--set hami-dra.drivers.nvidia.containerDriver=false`。
```

:::note

DRA 模式与传统模式不兼容，请勿同时启用。

:::

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

HAMi DRA webhook 会自动将 DevicePlugin 风格的资源请求转换为 DRA ResourceClaim。使用与传统模式相同的资源语法：

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

HAMi DRA 提供了与传统模式相同的监控功能，安装 HAMi DRA 时会默认启用监控服务，你可以将监控服务通过 NodePort 暴露到本地，或者添加 Prometheus 采集来访问监控指标。

你可以在 [这里](../userguide/monitoring/device-allocation) 查看 HAMi DRA 提供的监控指标。

更多信息参考 [HAMi DRA monitor](https://github.com/Project-HAMi/HAMi-DRA/blob/main/docs/MONITOR.md)
