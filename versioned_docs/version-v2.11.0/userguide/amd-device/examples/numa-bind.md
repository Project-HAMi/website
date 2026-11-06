---
title: Allocate GPUs on one NUMA node
---

Requires a HAMi release newer than v2.10.0 ([Project-HAMi/HAMi#3186](https://github.com/Project-HAMi/HAMi/pull/3186)).

To keep every GPU of a multi-GPU pod on one NUMA node, set the annotation `amd.com/numa-bind` to `"true"`. The scheduler reads each GPU's NUMA node from the registration that amd-device-plugin publishes, and keeps the pod `Pending` if no single NUMA node has enough free GPUs. A request for a single GPU is not affected.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-gpu-numa-bind
  annotations:
    amd.com/numa-bind: "true" # every requested GPU must sit on the same NUMA node
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
