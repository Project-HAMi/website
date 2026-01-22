---
title: 如何使用 Volcano vGPU 设备插件
translated: true
---

# Kubernetes 的 Volcano vgpu 设备插件

**注意**：

使用 volcano-vgpu 时，您*不需要*安装 HAMi，只需使用  
[Volcano vgpu 设备插件](https://github.com/Project-HAMi/volcano-vgpu-device-plugin) 就足够了。它可以为由 volcano 管理的 NVIDIA 设备提供设备共享机制。

这基于 [Nvidia 设备插件](https://github.com/NVIDIA/k8s-device-plugin)，使用 [HAMi-core](https://github.com/Project-HAMi/HAMi-core) 支持 GPU 卡的硬隔离。

Volcano vgpu 仅在 volcano > 1.9 中可用

## 快速开始

### 配置调度器

更新调度器配置：

```shell script
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

### 在 Kubernetes 中启用 GPU 支持

一旦您在*所有*希望使用的 GPU 节点上启用了此选项，您就可以通过部署以下 Daemonset 在集群中启用 GPU 支持：

```
$ kubectl create -f https://raw.githubusercontent.com/Project-HAMi/volcano-vgpu-device-plugin/main/volcano-vgpu-device-plugin.yml
```

### 验证环境是否准备好

检查节点状态，如果 `volcano.sh/vgpu-number` 包含在可分配资源中，则表示正常。

```shell script
$ kubectl get node {node name} -oyaml
...
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

### 运行 VGPU 作业

可以通过在 resource.limit 中设置 "volcano.sh/vgpu-number"、"volcano.sh/vgpu-cores" 和 "volcano.sh/vgpu-memory" 来请求 VGPU。

```shell script
$ cat <<EOF | kubectl apply -f -
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
          volcano.sh/vgpu-number: 2 # 请求 2 个 gpu 卡
          volcano.sh/vgpu-memory: 3000 # （可选）每个 vGPU 使用 3G 设备内存
          volcano.sh/vgpu-cores: 50 # （可选）每个 vGPU 使用 50% 核心  
EOF
```

您可以在容器内使用 nvidia-smi 验证设备内存：

> **警告：** *如果在使用设备插件和 NVIDIA 镜像时不请求 GPU，机器上的所有 GPU 都将暴露在您的容器内。
> 容器使用的 vgpu 数量不能超过该节点上的 gpu 数量。*

### 监控

volcano-scheduler-metrics 记录每个 GPU 的使用和限制，访问以下地址以获取这些指标。

```
curl {volcano scheduler cluster ip}:8080/metrics