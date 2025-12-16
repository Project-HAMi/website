---
title: Configuration
---

# Global Config

## Device Configs: ConfigMap

:::note
All the configurations listed below are managed within the hami-scheduler-device ConfigMap.
:::

You can update these configurations using one of the following methods:

1. Directly edit the ConfigMap: If HAMi has already been successfully installed, you can manually update
   the hami-scheduler-device ConfigMap using the kubectl edit command to manually update the hami-scheduler-device ConfigMap.

   ```bash
   kubectl edit configmap hami-scheduler-device -n <namespace>
   ```
  
   After making changes, restart the related HAMi components to apply the updated configurations.

2. Modify Helm Chart: Update the corresponding values in the
   [ConfigMap](https://raw.githubusercontent.com/archlitchi/HAMi/refs/heads/master/charts/hami/templates/scheduler/device-configmap.yaml),
   then reapply the Helm Chart to regenerate the ConfigMap.

   | Argument | Type | Description | Default |
   |----------|------|-------------|---------|
   | `nvidia.deviceMemoryScaling` | Float | The ratio for NVIDIA device memory scaling, can be greater than 1 (enables virtual device memory, experimental feature). For an NVIDIA GPU with *M* memory, if set to *S*, vGPUs split from this GPU will get `S * M` memory in Kubernetes. | `1` |
   | `nvidia.deviceSplitCount` | Integer | Maximum jobs assigned to a single GPU device. | `10` |
   | `nvidia.migstrategy` | String | "none" for ignoring MIG features, "mixed" for allocating MIG devices by separate resources. | `"none"` |
   | `nvidia.disablecorelimit` | String | "true" to disable core limit, "false" to enable core limit. | `"false"` |
   | `nvidia.defaultMem` | Integer | The default device memory of the current job, in MB. '0' means using 100% of the device memory. | `0` |
   | `nvidia.defaultCores` | Integer | Percentage of GPU cores reserved for the current job. `0` allows any GPU with enough memory; `100` reserves the entire GPU exclusively. | `0` |
   | `nvidia.defaultGPUNum` | Integer | Default number of GPUs. If set to `0`, it will be filtered out. If `nvidia.com/gpu` is not set in the pod resource, the webhook checks `nvidia.com/gpumem`, `resource-mem-percentage`, and `nvidia.com/gpucores`, adding `nvidia.com/gpu` with this default value if any of them are set. | `1` |
   | `nvidia.memoryFactor` | Integer | During resource requests, the actual value of `nvidia.com/gpumem` will be multiplied by this factor. If `mock-device-plugin` is deployed, the actual value `nvidia.com/gpumem` in `node.status.capacity` will also be amplified by the corresponding multiple. | `1` |
   | `nvidia.resourceCountName` | String | vGPU number resource name. | `"nvidia.com/gpu"` |
   | `nvidia.resourceMemoryName` | String | vGPU memory size resource name. | `"nvidia.com/gpumem"` |
   | `nvidia.resourceMemoryPercentageName` | String | vGPU memory fraction resource name. | `"nvidia.com/gpumem-percentage"` |
   | `nvidia.resourceCoreName` | String | vGPU core resource name. | `"nvidia.com/cores"` |
   | `nvidia.resourcePriorityName` | String | vGPU job priority name. | `"nvidia.com/priority"` |

## Node Configs: ConfigMap
HAMi allows configuring per-node behavior for device plugin. Edit 
```sh
kubectl -n <namespace> edit cm hami-device-plugin
```
* `name`: Name of the node.
* `operatingmode`: Operating mode of the node, can be "hami-core" or "mig", default: "hami-core".
* `devicememoryscaling`: Overcommit ratio of device memory.
* `devicecorescaling`: Overcommit ratio of device core.
* `devicesplitcount`: Allowed number of tasks sharing a device.
* `filterdevices`: Devices that are not registered to HAMi.
  * `uuid`: UUIDs of devices to ignore
  * `index`: Indexes of devices to ignore.
  * A device is ignored by HAMi if it's in `uuid` or `index` list.

## Chart Configs: arguments

You can customize your vGPU support by setting the following arguments using `-set`, for example

```bash
helm install hami hami-charts/hami --set devicePlugin.deviceMemoryScaling=5 ...
```

| Argument | Type | Description | Default |
|----------|------|-------------|---------|
| `devicePlugin.service.schedulerPort` | Integer | Scheduler webhook service nodePort. | `31998` |
| `scheduler.defaultSchedulerPolicy.nodeSchedulerPolicy` | String | GPU node scheduling policy: `"binpack"` allocates jobs to the same GPU node as much as possible. `"spread"` allocates jobs to different GPU nodes as much as possible. | `"binpack"` |
| `scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy` | String | GPU scheduling policy: `"binpack"` allocates jobs to the same GPU as much as possible. `"spread"` allocates jobs to different GPUs as much as possible. | `"spread"` |

## Pod configs: annotations

| Argument | Type | Description | Example |
|----------|------|-------------|---------|
| `nvidia.com/use-gpuuuid` | String | If set, devices allocated by this pod must be one of the UUIDs defined in this string. | `"GPU-AAA,GPU-BBB"` |
| `nvidia.com/nouse-gpuuuid` | String | If set, devices allocated by this pod will NOT be in the UUIDs defined in this string. | `"GPU-AAA,GPU-BBB"` |
| `nvidia.com/nouse-gputype` | String | If set, devices allocated by this pod will NOT be in the types defined in this string. | `"Tesla V100-PCIE-32GB, NVIDIA A10"` |
| `nvidia.com/use-gputype` | String | If set, devices allocated by this pod MUST be one of the types defined in this string. | `"Tesla V100-PCIE-32GB, NVIDIA A10"` |
| `hami.io/node-scheduler-policy` | String | GPU node scheduling policy: `"binpack"` allocates the pod to used GPU nodes for execution. `"spread"` allocates the pod to different GPU nodes for execution. | `"binpack"` or `"spread"` |
| `hami.io/gpu-scheduler-policy` | String | GPU scheduling policy: `"binpack"` allocates the pod to the same GPU card for execution. `"spread"` allocates the pod to different GPU cards for execution. | `"binpack"` or `"spread"` |
| `nvidia.com/vgpu-mode` | String | The type of vGPU instance this pod wishes to use. | `"hami-core"` or `"mig"` |

## Container configs: env

| Argument | Type | Description | Default |
|----------|------|-------------|---------|
| `GPU_CORE_UTILIZATION_POLICY` | String | Defines GPU core utilization policy: <ul><li>`"default"`: Default utilization policy.</li><li>`"force"`: Limits core utilization below `"nvidia.com/gpucores"`.</li><li>`"disable"`: Ignores the utilization limitation set by `"nvidia.com/gpucores"` during job execution.</li></ul> | `"default"` |
| `CUDA_DISABLE_CONTROL` | Boolean | If `"true"`, HAMi-core will not be used inside the container, leading to no resource isolation and limitation (for debugging purposes). | `false` |
