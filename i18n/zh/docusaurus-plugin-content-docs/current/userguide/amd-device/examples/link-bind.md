---
title: 分配通过 XGMI 互联的 GPU
translated: true
---

需要比 v2.10.0 更新的 HAMi 版本（[Project-HAMi/HAMi#3191](https://github.com/Project-HAMi/HAMi/pull/3191)）。

要让多 GPU Pod 只运行在彼此之间都通过 XGMI 互联的 GPU 上，把注解 `amd.com/link-bind` 设置为 `"true"`。amd-device-plugin 会在节点注册信息中以 `xgmiPeers` 发布每张 GPU 的 XGMI 对端。调度器要求申请的每张 GPU 都把其余申请的 GPU 列为对端；节点上没有这样的 GPU 组时，Pod 会保持 `Pending`。只申请一张 GPU 时该注解不起作用。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-gpu-link-bind
  annotations:
    amd.com/link-bind: "true" # 申请的所有 GPU 之间必须两两通过 XGMI 互联
spec:
  containers:
    - name: rocm
      image: rocm/dev-ubuntu-24.04:7.2.4
      command: ["bash", "-c", "sleep infinity"]
      securityContext:
        # runs as the image's user (root) on purpose: GPU device access needs the node's video and render group ids, which differ per node. For non-root add runAsUser and supplementalGroups for those groups.
        allowPrivilegeEscalation: false
      resources:
        limits:
          amd.com/gpu: 4
```

不设置 `amd.com/link-bind` 时，`topology-aware` 策略会优先选择互联的 GPU，但在没有完全互联的 GPU 组时仍会调度 Pod。参见[选择 GPU 调度策略](./scheduler-policy.md)。
