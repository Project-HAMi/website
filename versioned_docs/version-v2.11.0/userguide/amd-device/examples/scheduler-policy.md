---
title: Choose a GPU scheduling policy
---

Set the annotation `hami.io/gpu-scheduler-policy` on a pod to choose how the scheduler picks GPUs on a node. The default comes from `scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy` in the HAMi chart (`spread`). Several policies can be combined in one comma-separated value, for example `binpack,mutex`.

| Policy | Effect on AMD GPUs |
| --- | --- |
| `binpack` | Fills one GPU before using the next. |
| `spread` | Spreads pods over different GPUs. |
| `mutex` | Uses only GPUs that no other pod holds. A pod that finds none stays `Pending` (`ExclusiveDeviceAllocateConflict`). Other pods can still share a GPU that a `mutex` pod holds. |
| `topology-aware` | For a request of two or more GPUs, picks the group with the most XGMI links, and uses a shared NUMA node as the tie-break. Requires a HAMi release newer than v2.10.0 ([Project-HAMi/HAMi#3191](https://github.com/Project-HAMi/HAMi/pull/3191)). |

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

To require a fully linked group instead of preferring one, use [`amd.com/link-bind`](./link-bind.md). To require one NUMA node, use [`amd.com/numa-bind`](./numa-bind.md).
