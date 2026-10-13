---
title: 按 UUID 避开指定 GPU
translated: true
---

要让 Pod 避开指定 GPU，在 Pod 注解中设置 `amd.com/nouse-gpu-uuid`。UUID 可在节点注解 `hami.io/node-amd-register` 中查到。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-gpu-uuid-not-use
  annotations:
    amd.com/nouse-gpu-uuid: "<GPU UUID>" # replace with comma-separated UUIDs from the node annotation hami.io/node-amd-register; never run on these GPUs
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
