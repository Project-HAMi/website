---
title: Soft slicing (hami-vnpu-core)
---

Soft slicing uses runtime interception (`libvnpu.so`) to enable fine-grained NPU sharing without requiring hardware virtualization templates. To use it, add the annotation `huawei.com/vnpu-mode: 'hami-core'` to the Pod.

:::note `hami-vnpu-core` currently only supports ARM platforms and the HAMi scheduler. :::

## Single-card Soft Slicing

Request a portion of an NPU's memory and compute cores:

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
          huawei.com/Ascend910B3-memory: "28672" # Request 28Gi memory
          huawei.com/Ascend910B3-core: "40" # Request 40% of compute cores
```

## Multi-card Parallel Inference with vLLM (TP=2)

The soft partitioning mechanism supports requesting multiple virtual devices within the same Pod. When performing multi-card parallel inference, `--gpu-memory-utilization` must not exceed the ratio of the container's total memory limit to the sum of physical memory of the selected cards.

The example below uses 2 cards, each with 64Gi physical memory, requesting 32Gi each (64Gi total):

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
          huawei.com/Ascend910B3-memory: "65536" # 64GiB combined across 2 cards
          huawei.com/Ascend910B3-core: "50"
```

> `--gpu-memory-utilization 0.5` = total requested memory (64Gi) ÷ total physical memory (128Gi across 2 cards).
