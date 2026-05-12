---
title: 实时 GPU 用量
sidebar_label: 实时用量
---

实时监控允许你在 Kubernetes 集群中随工作负载运行时，跟踪 GPU 利用率、显存用量以及资源分配情况。HAMi 提供了动态观察 GPU 行为的工具。

## 使用 kubectl 进行监控

### 查看节点 GPU 资源

查看节点当前 GPU 容量与可分配资源：

```bash
kubectl get node <node-name> -o json | jq '.status.allocatable' | grep -i gpu
```

### 查看 Pod GPU 分配情况

查看某个 Pod 分配了哪些 GPU：

```bash
kubectl get pod <pod-name> -o json | jq '.metadata.annotations' | grep -i gpu
```

或者查看所有 GPU 相关信息：

```bash
kubectl describe pod <pod-name>
```

## 在容器内部监控

### 查看 Pod 内已分配 GPU

在运行中的容器内，可以查看当前可见的 GPU：

```bash
kubectl exec -it <pod-name> -- nvidia-smi
```

该命令会显示容器视角下的虚拟 GPU 配置，包括已分配的显存和计算核心。

### 实时 GPU 用量

在工作负载运行时监控 GPU 用量：

```bash
kubectl exec -it <pod-name> -- watch -n 1 nvidia-smi
```

该命令每秒刷新一次 GPU 指标，包括：

* GPU 利用率百分比
* 显存用量与上限
* 运行中的进程

## 节点级监控

### 查看节点上所有 GPU

通过 SSH 登录节点并运行：

```bash
nvidia-smi
```

持续监控：

```bash
watch -n 1 nvidia-smi
```

### 检查 HAMi 设备插件状态

验证 HAMi 设备插件是否正常运行并上报资源：

```bash
kubectl get pods -n kube-system | grep hami
kubectl logs -n kube-system -l app=hami-scheduler -f
```

## 资源注解追踪

HAMi 将 GPU 信息存储在节点注解中，可以这样查看：

```bash
kubectl get node <node-name> -o yaml | grep -A 10 "hami.io/node"
```

这将显示详细 GPU 信息，包括：

* GPU UUID
* 显存容量
* 计算核心数量
* 设备型号

## 与监控工具集成

在生产环境中，建议将 HAMi 与以下工具集成：

* **Prometheus**：抓取 kubelet 指标以获取 GPU 资源数据
* **Grafana**：可视化 GPU 用量趋势
* **Kubernetes Dashboard**：在 Web UI 中查看 GPU 资源

参考 Kubernetes 官方文档配置相关监控。

## 故障排查

如果你发现 GPU 分配不一致的问题：

1. 检查 Pod 的资源 request/limit 是否与 HAMi 注解匹配
2. 确认 HAMi 调度器是否正在运行
3. 查看设备插件日志是否有错误
4. 确保节点已正确打上 GPU 相关标签

更多细节请参考[故障排查指南](../../troubleshooting/troubleshooting.md)。
