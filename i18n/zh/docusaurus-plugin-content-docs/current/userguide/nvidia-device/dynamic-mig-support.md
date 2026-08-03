---
title: 启用动态 MIG 功能
translated: true
---

<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
  <strong style={{ fontSize: '0.9rem' }}>支持组件/模式：</strong>
  <a href="/zh/docs/get-started/deploy-with-helm" style={{ display: 'inline-block', padding: '3px 12px', borderRadius: '12px', background: '#10b981', color: '#fff', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none' }}>HAMi</a>
  <a href="/zh/docs/userguide/volcano-vgpu/nvidia-gpu/how-to-use-volcano-vgpu" style={{ display: 'inline-block', padding: '3px 12px', borderRadius: '12px', background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none' }}>Volcano</a>
  <a href="/zh/docs/userguide/nvidia-device/dynamic-resource-allocation" style={{ display: 'inline-block', padding: '3px 12px', borderRadius: '12px', background: '#8b5cf6', color: '#fff', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none' }}>HAMi-DRA</a>
</div>

HAMi v2.10 采用预留优先、拓扑感知的方式实现 NVIDIA 多实例 GPU（MIG）的动态切分。它不再选择并切换预定义的整卡几何配置，而是：

1. device plugin 通过 NVML 发现每块物理 GPU 支持的 MIG profile 和合法 placement。
2. `migProfileAllowlist` 定义 HAMi 可以对外暴露其中哪些 profile。
3. 调度器为每个 Pod 预留确切的物理 GPU、profile 和 placement。
4. 在 kubelet `Allocate` 阶段，device plugin 创建对应的 GPU 实例（GI）和计算实例（CI）。
5. Pod 结束后，device plugin 回收该 Pod 的 CI 和 GI，使该 placement 可以被重新使用。

这样既保留了 HAMi 统一的 `nvidia.com/gpu` 和 `nvidia.com/gpumem` 工作负载 API，又只在工作负载需要时才创建硬件隔离的 MIG 实例。

## 前提条件

- HAMi v2.10.0 或更高版本。调度器和 NVIDIA device plugin 必须使用同一套预留协议。
- 支持 MIG 的 NVIDIA Ampere、Hopper 或 Blackwell GPU，以及能够通过 NVML 暴露所需 profile 的驱动版本。
- NVIDIA Container Toolkit。
- 对每块目标 GPU 的 MIG 硬件变更拥有独占控制权。HAMi 动态 MIG 与 NVIDIA MIG Manager 不能同时管理同一块物理 GPU。

当前 Chart 包含 A30、A100、H100、H20、H200、B200 以及 **RTX PRO 6000 Blackwell Server Edition** GPU 的 profile 映射。实际能力仍由每个节点上的 NVML 决定。

## 启用动态 MIG 支持

### 1. 将节点运行模式设置为 `mig`

按照[在线安装指南](../../installation/online-installation.md)安装或升级 HAMi Chart，然后为每个目标节点将 `operatingmode` 设置为 `mig`。例如，`devicePlugin.nodeConfiguration.config` 的值可以包含：

```yaml
devicePlugin:
  nodeConfiguration:
    config: |
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

在某些硬件和驱动组合上，切换 MIG 模式可能需要重置 GPU 或重启节点。如果节点上已经在运行 GPU 工作负载，请在首次转换前先 cordon 并 drain 该节点。

### 2. 配置 profile 允许列表

[当前 Chart 的设备配置](https://github.com/Project-HAMi/HAMi/blob/v2.10.0/charts/hami/templates/scheduler/device-configmap.yaml)使用 `migProfileAllowlist`。v2.10 的默认值为：

```yaml
nvidia:
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

允许列表是集群策略，而不是硬件拓扑描述。不要在其中配置 profile 的显存、算力百分比、实例数量或 placement。device plugin 会通过 NVML 的 `GetGpuInstanceProfileInfo` 和 `GetGpuInstancePossiblePlacements` 获取这些值，并且只向调度器发布既在允许列表中又可被发现的 profile。

:::warning

如果你设置了 `device-config.content` 或提供了外部的调度器设备 ConfigMap，该内容会完全替换 Chart 的默认设备配置。请将完整的自定义配置更新为使用 `migProfileAllowlist`。`knownMigGeometries` 是 v2.9 的旧字段，不会被自动转换。

:::

修改节点模式或调度器设备配置后，重启 HAMi 调度器以及受影响节点上的 NVIDIA device plugin。确认 device plugin 日志中出现 profile 发现记录，并且每块 MIG GPU 都在 `hami.io/node-nvidia-register` 中发布了非空的 `migProfiles` 数组：

```bash
kubectl get node MIG-NODE-A -o json \
  | jq -r '.metadata.annotations["hami.io/node-nvidia-register"] | fromjson'
```

未列入允许列表或 NVML 无法发现的型号或 profile，不会被作为可调度的 MIG 容量发布。

## 运行 MIG 工作负载

使用与 HAMi-core 相同的资源名称申请由 MIG 支撑的 vGPU。当工作负载必须运行在 MIG 节点上时，设置 `nvidia.com/vgpu-mode: "mig"`：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mig-workload
  annotations:
    nvidia.com/vgpu-mode: "mig"
spec:
  containers:
    - name: workload
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 8000
```

`nvidia.com/gpumem` 的单位是 1 MiB。调度器会选择 NVML 上报显存能够满足请求、且存在合法且不重叠 placement 的最小允许 profile。如果当前没有可用的 placement，Pod 会保持 Pending；HAMi 不会迁移正在运行的 GI，也不会把整块 GPU 切换到另一个模板。

如果没有 `nvidia.com/vgpu-mode` 注解，工作负载可以被放置到兼容的 HAMi-core 或 MIG 资源池中。HAMi 仍然暴露统一的 `nvidia.com/gpu` 资源，而不是 `nvidia.com/mig-1g.10gb` 这类资源。

## 预留与实例生命周期

调度器会为每个申请的 MIG 设备在 Pod 注解 `hami.io/vgpu-mig-allocations` 中写入一条记录。例如，分配成功后一条记录可能如下：

```json
[
  {
    "containerIndex": 0,
    "deviceIndex": 0,
    "gpuUUID": "GPU-xxxxxxxx",
    "profile": "2g.10gb",
    "placement": { "start": 2, "size": 2 },
    "migUUID": "MIG-xxxxxxxx",
    "gpuInstanceID": 4,
    "computeInstanceID": 0
  }
]
```

调度器最初只记录容器索引、设备索引、父 GPU、profile 和 placement。在 `Allocate` 阶段，device plugin 会：

1. 根据当前 NVML 能力校验该预留；
2. 对所选物理 GPU 上的变更进行串行化；
3. 严格按预留的 placement 创建 GI 和 CI；
4. 将生成的 MIG 设备注入容器；
5. 在注解中补充 `migUUID`、`gpuInstanceID` 和 `computeInstanceID`。

物理 GPU、profile 和 placement 共同构成幂等的预留键，因此重复的分配请求会收敛到同一个受管实例。该注解是 HAMi 的内部契约：用户和其他控制器不得创建、删除或修改它。

可以这样查看：

```bash
kubectl get pod mig-workload -o json \
  | jq -r '.metadata.annotations["hami.io/vgpu-mig-allocations"] | fromjson'
```

device plugin 会定期将受管实例与其节点上的活动 Pod 进行比对。当 Pod 被删除、成功或失败时，其对应的 CI 和 GI 会被精确销毁，而不会改动其他 Pod 拥有的实例。如果无法完整读取 Kubernetes API 或注解，则会跳过破坏性协调，而不是凭猜测处理。

### device plugin 重启恢复

启动时，device plugin 结合活动 Pod 的预留和 NVML 进程状态来识别正在承载工作负载的 GPU。它会将空闲 GPU 准备为可动态分配的状态，根据 NVML 校验完整的运行时记录，并将匹配的活动 GI/CI 实例接管到新的管理进程中。这样可以在 device plugin 重启后保留当前的 v2.10 分配。

重启接管要求具备 v2.10 记录的完整 profile、placement、MIG UUID、GI ID 和 CI ID。旧的模板/slot 标识不包含足够的物理身份信息，无法被安全接管。

## 监控已创建的 MIG 实例

调度器的指标端点会为每个拥有完整运行时身份的已创建分配暴露一条 `hami_node_gpu_mig_instance_info` 序列：

```bash
curl http://<scheduler-ip>:31993/metrics
```

```text
# HELP hami_node_gpu_mig_instance_info Realized MIG instance identity and scheduler placement
# TYPE hami_node_gpu_mig_instance_info gauge
hami_node_gpu_mig_instance_info{compute_instance_id="0",device_index="0",device_uuid="GPU-xxxxxxxx",gpu_instance_id="4",mig_uuid="MIG-xxxxxxxx",node="MIG-NODE-A",placement_size="2",placement_start="2",profile="2g.10gb",zone="vGPU"} 1
```

父 GPU 的 `device_uuid` 和 `gpu_instance_id` 可以与携带 `UUID` 和 `GPU_I_ID` 标签的 DCGM 指标关联。旧指标 `nodeGPUMigInstance` 仅在 `legacyMetrics: true` 时输出，Chart 默认值为 `false`。其他调度器分配指标见[集群设备分配](../monitoring/device-allocation.md)。

## 从旧版动态 MIG 迁移

v2.9 的几何配置实现与 v2.10 的预留实现使用互不兼容的调度器/device plugin 契约。旧调度器把模板和 slot 编码在设备标识中，而 v2.10 要求上文描述的显式 Pod 预留。旧 MIG Pod 无法被无缝滚动接管。

首次迁移时：

1. 盘点调度器设备 ConfigMap、活动的 MIG Pod、节点注册注解以及 `nvidia-smi -L` 的输出。
2. cordon 一个 MIG 节点，并 drain 或等待其上的旧 MIG 工作负载结束。
3. 用 `migProfileAllowlist` 替换 `knownMigGeometries`。通常允许列表就是旧几何配置中 profile 名称的并集；删除手工维护的显存、算力、数量和布局数据。
4. 先升级调度器，再升级 device plugin，避免旧调度器向 v2.10 的插件发送模板/slot 分配。
5. 逐节点升级 device plugin。启动过程可能会移除 HAMi 判定为空闲的 GPU 上已有的 GI/CI 实例。
6. 在解除 cordon 之前，验证 profile 发布、Pod 预留、GI/CI 创建、Pod 删除与回收以及 device plugin 重启接管。

迁移完成后，只要存在合法的空闲 placement，日常创建和删除混合 profile 不再需要切换整卡模板。首次迁移、启用或禁用 MIG 模式、驱动或 GPU 重置维护、回滚，以及需要移动正在运行实例的布局变更，仍可能需要 drain 节点。

## 从 NVIDIA MIG Manager 迁移

NVIDIA MIG Manager 和 HAMi 动态 MIG 都可以创建和销毁 GI/CI 实例，因此两者不能同时协调同一块物理 GPU。在目标节点上启用 HAMi `mig` 模式之前：

1. cordon 该节点并迁走现有 GPU 工作负载；
2. 停止 MIG Manager 对目标 GPU 的协调，包括任何会重新创建它或重新应用 `nvidia.com/mig.config` 的控制器；
3. 保留 HAMi 仍然需要的 GPU Operator 组件，例如驱动、Container Toolkit，以及可选的 DCGM；
4. 先运行一个金丝雀 Pod，然后测试混合 profile、容量耗尽、回收以及 device plugin 重启恢复。

如果 MIG Manager 的控制器会立即重建 Pod，仅删除一次 MIG Manager Pod 是不够的。除非你已经明确验证了按 GPU 隔离的所有权，否则应指定唯一的控制器作为硬件变更的所有者。关于 NVIDIA 静态 MIG 工作流及其重新配置限制，请参阅 [NVIDIA GPU Operator MIG 文档](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-mig.html)。

## 限制

- 动态 MIG 遵循 NVIDIA 的 placement 规则。碎片化可能导致总切片数足够，却没有可供更大 profile 使用的合法连续 placement。
- HAMi 不会迁移活动的 GI/CI 来整理 GPU 碎片。
- Ampere 之前的 GPU 不支持 MIG。
- 启用或禁用 MIG 模式仍可能需要重置或重启，具体取决于 GPU 和驱动。
