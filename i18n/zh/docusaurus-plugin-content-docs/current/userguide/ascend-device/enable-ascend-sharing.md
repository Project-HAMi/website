---
title: 启用 Ascend 共享
sidebar_label: Ascend 共享
translated: true
---

Ascend 设备插件为 HAMi 提供 NPU 切片支持，支持两种模式：

## 1. 基于模板的硬切片（vNPU）

基于虚拟化模板支持显存切片，自动使用最小可用模板。有关详细信息，请查看[设备模板](./device-template.md)。

## 2. 基于运行时拦截的软切片（hami-vnpu-core）

该模式基于 `libvnpu.so` 拦截和 `limiter` 令牌调度实现软切片机制，支持细粒度的资源共享。

:::note

- `hami-vnpu-core` 目前仅支持 ARM 平台。
- `hami-vnpu-core` 目前仅支持 HAMi 调度器。

:::

## 先决条件

- Ascend 设备类型：910B, 910A, 310P
- [Ascend docker 运行时](https://gitcode.com/Ascend/mind-cluster/tree/master/component/ascend-docker-runtime)

**软切片（hami-vnpu-core）的额外要求：**

- **Ascend 驱动版本**：≥ 25.5
- **芯片模式**：需在 Ascend 芯片上启用 `device-share` 模式以支持虚拟化

启用 `device-share` 模式，运行以下命令：

```bash
npu-smi set -t device-share -i <id> -d <value>
```

| 参数    | 说明                                                                |
| ------- | ------------------------------------------------------------------- |
| `id`    | 设备 ID，通过运行 `npu-smi info -l` 命令获取的 NPU ID 即为设备 ID。 |
| `value` | 容器启用状态：`0`（禁用，默认值）或 `1`（启用）。                   |

## 启用 Ascend-sharing 支持

由于与 HAMi 的依赖关系，你需要在 HAMi 安装期间设置以下参数：

```yaml
devices.ascend.enabled=true
```

有关更多详细信息，参阅 `values.yaml` 中的 `devices` 部分：

```yaml
devices:
  ascend:
    enabled: true
    image: "ascend-device-plugin:master"
    imagePullPolicy: IfNotPresent
    extraArgs: []
    nodeSelector:
      ascend: "on"
    tolerations: []
    resources:
      - huawei.com/Ascend910A
      - huawei.com/Ascend910A-memory
      - huawei.com/Ascend910B
      - huawei.com/Ascend910B-memory
      - huawei.com/Ascend310P
      - huawei.com/Ascend310P-memory
```

如果你希望 HAMi 自动将 `runtimeClassName` 配置添加到请求 Ascend 资源的 Pod（默认禁用），请在 HAMi 的 `values.yaml` 中将 `devices.ascend.runtimeClassName` 设置为非空字符串，并确保其与 `RuntimeClass` 资源的名称匹配：

```yaml
devices:
  ascend:
    runtimeClassName: ascend
```

## 部署步骤

### 1. 标记节点

```bash
kubectl label node {ascend-node} ascend=on
```

### 2. 部署 RuntimeClass

```bash
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/ascend-device-plugin/main/ascend-runtimeclass.yaml
```

### 3. 部署 ConfigMap

此 ConfigMap 用于全局配置，例如 resourceName、模式和模板。通过在顶层设置 `hamiVnpuCore: true`，可使所有节点启用基于 `hami-vnpu-core` 的软切片。

```bash
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/ascend-device-plugin/main/ascend-device-configmap.yaml
```

:::note 如果 ConfigMap 已存在，可跳过此步骤。:::

#### （可选）节点自定义配置

`hami-device-node-config` ConfigMap 用于为集群内特定节点启用或覆盖 `hami-vnpu-core`。节点级别的设置优先级高于全局 `hamiVnpuCore` 开关。

```bash
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/ascend-device-plugin/main/ascend-device-node-configmap.yaml
```

### 4. 部署 ascend-device-plugin

```bash
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/ascend-device-plugin/main/ascend-device-plugin.yaml
```

## 运行 Ascend 作业

若要独占使用整张卡或申请多张卡，只需设置对应的 resourceName 即可。若多个任务需要共享同一 NPU，则需将资源请求设置为 `1` 并配置对应的 `ResourceMemoryName`。

### Ascend 910B（硬切片）

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
          huawei.com/Ascend910B: "1"
          # 如果不指定 Ascend910B-memory，将使用整张 NPU
          huawei.com/Ascend910B-memory: "4096"
```

### Ascend 310P（硬切片）

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

:::note `--gpu-memory-utilization 0.5` = 申请总显存（64Gi）/ 2 张卡物理显存总量（128Gi）。:::

## 注意事项

1. 硬切片模式下，Ascend 910B 仅支持两种分片策略：1/4 和 1/2。Ascend 310P 支持三种分片策略：1/7、2/7、4/7。显存请求将自动与最接近的分片策略对齐。

2. 不支持在初始化容器中使用 Ascend-sharing。

3. `huawei.com/Ascend910B-memory` 仅在 `huawei.com/Ascend910B=1` 时有效。 `huawei.com/Ascend310P-memory` 仅在 `huawei.com/Ascend310P=1` 时有效。
