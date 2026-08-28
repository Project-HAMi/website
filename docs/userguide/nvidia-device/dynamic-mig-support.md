---
title: Enable dynamic MIG feature
---

From v2.10.0, HAMi supports Flexible MIG: the scheduler reserves a MIG profile and physical placement for each Pod, and the device plugin creates or reclaims the corresponding GPU Instance (GI) and Compute Instance (CI) through NVML. This includes:

- **Dynamic MIG Instance Management**: Users no longer need to operate directly on GPU nodes or use commands like `nvidia-smi -i 0 -mig 1` to manage MIG instances. HAMi-device-plugin creates and destroys GI/CI instances on demand.

- **Dynamic MIG Adjustment**: Each request is placed onto a legal free slice. Mixed profiles can share one GPU without switching a whole-GPU geometry or draining the node for routine profile changes.

- **Device MIG Observation**: Each realized MIG instance is displayed in the scheduler monitor, including MIG UUID, profile, instance IDs, and placement coordinates.

- **Compatibility with HAMi-Core Nodes**: HAMi can manage a unified GPU pool across both `HAMi-core nodes` and `MIG nodes`. A job can be scheduled to either node unless manually specified using the `nvidia.com/vgpu-mode` annotation.

- **Unified API with HAMi-Core**: No additional work is required to make jobs compatible with the dynamic MIG feature. Continue to request `nvidia.com/gpu` and `nvidia.com/gpumem`.

## Prerequisites

- NVIDIA Blackwell, Hopper™, and Ampere GPUs
- HAMi >= v2.10.0
- nvidia-container-toolkit

## Enable dynamic MIG support

- Install the chart using helm, See [enabling vGPU support in kubernetes](https://github.com/Project-HAMi/HAMi#enabling-vgpu-support-in-kubernetes).

- Configure `mode` in device-plugin configMap to `mig` for MIG nodes

  ```bash
  kubectl describe cm hami-device-plugin -n kube-system
  ```

  ```json
  {
    "nodeconfig": [
      {
        "name": "MIG-NODE-A",
        "operatingmode": "mig",
        "filterdevices": {
          "uuid": [],
          "index": []
        }
      }
    ]
  }
  ```

- Restart the following pods for the change to take effect:
  - hami-scheduler
  - hami-device-plugin on 'MIG-NODE-A'

Do not run NVIDIA GPU Operator MIG Manager on the same physical GPU. GPU Operator can still provide the driver and container runtime, but only one controller should mutate GI/CI state.

## Custom MIG configuration (optional)

HAMi currently has a [built-in MIG profile allowlist](https://github.com/Project-HAMi/HAMi/blob/v2.10.0/charts/hami/templates/scheduler/device-configmap.yaml).

The allowlist defines which profiles the scheduler may use. The device plugin discovers memory, compute, instance count, and legal placements for those profiles through NVML. You no longer need to maintain whole-GPU geometries (`knownMigGeometries`) or duplicate `core`, `memory`, and `count`.

You can customize the MIG configuration by following the steps below:

### Edit `device-configmap.yaml` in charts/hami/templates/scheduler

<!-- prettier-ignore -->
```yaml
nvidia:
  resourceCountName: {{ .Values.resourceName }}
  resourceMemoryName: {{ .Values.resourceMem }}
  resourceMemoryPercentageName: {{ .Values.resourceMemPercentage }}
  resourceCoreName: {{ .Values.resourceCores }}
  resourcePriorityName: {{ .Values.resourcePriority }}
  overwriteEnv: false
  defaultMemory: 0
  defaultCores: 0
  defaultGPUNum: 1
  memoryFactor: 1
  deviceSplitCount: {{ .Values.devicePlugin.deviceSplitCount }}
  deviceMemoryScaling: {{ .Values.devicePlugin.deviceMemoryScaling }}
  deviceCoreScaling: {{ .Values.devicePlugin.deviceCoreScaling }}
  migProfileAllowlist:
    - models: ["A30"]
      profiles: ["1g.6gb", "2g.12gb", "4g.24gb"]
    - models: ["A100-SXM4-40GB", "A100-40GB-PCIe", "A100-PCIE-40GB"]
      profiles: ["1g.5gb", "2g.10gb", "3g.20gb", "7g.40gb"]
    - models: ["A100-SXM4-80GB", "A100-80GB-PCIe", "A100-PCIE-80GB"]
      profiles: ["1g.10gb", "2g.20gb", "3g.40gb", "7g.79gb"]
    - models: ["H100-PCIE-80GB", "H100-SXM5-80GB"]
      profiles: ["1g.10gb", "2g.20gb", "3g.40gb", "7g.80gb"]
    - models: ["H100-PCIE-94GB", "H100-SXM5-94GB"]
      profiles: ["1g.12gb", "2g.24gb", "3g.47gb", "7g.94gb"]
    - models: ["H20", "H100 on GH200"]
      profiles: ["1g.12gb", "2g.24gb", "3g.48gb", "7g.96gb"]
    - models: ["H200 NVL", "H200-SXM5"]
      profiles: ["1g.18gb", "2g.35gb", "3g.71gb", "7g.141gb"]
    - models: ["B200"]
      profiles: ["1g.23gb", "2g.45gb", "3g.90gb", "7g.180gb"]
    - models: ["RTX PRO 6000 Blackwell Server Edition"]
      profiles: ["1g.24gb", "2g.48gb", "4g.96gb"]
```

:::note

Helm installations and updates will follow the configuration specified in this file, overriding the default Helm settings.

If you previously used `knownMigGeometries`, take the union of profile names from those geometries and put them in `migProfileAllowlist`. Verify names against the target GPU model, driver, and device-plugin discovery logs. Legacy fields are not converted automatically. See the [upstream migration guide](https://github.com/Project-HAMi/HAMi/blob/v2.10.0/docs/develop/dynamic-mig-migration.md) for the initial upgrade drain.

:::

## Running MIG jobs

A MIG instance can now be requested by a container in the same way as `hami-core`, by specifying the `nvidia.com/gpu` and `nvidia.com/gpumem` resource types.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    nvidia.com/vgpu-mode: "mig" #(Optional), if not set, this pod can be assigned to a MIG instance or a hami-core instance
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

In this example above, the job allocates two MIG instances, each with at least 8G device memory. The scheduler selects an allowlisted profile that satisfies the memory request and a non-overlapping placement on the GPU.

Do not create or edit `hami.io/vgpu-mig-allocations`. The scheduler writes the reservation (parent GPU, profile, placement); the device plugin adds MIG UUID, GI ID, and CI ID after the instance is created.

## Monitor MIG Instance

MIG instances managed by HAMi are displayed in the scheduler monitor (scheduler node ip:31993/metrics). After a successful allocate, `hami_node_gpu_mig_instance_info` reports realized identity and placement:

```bash
# HELP hami_node_gpu_mig_instance_info Realized MIG instance identity and scheduler placement
# TYPE hami_node_gpu_mig_instance_info gauge
hami_node_gpu_mig_instance_info{node="aio-node15",device_uuid="GPU-936619fc-f6a1-74a8-0bc6-ecf6b3269313",device_index="0",mig_uuid="MIG-xxxxxxxx",profile="2g.10gb",gpu_instance_id="4",compute_instance_id="0",placement_start="2",placement_size="2"} 1
```

On the GPU node, vGPUmonitor (`<GPU-node-ip>:31992/metrics`) exposes container mapping as `hami_mig_device_info`, with labels for namespace, pod, container, parent GPU UUID, MIG UUID, profile, and GI/CI IDs.

:::note

1. No action is required on MIG nodes for routine create and delete. The device plugin realizes reservations through NVML and reclaims the exact GI/CI when the Pod terminates.
2. NVIDIA devices older than the Ampere architecture do not support MIG mode.
3. MIG resources (e.g., `nvidia.com/mig-1g.10gb`) won’t be visible on the node. HAMi uses a unified resource name for both MIG and hami-core nodes.
4. CDI mode is not supported together with Dynamic MIG in v2.10.0. Multi-device MIG cases still need validation on your topology.
5. Enabling or disabling MIG mode, driver upgrades, GPU resets, and the initial upgrade from geometry-based Dynamic MIG can still require draining a node.

:::
