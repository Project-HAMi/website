---
title: Assign task to MIG instance
---

This Pod requests two MIG devices with at least 8,000 MiB each. The `nvidia.com/vgpu-mode: "mig"` annotation requires Dynamic MIG, and the optional `binpack` policy asks HAMi to prefer packing the allocations.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    nvidia.com/vgpu-mode: "mig"
    hami.io/gpu-scheduler-policy: "binpack" # Optional
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2
          nvidia.com/gpumem: 8000
```

On an empty A100 40 GB GPU this request normally selects two `2g.10gb` profiles; on an empty A100 80 GB GPU it normally selects two `1g.10gb` profiles. The result is not a fixed template: HAMi chooses the smallest allowlisted, NVML-discovered profile with enough memory and a legal free placement, so driver-reported capacity and existing reservations can change the selected profile or leave the Pod Pending.

HAMi records the selected GPU, profile, and placement in the internal `hami.io/vgpu-mig-allocations` Pod annotation. The device plugin creates the reserved GI/CI instances during `Allocate`, adds their runtime identities to the annotation, and reclaims them after the Pod terminates. Users must not set or edit this annotation.
