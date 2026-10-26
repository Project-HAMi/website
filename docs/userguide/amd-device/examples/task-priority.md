---
title: Set the queue priority of a pod
---

To give the compute queues of a pod a higher or lower priority, set the environment variable `AMD_TASK_PRIORITY` in the container. The memory hook sets the HSA queue priority from it. A value of 0 is the high class and higher values are low, and the hook pins the value to the one in the pod spec, so a process cannot change it with `setenv`.

On a GPU shared by two processes in a 25 percent slice, priorities 0 and 3 gave 144.7 and 72.3 kernels per second, against about 108.6 each without a priority.

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
          value: "0" # 0 is the high class, higher values are low
      securityContext:
        # runs as the image's user (root) on purpose: GPU device access needs the node's video and render group ids, which differ per node. For non-root add runAsUser and supplementalGroups for those groups.
        allowPrivilegeEscalation: false
      resources:
        limits:
          amd.com/gpu: 1
          amd.com/gpumem: 4096
          amd.com/gpucores: 25
```

The priority only applies to slices, because a whole-GPU pod does not load the hook.
