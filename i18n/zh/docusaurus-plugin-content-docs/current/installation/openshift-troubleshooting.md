---
title: OpenShift 故障排查
sidebar_label: 故障排查
---

诊断和解决在 Red Hat OpenShift 上运行 HAMi 时的常见问题。

## Device Plugin Pod 处于 CrashLoopBackOff

### 症状

```bash
oc get pods -n kube-system -l app=hami-device-plugin
# NAME                              READY   STATUS             RESTARTS   AGE
# hami-device-plugin-xxxxx          0/2     CrashLoopBackOff   5          5m
```

### 诊断

检查 Pod 日志：

```bash
oc logs -n kube-system hami-device-plugin-xxxxx -c nvidia-device-plugin
oc logs -n kube-system hami-device-plugin-xxxxx -c vgpu-device-plugin
```

### 常见原因和修复方法

#### 1. 未授予 SCC

**检查是否分配了 SCC：**

```bash
oc get pod hami-device-plugin-xxxxx -n kube-system \
  -o jsonpath='{.metadata.annotations.openshift\.io/scc}'
```

**预期输出：**`hami-scc`（或 `privileged`，如果使用现有 SCC）

**如果为空或 SCC 错误，请授予它：**

```bash
# 对于 HAMi 创建的 SCC
oc adm policy add-scc-to-user hami-scc \
  -z hami-device-plugin -n kube-system

# 对于现有的 privileged SCC
oc adm policy add-scc-to-user privileged \
  -z hami-device-plugin -n kube-system
```

#### 2. 错误的 NVIDIA 驱动根目录

**日志中的症状：**
```
Error: failed to load NVML: could not load NVML library
Error: library not found in /usr/lib/x86_64-linux-gnu
```

**查找正确的驱动根目录：**

```bash
oc get clusterpolicy gpu-cluster-policy \
  -o jsonpath='{.spec.driver.manager.env[?(@.name=="DRIVER_ROOT")].value}'
```

**验证路径在 GPU 节点上存在：**

```bash
oc debug node/<gpu-node-name>
chroot /host
ls -la /run/nvidia/driver
```

**更新 Helm values：**

```yaml
devicePlugin:
  nvidiaDriverRoot: /run/nvidia/driver  # 使用正确的路径
```

#### 3. SELinux 阻止访问

**检查 AVC 拒绝：**

```bash
oc debug node/<gpu-node-name>
chroot /host
ausearch -m AVC -ts recent | grep -E "nvidia|hami|vgpu"
```

**修复：**在 Helm values 中启用 SELinux 重新标记：

```yaml
devicePlugin:
  selinux:
    enabled: true
```

## Pod 未调度到 GPU

### 症状

请求 GPU 的 Pod 保持 `Pending` 状态：

```bash
oc get pod gpu-workload
# NAME           READY   STATUS    RESTARTS   AGE
# gpu-workload   0/1     Pending   0          30s
```

### 诊断

```bash
oc describe pod gpu-workload
```

### 常见原因和修复

#### 1. GPU Operator Taint 未容忍

**事件中的症状：**
```
0/3 nodes are available: 1 node(s) had untolerated taint {nvidia.com/gpu: true}
```

**修复：**升级到 Chart v2.11.0+，它默认包含此容忍度。

#### 2. 无可用 GPU 节点

**检查 GPU 节点标签：**

```bash
oc get nodes -l nvidia.com/gpu.present=true
```

**如果为空，检查 Node Feature Discovery：**

```bash
# 确保在 GPU Operator 中启用了 NFD
oc get clusterpolicy gpu-cluster-policy \
  -o jsonpath='{.spec.nfd.enabled}'

# 应返回：true
```

## SELinux 拒绝

### 症状

Pod 因权限错误而失败，尽管 SCC 正确：

```bash
oc logs gpu-workload
# Error: failed to open /dev/nvidia0: operation not permitted
```

### 诊断

**检查 AVC 拒绝：**

```bash
oc debug node/<gpu-node-name>
chroot /host
ausearch -m AVC -ts recent | grep -E "nvidia|cuda"
```

### 修复

**选项 1：启用 SELinux 重新标记（推荐）**

```yaml
devicePlugin:
  selinux:
    enabled: true
```

**选项 2：创建自定义 SELinux 策略模块**

```bash
# 从拒绝生成策略
ausearch -m AVC -ts recent | audit2allow -M hami_gpu

# 加载策略
semodule -i hami_gpu.pp
```

## 诊断命令

### 综合健康检查

```bash
#!/bin/bash
# HAMi OpenShift 诊断脚本

echo "=== HAMi 组件 ==="
oc get pods -n kube-system -l app=hami

echo "\n=== SecurityContextConstraints ==="
oc get scc hami-scc 2>/dev/null || echo "hami-scc 未找到"

echo "\n=== GPU 节点 ==="
oc get nodes -l nvidia.com/gpu.present=true

echo "\n=== GPU Operator 状态 ==="
oc get pods -n nvidia-gpu-operator

echo "\n=== Device Plugin 日志（最后 20 行）==="
oc logs -n kube-system -l app=hami-device-plugin --tail=20 -c nvidia-device-plugin

echo "\n=== GPU 容量 ==="
oc describe nodes -l nvidia.com/gpu.present=true | grep -A 5 "Allocated resources"
```

## 获取帮助

如果遇到此处未涵盖的问题：

1. **检查 HAMi 日志：**
   ```bash
   oc logs -n kube-system -l app=hami-device-plugin --all-containers
   oc logs -n kube-system -l app=hami-scheduler --all-containers
   ```

2. **运行诊断：**
   ```bash
   ./hami-diagnostics.sh > diagnostics.txt
   ```

3. **提交问题：**[HAMi GitHub Issues](https://github.com/Project-HAMi/HAMi/issues)
   - 包括：OpenShift 版本、GPU Operator 版本、HAMi Chart 版本
   - 附加：`diagnostics.txt`、相关 Pod 日志

## 相关文档

- [OpenShift 安装指南](openshift-installation.md)
- [OpenShift 示例](openshift-examples.md)
- [通用故障排查](../troubleshooting/troubleshooting.md)
