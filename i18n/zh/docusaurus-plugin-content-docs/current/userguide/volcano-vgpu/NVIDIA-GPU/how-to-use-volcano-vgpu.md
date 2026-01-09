---
title: 如何使用 Volcano vGPU
translated: true
---

# Volcano vgpu 设备插件用于 Kubernetes

:::note

使用 volcano-vgpu 时，**不需要** 安装 HAMi，仅使用  
[Volcano vGPU device-plugin](https://github.com/Project-HAMi/volcano-vgpu-device-plugin) 即可。它可以为由 Volcano 管理的 NVIDIA 设备提供设备共享机制。

该插件基于 [Nvidia Device Plugin](https://github.com/NVIDIA/k8s-device-plugin)，并使用 [HAMi-core](https://github.com/Project-HAMi/HAMi-core) 实现对 GPU 卡的硬隔离支持。

Volcano vGPU 仅在 Volcano v1.9 及更高版本中可用。

:::

## 快速开始

### 安装 Volcano

```bash
helm repo add volcano-sh https://volcano-sh.github.io/helm-charts
helm install volcano volcano-sh/volcano -n volcano-system --create-namespace
```

### 配置调度器

更新调度器配置：

```bash
kubectl edit cm -n volcano-system volcano-scheduler-configmap
```

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill"
    tiers:
    - plugins:
      - name: priority
      - name: gang
      - name: conformance
    - plugins:
      - name: drf
      - name: deviceshare
        arguments:
          deviceshare.VGPUEnable: true # 启用 vgpu
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
```

### 启用 Kubernetes 的 GPU 支持

在你想要使用的 **所有** GPU 节点上启用此选项后，  
可以通过部署以下 DaemonSet 来在集群中启用 GPU 支持：

```bash
kubectl create -f https://raw.githubusercontent.com/Project-HAMi/volcano-vgpu-device-plugin/main/volcano-vgpu-device-plugin.yml
```

### 验证环境是否就绪

检查节点状态，如果 `volcano.sh/vgpu-number` 出现在 allocatable 资源中，即表示正常。

```bash
kubectl get node {node name} -oyaml
```

输出示例：

```yaml
status:
  addresses:
  - address: 172.17.0.3
    type: InternalIP
  - address: volcano-control-plane
    type: Hostname
  allocatable:
    cpu: "4"
    ephemeral-storage: 123722704Ki
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    memory: 8174332Ki
    pods: "110"
    volcano.sh/gpu-number: "10"    # vGPU 资源
  capacity:
    cpu: "4"
    ephemeral-storage: 123722704Ki
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    memory: 8174332Ki
    pods: "110"
    volcano.sh/gpu-memory: "89424"
    volcano.sh/gpu-number: "10"   # vGPU 资源
```

### 运行 vGPU 作业

可以通过在 `resources.limits` 中设置 `volcano.sh/vgpu-number`、`volcano.sh/vgpu-cores` 和 `volcano.sh/vgpu-memory` 来请求 vGPU：

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
spec:
  containers:
    - name: cuda-container
      image: nvidia/cuda:9.0-devel
      command: ["sleep"]
      args: ["100000"]
      resources:
        limits:
          volcano.sh/vgpu-number: 2        # 请求 2 张 GPU 卡
          volcano.sh/vgpu-memory: 3000     # （可选）每个 vGPU 使用 3G 显存
          volcano.sh/vgpu-cores: 50        # （可选）每个 vGPU 使用 50% 核
EOF
```

你可以在容器内使用 `nvidia-smi` 验证设备显存使用情况：

:::warning

如果你在使用 device-plugin 配合 NVIDIA 镜像时未显式请求 GPU，  
那么该节点上所有 GPU 都会暴露在你的容器中。  
容器中使用的 vGPU 数量不能超过该节点上的 GPU 总数。

:::

### 监控

`volcano-scheduler-metrics` 会记录每次 GPU 使用和限制情况，  
你可以通过访问以下地址来获取这些指标：

```bash
curl {volcano scheduler cluster ip}:8080/metrics
```
