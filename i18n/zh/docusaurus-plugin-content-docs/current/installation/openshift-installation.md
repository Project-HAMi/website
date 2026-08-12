---
title: 在 OpenShift 上部署 HAMi
sidebar_label: OpenShift 上的 HAMi
translated: true
---

本文介绍 HAMi 在 OpenShift 上的推荐部署方式，重点涵盖 SCC、随机 UID、非特权端口和 SELinux。

## 前置条件

- OpenShift 集群已安装 NVIDIA GPU Operator；
- NVIDIA 驱动和 Container Toolkit 已就绪；
- 集群中存在 GPU Operator 配置的 NVIDIA RuntimeClass；
- 安装者有权创建集群级 `SecurityContextConstraints`（SCC）。

确认集群配置：

```bash
oc get runtimeclass
oc get nodes -L nvidia.com/gpu.present
oc describe node <gpu-node> | grep -A5 Taints
```

以下示例采用 GPU Operator 的常见配置：

```text
RuntimeClass: nvidia
node label: nvidia.com/gpu.present=true
taint: nvidia.com/gpu=true:NoSchedule
driver root: /run/nvidia/driver
toolkit validation: /run/nvidia/validations
```

如果集群使用不同的名称或路径，请同步调整 values。

## 推荐配置

建议将 HAMi 安装到独立项目：

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
  patch:
    runAsUser: null
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

  tolerations:
    - key: nvidia.com/gpu
      operator: Exists
      effect: NoSchedule
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

scheduler 和 admission 组件应使用 OpenShift 的 `restricted-v2` 或集群等价的 restricted SCC。

推荐安全上下文：

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

`runAsUser` 保持为空，由 OpenShift 从项目 UID range 自动分配 UID。

scheduler extender 在容器内监听非特权端口 `9443`，Service 对外继续提供 `443`：

```text
Service port 443 -> targetPort 9443 -> containerPort 9443
```

Deployment、Service 和 kube-scheduler extender ConfigMap 使用相同的 target port。

### Device plugin

device-plugin 使用 Chart 创建的 `hami-device-plugin` SCC。该 SCC 只授予 device-plugin ServiceAccount，并允许当前节点组件需要的权限：

- privileged container；
- host PID；
- hostPath；
- `SYS_ADMIN` capability；
- `RunAsAny` UID 和 SELinux context。

SCC 禁用 host IPC、host network 和 host ports，并限制允许的 volume 类型。

scheduler、admission 和普通业务 ServiceAccount 不绑定该 SCC。

## SELinux

启用 SELinux relabel：

```yaml
selinux:
  enabled: true
  type: container_file_t
  level: s0
```

relabel initContainer 只处理 HAMi 管理且需要容器访问的共享目录，包括：

```text
/usr/local/vgpu
/usr/local/vgpu/containers
/tmp/vgpulock
```

这些路径使用 `container_file_t`，使受限业务容器能够在正常 SELinux container domain 下访问 HAMi 共享数据。

NVIDIA driver root 由 GPU Operator 管理，并以只读方式挂载给 device-plugin 和 monitor：

```text
/run/nvidia/driver
```

HAMi 不修改该路径的 SELinux label。

## 验证

检查渲染结果：

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

- scheduler 和 admission 使用 restricted SCC；
- device-plugin 使用 `hami-device-plugin` SCC；
- scheduler extender 监听 `9443`；
- scheduler Service 将 `443` 转发到 `9443`；
- device-plugin 使用配置的 NVIDIA RuntimeClass；
- SELinux relabel 仅处理 HAMi 共享目录。

检查节点上的 SELinux label：

```bash
oc debug node/<gpu-node> -- chroot /host \
  ls -Zd /usr/local/vgpu /usr/local/vgpu/containers
```

HAMi 共享目录应使用配置的 `container_file_t`。
