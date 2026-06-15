---
title: 软切片（hami-vnpu-core）
translated: true
---

软切片通过运行时拦截（`libvnpu.so`）实现细粒度的 NPU 共享，无需依赖硬件虚拟化模板。使用时，需在 Pod 上添加注解 `huawei.com/vnpu-mode: 'hami-core'`。

:::note `hami-vnpu-core` 目前仅支持 ARM 平台和 HAMi 调度器。:::

## 单卡软切片

申请 NPU 的部分显存和算力核心：

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
          huawei.com/Ascend910B3-memory: "28672" # 申请 28Gi 显存
          huawei.com/Ascend910B3-core: "40" # 申请 40% 的算力核心
```

## 使用 vLLM 进行多卡并行推理（TP=2）

软切片机制支持在同一 Pod 中申请多个虚拟设备。进行多卡并行推理时，`--gpu-memory-utilization` 的值不得超过容器总显存限制与所选卡物理显存总量之比。

以下示例使用 2 张卡，每张物理卡有 64Gi 显存，各申请 32Gi（共 64Gi）：

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
          huawei.com/Ascend910B3-memory: "65536" # 2 张卡合计 64GiB
          huawei.com/Ascend910B3-core: "50"
```

> `--gpu-memory-utilization 0.5` = 申请总显存（64Gi）÷ 2 张卡物理显存总量（128Gi）。
