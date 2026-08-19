---
title: 将任务分配给 MIG 实例
translated: true
---

:::note HAMi v2.10 当前行为

下方 A100 profile 是 GPU 空闲时的常见结果，并不是固定模板。v2.10 会为两个设备请求分别选择显存满足 8000 MiB、已列入 `migProfileAllowlist`、由 NVML 发现且具有合法空闲 placement 的最小 profile；现有预留可能改变结果或使 Pod 保持 Pending。HAMi 会管理内部注解 `hami.io/vgpu-mig-allocations`，在 `Allocate` 时按预留创建 GI/CI，并在 Pod 结束后回收；用户不得设置或修改该注解。

:::

此示例将为 A100-40GB-PCIE 设备分配 `2g.10gb * 2` 或为 A100-80GB-SXM 设备分配 `1g.10gb * 2`。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    nvidia.com/vgpu-mode: "mig"
    hami.io/gpu-scheduler-policy: "binpack" #(可选)
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
