---
title: 启用 Huawei Ascend 共享
sidebar_label: Huawei Ascend 共享
translated: true
---

Huawei Ascend 设备插件为 HAMi 提供 NPU 切片支持，支持两种模式：

## 1. 基于模板的硬切片（vNPU）

基于虚拟化模板支持显存切片，自动使用最小可用模板。有关详细信息，请查看[设备模板](./device-template.md)。

## 2. 基于运行时拦截的软切片（hami-vnpu-core）

该模式基于 `libvnpu.so` 拦截和 `limiter` 令牌调度实现软切片机制，支持细粒度的资源共享。

:::note

- `hami-vnpu-core` 目前仅支持 ARM 平台。
- `hami-vnpu-core` 目前仅支持 HAMi 调度器。

:::

## 先决条件

- Huawei Ascend 设备类型：910B, 910A, 310P
- [Huawei Ascend docker 运行时](https://gitcode.com/Ascend/mind-cluster/tree/master/component/ascend-docker-runtime)

**软切片（hami-vnpu-core）的额外要求：**

- **Huawei Ascend 驱动版本**：≥ 25.5
- **芯片模式**：需在 Huawei Ascend 芯片上启用 `device-share` 模式以支持虚拟化

启用 `device-share` 模式，运行以下命令：

```bash
npu-smi set -t device-share -i <id> -d <value>
```

| 参数    | 说明                                                                |
| ------- | ------------------------------------------------------------------- |
| `id`    | 设备 ID，通过运行 `npu-smi info -l` 命令获取的 NPU ID 即为设备 ID。 |
| `value` | 容器启用状态：`0`（禁用，默认值）或 `1`（启用）。                   |

## 启用 Huawei Ascend-sharing 支持

将以下内容加入 HAMi values 文件，然后按[在线安装指南](../../installation/online-installation.md)部署：

```yaml
devices:
  ascend:
    enabled: true
```

此配置启用 Ascend 调度支持。HAMi Chart 不会部署 `ascend-device-plugin`；插件镜像、节点选择器等部署配置应在插件自己的清单中设置。

没有特殊需求时保留默认值。全局模式和设备模板分别通过 `devices.ascend.hamiVnpuMode`、`devices.ascend.configs` 配置。需要为 Ascend Pod 指定 RuntimeClass 时，将 `devices.ascend.runtimeClassName` 设为已有 RuntimeClass 的名称。完整参数见 [Chart values 表](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md)，配置示例见 [values 源码](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml)。自定义资源名称时，还需同步修改 `devices.ascend.customresources`；列表覆盖会替换整个列表。

## 部署步骤

按插件的 [HAMi 集成指南](https://github.com/Project-HAMi/ascend-device-plugin/blob/main/docs/hami.md)部署，使用同一插件发布版本的清单和镜像。该指南包含 `ascend=on` 节点标签、运行时和插件部署步骤。

:::warning

HAMi 与插件部署在同一命名空间时，使用 HAMi Chart 生成的全局设备 ConfigMap。不要再次应用 `ascend-device-configmap.yaml`，也不要手工修改其中的 `device-config.yaml`，以免覆盖其他厂商的配置。全局参数统一通过 Helm values 中的 `devices.ascend.*` 管理，见[全局设备配置](../configure.md#device-config-overrides)。

插件部署在其他命名空间时，需要在该命名空间准备设备 ConfigMap，并保持其中的 Ascend 配置与 HAMi 的 Helm values 一致。自定义 HAMi release 名称可能改变生成的 ConfigMap 名称，需要同步调整插件的卷引用。

:::

插件独立使用的 `hami-device-node-config` ConfigMap 采用 `node-config.yaml` 数据键。需要按节点覆盖模式时，在其中设置 `hamiVnpuMode`；未覆盖的节点继承全局模式。它与 NVIDIA 插件的 `devicePlugin.nodeConfiguration` 不同，应使用所选 Ascend 插件版本提供的节点 ConfigMap 清单。

## 运行 Huawei Ascend 作业

若要独占使用整张卡或申请多张卡，只需设置对应的 resourceName 即可。若多个任务需要共享同一 NPU，则需将资源请求设置为 `1` 并配置对应的 `ResourceMemoryName`。

### Huawei Ascend 910B3（硬切片）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ascendhub.huawei.com/public-ascendhub/ascend-mindspore:23.0.RC3-centos7
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend910B3: "1"
          # 如果不指定 Ascend910B3-memory，将使用整张 NPU
          huawei.com/Ascend910B3-memory: "4096"
```

### Huawei Ascend 310P（硬切片）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ascendhub.huawei.com/public-ascendhub/ascend-mindspore:23.0.RC3-centos7
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend310P: "1"
          huawei.com/Ascend310P-memory: "1024"
```

### 软切片（hami-vnpu-core）

为 Pod 添加注解 `huawei.com/vnpu-mode: 'hami-core'` 即可启用软切片。还可以通过 `-core` 资源申请一定比例的算力核心：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ascend-soft-slice-pod
  annotations:
    huawei.com/vnpu-mode: "hami-core"
spec:
  containers:
    - name: npu_pod
      image: ascendhub.huawei.com/public-ascendhub/ascend-mindspore:23.0.RC3-centos7
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend910B3: "1"
          huawei.com/Ascend910B3-memory: "28672"
          huawei.com/Ascend910B3-core: "40" # 申请 40% 的算力核心
```

### 多卡并行推理（软切片）

软切片机制支持在同一 Pod 中申请多个虚拟设备。进行多卡并行推理（如使用 vLLM）时，`--gpu-memory-utilization` 的值不得超过容器总显存限制与所选卡物理显存总量之比。

### 示例：使用 vLLM 实现 2 卡张量并行（TP=2）

假设每张物理卡有 64Gi 显存，计划在 2 张卡上各使用 32Gi（共 64Gi）：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: vllm-npu-2card
  annotations:
    huawei.com/vnpu-mode: "hami-core"
spec:
  containers:
    - name: vllm-container
      image: vllm-ascend:latest
      command: ["/bin/sh", "-c"]
      args:
        - |
          vllm serve /model/Qwen3-0.6B \
          --host 0.0.0.0 \
          --port 8002 \
          --enforce-eager \
          --tensor-parallel-size 2 \
          --gpu-memory-utilization 0.5
      resources:
        limits:
          huawei.com/Ascend910B3: "2"
          huawei.com/Ascend910B3-memory: "65536"
          huawei.com/Ascend910B3-core: "50"
```

:::note

`--gpu-memory-utilization 0.5` = 申请总显存（64Gi）/ 2 张卡物理显存总量（128Gi）。

:::

## 注意事项

1. 硬切片模式下，默认 910B3 配置提供 16、32 GiB 两种模板，上文的 4096 MiB 请求会选择 16 GiB 模板。支持的模板取决于卡型和驱动，见[设备模板](./device-template.md)。

2. 不支持在初始化容器中使用 Huawei Ascend-sharing。

3. `huawei.com/Ascend910B3-memory` 仅在 `huawei.com/Ascend910B3=1` 时有效。 `huawei.com/Ascend310P-memory` 仅在 `huawei.com/Ascend310P=1` 时有效。
