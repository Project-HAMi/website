---
title: 在同一 NUMA 节点上分配 GPU
translated: true
---

需要比 v2.10.0 更新的 HAMi 版本（[Project-HAMi/HAMi#3186](https://github.com/Project-HAMi/HAMi/pull/3186)）。

要让多 GPU Pod 的所有 GPU 位于同一个 NUMA 节点，把注解 `amd.com/numa-bind` 设置为 `"true"`。调度器从 amd-device-plugin 发布的注册信息中读取每张 GPU 所在的 NUMA 节点；如果没有任何一个 NUMA 节点有足够的空闲 GPU，Pod 会保持 `Pending`。只申请一张 GPU 时该注解不起作用。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-gpu-numa-bind
  annotations:
    amd.com/numa-bind: "true" # 申请的所有 GPU 必须位于同一个 NUMA 节点
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
          amd.com/gpu: 2
```
