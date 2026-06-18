---
id: gpu-topology-scheduling
title: GPU Topology-Aware Scheduling
sidebar_label: GPU Topology Scheduling
---

HAMi supports GPU topology-aware scheduling in vGPU environments. HAMi can optimize GPU card scheduling based on the topological relationships between GPUs, thereby improving GPU resource utilization and performance.

Use `nvidia-smi topo -m` to view the topological relationships between GPUs on a node.

## Enabling GPU Topology-Aware Scheduling

When installing HAMi, set `scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy` to `topology-aware`:

```bash
helm install hami hami-charts/hami \
  --set scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy=topology-aware \
  -n kube-system
```

If HAMi is already installed, enable it via one of the following methods:

### 1. Device-plugin configuration

Set the environment variable `ENABLE_TOPOLOGY_SCORE: 'true'` in the DaemonSet `hami-device-plugin`.

### 2. Global scheduler settings

Add `gpu-scheduler-policy=topology-aware` when starting `hami-scheduler`.

### 3. Pod-level annotation

```yaml
metadata:
  annotations:
    hami.io/gpu-scheduler-policy: topology-aware
```

After submitting the Pod, check the logs of `hami-scheduler` (log level must be greater than 5):

```
I0703 08:34:27.032644  1 device.go:708] "device allocate success" pod="default/testpod" best device combination={"NVIDIA":[{"Idx":7,"UUID":"GPU-dsaf","Type":"NVIDIA","Usedmem":1024,"Usedcores":0},{"Idx":5,"UUID":"GPU-gads","Type":"NVIDIA","Usedmem":1024,"Usedcores":0}]}
```

## Scheduling Strategy

### Node Selection

When multiple nodes meet the requirements, the node with the minimum number of GPUs that still satisfies the request is preferred.

For example, given two candidate nodes:

- Node1: 4 GPUs
- Node2: 6 GPUs

If the workload requires 2 GPUs, Node1 is preferred because it is the smaller node that still fits the request. This leaves Node2 available for larger workloads.

### Single-GPU Allocation (One Pod, One Device)

When a Pod requests only one GPU, the GPU with the **worst connectivity** to other GPUs on the node is preferred (assuming memory and compute requirements are met). This preserves high-bandwidth GPU pairs for future multi-GPU workloads.

Example on a 4-GPU node:

```json
[
  { "uuid": "gpu0", "score": { "gpu1": "100", "gpu2": "100", "gpu3": "200" } },
  { "uuid": "gpu1", "score": { "gpu0": "100", "gpu2": "200", "gpu3": "100" } },
  { "uuid": "gpu2", "score": { "gpu0": "100", "gpu1": "200", "gpu3": "200" } },
  { "uuid": "gpu3", "score": { "gpu0": "200", "gpu1": "100", "gpu2": "200" } }
]
```

`gpu0` and `gpu1` have the lowest total connectivity scores, so they are preferred for single-GPU allocation.

### Multi-GPU Allocation (One Pod, Multiple Devices)

When a Pod requests multiple GPUs, the set of GPUs with the **best mutual connectivity** is preferred.

Using the same 4-GPU node as above, `gpu2` and `gpu3` have the highest connectivity with each other, so they are preferred for a 2-GPU request.
