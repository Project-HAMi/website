---
title: 启用动态 MIG 功能
translated: true
---

## 介绍

**我们现在支持通过使用 mig-parted 动态调整 mig-devices 来支持 dynamic-mig**，包括：

***动态 MIG 实例管理***：用户无需在 GPU 节点上操作，使用 'nvidia-smi -i 0 -mig 1' 或其他命令来管理 MIG 实例，所有操作将由 HAMi-device-plugin 完成。

***动态 MIG 调整***：HAMi 管理的每个 MIG 设备将根据提交的任务在必要时动态调整其 MIG 模板。

***设备 MIG 观察***：HAMi 生成的每个 MIG 实例将在调度器监视器中显示，包括任务信息。用户可以清晰地查看 MIG 节点的概况。

***兼容 HAMi-core 节点***：HAMi 可以管理 `HAMi-core 节点` 和 `mig 节点` 的统一 GPU 池。如果没有通过 `nvidia.com/vgpu-mode` 注释手动指定，任务可以被调度到任一节点。

***与 HAMi-core 统一的 API***：无需进行任何工作即可使作业与 dynamic-mig 功能兼容。

## 前提条件

* NVIDIA Blackwell 和 Hopper™ 及 Ampere 设备
* HAMi > v2.5.0
* Nvidia-container-toolkit

## 启用 Dynamic-mig 支持

* 使用 helm 安装 chart，参见[此处](https://github.com/Project-HAMi/HAMi#enabling-vgpu-support-in-kubernetes)的“在 Kubernetes 中启用 vGPU 支持”部分

* 在 device-plugin configMap 中将 `mode` 配置为 `mig` 以支持 MIG 节点
```
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

* 重启以下 pod 以使更改生效：
  * hami-scheduler 
  * 'MIG-NODE-A' 上的 hami-device-plugin

## 自定义 mig 配置（可选）
HAMi 目前有一个 [内置的 mig 配置](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/templates/scheduler/device-configmap.yaml) 用于 MIG。

您可以按照以下步骤自定义 mig 配置：

  ### 更改 charts/hami/templates/scheduler 中 'device-configmap.yaml' 的内容，如下所示

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
      deviceSplitCount: {{ .Values.devicePlugin.deviceSplitCount }}
      deviceMemoryScaling: {{ .Values.devicePlugin.deviceMemoryScaling }}
      deviceCoreScaling: {{ .Values.devicePlugin.deviceCoreScaling }}
      knownMigGeometries:
      - models: [ "A30" ]
        allowedGeometries:
          - 
            - name: 1g.6gb
              memory: 6144
              count: 4
          - 
            - name: 2g.12gb
              memory: 12288
              count: 2
          - 
            - name: 4g.24gb
              memory: 24576
              count: 1
      - models: [ "A100-SXM4-40GB", "A100-40GB-PCIe", "A100-PCIE-40GB", "A100-SXM4-40GB" ]
        allowedGeometries:
          - 
            - name: 1g.5gb
              memory: 5120
              count: 7
          - 
            - name: 2g.10gb
              memory: 10240
              count: 3
            - name: 1g.5gb
              memory: 5120
              count: 1
          - 
            - name: 3g.20gb
              memory: 20480
              count: 2
          - 
            - name: 7g.40gb
              memory: 40960
              count: 1
      - models: [ "A100-SXM4-80GB", "A100-80GB-PCIe", "A100-PCIE-80GB"]
        allowedGeometries:
          - 
            - name: 1g.10gb
              memory: 10240
              count: 7
          - 
            - name: 2g.20gb
              memory: 20480
              count: 3
            - name: 1g.10gb
              memory: 10240
              count: 1
          - 
            - name: 3g.40gb
              memory: 40960
              count: 2
          - 
            - name: 7g.79gb
              memory: 80896
              count: 1
  ```

  > **注意** Helm 安装和更新将基于此文件中的配置，覆盖 Helm 的内置配置

  > **注意** 请注意 HAMi 将按照此 configMap 的顺序找到并使用适合任务的第一个 MIG 模板

## 运行 MIG 作业

MIG 实例现在可以通过容器请求，方式与使用 `hami-core` 相同，只需指定 `nvidia.com/gpu` 和 `nvidia.com/gpumem` 资源类型。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    nvidia.com/vgpu-mode: "mig" #(可选)，如果未设置，此 pod 可以被分配到 MIG 实例或 hami-core 实例
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:18.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2 
          nvidia.com/gpumem: 8000
```

在上面的示例中，任务分配了两个 mig 实例，每个实例至少具有 8G 设备内存。

## 监控 MIG 实例

由 HAMi 管理的 MIG 实例将在调度器监视器中显示（调度器节点 ip:31993/metrics），如下所示：

```bash
# HELP nodeGPUMigInstance GPU 共享模式。0 表示 hami-core，1 表示 mig，2 表示 mps
# TYPE nodeGPUMigInstance gauge
nodeGPUMigInstance{deviceidx="0",deviceuuid="GPU-936619fc-f6a1-74a8-0bc6-ecf6b3269313",migname="3g.20gb-0",nodeid="aio-node15",zone="vGPU"} 1
nodeGPUMigInstance{deviceidx="0",deviceuuid="GPU-936619fc-f6a1-74a8-0bc6-ecf6b3269313",migname="3g.20gb-1",nodeid="aio-node15",zone="vGPU"} 0
nodeGPUMigInstance{deviceidx="1",deviceuuid="GPU-30f90f49-43ab-0a78-bf5c-93ed41ef2da2",migname="3g.20gb-0",nodeid="aio-node15",zone="vGPU"} 1
nodeGPUMigInstance{deviceidx="1",deviceuuid="GPU-30f90f49-43ab-0a78-bf5c-93ed41ef2da2",migname="3g.20gb-1",nodeid="aio-node15",zone="vGPU"} 1
```

## 注意事项

1. 您无需在 MIG 节点上执行任何操作，所有操作均由 hami-device-plugin 中的 mig-parted 管理。

2. Ampere 架构之前的 Nvidia 设备无法使用 'mig' 模式

3. 您不会在节点上看到任何 mig 资源（即 `nvidia.com/mig-1g.10gb`），hami 对 'mig' 和 'hami-core' 节点使用统一的资源名称。