---
title: Enable Mthreads GPU sharing
---

## Introduction

**HAMi now supports mthreads.com/vgpu by implementing most device-sharing features as NVIDIA GPUs**, including:

**GPU sharing**: Each task can allocate a portion of GPU instead of a whole GPU card, thus GPU can be shared among multiple tasks.

**Device Memory Control**: GPUs can be allocated with a specific device memory size on certain types (e.g., MTT S4000, MTT S5000), with hard limits enforced to prevent exceeding the allocation.

**Device Core Control**: GPUs can be allocated with limited compute cores on certain types (e.g., MTT S4000, MTT S5000), with hard limits enforced to prevent exceeding the allocation.

## Important Notes

1. Device sharing for multi-cards is not supported.

2. Only one Mthreads device can be shared in a pod (even if there are multiple containers).

3. Support allocating exclusive Mthreads GPU by specifying mthreads.com/vgpu only.

4. These features are tested on MTT S4000 and MTT S5000. On MTT S5000 clusters, set `devices.mthreads.memoryPerCard` to `[160]` when installing HAMi, as shown in [Enabling GPU-sharing Support](#enabling-gpu-sharing-support).

## Card specifications

Both card models expose 16 core groups per card. Device memory is requested in 512 MiB units, and the valid values depend on the card capacity:

| Card model | Device memory | Total `sgpu-memory` units | Valid `sgpu-memory` values    |
| ---------- | ------------- | ------------------------- | ----------------------------- |
| MTT S4000  | 48 GiB        | 96                        | 2, 4, 8, 16, 32, 64, 96       |
| MTT S5000  | 80 GiB        | 160                       | 2, 4, 8, 16, 32, 64, 128, 160 |

Requests with values outside the valid list are rejected by the admission webhook. The per-card capacity is controlled by the cluster-level `devices.mthreads.memoryPerCard` chart value, so clusters mixing both card models need separate node pools per model.

## Prerequisites

- [MT CloudNative Toolkits > 1.9.0](https://docs.mthreads.com/cloud-native/cloud-native-doc-online/)
- driver version >= 1.2.0
- For MTT S5000 with sGPU: MT Container Toolkit >= 2.1.0 and MTML >= 2.1.0, with sGPU enabled through the Mthreads GPU Operator. See [Use HAMi with Mthreads MTT S5000](../../installation/how-to-use-mthreads-s5000.md) for the full setup.

## Enabling GPU-sharing Support

- Deploy MT-CloudNative Toolkit on Mthreads nodes (Please consult your device provider to acquire its package and document)

:::note

You can remove `mt-mutating-webhook` and `mt-gpu-scheduler` after installation (optional). HAMi's scheduler and webhook take over their roles. On MTT S5000 clusters running the Mthreads GPU Operator, disable the vendor components through the ClusterPolicy as described in the [MTT S5000 installation guide](../../installation/how-to-use-mthreads-s5000.md).

:::

- Set `devices.mthreads.enabled=true` when installing HAMi

```bash
helm install hami hami-charts/hami --set scheduler.kubeScheduler.image.tag={your kubernetes version} --set devices.mthreads.enabled=true -n kube-system
```

- On MTT S5000 clusters, also set the per-card memory capacity in a values file:

```yaml
devices:
  mthreads:
    enabled: true
    # MTT S5000 has 80 GiB device memory = 160 x 512 MiB units per card.
    # The chart default (96) matches the MTT S4000 and must be overridden for S5000.
    memoryPerCard:
      - 160
```

```bash
helm install hami hami-charts/hami -n kube-system -f values.yaml
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

Each unit of `mthreads.com/sgpu-memory` represents 512 MiB of device memory. Valid values per card model are listed in [Card specifications](#card-specifications). More examples are available in the [examples/mthreads folder](https://github.com/Project-HAMi/HAMi/tree/master/examples/mthreads/).

:::
