---
title: Enable Ascend sharing
---

The Ascend device plugin supports NPU-slicing for HAMi. It supports two modes:

### 1. Template-based Hard Slicing (vNPU)

Memory slicing is supported based on virtualization template, the least available template is automatically used. For detailed information, check [device-template](./device-template.md).

### 2. Soft Slicing with Runtime Interception (hami-vnpu-core)

This mode implements a soft slicing mechanism based on `libvnpu.so` interception and `limiter` token scheduling, enabling fine-grained resource sharing.

:::note
- `hami-vnpu-core` currently only supports ARM platforms.
- `hami-vnpu-core` currently only supports HAMi scheduler.
:::

## Prerequisites

- Ascend device type: 910B, 910A, 310P
- [Ascend docker runtime](https://gitcode.com/Ascend/mind-cluster/tree/master/component/ascend-docker-runtime)

**Additional requirements for Soft Slicing (hami-vnpu-core):**

- **Ascend Driver Version**: ≥ 25.5
- **Chip Mode**: enable `device-share` mode on Ascend chips for virtualization

To enable `device-share` mode, run:

```bash
npu-smi set -t device-share -i <id> -d <value>
```

| Parameter | Description |
| --------- | ----------- |
| `id`      | Device ID. The NPU ID found by running `npu-smi info -l`. |
| `value`   | Container enable status: `0` (Disabled, default) or `1` (Enabled). |

## Enabling Ascend-sharing support

Due to dependencies with HAMi, you need to set the following arguments when installing HAMi:

```yaml
devices.ascend.enabled=true
```

For more details, see the `devices` section in `values.yaml`:

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

If you require HAMi to automatically add the `runtimeClassName` configuration to Pods requesting Ascend resources (this is disabled by default), set `devices.ascend.runtimeClassName` to a non-empty string in HAMi's `values.yaml`, ensuring it matches the name of the `RuntimeClass` resource:

```yaml
devices:
  ascend:
    runtimeClassName: ascend
```

## Deployment

### 1. Label the Node

```bash
kubectl label node {ascend-node} ascend=on
```

### 2. Deploy RuntimeClass

```bash
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/ascend-device-plugin/main/ascend-runtimeclass.yaml
```

### 3. Deploy ConfigMap

This ConfigMap is used for global configurations such as resourceName, mode, and templates. By setting `hamiVnpuCore: true` at the top level, all nodes will enable soft-partitioning based on `hami-vnpu-core`.

```bash
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/ascend-device-plugin/main/ascend-device-configmap.yaml
```

:::note
You can skip this step if the ConfigMap already exists.
:::

#### (Optional) Node Custom Configuration

The `hami-device-node-config` ConfigMap allows you to enable or override `hami-vnpu-core` for specific nodes. Node-level settings take higher priority than the global `hamiVnpuCore` switch.

```bash
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/ascend-device-plugin/main/ascend-device-node-configmap.yaml
```

### 4. Deploy ascend-device-plugin

```bash
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/ascend-device-plugin/main/ascend-device-plugin.yaml
```

## Running Ascend Jobs

To exclusively use an entire card or request multiple cards, you only need to set the corresponding resourceName. If multiple tasks need to share the same NPU, set the resource request to `1` and configure the appropriate `ResourceMemoryName`.

### Ascend 910B (Hard Slicing)

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
          # if you don't specify Ascend910B-memory, it will use a whole NPU.
          huawei.com/Ascend910B-memory: "4096"
```

### Ascend 310P (Hard Slicing)

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

### Soft Slicing (hami-vnpu-core)

Add the annotation `huawei.com/vnpu-mode: 'hami-core'` to enable soft slicing for a Pod. You can also request a percentage of compute cores using the `-core` resource:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ascend-soft-slice-pod
  annotations:
    huawei.com/vnpu-mode: 'hami-core'
spec:
  containers:
    - name: npu_pod
      image: ascendhub.huawei.com/public-ascendhub/ascend-mindspore:23.0.RC3-centos7
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend910B3: "1"
          huawei.com/Ascend910B3-memory: "28672"
          huawei.com/Ascend910B3-core: "40"   # Request 40% of compute cores
```

### Multi-card Parallel Inference (Soft Slicing)

The soft partitioning mechanism supports requesting multiple virtual devices within the same Pod. When performing multi-card parallel inference (e.g., using vLLM), the value of `--gpu-memory-utilization` must not exceed the ratio of the container's total memory limit to the sum of physical memory of the selected cards.

**Example: 2-Card Tensor Parallelism (TP=2) with vLLM**

Assume each physical card has 64Gi of memory, and you plan to use 32Gi on each of the 2 cards (totaling 64Gi):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: vllm-npu-2card
  annotations:
    huawei.com/vnpu-mode: 'hami-core'
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
`--gpu-memory-utilization 0.5` = Total requested memory (64Gi) / Total physical memory (128Gi across 2 cards).
:::

## Notes

1. For hard slicing, Ascend 910B supports only two sharding policies: 1/4 and 1/2. Ascend 310P supports three sharding policies: 1/7, 2/7, 4/7. The memory request will automatically align with the closest sharding policy.

1. Ascend-sharing in init containers is not supported.

1. `huawei.com/Ascend910B-memory` only works when `huawei.com/Ascend910B=1`.
   `huawei.com/Ascend310P-memory` only works when `huawei.com/Ascend310P=1`.
