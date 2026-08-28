---
title: 启用动态 MIG 功能
translated: true
---

## 介绍

**从 v2.10.0 起，HAMi 支持 Flexible MIG**：调度器为每个 Pod 预留 MIG profile 和物理 placement，device plugin 通过 NVML 按需创建或回收对应的 GPU Instance（GI）和 Compute Instance（CI），包括：

**动态 MIG 实例管理**：用户无需在 GPU 节点上操作，使用 `nvidia-smi -i 0 -mig 1` 或其他命令来管理 MIG 实例。HAMi-device-plugin 会按需创建和销毁 GI/CI。

**动态 MIG 调整**：每个请求会被放到合法的空闲切片上。同一块 GPU 可以混合多种 profile，日常切换 profile 时不必更换整卡几何布局，也不必排空节点。

**设备 MIG 观察**：已落地的每个 MIG 实例会在调度器监视器中显示，包括 MIG UUID、profile、实例 ID 和 placement 坐标。

**兼容 HAMi-core 节点**：HAMi 可以管理 `HAMi-core 节点` 和 `mig 节点` 的统一 GPU 池。如果没有通过 `nvidia.com/vgpu-mode` 注释手动指定，任务可以被调度到任一节点。

**与 HAMi-core 统一的 API**：无需进行任何工作即可使作业与 dynamic-mig 功能兼容。继续申请 `nvidia.com/gpu` 和 `nvidia.com/gpumem` 即可。

## 前提条件

- NVIDIA Blackwell 和 Hopper™ 及 Ampere 设备
- HAMi >= v2.10.0
- NVIDIA Container Toolkit

## 启用 Dynamic-mig 支持

- 使用 Helm 安装 Chart，参见[此处](https://github.com/Project-HAMi/HAMi#enabling-vgpu-support-in-kubernetes)的“在 Kubernetes 中启用 vGPU 支持”部分

- 在 device-plugin ConfigMap 中将 `mode` 配置为 `mig` 以支持 MIG 节点

```bash
kubectl describe cm  hami-device-plugin -n kube-system
```

```json
{
  "nodeconfig": [
    {
      "name": "MIG-NODE-A",
      "operatingmode": "mig",
      "filterdevices": {
        "uuid": [],
        "index": []
      }
    }
  ]
}
```

- 重启以下 Pod 以使更改生效：
  - hami-scheduler
  - 'MIG-NODE-A' 上的 hami-device-plugin

不要在同一块物理 GPU 上同时运行 NVIDIA GPU Operator MIG Manager。GPU Operator 仍可用于提供驱动和容器运行时，但 GI/CI 状态应只由一个控制器修改。

## 自定义 MIG 配置（可选）

HAMi 目前有一个 [内置的 MIG profile 允许列表](https://github.com/Project-HAMi/HAMi/blob/v2.10.0/charts/hami/templates/scheduler/device-configmap.yaml)。

允许列表定义调度器可以使用哪些 profile。device plugin 通过 NVML 发现这些 profile 的显存、算力、实例数量和合法 placement。你不再需要维护整卡几何布局（`knownMigGeometries`），也不必重复填写 `core`、`memory` 和 `count`。

你可以按照以下步骤自定义 MIG 配置：

### 更改 charts/hami/templates/scheduler 中 'device-configmap.yaml'

<!-- prettier-ignore -->
```yaml
nvidia:
  resourceCountName: {{ .Values.resourceName }}
  resourceMemoryName: {{ .Values.resourceMem }}
  resourceMemoryPercentageName: {{ .Values.resourceMemPercentage }}
  resourceCoreName: {{ .Values.resourceCores }}
  resourcePriorityName: {{ .Values.resourcePriority }}
  overwriteEnv: false
  defaultMemory: 0
  defaultCores: 0
  defaultGPUNum: 1
  memoryFactor: 1
  deviceSplitCount: {{ .Values.devicePlugin.deviceSplitCount }}
  deviceMemoryScaling: {{ .Values.devicePlugin.deviceMemoryScaling }}
  deviceCoreScaling: {{ .Values.devicePlugin.deviceCoreScaling }}
  migProfileAllowlist:
    - models: ["A30"]
      profiles: ["1g.6gb", "2g.12gb", "4g.24gb"]
    - models: ["A100-SXM4-40GB", "A100-40GB-PCIe", "A100-PCIE-40GB"]
      profiles: ["1g.5gb", "2g.10gb", "3g.20gb", "7g.40gb"]
    - models: ["A100-SXM4-80GB", "A100-80GB-PCIe", "A100-PCIE-80GB"]
      profiles: ["1g.10gb", "2g.20gb", "3g.40gb", "7g.79gb"]
    - models: ["H100-PCIE-80GB", "H100-SXM5-80GB"]
      profiles: ["1g.10gb", "2g.20gb", "3g.40gb", "7g.80gb"]
    - models: ["H100-PCIE-94GB", "H100-SXM5-94GB"]
      profiles: ["1g.12gb", "2g.24gb", "3g.47gb", "7g.94gb"]
    - models: ["H20", "H100 on GH200"]
      profiles: ["1g.12gb", "2g.24gb", "3g.48gb", "7g.96gb"]
    - models: ["H200 NVL", "H200-SXM5"]
      profiles: ["1g.18gb", "2g.35gb", "3g.71gb", "7g.141gb"]
    - models: ["B200"]
      profiles: ["1g.23gb", "2g.45gb", "3g.90gb", "7g.180gb"]
    - models: ["RTX PRO 6000 Blackwell Server Edition"]
      profiles: ["1g.24gb", "2g.48gb", "4g.96gb"]
```

:::note

Helm 安装和更新将基于此文件中的配置，覆盖 Helm 的内置配置。

如果此前使用 `knownMigGeometries`，请取这些几何布局中 profile 名称的并集，写入 `migProfileAllowlist`。请对照实际 GPU 型号、驱动和 device-plugin 发现日志核对名称。旧字段不会自动转换。首次升级时的排空步骤见[上游迁移指南](https://github.com/Project-HAMi/HAMi/blob/v2.10.0/docs/develop/dynamic-mig-migration.md)。

:::

## 运行 MIG 作业

MIG 实例现在可以通过容器请求，方式与使用 `hami-core` 相同，只需指定 `nvidia.com/gpu` 和 `nvidia.com/gpumem` 资源类型。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    nvidia.com/vgpu-mode: "mig" #(可选)，如果未设置，此 Pod 可以被分配到 MIG 实例或 hami-core 实例
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2
          nvidia.com/gpumem: 8000
```

在上面的示例中，任务分配了两个 MIG 实例，每个实例至少具有 8G 设备显存。调度器会选择满足显存请求的允许列表 profile，以及 GPU 上互不重叠的 placement。

不要创建或编辑 `hami.io/vgpu-mig-allocations`。调度器写入预留（父 GPU、profile、placement）；device plugin 在实例创建后补充 MIG UUID、GI ID 和 CI ID。

## 监控 MIG 实例

由 HAMi 管理的 MIG 实例将在调度器监视器中显示（调度器节点 ip:31993/metrics）。分配成功后，`hami_node_gpu_mig_instance_info` 会报告已落地的身份和 placement：

```bash
# HELP hami_node_gpu_mig_instance_info Realized MIG instance identity and scheduler placement
# TYPE hami_node_gpu_mig_instance_info gauge
hami_node_gpu_mig_instance_info{node="aio-node15",device_uuid="GPU-936619fc-f6a1-74a8-0bc6-ecf6b3269313",device_index="0",mig_uuid="MIG-xxxxxxxx",profile="2g.10gb",gpu_instance_id="4",compute_instance_id="0",placement_start="2",placement_size="2"} 1
```

在 GPU 节点上，vGPUmonitor（`<GPU-node-ip>:31992/metrics`）通过 `hami_mig_device_info` 暴露容器映射，标签包括 namespace、pod、container、父 GPU UUID、MIG UUID、profile 以及 GI/CI ID。

:::note

1. 日常创建和删除时，你无需在 MIG 节点上执行任何操作。device plugin 通过 NVML 落实预留，并在 Pod 结束后回收对应的 GI/CI。

2. Ampere 架构之前的 NVIDIA 设备无法使用 MIG 模式

3. 你不会在节点上看到任何 MIG 资源（即 `nvidia.com/mig-1g.10gb`），HAMi 对 MIG 和 hami-core 节点使用统一的资源名称。

4. v2.10.0 中 Dynamic MIG 尚不支持与 CDI 模式同时使用。多卡 MIG 场景仍需在你的拓扑上验证。

5. 开启或关闭 MIG 模式、驱动升级、GPU reset，以及从基于几何布局的 Dynamic MIG 首次升级，仍可能需要排空节点。

:::
