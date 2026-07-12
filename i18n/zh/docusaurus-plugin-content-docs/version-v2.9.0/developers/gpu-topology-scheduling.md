---
id: gpu-topology-scheduling
title: GPU 拓扑感知调度
sidebar_label: GPU 拓扑感知调度
---

HAMi 支持 vGPU 环境下的 GPU 拓扑感知调度。HAMi 可以根据 GPU 之间的拓扑关系优化 GPU 卡的调度，从而提高 GPU 资源的利用率和性能。

使用 `nvidia-smi topo -m` 命令查看节点上 GPU 之间的拓扑关系。

## 启用 GPU 拓扑感知调度

安装 HAMi 时，将 `scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy` 设置为 `topology-aware`：

```bash
helm install hami hami-charts/hami \
  --set scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy=topology-aware \
  -n kube-system
```

如果 HAMi 已安装，可以通过以下方式启用：

### 1. device-plugin 配置

在 DaemonSet `hami-device-plugin` 中设置环境变量 `ENABLE_TOPOLOGY_SCORE: 'true'`。

### 2. 调度器全局设置

启动 `hami-scheduler` 时添加 `gpu-scheduler-policy=topology-aware`。

### 3. Pod 级别注解

```yaml
metadata:
  annotations:
    hami.io/gpu-scheduler-policy: topology-aware
```

提交 Pod 后，检查 `hami-scheduler` 的日志（日志级别需大于 5）：

```plaintext
I0703 08:34:27.032644  1 device.go:708] "device allocate success" pod="default/testpod" best device combination={"NVIDIA":[{"Idx":7,"UUID":"GPU-dsaf","Type":"NVIDIA","Usedmem":1024,"Usedcores":0},{"Idx":5,"UUID":"GPU-gads","Type":"NVIDIA","Usedmem":1024,"Usedcores":0}]}
```

## 调度策略

### 节点选择

在满足需求的多个节点中，优先选择 GPU 数量最少但仍能满足请求的节点，以保留更大节点供大规模工作负载使用。

### 单 GPU 分配（一个 Pod，一个设备）

当 Pod 仅需要一块 GPU 时，在显存和算力满足需求的前提下，优先选择与其他 GPU **互联性最差**的 GPU，以保留高带宽 GPU 对供未来多 GPU 工作负载使用。

### 多 GPU 分配（一个 Pod，多个设备）

当 Pod 需要多块 GPU 时，优先选择**互联性最好**的 GPU 组合，以最大化 GPU 间通信带宽。
