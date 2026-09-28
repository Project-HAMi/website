---
title: Global Config
sidebar_label: Configuration
---

Use Helm values to configure device sharing, scheduling policies, and node settings. Save your settings in `my-values.yaml` and pass this file to Helm when installing or upgrading HAMi.

The examples use release `hami` in namespace `kube-system`. Replace these names with those used by your installation. Manual edits to Helm-managed ConfigMaps may be overwritten during an upgrade; use them only for temporary troubleshooting.

## Device Configs: ConfigMap

Set device parameters under `devices.<vendor>` in your values file, such as `devices.nvidia` or `devices.mthreads`. Helm uses these values to generate `device-config.yaml` in the `hami-scheduler-device` ConfigMap.

### Configure device sharing

The following example allows up to 20 tasks to share each NVIDIA GPU. It sets the default memory request to 4096 MiB and the default core request to 50% when a workload does not specify them. It also sets the MThreads card memory sizes:

```yaml
devices:
  nvidia:
    deviceSplitCount: 20
    defaultMemory: 4096
    defaultCores: 50
  mthreads:
    memoryPerCard: [96, 160]
```

Apply the file with Helm:

```bash
helm upgrade --install hami hami-charts/hami \
  --namespace kube-system \
  --values my-values.yaml
```

Keep all settings needed by your installation in the values files you pass to Helm. Fields you omit use the chart defaults. A list in your values file replaces the entire default list. For example, setting `devices.ascend.configs` replaces the complete Ascend chip list.

`devices.mthreads.memoryPerCard` is an integer array with default `[96]`. Each entry gives the memory size of a card model in units of 512 MiB: `96` means 48 GiB and `160` means 80 GiB. Use an array even for one model.

### Set the MIG profile allowlist

Add the following settings to the existing `devices.nvidia` section in `my-values.yaml`:

```yaml
devices:
  nvidia:
    migProfileAllowlist:
      - models: ["A100-SXM4-80GB"]
        profiles: ["1g.10gb", "2g.20gb"]
```

This replaces the entire allowlist. Include entries for any other GPU models you need to support. When combining examples, keep one `devices` key and one `nvidia` key in the file.

See the [chart parameter reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md) for available fields and defaults. You can also export the chart's default values:

```bash
helm show values hami-charts/hami > chart-defaults.yaml
```

If a vendor uses `devices.<vendor>.customresources`, keep this list consistent with the resource names in its device settings and chip definitions.

### Use a complete device configuration file

To supply your own `device-config.yaml`, set `device-config.content` to the complete file content. This replaces the whole file, including all vendor sections; it does not merge with `devices.*`. Use `devices.<vendor>` to change individual settings.

The chart chooses the file in this order:

1. Non-empty `device-config.content`.
2. `files/device-config.yaml`, if bundled in the chart.
3. The file generated from `devices.*` values.

When either of the first two sources is used, changes to `devices.*` do not change the device configuration file. Keep a complete replacement file under version control along with the other installation settings.

When a Helm upgrade changes the device configuration, the scheduler and the chart-managed NVIDIA device plugin roll out automatically. For device plugins deployed separately, follow their own update and restart procedures.

## Node Configs: ConfigMap

Use node configuration to override NVIDIA device settings on specific nodes. A matching node entry takes priority over the corresponding global device settings. The `hami-device-plugin` ConfigMap stores this configuration in `config.json`.

You can store the JSON in Helm values or use a ConfigMap that you manage separately. If both are set, `devicePlugin.nodeConfiguration.externalConfigName` takes priority over `devicePlugin.nodeConfiguration.config`. Without either setting, the chart uses its default node configuration.

### Store node configuration in values

Add this to `my-values.yaml`:

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
            "devicesplitcount": 20,
            "filterdevices": {
              "uuid": [],
              "index": []
            }
          }
        ]
      }
```

Replace `gpu-node-1` with the Kubernetes node name. The JSON string replaces the complete `config.json`, so include all node entries you need.

Apply the file with Helm. Changing only the node JSON does not trigger an automatic rollout. Restart the NVIDIA device plugin to load the change:

```bash
kubectl rollout restart daemonset/hami-device-plugin -n kube-system
kubectl rollout status daemonset/hami-device-plugin -n kube-system
```

### Use a separately managed node ConfigMap

Save the complete JSON document as `node-config.json`. Create the ConfigMap in the same namespace as HAMi:

```bash
kubectl create configmap hami-node-config \
  --namespace kube-system \
  --from-file=config.json=node-config.json
```

Add its name to `my-values.yaml`:

```yaml
devicePlugin:
  nodeConfiguration:
    externalConfigName: hami-node-config
```

The chart uses this ConfigMap and skips creating its own node ConfigMap. Manage and back it up separately from the Helm release. After changing its content, restart the NVIDIA device plugin with the commands above.

### Node configuration fields

| JSON field            | Meaning                                      |
| --------------------- | -------------------------------------------- |
| `name`                | Kubernetes node name.                        |
| `operatingmode`       | `hami-core` or `mig`.                        |
| `devicememoryscaling` | Device memory overcommit ratio.              |
| `devicecorescaling`   | Device core overcommit ratio.                |
| `devicesplitcount`    | Maximum number of tasks sharing one device.  |
| `filterdevices.uuid`  | Device UUIDs to exclude from registration.   |
| `filterdevices.index` | Device indexes to exclude from registration. |

A device is excluded when either its UUID or index matches a filter entry.

## Chart Configs: arguments

Set deployment and scheduler options in the same values file. You can also use `--set` to override a field for a Helm command. This example sets the NVIDIA memory overcommit ratio to 5:

```bash
helm upgrade --install hami hami-charts/hami \
  --namespace kube-system \
  --values my-values.yaml \
  --set devices.nvidia.deviceMemoryScaling=5
```

Save settings you need to retain in the values file. Common chart options are:

| Argument | Type | Description | Default |
| --- | --- | --- | --- |
| `scheduler.service.schedulerPort` | Integer | Scheduler webhook service NodePort. | `31998` |
| `scheduler.defaultSchedulerPolicy.nodeSchedulerPolicy` | String | `binpack` places jobs on the same GPU node where possible; `spread` distributes them across GPU nodes. | `"binpack"` |
| `scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy` | String | `binpack` packs jobs onto the same GPU; `spread` distributes them; `mutex` selects GPUs without other workloads. | `"spread"` |
| `devicePlugin.deviceListStrategy` | String | Device advertisement strategy: `envvar`, `volume-mounts`, or `cdi-annotations`. | `"envvar"` |
| `devicePlugin.migStrategy` | String | NVIDIA device-plugin MIG strategy: `none` or `mixed`. | `"none"` |
| `devicePlugin.disablecorelimit` | String | Whether to disable the NVIDIA device-plugin core limit. | `"false"` |

`devices.nvidia.runtimeClassName` sets the RuntimeClass for the NVIDIA device-plugin Pod and NVIDIA workload Pods. Set `devices.nvidia.createRuntimeClass` to `true` if the chart should create that RuntimeClass. Ascend uses `devices.ascend.runtimeClassName`; create its RuntimeClass separately.

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

## Upgrade an existing installation

A Helm upgrade may overwrite manual edits to the chart-managed ConfigMaps. Before upgrading, back up your values and ConfigMaps, then move the settings you need to keep into your values file.

### Back up the current configuration

Export the release's user-supplied values and device ConfigMap:

```bash
helm get values hami -n kube-system -o yaml > previous-values.yaml
kubectl get configmap hami-scheduler-device -n kube-system -o yaml > device-config-backup.yaml
```

If you use node configuration, back up its ConfigMap too. Replace `hami-device-plugin` with the external ConfigMap name when applicable:

```bash
kubectl get configmap hami-device-plugin -n kube-system -o yaml > node-config-backup.yaml
```

### Update the values file

Use the saved values to prepare `my-values.yaml`. Keep the settings required by your installation and move old device fields to their current paths using the table below. Remove each old field after moving its value.

The chart rejects these old fields even when their value is `0`, `false`, or empty:

| Old Helm value                           | Current Helm value                            |
| ---------------------------------------- | --------------------------------------------- |
| `resourceName`                           | `devices.nvidia.resourceCountName`            |
| `resourceMem`                            | `devices.nvidia.resourceMemoryName`           |
| `resourceMemPercentage`                  | `devices.nvidia.resourceMemoryPercentageName` |
| `resourceCores`                          | `devices.nvidia.resourceCoreName`             |
| `resourcePriority`                       | `devices.nvidia.resourcePriorityName`         |
| `mluResourceName`                        | `devices.cambricon.resourceCountName`         |
| `mluResourceMem`                         | `devices.cambricon.resourceMemoryName`        |
| `mluResourceCores`                       | `devices.cambricon.resourceCoreName`          |
| `hcuResourceName`                        | `devices.hygon.resourceCountName`             |
| `hcuResourceMem`                         | `devices.hygon.resourceMemoryName`            |
| `hcuResourceCores`                       | `devices.hygon.resourceCoreName`              |
| `metaxResourceName`                      | `devices.metax.resourceVCountName`            |
| `metaxResourceCore`                      | `devices.metax.resourceVCoreName`             |
| `metaxResourceMem`                       | `devices.metax.resourceVMemoryName`           |
| `metaxsGPUTopologyAware`                 | `devices.metax.sgpuTopologyAware`             |
| `enflameResourceNameDRSGCU`              | `devices.enflame.resourceNameDRSGCU`          |
| `enflameResourceNameGCUMemory`           | `devices.enflame.resourceNameGCUMemory`       |
| `enflameResourceNameGCUCore`             | `devices.enflame.resourceNameGCUCore`         |
| `kunlunResourceName`                     | `devices.kunlun.resourceCountName`            |
| `kunlunResourceVCountName`               | `devices.kunlun.resourceVCountName`           |
| `kunlunResourceVMemoryName`              | `devices.kunlun.resourceVMemoryName`          |
| `vastaiResourceName`                     | `devices.vastai.resourceCountName`            |
| `birenResourceName`                      | `devices.biren.resourceCountName`             |
| `devicePlugin.deviceSplitCount`          | `devices.nvidia.deviceSplitCount`             |
| `devicePlugin.deviceMemoryScaling`       | `devices.nvidia.deviceMemoryScaling`          |
| `devicePlugin.deviceCoreScaling`         | `devices.nvidia.deviceCoreScaling`            |
| `devicePlugin.preConfiguredDeviceMemory` | `devices.nvidia.preConfiguredDeviceMemory`    |
| `devicePlugin.enableNumaTopology`        | `devices.nvidia.enableNumaTopology`           |
| `devicePlugin.runtimeClassName`          | `devices.nvidia.runtimeClassName`             |
| `devicePlugin.createRuntimeClass`        | `devices.nvidia.createRuntimeClass`           |

Other settings, such as `scheduler.overwriteEnv`, `devicePlugin.enabled`, images, `devicePlugin.deviceListStrategy`, `devicePlugin.migStrategy`, `devicePlugin.disablecorelimit`, and `devicePlugin.nodeConfiguration`, keep their existing paths.

If you edited a ConfigMap manually, transfer only the fields you need into the corresponding Helm values. For node settings, use `devicePlugin.nodeConfiguration.config` or the separately managed ConfigMap. Restoring the entire old ConfigMap can overwrite new chart defaults.

### Apply the configuration

Upgrade with the chart defaults and your complete set of installation overrides:

```bash
helm upgrade hami hami-charts/hami \
  --namespace kube-system \
  --reset-values \
  --values my-values.yaml
```

`--reset-values` discards the release's previous values. Include every override you need to keep in `my-values.yaml` or the other values files passed to this command. Avoid `--reuse-values` and `--reset-then-reuse-values` when migrating old fields, because they can pass those fields to the new chart again.

After upgrading, check the ConfigMaps and Pod rollout status. Restart the NVIDIA device plugin if you changed only its node configuration.

## Edit ConfigMaps for troubleshooting

For a temporary device configuration change, back up and edit the ConfigMap:

```bash
kubectl get configmap hami-scheduler-device -n kube-system -o yaml > device-config-backup.yaml
kubectl edit configmap hami-scheduler-device -n kube-system
```

Restart the scheduler and device plugins that read the changed configuration. For the chart-managed NVIDIA components:

```bash
kubectl rollout restart deployment/hami-scheduler -n kube-system
kubectl rollout restart daemonset/hami-device-plugin -n kube-system
```

For a temporary node configuration change, edit the node ConfigMap and restart the NVIDIA device plugin:

```bash
kubectl edit configmap hami-device-plugin -n kube-system
kubectl rollout restart daemonset/hami-device-plugin -n kube-system
```

Use the external ConfigMap name if you configured one. Manual edits do not update Helm values. Save any changes you need to retain in your values file, or in the separately managed node ConfigMap, before the next upgrade.
