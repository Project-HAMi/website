---
title: 在 OpenShift 上部署 HAMi
sidebar_label: OpenShift 上的 HAMi
translated: true
---

本文说明如何在 OpenShift 上部署 HAMi，涵盖 SCC、随机 UID、非特权端口和 SELinux。

## 前置条件

- OpenShift 集群已安装 NVIDIA GPU Operator
- NVIDIA 驱动和 Container Toolkit 已就绪
- 集群中已有 GPU Operator 配置的 NVIDIA RuntimeClass
- 具备创建集群级 `SecurityContextConstraints`（SCC）的权限

确认集群配置：

```bash
oc get runtimeclass
oc get nodes -L nvidia.com/gpu.present
oc describe node <gpu-node> | grep -A5 Taints
```

下文示例基于常见的 GPU Operator 配置。若名称或路径不同，请按集群实际情况调整：

```text
RuntimeClass: nvidia
node label: nvidia.com/gpu.present=true
taint: nvidia.com/gpu=true:NoSchedule
driver root: /run/nvidia/driver
toolkit validation: /run/nvidia/validations
```

## 推荐配置

为 HAMi 创建独立项目：

```bash
oc new-project hami
```

创建 `values-openshift.yaml`：

```yaml
platform:
  openshift: true

openshift:
  securityContextConstraints:
    create: true
    name: hami-device-plugin

selinux:
  enabled: true
  type: container_file_t
  level: s0

scheduler:
  service:
    httpPort: 443
    httpTargetPort: 9443

devicePlugin:
  runtimeClassName: nvidia
  nvidiaDriverRoot: /run/nvidia/driver

  gpuOperatorToolkitReady:
    enabled: true
    hostPath: /run/nvidia/validations

  nvidiaNodeSelector:
    nvidia.com/gpu.present: "true"
```

若使用 OpenShift 内置 `privileged` SCC：

```yaml
openshift:
  securityContextConstraints:
    create: false
    name: privileged
```

安装 HAMi：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update

helm upgrade --install hami hami-charts/hami \
  --namespace hami \
  --create-namespace \
  -f values-openshift.yaml
```

## 安全模型

### Scheduler 和 admission

scheduler 与 admission 使用 OpenShift `restricted-v2` 或等价的 restricted SCC。

启用 OpenShift 时应用的安全上下文：

```yaml
securityContext:
  runAsNonRoot: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
  seccompProfile:
    type: RuntimeDefault
```

容器 UID 由 OpenShift 从项目 UID range 分配。非 OpenShift 集群仍使用 Chart 默认值 `scheduler.patch.runAsUser: 2000`。

端口映射：

```text
Service port 443 -> targetPort 9443 -> containerPort 9443
```

Deployment、Service 与 kube-scheduler extender ConfigMap 使用相同的 target port。

### Device plugin

Chart 创建 `hami-device-plugin` SCC，并授予 device-plugin ServiceAccount。该 SCC 允许：

- privileged container
- host PID
- hostPath
- `SYS_ADMIN` capability
- UID 与 SELinux context 使用 `RunAsAny`

允许的 volume 类型：`configMap`、`downwardAPI`、`emptyDir`、`hostPath`、`projected`、`secret`。host IPC、host network、host ports 保持关闭。

scheduler、admission 与业务工作负载继续使用平台 restricted SCC。

## SELinux

启用 SELinux relabel：

```yaml
selinux:
  enabled: true
  type: container_file_t
  level: s0
```

relabel initContainer 为 HAMi 共享目录设置 `container_file_t`：

```text
/usr/local/vgpu
/usr/local/vgpu/containers
/tmp/vgpulock
```

受限业务容器即可在标准 SELinux container domain 下访问这些路径。

NVIDIA driver root 由 GPU Operator 管理，并以只读方式挂载到 device-plugin 和 monitor：

```text
/run/nvidia/driver
```

driver root 的 SELinux label 由 GPU Operator 维护。卸载后如需恢复宿主机 SELinux label 与目录权限，请手动处理。

## 验证

渲染清单：

```bash
helm template hami hami-charts/hami \
  --namespace hami \
  -f values-openshift.yaml > /tmp/hami-openshift.yaml

grep -nE 'SecurityContextConstraints|system:openshift:scc|http_bind|targetPort|urlPrefix|runtimeClassName' \
  /tmp/hami-openshift.yaml
```

检查组件状态：

```bash
oc rollout status deployment/hami-scheduler -n hami
oc rollout status daemonset/hami-device-plugin -n hami
```

检查 Pod 使用的 SCC：

```bash
oc get pods -n hami \
  -o 'custom-columns=NAME:.metadata.name,SCC:.metadata.annotations.openshift\.io/scc'
```

预期结果：

- scheduler 与 admission：restricted SCC
- device-plugin：`hami-device-plugin` SCC
- scheduler extender 监听 `9443`
- scheduler Service 将 `443` 映射到 `9443`
- device-plugin 使用配置的 NVIDIA RuntimeClass
- SELinux relabel 范围：HAMi 共享目录

检查节点 SELinux label：

```bash
oc debug node/<gpu-node> -- chroot /host \
  ls -Zd /usr/local/vgpu /usr/local/vgpu/containers /tmp/vgpulock
```

HAMi 共享目录应显示配置的 `container_file_t`。
