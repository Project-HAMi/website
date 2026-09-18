---
title: 将任务分配给 MIG 实例
translated: true
---

此 Pod 申请两个 MIG 设备，每个至少 8,000 MiB 显存。`nvidia.com/vgpu-mode: "mig"` 注解要求使用动态 MIG，可选的 `binpack` 策略则要求 HAMi 优先紧凑放置这些分配。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    nvidia.com/vgpu-mode: "mig"
    hami.io/gpu-scheduler-policy: "binpack" # 可选
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

在空闲的 A100 40 GB GPU 上，该请求通常会选择两个 `2g.10gb` profile；在空闲的 A100 80 GB GPU 上，通常会选择两个 `1g.10gb` profile。结果并不是固定模板：HAMi 会选择显存足够、已列入允许列表、由 NVML 发现且具有合法空闲 placement 的最小 profile，因此驱动上报的容量和现有预留可能改变所选 profile，或使 Pod 保持 Pending。

HAMi 会将选定的 GPU、profile 和 placement 记录在内部 Pod 注解 `hami.io/vgpu-mig-allocations` 中。device plugin 在 `Allocate` 阶段创建预留的 GI/CI 实例，将其运行时身份补充到注解中，并在 Pod 终止后回收。用户不得设置或修改该注解。
