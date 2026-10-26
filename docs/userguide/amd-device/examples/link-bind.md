---
title: Allocate XGMI-linked GPUs
---

Requires a HAMi release newer than v2.10.0 ([Project-HAMi/HAMi#3191](https://github.com/Project-HAMi/HAMi/pull/3191)).

To run a multi-GPU pod only on GPUs that are all linked to each other over XGMI, set the annotation `amd.com/link-bind` to `"true"`. amd-device-plugin publishes the XGMI peers of each GPU as `xgmiPeers` in the node registration. The scheduler needs every requested GPU to list every other requested GPU as a peer, and keeps the pod `Pending` when the node has no such group. A request for a single GPU is not affected.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-gpu-link-bind
  annotations:
    amd.com/link-bind: "true" # every requested GPU must be XGMI-linked to all the others
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

Without `amd.com/link-bind`, the `topology-aware` policy prefers linked GPUs but still places a pod when no fully linked group exists. See [Choose a GPU scheduling policy](./scheduler-policy.md).
