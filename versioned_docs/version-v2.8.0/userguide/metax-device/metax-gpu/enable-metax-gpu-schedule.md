---
title: Enable Metax GPU topology-aware scheduling
---

**HAMi now supports metax.com/gpu by implementing topo-awareness among metax GPUs.**

When multiple GPUs are configured on a single server, the GPU cards are connected to the same PCIe Switch or MetaXLink.
Depending on the connection type, a near-far relationship is formed among the GPUs.
Together, these connections define the topology of the GPU cards on the server, as shown below:

![img](https://github.com/Project-HAMi/HAMi/raw/master/imgs/metax_topo.png)

When a user job requests a specific number of `metax-tech.com/gpu` resources,
Kubernetes schedules the pod to a suitable node. On that node,
the GPU device plugin (gpu-device) handles fine-grained allocation based on the following criteria:

1. MetaXLink takes precedence over PCIe Switch in two ways:

   - A connection is considered a MetaXLink connection when there is a MetaXLink connection and a PCIe Switch connection between the two cards.
   - When both the MetaXLink and the PCIe Switch can meet the job request, equipped with MetaXLink interconnected resources.

2. When using `node-scheduler-policy=spread`, allocate Metax resources to be under the same Metaxlink or Paiswich as much as possible, as shown below:

   ![img](https://github.com/Project-HAMi/HAMi/raw/master/imgs/metax_spread.png)

3. When using `node-scheduler-policy=binpack`, assign GPU resources, so minimize the damage to MetaxXLink topology, as shown below:

   ![img](https://github.com/Project-HAMi/HAMi/raw/master/imgs/metax_binpack.png)

## Important Notes

1. Device sharing is not supported yet.

2. These features are tested on MXC500

## Prerequisites

- Metax GPU extensions >= 0.8.0
- Kubernetes >= 1.23

## Enabling topo-awareness scheduling

- Deploy Metax GPU Extensions on metax nodes (Please consult your device provider to acquire its package and document)

- Deploy HAMi according to README.md

## Running Metax jobs

Metax GPUs can now be requested by a container
using the `metax-tech.com/gpu` resource type:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
  annotations: hami.io/node-scheduler-policy: "spread" # when this parameter is set to spread, the scheduler will try to find the best topology for this task.
spec:
  containers:
    - name: ubuntu-container
      image: cr.metax-tech.com/public-ai-release/c500/colossalai:2.24.0.5-py38-ubuntu20.04-amd64 
      imagePullPolicy: IfNotPresent
      command: ["sleep","infinity"]
      resources:
        limits:
          metax-tech.com/gpu: 1 # requesting 1 GPU
```

> **NOTICE:** *You can find more examples in [examples/metax folder](https://github.com/Project-HAMi/HAMi/tree/release-v2.6/examples/metax/gpu)*
