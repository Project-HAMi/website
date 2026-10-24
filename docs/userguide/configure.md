---
title: Configuration
sidebar_label: Configuration
---

Choose values for a HAMi installation and understand how device, node, and workload settings interact. For installation commands, see [Installation](../installation/online-installation.md); for backups and migration, see [Upgrade](../installation/upgrade.md).

## Find a value {#values-reference}

For the complete list of parameters, types, defaults, and descriptions, see the [Chart values reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values). The default configuration is available in [values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml).

Those links follow the development branch. For a released chart, inspect the exact version with `helm show values hami-charts/hami --version <chart-version>` and select the matching website version. Next may describe unreleased settings.

## Apply values {#apply-values}

Keep installation overrides in a values file and supply it to Helm with `--values`. Omitted fields use chart defaults on installation. Maps merge with defaults; lists replace the corresponding list in full. An upgrade's handling of previous values depends on its flags; follow the [upgrade procedure](../installation/upgrade.md).

| Configuration scope | Values | Purpose |
| --- | --- | --- |
| Images | `global.imageRegistry`, `global.imagePullSecrets`, component `image` settings | Choose registries, credentials, and images. Per-component tags override the shared HAMi tag; kube-scheduler uses its own tag. See the parameter reference for which components consume each global setting. |
| Scheduler | `scheduler.defaultSchedulerPolicy`, `scheduler.replicas`, `scheduler.leaderElect` | Choose placement policy and scheduler availability. Multiple replicas require leader election. |
| NVIDIA runtime and nodes | `devices.nvidia.runtimeClassName`, `devicePlugin.nvidiaNodeSelector`, `devicePlugin.nvidiaDriverRoot` | Match the runtime, node labels, and host driver layout prepared during installation. |
| Device sharing | `devices.<vendor>` | Set resource names, sharing limits, and vendor-specific device configuration. |
| NVIDIA node overrides | `devicePlugin.nodeConfiguration` | Apply per-node settings or reference a separately managed ConfigMap. |
| Platform and security | `platform.openshift`, `openshift.securityContextConstraints`, `selinux` | Configure platform-specific permissions and host directory labels. |

For driver and runtime choices, follow [Prerequisites](../installation/prerequisites.md) and [NVIDIA driver discovery](../installation/online-installation.md#nvidia-driver-discovery). For profiling and cleanup, see [Chart operations](./chart-operations.md).

## Device configuration {#device-configuration}

The chart generates `device-config.yaml` in the device ConfigMap from `devices.<vendor>`. With the default release name, the ConfigMap is `hami-scheduler-device`. `devices.ascend.configs` renders as `vnpus.configs`, and `devices.iluvatar.configs` renders as `iluvatars`.

### NVIDIA

Set NVIDIA sharing limits and default requests:

```yaml
devices:
  nvidia:
    deviceSplitCount: 20
    defaultMemory: 4096
    defaultCores: 50
```

`deviceSplitCount` controls the advertised virtual-device count per physical GPU. `defaultMemory` is the fallback allocation in MiB when neither absolute nor percentage memory is requested; `defaultCores` is the fallback core percentage. `defaultMemory: 0` uses the full GPU memory when no memory request is provided; `defaultCores: 0` leaves core usage unconstrained. `deviceCoreScaling` and `deviceMemoryScaling` accept fractional values, and node settings can override sharing parameters.

Each `migProfileAllowlist` entry contains `models` and `profiles` lists. This example replaces the whole default allowlist; include other models you need:

```yaml
devices:
  nvidia:
    migProfileAllowlist:
      - models: ["A100-SXM4-80GB"]
        profiles: ["1g.10gb", "2g.20gb"]
```

### MIG ownership and limit delivery

| Value | Default | When to use it |
| --- | --- | --- |
| `devices.nvidia.adoptExistingMIGInstances` | `false` | In `mig` mode, allow HAMi to adopt MIG instances it has no record of creating during plugin startup, so it can reuse or destroy them. Enable this only when HAMi alone manages the node's MIG layout. With `false`, those instances are left untouched. |
| `devices.nvidia.limitDelivery` | `file` | Choose how limits reach HAMi-core. `file` sets environment variables and mounts a read-only limits file at `/overrideEnv`; `env` sets environment variables only. This setting does not apply in `mig` mode. |

File delivery lets HAMi-core read limits for processes started without the container's original environment, such as through SSH, `su -`, `sudo`, or cron. A node's `limitdelivery` setting overrides the global value; the Pod annotation `hami.io/limit-delivery` takes precedence over both. Unknown values are ignored, and `file` is used when no valid setting is available.

### MThreads

For cards with 48 GiB and 80 GiB of memory, list both sizes in units of 512 MiB:

```yaml
devices:
  mthreads:
    memoryPerCard: [96, 160]
```

### Ascend

Set `devices.ascend.hamiVnpuMode` to choose the global default. The chart renders it as `vnpus.hamiVnpuMode` in the scheduler configuration. Empty uses `template`, or `hami-core` when the deprecated `devices.ascend.hamiVnpuCore: true` is present. An explicit mode always takes precedence over that legacy flag. Direct scheduler configuration has the same fallback for `vnpus.hamiVnpuCore`. Unknown modes are rejected. Replace the former `devices.ascend.enpu: true` with `devices.ascend.hamiVnpuMode: enpu`.

The device plugin's `hami-vnpu-core` and `hami.io/enpu` node annotations override the corresponding capability with `"true"` or `"false"`; absent annotations use the global mode. ENPU requires the companion Ascend device plugin with ENPU support. In a mixed cluster, use `devices.ascend.hamiVnpuMode: template` and enable ENPU only on the intended nodes through the separately deployed plugin's node configuration (`hamiVnpuMode: enpu`). The plugin publishes the corresponding `hami.io/enpu` annotation; changing the Node annotation alone does not change the plugin's mode and is overwritten by its next report.

Pods select ENPU explicitly with `huawei.com/vnpu-mode: enpu`. The scheduler also accepts `ubs-virt` and `vcann-rt`, matching the mode aliases in the companion [device plugin's `podUsesENPU`](https://github.com/maverick-woo/ascend-device-plugin/blob/5afdaec52dfd628a05066bfbbf0f39e2c47e3281/internal/server/server.go#L116-L125). Use `enpu` for new workloads. All three names use the same single-DIE admission, exact memory allocation, and policy-isolation rules.

Set `huawei.com/enpu-policy` on a Pod to override `devices.ascend.enpuPolicy`. Admission records the selected policy on the Pod so later changes to the default do not change existing tenants' policies. Invalid policies are rejected.

`devices.ascend` renders as `vnpus`. Its `configs` list contains chip definitions and partition templates:

| Field | Meaning |
| --- | --- |
| `chipName` | Chip model identifier |
| `commonWord` | Device identifier used by the backend |
| `resourceName` | Kubernetes resource for NPU count |
| `resourceMemoryName` | Kubernetes resource for NPU memory |
| `resourceCoreName` | Kubernetes resource for NPU cores |
| `memoryAllocatable` | Memory available for allocation, in backend units |
| `memoryCapacity` | Physical memory capacity, in backend units |
| `memoryFactor` | Memory-unit conversion multiplier |
| `aiCore` | AI-core capacity |
| `aiCPU` | AI-CPU capacity |
| `superPod` | Whether the chip uses super-pod mode |
| `templates` | Partition definitions containing `name`, `memory`, `aiCore`, and optionally `aiCPU` |

The complete default lists are in [values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml). Copy the list you need into your values file and modify it there; list entries do not merge by model or chip name.

### Iluvatar

`devices.iluvatar.configs` is a list of chip definitions and renders as `iluvatars`. Each entry uses the following fields:

| Field                | Meaning                                      |
| -------------------- | -------------------------------------------- |
| `chipName`           | Chip model identifier                        |
| `commonWord`         | Device identifier used by the backend        |
| `resourceCountName`  | Kubernetes resource for virtual-device count |
| `resourceMemoryName` | Kubernetes resource for device memory        |
| `resourceCoreName`   | Kubernetes resource for device cores         |

The complete default lists are in [values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml). Copy the list you need into your values file and modify it there; list entries do not merge by model or chip name.

### Resource names and other vendors

For Enflame, Kunlun, Vastai, and Biren, the scheduler extender's standard resources follow the named device resource fields. Their `customresources` lists contain only additional resources and default to `[]`. Standard resources remain included when the vendor is enabled, and duplicate names within each vendor are removed.

For other vendors whose extender resources use `customresources`, update those lists when changing resource names or chip definitions. Consult the [device guides](../installation/prerequisites.md#device-prerequisites) for vendor setup and examples. Enabling scheduler support does not imply that the chart deploys the vendor's device plugin.

### Complete device configuration replacement {#device-config-overrides}

The chart chooses the first available source in this order:

1. Non-empty `device-config.content`.
2. A bundled `files/device-config.yaml`.
3. Configuration generated from `devices.<vendor>` values.

`device-config.content` replaces the complete document for all vendors. It does not merge with `devices.*`. Prefer individual values for targeted changes. Lists such as the MIG allowlist, Ascend `configs`, and Iluvatar `configs` replace the whole default list; entries do not merge by model or chip name.

## NVIDIA node configuration {#node-configuration}

NVIDIA node settings are stored in `config.json` of the `hami-device-plugin` ConfigMap. Matching node settings override the corresponding global device parameters. Set the complete JSON with `devicePlugin.nodeConfiguration.config`, or reference a separately managed ConfigMap with `devicePlugin.nodeConfiguration.externalConfigName`; the external ConfigMap takes priority.

| JSON field | Meaning |
| --- | --- |
| `name` | Kubernetes node name, or `"*"` for fallback. |
| `operatingmode` | `hami-core`, `mig`, or `remote`; `remote` makes the node a Lupine GPU server. |
| `devicememoryscaling` | Device memory overcommit ratio. |
| `devicecorescaling` | Device core overcommit ratio; `null` keeps the global value. |
| `libcudaloglevel` | HAMi-core log level; `null` keeps the global value. `0` and `1` log errors only, `2` adds warnings and messages, `3` adds info, and `4` adds debug logs. |
| `reportnodecapacity` | Whether to report GPU memory and cores in Node capacity and allocatable; `null` follows `devicePlugin.reportNodeCapacity`. |
| `limitdelivery` | Per-node `file` or `env` limit delivery for HAMi-core. |
| `devicesplitcount` | Maximum number of tasks sharing one device. |
| `filterdevices.uuid` | Device UUIDs to exclude from registration. |
| `filterdevices.index` | Device indexes to exclude from registration. |

`nodelabelselector` accepts Kubernetes `matchLabels` and `matchExpressions`. Set either `name` or `nodelabelselector` in an entry, not both.

A device is excluded when either its UUID or index matches a filter entry.

This override example configures `gpu-node-1`; it is not the complete default JSON. Use the actual node name. The `null` fields retain their global settings. The JSON string replaces the complete `config.json`, so include all node entries you need:

```yaml
devicePlugin:
  nodeConfiguration:
    config: |
      {
        "nodeconfig": [
          {
            "name": "gpu-node-1",
            "operatingmode": "hami-core",
            "devicememoryscaling": 1,
            "devicecorescaling": null,
            "libcudaloglevel": null,
            "reportnodecapacity": null,
            "devicesplitcount": 20,
            "filterdevices": {
              "uuid": [],
              "index": []
            }
          }
        ]
      }
```

To reference an existing node ConfigMap, set its name. The ConfigMap must be in the HAMi namespace and contain a `config.json` data entry:

```yaml
devicePlugin:
  nodeConfiguration:
    externalConfigName: hami-node-config
```

Changing only the node JSON does not trigger a device-plugin rollout. See [Reload configuration](./chart-operations.md#configuration-reload) for restart commands.

### Which entries apply to a node

The device plugin checks for matching entries in this order:

1. Entries whose `name` equals the node name.
2. If there are none, every entry whose `nodelabelselector` matches the node labels.
3. If there are none, entries whose `name` is `"*"`.
4. Otherwise, the global settings in Device Configs above.

If more than one entry matches in step 1, 2, or 3, they are applied in list order. A later entry overrides only the fields it sets.

However, for resource settings (`devicesplitcount`, `devicememoryscaling`, etc.), null, 0, and false do not override non-zero values or true from earlier entries. Empty `operatingmode` and `filterdevices` values are also ignored.

Entries that set both `name` and `nodelabelselector`, or neither of them, and entries with an empty or invalid selector, are ignored and an error is logged. If config.json fails to load (e.g. invalid value type), no entries are applied and an error is logged.

:::note

The device plugin reads node labels when it starts. If you change the labels later, restart the device plugin. Select labels that the node has from the moment it registers, such as labels set by a node group or by kubelet `--node-labels`. Avoid labels that a controller adds after the node registers.

:::

In the example below, nodes labeled `gpu.example.com/pool=mig` use mig mode. Nodes with model t4 or l4 use hami-core mode with a split count of 4. All other nodes use a split count of 10.

If a node has both labels, both entries are applied in list order. The later entry overrides the settings, so it uses hami-core mode with a split count of 4.

This JSON goes into the `config.json` key of the device plugin ConfigMap. For Helm, set it under `devicePlugin.nodeConfiguration.config`.

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

## Scheduling policies {#scheduling-policies}

Set the global placement policy with:

```yaml
scheduler:
  defaultSchedulerPolicy:
    nodeSchedulerPolicy: binpack
    gpuSchedulerPolicy: spread
```

`binpack` favors consolidation; `spread` favors distribution. GPU policy also supports `mutex`, selecting a GPU with no other workloads. Per-Pod policy annotations below override these defaults.

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
