---
title: 在 Azure Kubernetes Service 上安装 HAMi
sidebar_label: AKS 上的 HAMi
translated: true
---

本文介绍在 Linux NVIDIA GPU 节点池上安装经典 HAMi 所需的 AKS 配置：由 AKS 安装驱动，HAMi 是唯一的设备插件。需要 HAMi 2.10.0 或更高版本。本文不涉及 GPU Operator、Windows 节点池和 Node Auto Provisioning。

通用节点要求见[安装前提条件](./prerequisites.md)。完成下文配置后，按[通过 Helm 在线安装](./online-installation.md)部署。CDI 配置见 [NVIDIA CDI 支持](./configure-cdi.md)。

## 创建仅驱动的 GPU 节点池

AKS 将这种方式称为**仅驱动（driver-only）**：AKS 安装 NVIDIA 驱动，Kubernetes 设备插件由你负责。请选择所在区域有配额且[AKS 支持的 NVIDIA GPU 虚拟机规格](https://learn.microsoft.com/azure/aks/use-nvidia-gpu#supported-gpu-enabled-vms)。示例使用 `Standard_NC4as_T4_v3`。

:::warning 不要使用 AKS 完全托管 GPU 栈

完全托管 GPU 配置会安装一个声明 `nvidia.com/gpu` 的 NVIDIA 设备插件，与 HAMi 设备插件注册的资源相同，不能在同一批节点上同时运行。GPU 管理模式、驱动选择和 MIG 策略在节点池创建后无法修改。如果 `gpuProfile.nvidia.managementMode` 为 `Managed`，请创建新的仅驱动节点池替换。

:::

创建专用的用户节点池。`gpu=on` 标签是 HAMi 的节点选择器，AKS 会在扩容、重置镜像和节点镜像升级创建的节点上重新应用：

```bash
az aks nodepool add \
  --resource-group <resource-group> \
  --cluster-name <aks-cluster> \
  --name gpunp \
  --mode User \
  --node-count 1 \
  --node-vm-size Standard_NC4as_T4_v3 \
  --os-sku Ubuntu \
  --node-osdisk-type Managed \
  --labels gpu=on \
  --node-taints sku=gpu:NoSchedule \
  --gpu-driver Install \
  --enable-managed-gpu=false
```

`--gpu-driver Install` 和 `--enable-managed-gpu=false` 选择仅驱动配置。请只把 `gpu=on` 标签用于 HAMi 管理的节点池。较旧的 Azure CLI 版本可能在 `az aks nodepool show` 中省略 `managementMode`，因此请从 ARM 响应中读取该配置：

```bash
az rest --method get \
  --url "https://management.azure.com$(az aks nodepool show \
    --resource-group <resource-group> --cluster-name <aks-cluster> \
    --name gpunp --query id --output tsv)?api-version=2026-01-02-preview" \
  --query properties.gpuProfile --output yaml
```

驱动必须为 `Install`，`managementMode` 必须为空或 `Unmanaged`。

确认没有其他插件管理该节点，下面两个值都必须为空：

```bash
kubectl get node <gpu-node> \
  -o jsonpath='{.status.allocatable.nvidia\.com/gpu}{"\n"}{.metadata.labels.kubernetes\.azure\.com/dcgm-exporter}{"\n"}'
```

第一行有值，说明已有设备插件在声明 `nvidia.com/gpu`。第二行为 `enabled`，说明启用了完全托管栈。AKS 托管插件可能不会出现在 `kubectl get daemonsets` 中，因此不要只依赖该检查。

## 配置 HAMi Helm 值

将以下内容保存为 `aks-values.yaml`：

```yaml
scheduler:
  admissionWebhook:
    manageNamespaceSelector: false

devicePlugin:
  nvidiaDriverRoot: "/"
  nvidiaNodeSelector:
    kubernetes.azure.com/agentpool: gpunp
  tolerations:
    - key: sku
      operator: Equal
      value: gpu
      effect: NoSchedule
    - key: nvidia.com/gpu
      operator: Exists
      effect: NoSchedule
```

- `manageNamespaceSelector: false` 让 AKS 管理 webhook 的 `namespaceSelector`，避免 Helm server-side apply 冲突。此时 Chart 不会渲染 `scheduler.admissionWebhook.whitelistNamespaces` 和命名空间级的 `hami.io/webhook: ignore` 标签。需要绕过 webhook 时，请使用 Pod 级的 `hami.io/webhook: ignore` 标签。
- `nvidiaDriverRoot: "/"` 使用节点主机上安装的驱动。
- `nvidiaNodeSelector` 将 HAMi 设备插件限制在专用节点池。
- `tolerations` 替换 Chart 默认的空列表，覆盖 AKS 的 `sku=gpu` 污点，以及部分节点镜像使用的 `nvidia.com/gpu` 污点。

使用该文件安装 Chart，之后每次 `helm upgrade` 也使用同一个文件：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update hami-charts
helm upgrade --install hami hami-charts/hami \
  --namespace kube-system \
  --version 2.10.0 \
  --values aks-values.yaml \
  --wait
```

## 验证安装

确认 HAMi 已注册 GPU 并声明逻辑槽位。默认 `devicePlugin.deviceSplitCount: 10` 时，单 GPU 节点会报告 10 个 `nvidia.com/gpu` 槽位：

```bash
kubectl get node <gpu-node> \
  -o jsonpath='{.metadata.annotations.hami\.io/node-nvidia-register}{"\n"}{.status.allocatable.nvidia\.com/gpu}{"\n"}'
```

AKS 会在运行中的 webhook `namespaceSelector` 里排除控制平面和 AKS 托管命名空间，HAMi 不会修改这些命名空间中的 Pod。请在运行中的选择器允许的应用命名空间里运行 HAMi 工作负载：

```bash
kubectl get mutatingwebhookconfiguration hami-webhook \
  -o jsonpath='{.webhooks[0].namespaceSelector}{"\n"}'
```

运行一个申请 2048 MiB GPU 显存并容忍节点池污点的 Pod：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hami-vgpu-test
spec:
  restartPolicy: Never
  nodeSelector:
    kubernetes.azure.com/agentpool: gpunp
  tolerations:
    - key: sku
      operator: Equal
      value: gpu
      effect: NoSchedule
  containers:
    - name: cuda
      image: nvcr.io/nvidia/cuda:12.4.1-base-ubuntu22.04
      command: ["sleep", "3600"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 2048
          nvidia.com/gpucores: 20
```

`kubectl get pod hami-vgpu-test -o jsonpath='{.spec.schedulerName}'` 必须输出 `hami-scheduler`，`kubectl exec hami-vgpu-test -- nvidia-smi --query-gpu=name,memory.total --format=csv,noheader` 必须报告 2048 MiB，而不是物理显存。Pod 处于 Running 并不足以证明成功：webhook 的失败策略是 `Ignore`，webhook 连接失败时 Pod 会在没有 HAMi 调度器的情况下被创建。完整的显存限制测试见[验证 HAMi 部署与 vGPU 行为](../get-started/verify-hami.md)。完成后删除测试 Pod。

HAMi-core 提供 CUDA 和 NVML 层面的软件隔离。它不是 MIG 那样的硬件边界，不应用于隔离互不信任的租户。

## 节点生命周期

AKS 会在扩容、重置镜像、修复和节点镜像升级时替换节点，因此不要通过 SSH 安装软件包或手动修改 containerd。每次节点池生命周期操作之后，请确认池中每个节点都处于 Ready，运行着 `hami-device-plugin` Pod，并且 `hami.io/node-nvidia-register` 注解非空，然后再接受工作负载。

## 自动扩缩容

请使用固定大小的节点池。HAMi 的 `nvidia.com/gpu` 是逻辑槽位数，`nvidia.com/gpumem` 和 `nvidia.com/gpucores` 不会发布到节点的 `Capacity` 或 `Allocatable`，上游 Cluster Autoscaler 在模拟扩容时也不会调用 HAMi 的调度器扩展。请手动规划 HAMi GPU 节点池的大小，或在生产使用前验证针对具体工作负载的方案。

## GPU Operator、MIG 和 DRA

- **GPU Operator：** 上述流程不使用它。如果需要，请在使用 `--gpu-driver None` 创建的单独节点池上，按 [AKS GPU Operator 指南](https://learn.microsoft.com/azure/aks/nvidia-gpu-operator)操作，在 Operator 的 values 中设置 `devicePlugin.enabled=false`，并让其组件容忍 `sku=gpu` 污点。Operator 默认启用 CDI，因此还需参阅 [NVIDIA CDI 支持](./configure-cdi.md)，并在实际节点上确认驱动根目录和 `nvidia-ctk` 路径。
- **MIG：** AKS 托管 MIG 在创建节点池时设置配置和资源发布。除非已经验证过该组合，否则不要与 HAMi 动态 MIG 同时使用。
- **DRA：** HAMi-DRA 是独立的模型，不要与经典 HAMi 安装在同一批 GPU 上。见 [HAMi-DRA 安装](./how-to-use-hami-dra.md)。

## 故障排查

### HAMi 设备插件 Pod 处于 Pending

节点必须带有 `kubernetes.azure.com/agentpool=gpunp`（你的节点池名称），并且 Helm 值必须容忍 `sku=gpu:NoSchedule`。可用 `kubectl describe node <gpu-node>` 检查。

### 创建节点池时报告 `OverconstrainedAllocationRequest`

Azure 无法放置所请求的区域、虚拟机规格、磁盘类型和网络组合。这不是 HAMi 的错误。上面的命令使用 `--node-osdisk-type Managed`，避免临时磁盘容量成为额外约束。请选择其他 AKS 支持且有配额和容量的 GPU 虚拟机规格或区域。

### 设备插件无法发现 NVML 设备

用 `kubectl logs -n kube-system -l app.kubernetes.io/component=hami-device-plugin --all-containers` 查看设备插件日志。对于这种仅驱动路径，请保持 `nvidiaDriverRoot: "/"`，不要把 GPU Operator 的路径复制进来。

### Helm 升级报告 `namespaceSelector` 所有权冲突

请使用 HAMi 2.10.0 或更高版本，并设置 `scheduler.admissionWebhook.manageNamespaceSelector: false`。用 `helm get values hami -n kube-system` 确认已应用的值。

### 存在多个设备插件

相互竞争的插件不能共用节点。请找出来源：AKS 完全托管配置（`managementMode` 为 `Managed`，需要替换节点池）、GPU Operator（禁用其 `devicePlugin` 组件）或手动创建的 DaemonSet。

## 卸载

先删除或迁移 GPU 工作负载，再按[卸载指南](./uninstall.md)移除 HAMi：

```bash
helm uninstall hami --namespace kube-system
```

移除 HAMi 后，仅驱动节点池没有设备插件。在保留的节点池上运行 GPU 工作负载之前，请先安装标准 NVIDIA 设备插件，或删除该节点池：

```bash
az aks nodepool delete \
  --resource-group <resource-group> \
  --cluster-name <aks-cluster> \
  --name gpunp
```

## 参考

- [在 AKS 上使用 GPU](https://learn.microsoft.com/azure/aks/use-nvidia-gpu)
- [AKS 托管 GPU 节点池](https://learn.microsoft.com/azure/aks/aks-managed-gpu-nodes)
- [HAMi AKS webhook 所有权问题](https://github.com/Project-HAMi/HAMi/issues/2039)
