---
title: 卸载
---

## 前置条件

在卸载 HAMi 之前，请确保你具备以下条件：

* 可以访问 Kubernetes 集群，并已配置 `kubectl`
* 已安装 Helm 3.x
* 具备从 `kube-system` 命名空间卸载资源的管理员权限

## 卸载 HAMi

### 基础卸载

卸载 HAMi 最简单的方式是使用 Helm：

```bash
helm uninstall hami -n kube-system
```

该命令将移除所有 HAMi 资源，包括：

* 调度器 Pod
* 设备插件 DaemonSet
* ConfigMap 和 Secret
* RBAC 角色与绑定

### 完全清理（可选）

如果你希望进行彻底清理并移除所有 HAMi 相关资源，请按以下步骤操作：

#### 1. 停止或重新调度运行中的任务

在卸载前，建议优雅地停止 GPU 工作负载：

```bash
kubectl delete pods -l gpu-workload=true --all-namespaces --grace-period=30
```

或者将它们重新调度到不需要 GPU 的节点上。

#### 2. 验证 HAMi Pod 是否已清除

卸载后，确认 HAMi 组件已被移除：

```bash
kubectl get pods -n kube-system | grep -i hami
```

应返回空结果。

#### 3. 清理 HAMi ConfigMap（如使用过自定义配置）

```bash
kubectl delete configmap hami-scheduler-device -n kube-system --ignore-not-found
```

#### 4. 删除 HAMi 创建的持久卷（如适用）

```bash
kubectl get pv | grep hami
kubectl delete pv <pv-name>  # 如果存在 HAMi 相关 PV
```

## 验证

要确认 HAMi 已在集群中完全移除，可以执行：

```bash
# 检查 HAMi Helm release 是否已删除
helm list -n kube-system | grep hami

# 验证是否还存在 HAMi Pod
kubectl get pods --all-namespaces | grep -i hami

# 检查是否还有残留资源
kubectl get all -n kube-system -o wide | grep -i hami
```

如果卸载成功，所有命令应无返回结果。

## 重新安装 HAMi

如需重新安装 HAMi，请参考 [安装指南](./online-installation.md)。

## 故障排查

### HAMi Pod 卡在 Terminating 状态

如果 HAMi Pod 一直处于 “Terminating” 状态，可以强制删除：

```bash
kubectl delete pods -n kube-system -l app=hami --grace-period=0 --force
```

然后重新执行卸载命令。

### Helm release 未找到错误

如果提示找不到 Helm release，说明 HAMi 已经被卸载：

```bash
Error: release named "hami" not found
```

你可以按照验证部分的方法检查 Pod 状态进行确认。

### 卸载后 GPU 资源仍被占用

如果卸载 HAMi 后 GPU 资源仍被 Pod 占用，说明这些 Pod 仍在运行。你需要：

1. 停止使用 GPU 的 Pod
2. 检查节点 GPU 资源状态
3. 等待 Kubernetes 重新调度 Pod

```bash
# 查看哪些节点分配了 GPU 资源
kubectl describe nodes | grep -A 5 "Allocated resources"

# 如有必要，重启节点（谨慎使用）
kubectl drain <node-name> --ignore-daemonsets
kubectl uncordon <node-name>
```

## 另请参阅

* [安装指南](./online-installation.md)
* [HAMi 介绍](../core-concepts/introduction.md)
