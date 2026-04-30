---
title: 升级 HAMi
---

## 概述

将 HAMi 升级到新版本需要谨慎操作，以避免影响 GPU 工作负载。本指南涵盖升级流程、兼容性注意事项以及最佳实践。

## 升级前准备

### 1. 检查兼容性

确认目标 HAMi 版本与你当前的 Kubernetes 版本以及 NVIDIA 驱动兼容：

```bash
# 当前 HAMi 版本
helm list -n kube-system | grep hami

# Kubernetes 版本
kubectl version --short

# NVIDIA 驱动版本（在 GPU 节点上执行）
nvidia-smi | grep "Driver Version"
```

### 2. 备份当前配置

在可能需要回滚时，请保存当前 HAMi 配置：

```bash
# 备份当前 values
helm get values hami -n kube-system > hami-backup-values.yaml

# 备份 ConfigMap
kubectl get configmap hami-scheduler-device -n kube-system -o yaml > hami-configmap-backup.yaml

# 备份当前状态
kubectl get all -n kube-system -l app=hami -o yaml > hami-state-backup.yaml
```

### 3. 清理运行中的工作负载

⚠️ **关键提醒：** 升级前必须停止或重新调度所有 GPU 工作负载。在存在运行任务的情况下升级，可能导致段错误（segmentation fault）或不可预测行为。

**优雅清理 GPU 工作负载：**

```bash
# 查找使用 GPU 的 Pod
kubectl get pods --all-namespaces -o json | jq -r '.items[] | select(.spec.containers[]?.resources.limits | select(. != null) | select(has("nvidia.com/gpu") or has("enflame.com/vgcu"))) | "\(.metadata.namespace) \(.metadata.name)"'

# 删除或重新调度这些 Pod
kubectl delete pods <pod-name> -n <namespace> --grace-period=30
```

或在可用情况下调度到非 GPU 节点：

```bash
# 添加 nodeSelector 强制调度到非 GPU 节点
kubectl patch deployment <deployment-name> -n <namespace> -p '{"spec":{"template":{"spec":{"nodeSelector":{"gpu":"false"}}}}}'
```

### 4. 确认 HAMi 组件运行正常

升级前确认所有 HAMi 组件健康：

```bash
# 查看 Pod 状态
kubectl get pods -n kube-system -l app=hami

# 查看错误日志
kubectl logs -n kube-system -l app=hami-scheduler --tail=50
kubectl logs -n kube-system -l app=hami-device-plugin --tail=50
```

## 升级流程

### 标准升级（推荐）

大多数场景建议使用标准升级方式：

```bash
# 更新 Helm 仓库
helm repo update hami-charts

# 查看可用版本
helm search repo hami-charts/hami --versions

# 获取当前配置（保留自定义配置）
helm get values hami -n kube-system > current-values.yaml

# 执行升级
helm upgrade hami hami-charts/hami -n kube-system -f current-values.yaml
```

### 原地升级（使用现有安装）

如果没有自定义 values 文件，可以直接升级：

```bash
helm repo update hami-charts
helm upgrade hami hami-charts/hami -n kube-system
```

### 卸载后重装（适用于大版本升级）

对于存在破坏性变更的大版本升级，建议先卸载：

```bash
# 卸载当前版本
helm uninstall hami -n kube-system

# 更新仓库
helm repo update

# 安装新版本
helm install hami hami-charts/hami -n kube-system
```

## 升级后验证

升级完成后，请验证 HAMi 是否正常运行：

### 1. 检查 Pod 状态

```bash
kubectl get pods -n kube-system -l app=hami
```

所有 Pod 应处于 `Running` 状态。

### 2. 检查组件健康状态

```bash
# 检查 scheduler 日志错误
kubectl logs -n kube-system -l app=hami-scheduler | grep -i "error\|warning" | head -20

# 检查 device plugin 日志
kubectl logs -n kube-system -l app=hami-device-plugin | grep -i "error" | head -20
```

### 3. 测试 GPU 分配

部署测试 Pod 验证 GPU 是否正常分配：

```bash id="gpu-test"
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test-pod
  namespace: default
spec:
  containers:
  - name: test
    image: nvidia/cuda:12.2.0-runtime-ubuntu22.04
    command: ["nvidia-smi"]
    resources:
      limits:
        nvidia.com/gpu: 1
  restartPolicy: Never
EOF

# 查看运行结果
kubectl logs gpu-test-pod

# 清理测试 Pod
kubectl delete pod gpu-test-pod
```

### 4. 检查节点 GPU 状态

```bash
# 查看每个节点 GPU 资源分配情况
kubectl describe nodes | grep -A 5 "Allocated resources"

# 查看 HAMi 节点注解
kubectl get nodes -o yaml | grep -A 10 "hami.io"
```

## 故障排查

### Pod 一直处于 Pending

如果升级后 Pod 一直 Pending：

```bash
# 查看 Pod 事件
kubectl describe pod <pod-name>

# 查看 scheduler 日志
kubectl logs -n kube-system -l app=hami-scheduler | grep -i "pending\|error"

# 检查 GPU 资源
kubectl describe nodes | grep -i "gpu"
```

**解决方法：** 重启 HAMi device plugin：

```bash
kubectl rollout restart daemonset/hami-device-plugin -n kube-system
```

### GPU 在升级后未被识别

如果 GPU 未被识别：

```bash
# 在节点上检查 NVIDIA 驱动
kubectl debug node/<node-name> -it --image=ubuntu

# 在调试容器中执行
lspci | grep -i gpu
nvidia-smi
exit

# 重启对应节点的 device plugin
kubectl delete pods -n kube-system -l app=hami-device-plugin --field-selector spec.nodeName=<node-name>
```

### 升级过程中出现 Segmentation Fault

如果出现段错误：

1. **根本原因：** 升级期间仍有运行中的工作负载（如前所述）
2. **立即处理：**

   ```bash
   kubectl delete pods <affected-pod-name> -n <namespace>
   ```

3. **避免方法：** 升级前必须清理所有 GPU 任务

### Helm Chart 配置变更

如果自定义 values 不兼容新版本：

```bash
# 对比新旧配置
helm show values hami-charts/hami > new-defaults.yaml
diff current-values.yaml new-defaults.yaml

# 更新 values（移除废弃字段）
# 然后重新升级
helm upgrade hami hami-charts/hami -n kube-system -f current-values.yaml
```

## 回滚流程

如果升级失败，可以回滚到旧版本：

### 使用 Helm 回滚

```bash
# 查看历史版本
helm history hami -n kube-system

# 回滚到上一个版本
helm rollback hami -n kube-system

# 或回滚到指定版本
helm rollback hami <revision-number> -n kube-system
```

### 手动回滚

如果 Helm rollback 不可用：

```bash
# 使用备份重新安装旧版本
helm install hami hami-charts/hami -n kube-system --version <previous-version> -f hami-backup-values.yaml

# 或恢复 kubectl 备份状态
kubectl apply -f hami-state-backup.yaml
```

## 版本兼容矩阵

| HAMi 版本 | 最低 Kubernetes | 最高 Kubernetes | NVIDIA 驱动 | 说明    |
| ------- | ------------- | ------------- | --------- | ----- |
| v2.9.x  | 1.24          | 1.29          | ≥450.x    | 最新稳定版 |
| v2.8.x  | 1.23          | 1.28          | ≥450.x    |       |
| v2.7.x  | 1.21          | 1.27          | ≥450.x    |       |
| v2.6.x  | 1.20          | 1.26          | ≥450.x    |       |

更早版本请参考[发布页面](https://github.com/Project-HAMi/HAMi/releases)。

## 最佳实践

1. **先在测试环境升级** —— 不要直接在生产环境升级
2. **保留完整备份** —— ConfigMap 和状态必须备份
3. **选择维护窗口** —— 在低峰期升级
4. **持续监控** —— 升级后至少观察 30 分钟日志与指标
5. **记录变更** —— 记录升级版本与时间
6. **准备回滚方案** —— 必须提前规划回滚路径

## 获取帮助

如果升级过程中遇到问题：

1. 查看[故障排查指南](../troubleshooting/troubleshooting.md)
2. 检查 scheduler 和 device plugin 日志
3. 查看 [GitHub Issues](https://github.com/Project-HAMi/HAMi/issues)
4. 在[社区讨论区](https://github.com/Project-HAMi/HAMi/discussions)提问

## 另请参阅

* [安装指南](./online-installation.md)
* [卸载指南](./uninstall.md)
* [HAMi 文档](../core-concepts/introduction.md)
