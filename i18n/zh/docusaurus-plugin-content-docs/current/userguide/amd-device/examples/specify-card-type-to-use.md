---
title: 将任务分配到指定类型的 GPU
translated: true
---

要让 Pod 只运行在某种类型的 GPU 上，在 Pod 注解中设置 `amd.com/use-gputype`。已注册的产品名称包含该文本（不区分大小写）即匹配。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-gpu-type-to-use
  annotations:
    amd.com/use-gputype: "Radeon" # run only on GPUs whose registered product name contains this text, comma separated, case-insensitive
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
          amd.com/gpu: 1
          amd.com/gpumem: 4096
```
