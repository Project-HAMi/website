---
title: 在 Red Hat OpenShift 上安装 HAMi
sidebar_label: OpenShift 上的 HAMi
translated: true
---

本文介绍如何在 OpenShift 上安装 HAMi，适用于通过 NVIDIA GPU Operator 管理 GPU 驱动和 NVIDIA Container Toolkit 的集群。

## 前置条件

通用环境要求参阅[前置条件](./prerequisites.md)。OpenShift 还需满足以下条件：

- 已通过 `oc` 连接集群，且有权创建项目、安全上下文约束（SecurityContextConstraints，SCC）和集群级 RBAC 资源。
- 已按照 NVIDIA 的 [OpenShift 安装指南](https://docs.nvidia.com/datacenter/cloud-native/openshift/latest/install-gpu-ocp.html)安装 GPU Operator 和 Node Feature Discovery，并在 CRI-O 中启用 CDI。

检查集群状态，并将以下变量设为实际的 ClusterPolicy 名称、GPU Operator 命名空间和 GPU 节点名称：

```bash
oc whoami
oc version
oc get nodes -o wide
oc get clusterpolicy
oc get nodes -L nvidia.com/gpu.present

export GPU_CLUSTER_POLICY='gpu-cluster-policy'
export GPU_OPERATOR_NAMESPACE='nvidia-gpu-operator'
export GPU_NODE='REPLACE_WITH_GPU_NODE_NAME'

oc describe node "$GPU_NODE"
oc get pods -n "$GPU_OPERATOR_NAMESPACE" -o wide
```

## 禁用 NVIDIA device plugin

在 HAMi 管理的节点上，只能由 HAMi device plugin 注册 `nvidia.com/gpu`。替换原有插件前，在维护窗口内结束或迁移使用原有插件的 GPU 工作负载。

如果所有 NVIDIA GPU 节点都由 HAMi 管理，通过 `ClusterPolicy` 在整个集群禁用 GPU Operator 的 device plugin。如果部分节点仍需使用 NVIDIA device plugin，应先将两种插件部署到不同的节点。

```bash
oc patch clusterpolicy "$GPU_CLUSTER_POLICY" --type=merge \
  -p '{"spec":{"devicePlugin":{"enabled":false}}}'

oc get clusterpolicy "$GPU_CLUSTER_POLICY" \
  -o jsonpath='state={.status.state}{"\n"}devicePlugin.enabled={.spec.devicePlugin.enabled}{"\n"}cdi.enabled={.spec.cdi.enabled}{"\n"}'
oc get daemonsets,pods -n "$GPU_OPERATOR_NAMESPACE"
```

等待 ClusterPolicy 的状态变为 `state=ready`，确认 `devicePlugin.enabled=false` 且原 device-plugin Pod 已停止。保留驱动和 Toolkit 组件。

## 添加 Helm 仓库

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
```

## 配置 HAMi

:::warning 尚未发布的 Chart values

当前已发布的 Helm 仓库提供 HAMi Chart v2.10.0，其中不包含本指南使用的 `platform.openshift` 和 `selinux.enabled` values。包含这些 values 的 HAMi Chart v2.11.0 尚未发布。

在 v2.11.0 发布前，必须从源码仓库安装 HAMi，不能使用 `hami-charts/hami`：

```bash
git clone https://github.com/Project-HAMi/HAMi.git
cd HAMi
helm dependency build charts/hami
```

在下方安装命令中使用本地 `./charts/hami` 路径。此 OpenShift 配置不能使用已发布的 v2.10.0 Chart。

:::

创建独立项目：

```bash
oc new-project hami-system
```

将以下内容保存为 `values-openshift.yaml`，并按集群配置调整节点标签、驱动根目录和 Toolkit 可执行文件路径。

根据 `oc version` 返回的 Kubernetes 服务端版本，填写 `scheduler.kubeScheduler.image.tag`。使用已发布的上游 Kubernetes 镜像标签，不要使用 OpenShift 版本号或带 OpenShift 专用后缀的版本号。

```yaml
platform:
  openshift: true

selinux:
  enabled: true

scheduler:
  kubeScheduler:
    image:
      tag: "REPLACE_WITH_KUBERNETES_IMAGE_TAG"

devicePlugin:
  deviceListStrategy: cdi-annotations
  nvidiaDriverRoot: /run/nvidia/driver
  nvidiaHookPath: /usr/local/nvidia/toolkit/nvidia-ctk
  nvidiaNodeSelector:
    gpu: null
    nvidia.com/gpu.present: "true"
  service:
    type: ClusterIP
```

- `gpu: null` 移除 Chart 默认的 `gpu=on` 节点选择条件。省略此项时，Helm 会合并两个条件，节点必须同时具备两种标签。如果 HAMi 只管理部分 GPU 节点，在选择器中添加专用节点标签。
- Chart 已容忍 `nvidia.com/gpu:NoSchedule` 污点。仅当 GPU 节点有其他污点时，覆盖 `devicePlugin.tolerations`。
- 如果 device plugin 依赖 NVIDIA 运行时处理 `NVIDIA_VISIBLE_DEVICES`，先确认 `nvidia` RuntimeClass 已存在，再设置 `devicePlugin.runtimeClassName: nvidia`。此值也用于 HAMi 为 NVIDIA 工作负载添加的 RuntimeClass。

  GPU Operator v25.10.0 及以后版本启用 CDI 时，NVIDIA 要求此类 GPU 管理容器指定该 RuntimeClass；由 NRI 插件处理设备注入时无需设置。详见 [CDI 与 GPU 管理容器](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/cdi.html#cdi-and-gpu-management-containers)。

- `nvidiaDriverRoot` 指向宿主机上的驱动安装根目录，不能填写单个库文件所在的目录。驱动直接安装在宿主机上时，使用 `/`。`nvidiaHookPath` 指向宿主机上的 `nvidia-ctk` 可执行文件。详见 [CDI 配置](./configure-cdi.md)。
- 如果现有环境使用 HAMi 的 `envvar` 注入，设置 `deviceListStrategy: envvar` 并省略 `nvidiaHookPath`。确认 NVIDIA 运行时能为 device plugin 和工作负载处理 `NVIDIA_VISIBLE_DEVICES`。排查方法见 [GPU Operator 运行时故障排查](../troubleshooting/troubleshooting.md#nvidia-toolkit-gpu-operator-25-10)。

  在 CRI-O 上关闭已有 GPU Operator 的 CDI 时，按 NVIDIA 的[关闭 CDI 步骤](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/cdi.html#disabling-cdi)操作：先将 GPU 节点的 `nvidia.com/gpu.deploy.operator-validator` 标签设为 `false`，再将 ClusterPolicy 的 `cdi.enabled` 设为 `false`，完成后将节点标签恢复为 `true`。保持 CDI 启用，或首次安装 GPU Operator 时就禁用 CDI，均无需执行此切换流程。

仅当 GPU Operator 会创建 `toolkit-ready` 文件时，才启用 `devicePlugin.gpuOperatorToolkitReady.enabled`。启用前，确认文件位于 `devicePlugin.gpuOperatorToolkitReady.hostPath` 指定的目录下，通常是 `/run/nvidia/validations`。文件缺失时，初始化容器会一直等待。

## 安装 HAMi

OpenShift 支持需要 HAMi Helm Chart v2.11.0 或更高版本。在该版本发布前，在前面准备的源码目录中执行以下命令。

```bash
helm upgrade --install hami ./charts/hami \
  --namespace hami-system \
  -f values-openshift.yaml \
  --wait --timeout 10m
```

## 验证部署

```bash
oc get pods -n hami-system
oc get node "$GPU_NODE" \
  -o 'custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu'
```

确认调度器和 device-plugin Pod 已就绪，且 GPU 节点上报的 `nvidia.com/gpu` 可分配数量大于 0。

### 运行 GPU 共享任务

创建独立的应用项目和 ServiceAccount，不授予 ServiceAccount 使用 device-plugin SCC 的权限。

使用 Job 运行 NVIDIA 的 [CUDA VectorAdd 示例](https://docs.nvidia.com/datacenter/cloud-native/openshift/24.6.2/install-gpu-ocp.html#running-a-sample-gpu-application)。该任务申请一个 vGPU、1024 MiB 显存和 25% GPU 核心配额。镜像要求驱动兼容 CUDA 12.5；如果当前驱动不兼容，替换为功能相同且兼容的示例镜像。

```bash
oc new-project hami-test
oc create serviceaccount hami-smoke -n hami-test
```

保存为 `hami-smoke.yaml`：

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: hami-smoke
  namespace: hami-test
spec:
  backoffLimit: 0
  template:
    spec:
      serviceAccountName: hami-smoke
      restartPolicy: Never
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
      containers:
        - name: vectoradd
          image: nvcr.io/nvidia/k8s/cuda-sample:vectoradd-cuda12.5.0-ubi8
          securityContext:
            runAsNonRoot: true
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
            seccompProfile:
              type: RuntimeDefault
          resources:
            limits:
              nvidia.com/gpu: 1
              nvidia.com/gpumem: 1024
              nvidia.com/gpucores: 25
```

如果安装 HAMi 时调整了容忍度，相应修改 Job 的 `tolerations`，使其匹配 GPU 节点。提交 Job，查看日志和创建的 Pod：

```bash
oc apply -f hami-smoke.yaml
oc wait -n hami-test --for=condition=complete job/hami-smoke --timeout=300s
oc logs -n hami-test job/hami-smoke
oc get pods -n hami-test -l job-name=hami-smoke \
  -o 'custom-columns=NAME:.metadata.name,NODE:.spec.nodeName,SCHEDULER:.spec.schedulerName,RUNTIMECLASS:.spec.runtimeClassName,SCC:.metadata.annotations.openshift\.io/scc'
oc get pods -n hami-test -l job-name=hami-smoke -o yaml
```

确认以下结果：

- 日志包含 `Test PASSED`。
- Pod 使用 `hami-scheduler` 调度器。如果设置了 `devicePlugin.runtimeClassName`，Pod 使用对应的 RuntimeClass。
- Pod 运行在 HAMi 管理的 GPU 节点上。
- Pod 注解包含 HAMi 分配信息。
- 应用使用合适的受限 SCC。

Job 控制器使用应用的 ServiceAccount 创建 Pod。直接以管理员身份创建 Pod，可能使用管理员的 SCC 权限而掩盖应用权限问题。

该任务用于验证 Pod 准入、调度、设备分配和 CUDA 程序运行。验证负载下的显存与核心配额限制，还需运行[显存分配](../userguide/nvidia-device/examples/allocate-device-memory.md)和[核心分配](../userguide/nvidia-device/examples/allocate-device-core.md)示例。

## 故障排查与清理

| 现象 | 检查与处理 |
| --- | --- |
| 安装后缺少 SCC 或 SELinux 初始化容器 | 检查是否启用了 `platform.openshift` 和 `selinux.enabled`。 |
| device-plugin Pod 被 SCC 准入拒绝 | 查看 DaemonSet 事件，检查 SCC、授予 SCC 使用权限的 ClusterRole，以及 RoleBinding 的绑定对象。复用 SCC 时，确认对应的 ClusterRole 已存在。 |
| device-plugin Pod 一直处于 `Pending` | 检查节点标签、合并后的选择器、污点和容忍度。使用 NVIDIA 标签时，通过 `gpu: null` 移除默认的 `gpu=on` 选择条件。 |
| device-plugin Pod 停留在 `Init` | 查看初始化容器日志。若启用了 Toolkit 就绪检查，确认 `toolkit-ready` 文件存在；若 `selinux-relabel` 失败，检查 `chcon` 错误和宿主机路径。 |
| 出现 NVIDIA hook、缺少库文件或 CDI 设备无法解析错误 | 检查 GPU Operator 状态、RuntimeClass handler、驱动根目录、hook 可执行文件及生成的 CDI 规范。参考 [GPU Operator 运行时故障排查](../troubleshooting/troubleshooting.md#nvidia-toolkit-gpu-operator-25-10)。 |
| 工作负载无法访问 HAMi 共享文件 | 检查实际使用的 SCC、工作负载 UID、目录权限、SELinux 标签和 `selinux-relabel` 日志。不要关闭 SELinux 来绕过错误。 |
| GPU 共享任务未完成 | 运行 `oc describe job hami-smoke -n hami-test`，查看 Pod 事件和容器日志。确认 webhook 选择了 `hami-scheduler`，vGPU 资源充足，且镜像与驱动兼容。 |

验证完成后，删除示例 Job 和 ServiceAccount：

```bash
oc delete job hami-smoke -n hami-test
oc delete serviceaccount hami-smoke -n hami-test
```
