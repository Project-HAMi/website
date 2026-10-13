---
title: 设置 Pod 的队列优先级
translated: true
---

要提高或降低 Pod 计算队列的优先级，在容器中设置环境变量 `AMD_TASK_PRIORITY`。显存 hook 会据此设置 HSA 队列优先级。0 是高优先级类别，数值越大优先级越低，hook 会把该值固定为 Pod spec 中的值，因此进程无法用 `setenv` 修改它。

在 25% 切片内共享一张 GPU 的两个进程，优先级为 0 和 3 时分别得到每秒 144.7 和 72.3 个 kernel，不设置优先级时各约 108.6。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-gpu-priority
spec:
  containers:
    - name: rocm
      image: rocm/dev-ubuntu-24.04:7.2.4
      command: ["bash", "-c", "sleep infinity"]
      env:
        - name: AMD_TASK_PRIORITY
          value: "0" # 0 是高优先级类别，数值越大优先级越低
      securityContext:
        # runs as the image's user (root) on purpose: GPU device access needs the node's video and render group ids, which differ per node. For non-root add runAsUser and supplementalGroups for those groups.
        allowPrivilegeEscalation: false
      resources:
        limits:
          amd.com/gpu: 1
          amd.com/gpumem: 4096
          amd.com/gpucores: 25
```

优先级只对切片生效，因为整卡 Pod 不会加载 hook。
