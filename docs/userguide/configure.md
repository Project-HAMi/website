---
title: Global Config
sidebar_label: Configuration
---

## Device Configs: ConfigMap

:::note

All the configurations listed below are managed within the hami-scheduler-device ConfigMap.

:::

You can update these configurations using one of the following methods:

1. Directly edit the ConfigMap: If HAMi has already been successfully installed, you can manually update the hami-scheduler-device ConfigMap using the kubectl edit command.

   ```bash
   kubectl edit configmap hami-scheduler-device -n <namespace>
   ```

   After making changes, restart the related HAMi components to apply the updated configurations.

2. Modify Helm Chart: Update the corresponding values in the [ConfigMap](https://raw.githubusercontent.com/Project-HAMi/HAMi/refs/heads/master/charts/hami/templates/scheduler/device-configmap.yaml), then reapply the Helm Chart to regenerate the ConfigMap.

   | Argument | Type | Description | Default |
   | --- | --- | --- | --- |
   | `nvidia.deviceMemoryScaling` | Float | The ratio for NVIDIA device memory scaling, can be greater than 1 (enables virtual device memory, experimental feature). For an NVIDIA GPU with _M_ memory, if set to _S_, vGPUs split from this GPU will get `S * M` memory in Kubernetes. | `1` |
   | `nvidia.deviceSplitCount` | Integer | Maximum jobs assigned to a single GPU device. | `10` |
   | `nvidia.migstrategy` | String | "none" for ignoring MIG features, "mixed" for allocating MIG devices by separate resources. | `"none"` |
   | `nvidia.disablecorelimit` | String | "true" to disable core limit, "false" to enable core limit. | `"false"` |
   | `nvidia.defaultMemory` | Integer | The default device memory of the current job, in MB. '0' means using 100% of the device memory. | `0` |
   | `nvidia.defaultCores` | Integer | Percentage of GPU cores reserved for the current job. `0` allows any GPU with enough memory; `100` reserves the entire GPU exclusively. | `0` |
   | `nvidia.defaultGPUNum` | Integer | Default number of GPUs. If set to `0`, it will be filtered out. If `nvidia.com/gpu` is not set in the pod resource, the webhook checks `nvidia.com/gpumem`, `resource-mem-percentage`, and `nvidia.com/gpucores`, adding `nvidia.com/gpu` with this default value if any of them are set. | `1` |
   | `nvidia.memoryFactor` | Integer | During resource requests, the actual value of `nvidia.com/gpumem` will be multiplied by this factor. If `mock-device-plugin` is deployed, the actual value `nvidia.com/gpumem` in `node.status.capacity` will also be amplified by the corresponding multiple. | `1` |
   | `nvidia.resourceCountName` | String | vGPU number resource name. | `"nvidia.com/gpu"` |
   | `nvidia.resourceMemoryName` | String | vGPU memory size resource name. | `"nvidia.com/gpumem"` |
   | `nvidia.resourceMemoryPercentageName` | String | vGPU memory fraction resource name. | `"nvidia.com/gpumem-percentage"` |
   | `nvidia.resourceCoreName` | String | vGPU core resource name. | `"nvidia.com/gpucores"` |
   | `nvidia.resourcePriorityName` | String | vGPU job priority name. | `"nvidia.com/priority"` |

## Node Configs: ConfigMap

HAMi allows configuring per-node behavior for device plugin. Edit the ConfigMap:

```sh
kubectl -n <namespace> edit cm hami-device-plugin
```

- `name`: Name of the node, or `"*"`. `"*"` is used as a fallback when no node name or label selector matches. It is not a wildcard.
- `nodelabelselector`: Kubernetes label selector for matching nodes. Supports matchLabels and matchExpressions. Specify either name or `nodelabelselector` for each entry, not both.
- `operatingmode`: Operating mode of the node, can be "hami-core" or "mig", default: "hami-core".
- `devicememoryscaling`: Overcommit ratio of device memory.
- `devicecorescaling`: Overcommit ratio of device core.
- `devicesplitcount`: Allowed number of tasks sharing a device.
- `filterdevices`: Devices that are not registered to HAMi.
  - `uuid`: UUIDs of devices to ignore
  - `index`: Indexes of devices to ignore.
  - A device is ignored by HAMi if it is in the `uuid` or `index` list.

### Which entries apply to a node

The device plugin checks for matching entries in this order:

1. Entries whose `name` equals the node name.
2. If there are none, every entry whose `nodelabelselector` matches the node labels.
3. If there are none, entries whose `name` is `"*"`.
4. Otherwise, the global settings in Device Configs above.

If more than one entry matches in step 1, 2, or 3, they are applied in list order. A later entry overrides only the fields it sets.

Entries that set both `name` and `nodelabelselector`, and entries with an empty or invalid selector, are ignored and an error is logged. If `config.json` fails to load (e.g. invalid value type), no entries are applied and an error is logged.

:::note

The device plugin reads node labels when it starts. If you change the labels later, restart the device plugin. Select labels that the node has from the moment it registers, such as labels set by a node group or by kubelet `--node-labels`. Avoid labels that a controller adds after the node registers.

:::

In the example below, nodes labeled `gpu.example.com/pool=mig` use MIG mode. Nodes with model t4 or l4 use hami-core mode with a split count of 4. All other nodes use a split count of 10.

If a node has both labels, both entries are applied in list order. The later entry overrides the settings, so it uses hami-core mode with a split count of 4.

<!-- prettier-ignore -->
```json
{
  "nodeconfig": [
    {
      "nodelabelselector": {
        "matchLabels": {
          "gpu.example.com/pool": "mig"
        }
      },
      "operatingmode": "mig"
    },
    {
      "nodelabelselector": {
        "matchExpressions": [
          {
            "key": "gpu.example.com/model",
            "operator": "In",
            "values": [
              "t4",
              "l4"
            ]
          }
        ]
      },
      "operatingmode": "hami-core",
      "devicesplitcount": 4
    },
    {
      "name": "*",
      "devicesplitcount": 10
    }
  ]
}
```

## Chart Configs: arguments

You can customize your vGPU support by setting the following arguments using `--set`, for example

```bash
helm install hami hami-charts/hami --set devicePlugin.deviceMemoryScaling=5 -n kube-system
```

| Argument | Type | Description | Default |
| --- | --- | --- | --- |
| `devicePlugin.service.schedulerPort` | Integer | Scheduler webhook service nodePort. | `31998` |
| `scheduler.defaultSchedulerPolicy.nodeSchedulerPolicy` | String | GPU node scheduling policy: `"binpack"` allocates jobs to the same GPU node as much as possible. `"spread"` allocates jobs to different GPU nodes as much as possible. | `"binpack"` |
| `scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy` | String | GPU scheduling policy: `"binpack"` allocates jobs to the same GPU as much as possible. `"spread"` allocates jobs to different GPUs as much as possible. `"mutex"` allocates jobs only to GPUs with no other workloads. | `"spread"` |
| `devicePlugin.deviceListStrategy` | String | Controls how the device plugin advertises allocated GPU devices to the container runtime: `"envvar"` (via `NVIDIA_VISIBLE_DEVICES`), `"volume-mounts"` (via mounted files, avoids env-var override risk in multi-tenant clusters), or `"cdi-annotations"` (via CDI annotations). | `"envvar"` |

## Pod Configs: Annotations

| Argument | Type | Description | Example |
| --- | --- | --- | --- |
| `nvidia.com/use-gpuuuid` | String | If set, devices allocated by this pod must be one of the UUIDs defined in this string. | `"GPU-AAA,GPU-BBB"` |
| `nvidia.com/nouse-gpuuuid` | String | If set, devices allocated by this pod will NOT be in the UUIDs defined in this string. | `"GPU-AAA,GPU-BBB"` |
| `nvidia.com/nouse-gputype` | String | If set, devices allocated by this pod will NOT be in the types defined in this string. | `"Tesla V100-PCIE-32GB, NVIDIA A10"` |
| `nvidia.com/use-gputype` | String | If set, devices allocated by this pod MUST be one of the types defined in this string. | `"Tesla V100-PCIE-32GB, NVIDIA A10"` |
| `hami.io/node-scheduler-policy` | String | GPU node scheduling policy: `"binpack"` allocates the pod to used GPU nodes for execution. `"spread"` allocates the pod to different GPU nodes for execution. | `"binpack"` or `"spread"` |
| `hami.io/gpu-scheduler-policy` | String | GPU scheduling policy: `"binpack"` allocates the pod to the same GPU card for execution. `"spread"` allocates the pod to different GPU cards for execution. `"mutex"` allocates the pod only to a GPU card with no other workloads, giving it exclusive use of that card. | `"binpack"`, `"spread"` or `"mutex"` |
| `hami.io/device-scoring-weights` | String | Relative weights of virtual-device slot, device-core, and device-memory utilization in physical-device scoring. All three weights are required, must be non-negative integers, and at least one must be positive. | `"slot=1,core=1,memory=3"` |
| `nvidia.com/vgpu-mode` | String | The type of vGPU instance this pod wishes to use. | `"hami-core"` or `"mig"` |

## Container Configs: Env

| Argument | Type | Description | Default |
| --- | --- | --- | --- |
| `GPU_CORE_UTILIZATION_POLICY` | String | Defines GPU core utilization policy: <ul><li>`"default"`: Default utilization policy.</li><li>`"force"`: Limits core utilization below `"nvidia.com/gpucores"`.</li><li>`"disable"`: Ignores the utilization limitation set by `"nvidia.com/gpucores"` during job execution.</li></ul> | `"default"` |
| `CUDA_DISABLE_CONTROL` | Boolean | If `"true"`, HAMi-core will not be used inside the container, leading to no resource isolation and limitation (for debugging purposes). | `false` |
