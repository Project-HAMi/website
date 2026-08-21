---
title: Enable Mthreads GPU sharing
---

## Introduction

**HAMi now supports mthreads.com/vgpu by implementing most device-sharing features as NVIDIA GPUs**, including:

**GPU sharing**: Each task can allocate a portion of GPU instead of a whole GPU card, thus GPU can be shared among multiple tasks.

**Device Memory Control**: GPUs can be allocated with a specific device memory size on certain types (e.g., MTT S4000), with hard limits enforced to prevent exceeding the allocation.

**Device Core Control**: GPUs can be allocated with limited compute cores on certain types (e.g., MTT S4000), with hard limits enforced to prevent exceeding the allocation.

## Important Notes

1. Device sharing for multi-cards is not supported.

2. Only one Mthreads device can be shared in a pod (even if there are multiple containers).

3. Support allocating exclusive Mthreads GPU by specifying mthreads.com/vgpu only.

4. These features are tested on MTT S4000

## Prerequisites

- [MT CloudNative Toolkits > 1.9.0](https://docs.mthreads.com/cloud-native/cloud-native-doc-online/)
- driver version >= 1.2.0

## Enabling GPU-sharing Support

- Deploy MT-CloudNative Toolkit on Mthreads nodes (Please consult your device provider to acquire its package and document)

:::note

You can remove `mt-mutating-webhook` and `mt-gpu-scheduler` after installation (optional).

:::

- Set `devices.mthreads.enabled=true` when installing HAMi

```bash
helm install hami hami-charts/hami --set scheduler.kubeScheduler.image.tag={your kubernetes version} --set devices.mthreads.enabled=true -n kube-system
```

## Running Mthreads jobs

Mthreads GPUs can now be requested by a container using the `mthreads.com/vgpu`, `mthreads.com/sgpu-memory` and `mthreads.com/sgpu-core` resource type:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpushare-pod-default
spec:
  restartPolicy: OnFailure
  containers:
    - image: core.harbor.zlidc.mthreads.com:30003/mt-ai/lm-qy2:v17-mpc
      imagePullPolicy: IfNotPresent
      name: gpushare-pod-1
      command: ["sleep"]
      args: ["100000"]
      resources:
        limits:
          mthreads.com/vgpu: 1
          mthreads.com/sgpu-memory: 32
          mthreads.com/sgpu-core: 8
```

:::note

Each unit of `sgpu-memory` represents 512 MB of device memory. More examples are available in the [examples/mthreads folder](https://github.com/Project-HAMi/HAMi/tree/master/examples/mthreads/).

:::
