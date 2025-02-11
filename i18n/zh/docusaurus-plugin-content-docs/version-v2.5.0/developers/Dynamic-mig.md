---
title: NVIDIA GPU MPS 和 MIG 动态切片插件
translated: true
---

-

# NVIDIA GPU MPS 和 MIG 动态切片插件

## 特别感谢

没有 @sailorvii 的帮助，这个功能将无法实现。

## 介绍

NVIDIA GPU 内置的共享方法包括：时间片、MPS 和 MIG。时间片共享的上下文切换会浪费一些时间，所以我们选择了 MPS 和 MIG。GPU MIG 配置是可变的，用户可以在配置定义中获取 MIG 设备，但当前实现仅在用户需求之前定义了专用配置。这限制了 MIG 的使用。我们希望开发一个自动切片插件，并在用户需要时创建切片。
对于调度方法，将支持节点级别的 binpack 和 spread。参考 binpack 插件，我们考虑了 CPU、内存、GPU 内存和其他用户定义的资源。
HAMi 是通过使用 [hami-core](https://github.com/Project-HAMi/HAMi-core) 完成的，这是一个 cuda-hacking 库。但 mig 在全球范围内也被广泛使用。需要一个用于动态-mig 和 hami-core 的统一 API。

## 目标

- CPU、内存和 GPU 组合调度
- GPU 动态切片：Hami-core 和 MIG
- 支持通过 GPU 内存、CPU 和内存的节点级别 binpack 和 spread
- 不同虚拟化技术的统一 vGPU 池
- 任务可以选择使用 MIG、使用 HAMi-core 或同时使用两者。

### 配置映射
- hami-scheduler-device-configMap
此 configmap 定义了插件配置，包括 resourceName、MIG 几何形状和节点级别配置。

```yaml
apiVersion: v1
data:
  device-config.yaml: |
    nvidia:
      resourceCountName: nvidia.com/gpu
      resourceMemoryName: nvidia.com/gpumem
      resourceCoreName: nvidia.com/gpucores
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
      nodeconfig: 
          - name: nodeA
            operatingmode: hami-core
          - name: nodeB
            operatingmode: mig
```

## 结构

<img src="https://github.com/Project-HAMi/HAMi/blob/master/docs/develop/imgs/hami-dynamic-mig-structure.png?raw=true" width = "600" /> 

## 示例

动态 mig 与 hami 任务兼容，如下例所示：
只需设置 `nvidia.com/gpu` 和 `nvidia.com/gpumem`。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
spec:
  containers:
    - name: ubuntu-container1
      image: ubuntu:20.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2 # 请求 2 个 vGPU
          nvidia.com/gpumem: 8000 # 每个 vGPU 包含 8000m 设备内存（可选，整数）
```

任务可以通过设置 `annotations.nvidia.com/vgpu-mode` 为相应的值来决定仅使用 `mig` 或 `hami-core`，如下例所示：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
  annotations:
    nvidia.com/vgpu-mode: "mig"
spec:
  containers:
    - name: ubuntu-container1
      image: ubuntu:20.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2 # 请求 2 个 vGPU
          nvidia.com/gpumem: 8000 # 每个 vGPU 包含 8000m 设备内存（可选，整数）
```

## 流程

使用动态-mig 的 vGPU 任务的流程如下所示：

<img src="https://github.com/Project-HAMi/HAMi/blob/master/docs/develop/imgs/hami-dynamic-mig-procedure.png?raw=true" width = "800" /> 

请注意，在提交任务后，deviceshare 插件将遍历 configMap `hami-scheduler-device` 中定义的模板，并找到第一个可用的模板来适配。您可以随时更改该 configMap 的内容，并重新启动 vc-scheduler 进行自定义。

如果您在空的 A100-PCIE-40GB 节点上提交示例，那么它将选择一个 GPU 并选择以下 MIG 模板：

```yaml
  2g.10gb : 3
  1g.5gb : 1
```

然后启动具有 2g.10gb 实例 * 2 的容器。