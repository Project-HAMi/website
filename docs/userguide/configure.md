---
title: Configuration
sidebar_label: Configuration
---

This guide covers common HAMi settings and where to change them. For the complete list of parameters, defaults, and constraints, use the [Chart values reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values). Configuration examples are available in [values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml).

| Configuration scope | Where to configure it |
| --- | --- |
| [Scheduler and supporting components](#scheduler-configuration) | Helm values such as `scheduler.*` |
| [Vendor device plugins and device parameters](#device-configuration) | Helm values under `devicePlugin.*` and `devices.<vendor>.*`, plus separately deployed vendor plugin configurations |
| [Node ConfigMap](#node-configuration) | `devicePlugin.nodeConfiguration` |
| [Pod labels and annotations](#pod-configuration) | The workload Pod's `metadata` |
| [Container environment variables](#container-environment) | The workload container's `env` |

This page describes the Next development version, and the source links above point to the development branch. For a released chart, select the matching documentation version and inspect that chart's defaults:

```bash
helm show values hami-charts/hami --version <chart-version>
```

Merge the settings you need into `my-values.yaml` and pass it to Helm with `--values my-values.yaml`. Maps support partial overrides; lists are replaced in full. When combining examples, keep only one occurrence of each top-level key. See [Installation](../installation/online-installation.md) for a new deployment and [Upgrade](../installation/upgrade.md) for configuration changes to an existing deployment.

## Scheduler and supporting components: Chart values {#scheduler-configuration}

Common scheduler changes include placement, replica count, and default scheduling policies. For example, deploy two replicas on nodes labeled `hami.io/scheduler=true`:

```yaml
scheduler:
  nodeSelector:
    hami.io/scheduler: "true"
  leaderElect: true
  replicas: 2
  defaultSchedulerPolicy:
    nodeSchedulerPolicy: binpack
    gpuSchedulerPolicy: spread
```

Multiple replicas require `leaderElect` and enough matching nodes and resources. `nodeSelector` controls where scheduler Pods run; it does not select nodes for GPU workloads.

### Default scheduling policies {#scheduling-policies}

`nodeSchedulerPolicy` controls node selection and defaults to `binpack`. `gpuSchedulerPolicy` controls device selection within a node and defaults to `spread`. `binpack` favors consolidation, while `spread` favors distribution. Pod annotations can override these defaults. For other policies and combinations, see [Scheduling policies](./nvidia-device/scheduling-policy.md).

Images, CPU and memory resources, webhook scope, certificates, service ports, and monitoring can usually keep their defaults. When changes are needed, look up `global.*`, `scheduler.*`, and `prometheus.*` in the [Chart values reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values). Profiling settings are also documented there.

## Vendor device plugins and device parameters: Chart values {#device-configuration}

`devicePlugin.*` manages the **NVIDIA device plugin and vGPU monitor** deployed by the HAMi chart. `devices.<vendor>.*` configures vendor scheduling support and device parameters; these settings do not imply that the chart deploys the corresponding vendor plugin.

### NVIDIA

Common changes include plugin placement, RuntimeClass, and the number of containers that can share a GPU. For example, use an existing `nvidia` RuntimeClass, deploy the plugin on nodes labeled `gpu=on`, and allow up to `20` containers to share each GPU:

```yaml
devicePlugin:
  enabled: true
  nvidiaNodeSelector:
    gpu: "on"
devices:
  nvidia:
    runtimeClassName: nvidia
    deviceSplitCount: 20
```

Prepare the RuntimeClass and drivers according to [Prerequisites](../installation/prerequisites.md). Other common sharing parameters are under `devices.nvidia`:

| Field | Default | Purpose |
| --- | --- | --- |
| `deviceSplitCount` | `10` | Maximum number of containers sharing each physical GPU. MIG mode is limited by actual instance capacity. |
| `deviceMemoryScaling` | `1` | Multiplier for advertised GPU memory. Values above `1` allow memory overcommit without increasing physical memory. Does not apply to MIG. |
| `defaultMemory` | `0` | Default memory per GPU, in MiB, when neither absolute nor percentage memory has a positive request. `0` allocates the full GPU memory. |
| `defaultCores` | `0` | Default core percentage when no core request is specified. `0` reserves no cores. With the webhook enabled, whole-GPU requests that omit memory or request all memory receive a `100` (100%) core request. |

For driver paths, plugin images, monitoring, cache cleanup, and other sharing parameters, consult `devicePlugin.*` and `devices.nvidia.*` in the [Chart values reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values). See [Dynamic MIG support](./nvidia-device/dynamic-mig-support.md) and [NUMA alignment](./nvidia-device/numa-alignment.md) for those configurations.

### Other vendors

Other vendor plugins generally require a separate deployment. The table below lists their HAMi chart configuration prefixes. Use the [Chart values reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values) for field definitions and the corresponding device guide for the plugin's own images, arguments, and node configuration.

| Vendor and device guide | HAMi chart configuration prefix |
| --- | --- |
| [Ascend](./ascend-device/enable-ascend-sharing.md) | `devices.ascend.*` |
| [Cambricon](./cambricon-device/enable-cambricon-mlu-sharing.md) | `devices.cambricon.*` |
| [Hygon](./hygon-device/enable-hygon-hcu-sharing.md) | `devices.hygon.*` |
| [MThreads](./mthreads-device/enable-mthreads-gpu-sharing.md) | `devices.mthreads.*` |
| [Iluvatar](./iluvatar-device/enable-iluvatar-gpu-sharing.md) | `devices.iluvatar.*` |
| [MetaX](./metax-device/metax-sgpu/enable-metax-gpu-sharing.md) | `devices.metax.*` |
| [Enflame](./enflame-device/enable-enflame-gcu-sharing.md) | `devices.enflame.*` |
| [Kunlunxin](./kunlunxin-device/enable-kunlunxin-schedule.md) | `devices.kunlun.*` |
| [AMD](./amd-device/enable-amd-gpu-sharing.md) | `devices.amd.*` |
| [AWS Neuron prerequisites](../installation/prerequisites.md#device-prerequisites) | `devices.awsneuron.*` |
| [Vastai](./vastai/enable-vastai-sharing.md) | `devices.vastai.*` |
| [Biren](./biren-device/enable-biren-sharing.md) | `devices.biren.*` |

For example, an Ascend-only cluster can disable the NVIDIA plugin and enable Ascend scheduling support:

```yaml
devicePlugin:
  enabled: false
devices:
  ascend:
    enabled: true
```

This does not deploy the Ascend plugin; install it separately using the device guide. When changing vendor resource names or chip definitions, also check `customresources` so HAMi, the vendor plugin, and workload Pods use consistent resource names. Device model and template lists are replaced in full, not merged by model.

### Device ConfigMap generation and updates {#device-config-overrides}

With the default release name `hami`, the chart writes global device parameters to `device-config.yaml` in the `hami-scheduler-device` ConfigMap.

:::warning Do not manually edit the global device ConfigMap

Do not edit the global `device-config.yaml` through `kubectl edit`, `kubectl patch`, or a cluster management UI. Change `devices.<vendor>.*` in Helm values, then update the deployment through Helm.

Manual edits do not update Helm values or trigger the component rollouts associated with chart configuration changes. A later Helm upgrade or rollback may also overwrite those edits.

:::

To replace the complete file, use `device-config.content` as described in the [Chart values reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values). It does not merge with `devices.*`. Keep resource names consistent, because kube-scheduler's extender resource list is still generated from values.

Changing the generated device configuration through Helm updates the scheduler and NVIDIA plugin Pod templates. The default `RollingUpdate` strategy updates plugin Pods automatically; with `OnDelete`, delete the old Pods manually. Separately deployed vendor plugins follow their own update procedures.

## Node ConfigMap configuration {#node-configuration}

NVIDIA node configuration overrides operating modes, sharing parameters, and device filters for specific nodes. It uses a different ConfigMap from the global device configuration:

| ConfigMap with the default release name | Data key | Configuration source |
| --- | --- | --- |
| `hami-scheduler-device` | `device-config.yaml` | Global chart values such as `devices.*` |
| `hami-device-plugin` | `config.json` | `devicePlugin.nodeConfiguration.config` |

### Configure nodes through values

The following is a simplified version of the [node configuration example in values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml). Replace `gpu-node-1` with the actual node name:

```yaml
devicePlugin:
  nodeConfiguration:
    config: |
      {
        "nodeconfig": [
          {
            "name": "gpu-node-1",
            "operatingmode": "hami-core",
            "devicesplitcount": 20,
            "filterdevices": {
              "uuid": [],
              "index": []
            }
          }
        ]
      }
```

This example uses `hami-core` mode and allows up to `20` containers to share each GPU on the node. Add device UUIDs or indexes to `filterdevices.uuid` or `filterdevices.index` to exclude them. Devices matching either list are not registered with HAMi. Other parameters retain their global settings.

`config` replaces the entire `config.json`; include multiple nodes in the same `nodeconfig` list. Matching precedence is: node name (`name`) → label selector (`nodelabelselector`) → `name: "*"` → global configuration. Each entry must specify either a name or a label selector. Multiple entries matching at the same level apply in list order; zero, `false`, and `null` resource values do not clear existing nonzero values or `true`.

For more node fields, label selector examples, and override rules, see `devicePlugin.nodeConfiguration.config` in the [Chart values reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values) and its linked source example.

### External ConfigMaps and reloading {#configuration-reload}

If another operations tool manages node configuration, reference an existing ConfigMap through values:

```yaml
devicePlugin:
  nodeConfiguration:
    externalConfigName: hami-node-config
```

The ConfigMap must be in the same namespace as the plugin Pods and contain a `config.json` data entry. `externalConfigName` takes precedence over `config`.

Changing only the node JSON or external ConfigMap contents **does not automatically update plugin Pods**. Changes to node labels also require a plugin restart to match the configuration again. With the default `RollingUpdate` strategy, run:

```bash
kubectl -n kube-system rollout restart daemonset/hami-device-plugin
kubectl -n kube-system rollout status daemonset/hami-device-plugin --timeout=5m
```

Replace the resource name and namespace with those of your deployment. With `OnDelete`, delete the old plugin Pods manually during maintenance. Reloading node configuration does not mean that existing workload containers' resource limits have changed.

## Pod configuration: labels and annotations {#pod-configuration}

Set labels and annotations in the Pod's `metadata`. For Deployments, StatefulSets, Jobs, and similar workloads, use **`spec.template.metadata`**. Annotation values must be strings.

| Location | Key | Purpose or example |
| --- | --- | --- |
| Label | `hami.io/webhook` | `"ignore"` skips the HAMi webhook, including automatic scheduler and device-default injection. |
| Annotation | `hami.io/node-scheduler-policy` | `"binpack"` or `"spread"` overrides the global node policy. |
| Annotation | `hami.io/gpu-scheduler-policy` | Overrides the device policy within a node, for example `"binpack"` or `"spread"`. |
| Annotation | `nvidia.com/use-gpuuuid` / `nvidia.com/nouse-gpuuuid` | GPU UUIDs to allow or exclude, separated by commas. |
| Annotation | `nvidia.com/use-gputype` / `nvidia.com/nouse-gputype` | GPU models to allow or exclude, such as `"A100,Tesla V100"`. |
| Annotation | `nvidia.com/vgpu-mode` | Selects `"hami-core"` or `"mig"` mode. |
| Annotation | `hami.io/overwrite-env` | `"true"` hides NVIDIA or Ascend devices from containers that request none, overriding the global default. |

For example, this Deployment fragment prefers distributing Pods across nodes and selects A100 GPUs:

```yaml
spec:
  template:
    metadata:
      annotations:
        hami.io/node-scheduler-policy: "spread"
        nvidia.com/use-gputype: "A100"
    spec:
      containers:
        - name: worker
          image: ubuntu:22.04
          command: ["sleep", "infinity"]
          resources:
            limits:
              nvidia.com/gpu: 1
              nvidia.com/gpumem: 4096
              nvidia.com/gpucores: 50
```

The example assumes default resource names, `memoryFactor: 1`, and an enabled webhook. Replace the image and command with those of your workload. Resource quantities must still be requested in the container's `resources`; annotations do not replace resource requests.

See [Scheduling policies](./nvidia-device/scheduling-policy.md) for additional policies and the vendor device guides for vendor-specific annotations. `nvidia.com/*` annotations do not apply to other vendors. HAMi components manage the device allocation and binding-status annotations they write; do not copy them to new Pods or edit them manually.

## Container configuration: environment variables {#container-environment}

These variables apply to **workload containers using NVIDIA HAMi-core mode**. Set them in the container's `env`, not in the plugin's `devicePlugin.extraEnvs`.

| Environment variable | Purpose |
| --- | --- |
| `GPU_CORE_UTILIZATION_POLICY` | `default` enforces core limits based on competition on the GPU; `force` always enforces the requested core limit; `disable` disables runtime core limiting. Core values of `0` and `100` are not throttled. |
| `CUDA_DISABLE_CONTROL` | `"true"` disables HAMi-core control and its runtime resource isolation and limits. Do not use it for shared workloads that depend on isolation. |
| `LIBCUDA_LOG_LEVEL` | `"0"` and `"1"` log errors only; `"2"` adds warnings and messages, `"3"` adds info, and `"4"` adds debug logs. |

For example, add the following settings to a workload container:

```yaml
env:
  - name: GPU_CORE_UTILIZATION_POLICY
    value: "force"
  - name: LIBCUDA_LOG_LEVEL
    value: "3"
```

This example assumes the global `devices.nvidia.gpuCorePolicy` remains `default`. If it is set to `force` or `disable`, the webhook injects the same environment variable, so inspect the admitted Pod configuration. Request GPU memory and cores through `resources.limits`; manually changing runtime limits does not update the scheduler's resource accounting.

For global core policies, log levels, whole-GPU hook behavior, and limit delivery, see `devices.nvidia.*` and `devicePlugin.monitor.disableHAMiCoreForWholeGPU` in the [Chart values reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values). When starting processes through SSH, `su -`, or similar tools, keep the default `limitDelivery: file` so processes that do not inherit the container's environment can still read limits from the read-only file.
