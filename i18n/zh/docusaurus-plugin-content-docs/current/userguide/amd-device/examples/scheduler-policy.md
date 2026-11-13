---
title: 选择 GPU 调度策略
translated: true
---

在 Pod 上设置注解 `hami.io/gpu-scheduler-policy`，选择调度器在节点上挑选 GPU 的方式。默认值来自 HAMi chart 中的 `scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy`（`spread`）。多个策略可以用逗号组合在同一个值中，例如 `binpack,mutex`。

| 策略 | 对 AMD GPU 的效果 |
| --- | --- |
| `binpack` | 先把一张 GPU 用满，再使用下一张。 |
| `spread` | 把 Pod 分散到不同的 GPU。 |
| `mutex` | 只使用没有被其他 Pod 占用的 GPU。找不到时 Pod 保持 `Pending`（`ExclusiveDeviceAllocateConflict`）。其他 Pod 仍可共享被 `mutex` Pod 占用的 GPU。 |
| `topology-aware` | 申请两张及以上 GPU 时，选择 XGMI 链路最多的一组，并以同一 NUMA 节点作为次要依据。需要比 v2.10.0 更新的 HAMi 版本（[Project-HAMi/HAMi#3191](https://github.com/Project-HAMi/HAMi/pull/3191)）。 |

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-gpu-topology-aware
  annotations:
    hami.io/gpu-scheduler-policy: "topology-aware"
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

如果要求必须是完全互联的 GPU 组，而不只是优先选择，请使用 [`amd.com/link-bind`](./link-bind.md)；如果要求位于同一个 NUMA 节点，请使用 [`amd.com/numa-bind`](./numa-bind.md)。
