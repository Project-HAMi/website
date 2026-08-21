---
title: Enable dynamic MIG feature
---

HAMi v2.10 uses a reservation-first, topology-aware implementation of dynamic NVIDIA Multi-Instance GPU (MIG). It does not select and switch a predefined whole-GPU geometry. Instead:

1. The device plugin discovers the MIG profiles and legal placements supported by each physical GPU through NVML.
2. `migProfileAllowlist` defines which of those profiles HAMi may expose.
3. The scheduler reserves an exact physical GPU, profile, and placement for each Pod.
4. During kubelet `Allocate`, the device plugin creates that GPU instance (GI) and compute instance (CI).
5. When the Pod finishes, the device plugin reclaims that Pod's CI and GI so the placement can be reused.

This preserves HAMi's unified `nvidia.com/gpu` and `nvidia.com/gpumem` workload API while creating hardware-isolated MIG instances only when workloads need them.

## Prerequisites

- HAMi v2.10.0 or later. The scheduler and NVIDIA device plugin must use the same reservation protocol.
- An NVIDIA Ampere, Hopper, or Blackwell GPU that supports MIG, plus a driver version that exposes the required profiles through NVML.
- NVIDIA Container Toolkit.
- Exclusive ownership of MIG hardware mutation on each target GPU. HAMi Dynamic MIG and NVIDIA MIG Manager must not manage the same physical GPU at the same time.

The current Chart includes profile mappings for A30, A100, H100, H20, H200, B200, and **RTX PRO 6000 Blackwell Server Edition** GPUs. Actual capability is still determined by NVML on each node.

## Enable dynamic MIG support

### 1. Set the node operating mode to `mig`

Install or upgrade the HAMi Chart as described in [the online installation guide](../../installation/online-installation.md), then set `operatingmode` to `mig` for each target node. For example, the `devicePlugin.nodeConfiguration.config` value can contain:

```yaml
devicePlugin:
  nodeConfiguration:
    config: |
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

Changing MIG mode can require a GPU reset or node reboot on some hardware and driver combinations. Cordon and drain a node before its initial conversion if it is already running GPU workloads.

### 2. Configure the profile allowlist

The [current Chart device configuration](https://github.com/Project-HAMi/HAMi/blob/v2.10.0/charts/hami/templates/scheduler/device-configmap.yaml) uses `migProfileAllowlist`. The v2.10 defaults are:

```yaml
nvidia:
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

The allowlist is cluster policy, not a hardware topology description. Do not configure profile memory, compute percentage, instance count, or placement. The device plugin obtains those values from `GetGpuInstanceProfileInfo` and `GetGpuInstancePossiblePlacements` in NVML and publishes only allowlisted, discoverable profiles to the scheduler.

:::warning

If you set `device-config.content` or provide an external scheduler device ConfigMap, that content replaces the Chart's default device configuration. Update the complete custom configuration to use `migProfileAllowlist`. `knownMigGeometries` is a legacy v2.9 field and is not converted automatically.

:::

After changing the node mode or scheduler device configuration, restart the HAMi scheduler and the NVIDIA device plugin on the affected nodes. Confirm that device plugin logs show profile discovery and that each MIG GPU publishes a non-empty `migProfiles` array in `hami.io/node-nvidia-register`:

```bash
kubectl get node MIG-NODE-A -o json \
  | jq -r '.metadata.annotations["hami.io/node-nvidia-register"] | fromjson'
```

A model or profile that is not allowlisted, or that NVML cannot discover, is not advertised as schedulable MIG capacity.

## Run a MIG workload

Request a MIG-backed vGPU with the same resource names used by HAMi-core. Set `nvidia.com/vgpu-mode: "mig"` when the workload must run on a MIG node:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mig-workload
  annotations:
    nvidia.com/vgpu-mode: "mig"
spec:
  containers:
    - name: workload
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 8000
```

Each unit of `nvidia.com/gpumem` is 1 MiB. The scheduler selects the smallest allowlisted profile whose NVML-reported memory satisfies the request and that has a legal, non-overlapping placement. If no placement is currently possible, the Pod remains Pending; HAMi does not move a running GI or switch the entire GPU to another template.

Without the `nvidia.com/vgpu-mode` annotation, a workload can be placed in a compatible HAMi-core or MIG pool. HAMi continues to expose the unified `nvidia.com/gpu` resource rather than resources such as `nvidia.com/mig-1g.10gb`.

## Reservation and instance lifecycle

The scheduler writes one record per requested MIG device to the Pod annotation `hami.io/vgpu-mig-allocations`. For example, after successful allocation a record can look like this:

```json
[
  {
    "containerIndex": 0,
    "deviceIndex": 0,
    "gpuUUID": "GPU-xxxxxxxx",
    "profile": "2g.10gb",
    "placement": { "start": 2, "size": 2 },
    "migUUID": "MIG-xxxxxxxx",
    "gpuInstanceID": 4,
    "computeInstanceID": 0
  }
]
```

The scheduler initially records the container and device indexes, parent GPU, profile, and placement. During `Allocate`, the device plugin:

1. verifies that reservation against current NVML capability;
2. serializes mutation on the selected physical GPU;
3. creates the GI and CI at exactly the reserved placement;
4. injects the resulting MIG device into the container; and
5. adds `migUUID`, `gpuInstanceID`, and `computeInstanceID` to the annotation.

The physical GPU, profile, and placement form an idempotent reservation key, so a repeated allocation request converges on the same managed instance. The annotation is an internal HAMi contract: users and other controllers must not create, remove, or modify it.

Inspect it with:

```bash
kubectl get pod mig-workload -o json \
  | jq -r '.metadata.annotations["hami.io/vgpu-mig-allocations"] | fromjson'
```

The device plugin periodically compares managed instances with active Pods on its node. When a Pod is deleted, succeeds, or fails, its exact CI and GI are destroyed without changing instances owned by other Pods. If the Kubernetes API or an annotation cannot be read completely, destructive reconciliation is skipped rather than guessing.

### Device plugin restart recovery

On startup, the device plugin combines active Pod reservations with NVML process state to identify GPUs carrying work. It prepares idle GPUs for dynamic allocation, verifies complete runtime records against NVML, and adopts matching active GI/CI instances into the new manager process. This preserves current v2.10 allocations across a device plugin restart.

Restart adoption requires the complete profile, placement, MIG UUID, GI ID, and CI ID recorded by v2.10. Legacy template/slot identifiers do not contain enough physical identity to be adopted safely.

## Monitor realized MIG instances

The scheduler metrics endpoint exposes one `hami_node_gpu_mig_instance_info` series for each realized allocation that has a complete runtime identity:

```bash
curl http://<scheduler-ip>:31993/metrics
```

```text
# HELP hami_node_gpu_mig_instance_info Realized MIG instance identity and scheduler placement
# TYPE hami_node_gpu_mig_instance_info gauge
hami_node_gpu_mig_instance_info{compute_instance_id="0",device_index="0",device_uuid="GPU-xxxxxxxx",gpu_instance_id="4",mig_uuid="MIG-xxxxxxxx",node="MIG-NODE-A",placement_size="2",placement_start="2",profile="2g.10gb"} 1
```

The parent `device_uuid` and `gpu_instance_id` can be correlated with DCGM metrics that carry `UUID` and `GPU_I_ID` labels. The older `nodeGPUMigInstance` metric is emitted only when `legacyMetrics: true`; the Chart default is `false`. See [Cluster device allocation](../monitoring/device-allocation) for the other scheduler allocation metrics.

## Migrate from legacy dynamic MIG

The v2.9 geometry implementation and the v2.10 reservation implementation use incompatible scheduler/device-plugin contracts. The legacy scheduler encodes a template and slot in a device identifier, while v2.10 requires the explicit Pod reservation described above. There is no seamless rolling adoption of legacy MIG Pods.

For the initial migration:

1. Inventory the scheduler device ConfigMap, active MIG Pods, node registration annotations, and `nvidia-smi -L` output.
2. Cordon a MIG node and drain or finish its legacy MIG workloads.
3. Replace `knownMigGeometries` with `migProfileAllowlist`. Usually the allowlist is the union of the profile names in the old geometries; remove manually maintained memory, core, count, and layout data.
4. Upgrade the scheduler before upgrading device plugins, so a legacy scheduler cannot send template/slot allocations to a v2.10 plugin.
5. Upgrade device plugins one node at a time. Startup can remove pre-existing GI/CI instances from GPUs that HAMi determines are idle.
6. Validate profile publication, Pod reservation, GI/CI realization, Pod deletion and reclaim, and device plugin restart adoption before uncordoning the node.

Routine creation and deletion of mixed profiles no longer requires switching a whole-GPU template when a legal free placement exists. Draining can still be required for the initial migration, enabling or disabling MIG mode, driver or GPU reset maintenance, rollback, or a layout change that would have to move a running instance.

## Migrate from NVIDIA MIG Manager

NVIDIA MIG Manager and HAMi Dynamic MIG can both create and destroy GI/CI instances, so they must not reconcile the same physical GPU concurrently. Before enabling HAMi `mig` mode on a target node:

1. cordon the node and move existing GPU workloads;
2. stop MIG Manager reconciliation for the target GPU, including any controller that would recreate it or reapply `nvidia.com/mig.config`;
3. keep the GPU Operator components HAMi still needs, such as the driver, Container Toolkit, and optionally DCGM; and
4. start with one canary Pod, then test mixed profiles, capacity exhaustion, reclaim, and device plugin restart recovery.

Deleting a MIG Manager Pod once is not enough if its controller immediately recreates it. Assign one controller as the hardware mutation owner unless you have explicit and verified per-GPU ownership isolation. For NVIDIA's static MIG workflow and its reconfiguration constraints, see the [NVIDIA GPU Operator MIG documentation](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-mig.html).

## Limitations

- Dynamic MIG obeys NVIDIA's placement rules. Fragmentation can leave enough total slices but no legal contiguous placement for a larger profile.
- HAMi does not relocate an active GI/CI to defragment a GPU.
- GPUs older than Ampere do not support MIG.
- Enabling or disabling MIG mode can still require a reset or reboot depending on the GPU and driver.
