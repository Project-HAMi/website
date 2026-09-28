---
title: Configuration reference
sidebar_label: Configuration
---

Reference for HAMi Helm values, NVIDIA node settings, Pod annotations, and container environment variables. The parameter tables list field names, types, default values, and their effects.

Set Helm parameters in a values file. Omitted fields use chart defaults; lists replace the complete default list. `nil` means the value is unset (`null` in YAML). For installation commands, see [Online installation](../installation/online-installation.md). For backups and field migration, see [Upgrade HAMi](../installation/upgrade.md).

## Device Configs: ConfigMap

Device settings are grouped under `devices.<vendor>`. The chart generates `device-config.yaml` in the `hami-scheduler-device` ConfigMap from these values.

### NVIDIA

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `devices.nvidia.createRuntimeClass` | bool | `false` | Create the NVIDIA RuntimeClass named by devices.nvidia.runtimeClassName when the device plugin is enabled. |
| `devices.nvidia.defaultCores` | int | `0` | Fallback GPU-core percentage when no core request is provided; 0 leaves core usage unconstrained. |
| `devices.nvidia.defaultGPUNum` | int | `1` | GPU count injected when a Pod requests NVIDIA memory or cores without a GPU count. |
| `devices.nvidia.defaultMemory` | int | `0` | Fallback memory allocation in MiB when neither absolute nor percentage memory is requested; 0 uses the full GPU memory. |
| `devices.nvidia.deviceCoreScaling` | number | `1` | Ratio used to scale advertised NVIDIA GPU cores; per-node configuration can override it. |
| `devices.nvidia.deviceMemoryScaling` | number | `1` | Ratio used to scale advertised NVIDIA GPU memory; per-node configuration can override it. |
| `devices.nvidia.deviceSplitCount` | int | `10` | Maximum virtual-device count advertised per physical NVIDIA GPU; per-node configuration can override it. |
| `devices.nvidia.enableNumaTopology` | bool | `false` | Advertise physical GPU NUMA topology to kubelet; enabling it can affect TopologyManager admission. |
| `devices.nvidia.gpuCorePolicy` | string | `"default"` | HAMi-core GPU-core utilization policy: default, force, or disable. |
| `devices.nvidia.libCudaLogLevel` | int | `1` | HAMi-core CUDA log level: 0 errors, 1 warnings, 3 information, or 4 debug. |
| `devices.nvidia.memoryFactor` | int | `1` | Memory-unit multiplier used by this device backend when translating memory requests. |
| `devices.nvidia.migProfileAllowlist` | list | See the complete list in [values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml). | Allowed MIG profiles by GPU model. Each entry contains models and profiles lists; an override replaces the complete default list. |
| `devices.nvidia.preConfiguredDeviceMemory` | int | `0` | Memory in MB for GPUs without memory queries; 0 uses auto-detection. Per-node configuration can override it. |
| `devices.nvidia.resourceCoreName` | string | `"nvidia.com/gpucores"` | Kubernetes extended-resource name for device cores. |
| `devices.nvidia.resourceCountName` | string | `"nvidia.com/gpu"` | Kubernetes extended-resource name for device count. |
| `devices.nvidia.resourceMemoryName` | string | `"nvidia.com/gpumem"` | Kubernetes extended-resource name for device memory. |
| `devices.nvidia.resourceMemoryPercentageName` | string | `"nvidia.com/gpumem-percentage"` | Kubernetes extended-resource name for NVIDIA memory percentage requests. |
| `devices.nvidia.resourcePriorityName` | string | `"nvidia.com/priority"` | Kubernetes extended-resource name for NVIDIA allocation priority. |
| `devices.nvidia.runtimeClassName` | string | `""` | RuntimeClass used by the NVIDIA device-plugin Pod and injected into NVIDIA workload Pods. |

For example, set NVIDIA sharing limits and default requests:

```yaml
devices:
  nvidia:
    deviceSplitCount: 20
    defaultMemory: 4096
    defaultCores: 50
```

`deviceCoreScaling` and `deviceMemoryScaling` accept fractional values. `defaultMemory` is in MiB and `defaultCores` is a percentage.

Each `migProfileAllowlist` entry contains a `models` list of GPU models and a `profiles` list of allowed profiles. This example replaces the whole default allowlist; include entries for other models you need. Merge it into the existing `devices.nvidia` section:

```yaml
devices:
  nvidia:
    migProfileAllowlist:
      - models: ["A100-SXM4-80GB"]
        profiles: ["1g.10gb", "2g.20gb"]
```

### Cambricon

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `devices.cambricon.resourceCoreName` | string | `"cambricon.com/mlu.smlu.vcore"` | Kubernetes extended-resource name for device cores. |
| `devices.cambricon.resourceCountName` | string | `"cambricon.com/vmlu"` | Kubernetes extended-resource name for device count. |
| `devices.cambricon.resourceMemoryName` | string | `"cambricon.com/mlu.smlu.vmemory"` | Kubernetes extended-resource name for device memory. |

### Hygon

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `devices.hygon.memoryFactor` | int | `1` | Memory-unit multiplier used by this device backend when translating memory requests. |
| `devices.hygon.resourceCoreName` | string | `"hygon.com/hcucores"` | Kubernetes extended-resource name for device cores. |
| `devices.hygon.resourceCountName` | string | `"hygon.com/hcunum"` | Kubernetes extended-resource name for device count. |
| `devices.hygon.resourceMemoryName` | string | `"hygon.com/hcumem"` | Kubernetes extended-resource name for device memory. |

### MetaX

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `devices.metax.resourceCountName` | string | `"metax-tech.com/gpu"` | Kubernetes extended-resource name for device count. |
| `devices.metax.resourceVCoreName` | string | `"metax-tech.com/vcore"` | Kubernetes extended-resource name for virtual-device cores. |
| `devices.metax.resourceVCountName` | string | `"metax-tech.com/sgpu"` | Kubernetes extended-resource name for virtual-device count. |
| `devices.metax.resourceVMemoryName` | string | `"metax-tech.com/vmemory"` | Kubernetes extended-resource name for virtual-device memory. |
| `devices.metax.sgpuTopologyAware` | bool | `false` | Enable Metax sGPU topology-aware allocation. |

### Enflame

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `devices.enflame.customresources` | list | `["enflame.com/drs-gcu","enflame.com/gcu-memory","enflame.com/gcu-core","enflame.com/gcu"]` | Resource names forwarded to the scheduler extender for this vendor; update this list when changing its runtime resource names. |
| `devices.enflame.enabled` | bool | `true` | Enable this optional chart feature. |
| `devices.enflame.resourceNameDRSGCU` | string | `"enflame.com/drs-gcu"` | Kubernetes extended-resource name for Enflame DRS GCU count. |
| `devices.enflame.resourceNameGCU` | string | `"enflame.com/gcu"` | Kubernetes extended-resource name for physical Enflame GCU count. |
| `devices.enflame.resourceNameGCUCore` | string | `"enflame.com/gcu-core"` | Kubernetes extended-resource name for Enflame GCU cores. |
| `devices.enflame.resourceNameGCUMemory` | string | `"enflame.com/gcu-memory"` | Kubernetes extended-resource name for Enflame GCU memory. |

### MThreads

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `devices.mthreads.customresources` | list | `["mthreads.com/vgpu"]` | Resource names forwarded to the scheduler extender for this vendor; update this list when changing its runtime resource names. |
| `devices.mthreads.enabled` | bool | `true` | Whether to enable |
| `devices.mthreads.memoryPerCard` | list | `[96]` | List of integer memory units of 512 MiB per MThreads card model; list every model in mixed fleets. 96 represents 48 GiB and 160 represents 80 GiB. |
| `devices.mthreads.resourceCoreName` | string | `"mthreads.com/sgpu-core"` | Kubernetes extended-resource name for device cores. |
| `devices.mthreads.resourceCountName` | string | `"mthreads.com/vgpu"` | Kubernetes extended-resource name for device count. |
| `devices.mthreads.resourceMemoryName` | string | `"mthreads.com/sgpu-memory"` | Kubernetes extended-resource name for device memory. |

For MThreads cards with 48 GiB and 80 GiB of memory, list both memory sizes in units of 512 MiB:

```yaml
devices:
  mthreads:
    memoryPerCard: [96, 160]
```

### Kunlunxin

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `devices.kunlun.customresources` | list | `["kunlunxin.com/xpu","kunlunxin.com/vxpu","kunlunxin.com/vxpu-memory"]` | Resource names forwarded to the scheduler extender for this vendor; update this list when changing its runtime resource names. |
| `devices.kunlun.enabled` | bool | `true` | Whether to enable |
| `devices.kunlun.resourceCountName` | string | `"kunlunxin.com/xpu"` | Kubernetes extended-resource name for device count. |
| `devices.kunlun.resourceVCountName` | string | `"kunlunxin.com/vxpu"` | Kubernetes extended-resource name for virtual-device count. |
| `devices.kunlun.resourceVMemoryName` | string | `"kunlunxin.com/vxpu-memory"` | Kubernetes extended-resource name for virtual-device memory. |

### AWS Neuron

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `devices.awsneuron.customresources` | list | `["aws.amazon.com/neuron","aws.amazon.com/neuroncore"]` | Resource names forwarded to the scheduler extender for this vendor; update this list when changing its runtime resource names. |
| `devices.awsneuron.resourceCoreName` | string | `"aws.amazon.com/neuroncore"` | Kubernetes extended-resource name for device cores. |
| `devices.awsneuron.resourceCountName` | string | `"aws.amazon.com/neuron"` | Kubernetes extended-resource name for device count. |

### AMD

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `devices.amd.customresources` | list | `["amd.com/gpu","amd.com/gpumem","amd.com/gpucores"]` | Resource names forwarded to the scheduler extender for this vendor; update this list when changing its runtime resource names. |
| `devices.amd.resourceCoreName` | string | `"amd.com/gpucores"` | Kubernetes extended-resource name for device cores. |
| `devices.amd.resourceCountName` | string | `"amd.com/gpu"` | Kubernetes extended-resource name for device count. |
| `devices.amd.resourceMemoryName` | string | `"amd.com/gpumem"` | Kubernetes extended-resource name for device memory. |

### Vastai

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `devices.vastai.customresources` | list | `["vastaitech.com/va"]` | Resource names forwarded to the scheduler extender for this vendor; update this list when changing its runtime resource names. |
| `devices.vastai.enabled` | bool | `true` | Enable this optional chart feature. |
| `devices.vastai.resourceCountName` | string | `"vastaitech.com/va"` | Kubernetes extended-resource name for device count. |

### Biren

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `devices.biren.customresources` | list | `["birentech.com/gpu"]` | Resource names forwarded to the scheduler extender for this vendor; update this list when changing its runtime resource names. |
| `devices.biren.enabled` | bool | `true` | Enable this optional chart feature. |
| `devices.biren.resourceCountName` | string | `"birentech.com/gpu"` | Kubernetes extended-resource name for device count. |

### Ascend

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `devices.ascend.configs` | list | See the complete list in [values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml). | Ascend chip configurations and partition templates; an override replaces the complete default chip list. |
| `devices.ascend.customresources` | list | `["huawei.com/Ascend910A","huawei.com/Ascend910A-memory","huawei.com/Ascend910A-core","huawei.com/Ascend910B2","huawei.com/Ascend910B2-memory","huawei.com/Ascend910B2-core","huawei.com/Ascend910B3","huawei.com/Ascend910B3-memory","huawei.com/Ascend910B3-core","huawei.com/Ascend910B4","huawei.com/Ascend910B4-memory","huawei.com/Ascend910B4-core","huawei.com/Ascend910B4-1","huawei.com/Ascend910B4-1-memory","huawei.com/Ascend910B4-1-core","huawei.com/Ascend310P","huawei.com/Ascend310P-memory","huawei.com/Ascend310P-core","huawei.com/Ascend910C","huawei.com/Ascend910C-memory","huawei.com/Ascend910C-core"]` | Resource names forwarded to the scheduler extender for this vendor; update this list when changing its runtime resource names. |
| `devices.ascend.enabled` | bool | `false` | Enable Ascend handling in the scheduler and its extender resource list. |
| `devices.ascend.extraArgs` | list | `[]` | Ascend device-plugin command arguments; unused by the current chart templates. |
| `devices.ascend.hamiVnpuCore` | bool | `false` | Enable hami-vnpu-core soft partitioning globally; per-node annotations take priority. |
| `devices.ascend.image` | string | `""` | Unused by the current chart; an Ascend device plugin must be deployed separately. |
| `devices.ascend.imagePullPolicy` | string | `"IfNotPresent"` | Ascend device-plugin pull policy setting; unused by the current chart templates. |
| `devices.ascend.nodeSelector.ascend` | string | `"on"` | Ascend device-plugin node-selector label value; unused by the current chart templates. |
| `devices.ascend.runtimeClassName` | string | `""` | RuntimeClass injected into Ascend workload Pods. |
| `devices.ascend.tolerations` | list | `[]` | Ascend device-plugin tolerations; unused by the current chart templates. |

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

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `devices.iluvatar.configs` | list | See the complete list in [values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml). | Iluvatar chip configurations with chipName, commonWord and resource names; an override replaces the complete default chip list. |
| `devices.iluvatar.customresources` | list | `["iluvatar.ai/BI-V100-vgpu","iluvatar.ai/BI-V100.vCore","iluvatar.ai/BI-V100.vMem","iluvatar.ai/BI-V150-vgpu","iluvatar.ai/BI-V150.vCore","iluvatar.ai/BI-V150.vMem","iluvatar.ai/MR-V100-vgpu","iluvatar.ai/MR-V100.vCore","iluvatar.ai/MR-V100.vMem","iluvatar.ai/MR-V50-vgpu","iluvatar.ai/MR-V50.vCore","iluvatar.ai/MR-V50.vMem"]` | Resource names forwarded to the scheduler extender for this vendor; update this list when changing its runtime resource names. |
| `devices.iluvatar.enabled` | bool | `false` | Enable Iluvatar handling in the scheduler and its extender resource list. |

`devices.iluvatar.configs` is a list of chip definitions and renders as `iluvatars`. Each entry uses the following fields:

| Field                | Meaning                                      |
| -------------------- | -------------------------------------------- |
| `chipName`           | Chip model identifier                        |
| `commonWord`         | Device identifier used by the backend        |
| `resourceCountName`  | Kubernetes resource for virtual-device count |
| `resourceMemoryName` | Kubernetes resource for device memory        |
| `resourceCoreName`   | Kubernetes resource for device cores         |

The complete default lists are in [values.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml). Copy the list you need into your values file and modify it there; list entries do not merge by model or chip name.

### Remote GPU

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `devices.remotegpu.defaultPort` | int | `14833` | Lupine server port used when the server node label does not specify a port; also used by the chart-managed server. |
| `devices.remotegpu.enabled` | bool | `false` | Enable scheduling for Remote GPU resources served by lupine. |
| `devices.remotegpu.libImage` | string | `nil` | Image supplying HAMi-core to Remote GPU clients. null derives the device-plugin image; an empty string disables client enforcement. |
| `devices.remotegpu.resourceCountName` | string | `"nvidia.com/remote-gpu"` | Kubernetes extended-resource name for device count. |
| `devices.remotegpu.resourceMemoryName` | string | `"nvidia.com/remote-gpu-memory"` | Kubernetes extended-resource name for device memory. |
| `devices.remotegpu.server.enabled` | bool | `true` | Run a lupine server on labelled nodes whose hami.io/lupine-server label value is empty. |
| `devices.remotegpu.server.image.pullPolicy` | string | `"IfNotPresent"` | Kubernetes container image pull policy. |
| `devices.remotegpu.server.image.registry` | string | `"ghcr.io"` | Container image registry; global.imageRegistry takes priority when set. |
| `devices.remotegpu.server.image.repository` | string | `"lupinemachines/lupine-server"` | Container image repository name. |
| `devices.remotegpu.server.image.tag` | string | `"cuda-13.3.1-ubuntu24.04"` | Container image tag. |
| `devices.remotegpu.server.resources` | object | `{}` | Kubernetes CPU and memory requests and limits for the container. |
| `devices.remotegpu.server.runtimeClassName` | string | `""` | RuntimeClass selecting the NVIDIA container runtime for the chart-managed lupine server. |
| `devices.remotegpu.server.tolerations` | list | `[]` | Kubernetes Pod tolerations for node taints. |
| `devices.remotegpu.sessionImage` | string | `""` | Image for server session relay Pods; empty disables session relays. The image must provide socat. |

### Complete device configuration file

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `device-config.content` | string | `""` | Complete device-config.yaml replacement, taking precedence over a bundled files/device-config.yaml and values. Non-empty content does not merge with the structured defaults. |

`device-config.content` replaces the configuration for all vendors. For individual changes, use the `devices.<vendor>` parameters above. If the chart contains `files/device-config.yaml`, it uses that file before the device configuration generated from values.

## Node Configs: ConfigMap

NVIDIA node settings are stored in `config.json` of the `hami-device-plugin` ConfigMap. Matching node settings override the corresponding global device parameters. Set the complete JSON with `devicePlugin.nodeConfiguration.config`, or reference a separately managed ConfigMap with `devicePlugin.nodeConfiguration.externalConfigName`; the external ConfigMap takes priority.

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

These values configure `gpu-node-1`. Use the actual node name. The JSON string replaces the complete `config.json`, so include all node entries you need:

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

To reference an existing node ConfigMap, set its name. The ConfigMap must be in the HAMi namespace and contain a `config.json` data entry:

```yaml
devicePlugin:
  nodeConfiguration:
    externalConfigName: hami-node-config
```

Changing only the node JSON does not trigger a device-plugin rollout. See [Upgrade HAMi](../installation/upgrade.md#configmap-changes) for restart commands.

## Chart Configs: arguments

### Global settings

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `fullnameOverride` | string | `""` | Override the complete release resource-name prefix. |
| `global.annotations` | object | `{}` | Additional annotations on chart-managed resources. |
| `global.gpuHookPath` | string | `"/usr/local"` | Host directory under which HAMi installs its vgpu hook files. |
| `global.imagePullSecrets` | list | `[]` | Global Docker image pull secrets |
| `global.imageRegistry` | string | `""` | Registry override applied to component image definitions. |
| `global.imageTag` | string | `"v2.10.0"` | Fallback HAMi image tag when a component tag is empty. |
| `global.labels` | object | `{}` | Additional labels on chart-managed resources. |
| `global.managedNodeSelector.usage` | string | `"gpu"` | Value of the usage node label injected when the managed node selector is enabled. |
| `global.managedNodeSelectorEnable` | bool | `false` | Inject global.managedNodeSelector into Pods handled by the admission webhook. |
| `nameOverride` | string | `""` | Override the chart name used in resource names and labels. |
| `namespaceOverride` | string | `""` | Override the namespace used for chart-managed namespaced resources. |

### Scheduler

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `scheduler.admissionWebhook.customURL.enabled` | bool | `false` | Whether to enable custom URL |
| `scheduler.admissionWebhook.customURL.host` | string | `"127.0.0.1"` | Custom URL host |
| `scheduler.admissionWebhook.customURL.path` | string | `"/webhook"` | Custom URL path |
| `scheduler.admissionWebhook.customURL.port` | int | `31998` | Custom URL port |
| `scheduler.admissionWebhook.enabled` | bool | `true` | Whether to enable admission webhook |
| `scheduler.admissionWebhook.failurePolicy` | string | `"Ignore"` | Kubernetes admission webhook policy when the webhook call fails. |
| `scheduler.admissionWebhook.manageNamespaceSelector` | bool | `true` | Whether the chart renders and manages the webhook namespaceSelector field |
| `scheduler.admissionWebhook.namespaceSelector.matchExpressions` | list | `[]` | Namespace label expressions used for webhook matching; appended to the chart exclusions. |
| `scheduler.admissionWebhook.namespaceSelector.matchLabels` | object | `nil` | Namespace labels required for webhook matching when manageNamespaceSelector is enabled. |
| `scheduler.admissionWebhook.objectSelector.matchExpressions` | list | `[]` | Pod label expressions used for webhook matching; appended to the chart exclusions. |
| `scheduler.admissionWebhook.reinvocationPolicy` | string | `"Never"` | Kubernetes admission webhook reinvocation policy. |
| `scheduler.admissionWebhook.whitelistNamespaces` | list | `nil` | Namespace names excluded from HAMi admission webhook matching. |
| `scheduler.certManager.enabled` | bool | `false` | Whether to use cert-manager to generate self-signed certificates |
| `scheduler.defaultSchedulerPolicy.gpuSchedulerPolicy` | string | `"spread"` | GPU scheduler policy `binpack` packs jobs onto the same GPU; `spread` distributes them; `mutex` selects GPUs without other workloads. |
| `scheduler.defaultSchedulerPolicy.nodeSchedulerPolicy` | string | `"binpack"` | Node scheduler policy `binpack` places jobs on the same GPU node where possible; `spread` distributes them across GPU nodes. |
| `scheduler.extender.extraArgs` | list | `["--debug","-v=4"]` | Scheduler extender extra arguments |
| `scheduler.extender.image.pullPolicy` | string | `"IfNotPresent"` | Kubernetes container image pull policy. |
| `scheduler.extender.image.pullSecrets` | list | `[]` | Names of existing image-pull Secrets for the component images. |
| `scheduler.extender.image.registry` | string | `"docker.io"` | Container image registry; global.imageRegistry takes priority when set. |
| `scheduler.extender.image.repository` | string | `"projecthami/hami"` | Container image repository name. |
| `scheduler.extender.image.tag` | string | `""` | Container image tag; an empty tag uses global.imageTag. |
| `scheduler.extender.resources` | object | `{}` | Kubernetes CPU and memory requests and limits for the container. |
| `scheduler.extenderHTTPTimeout` | int | `30` | `httpTimeout` given to the HAMi extender in the generated scheduler configuration, in seconds. Applies to both the KubeSchedulerConfiguration used on Kubernetes 1.22+ and the legacy Policy format used below it. Keep it above `scheduler.nodeLockRetryTimeout` |
| `scheduler.extenderPort` | int | `9444` | Loopback port for the extender filter and bind endpoints inside the scheduler Pod. |
| `scheduler.forceOverwriteDefaultScheduler` | bool | `true` | Replace the default Kubernetes scheduler name on matching Pods with schedulerName. |
| `scheduler.kubeBurst` | string | `""` | Client burst for kube-apiserver requests; empty keeps the binary default of 10. |
| `scheduler.kubeQPS` | string | `""` | Client QPS for kube-apiserver requests; empty keeps the binary default of 5. |
| `scheduler.kubeScheduler.enabled` | bool | `true` | Whether to run kube-scheduler container in scheduler pod |
| `scheduler.kubeScheduler.extraArgs` | list | `["--policy-config-file=/config/config.json","-v=4"]` | Kube-scheduler arguments for the legacy Policy configuration on Kubernetes before 1.22. |
| `scheduler.kubeScheduler.extraNewArgs` | list | `["--config=/config/config.yaml","-v=4"]` | Kube-scheduler arguments for Kubernetes 1.22 and newer. |
| `scheduler.kubeScheduler.image.pullPolicy` | string | `"IfNotPresent"` | Kubernetes container image pull policy. |
| `scheduler.kubeScheduler.image.pullSecrets` | list | `[]` | Names of existing image-pull Secrets for the component images. |
| `scheduler.kubeScheduler.image.registry` | string | `"registry.cn-hangzhou.aliyuncs.com"` | Container image registry; global.imageRegistry takes priority when set. |
| `scheduler.kubeScheduler.image.repository` | string | `"google_containers/kube-scheduler"` | Container image repository name. |
| `scheduler.kubeScheduler.image.tag` | string | `""` | Kube-scheduler image tag; empty derives the tag from the target Kubernetes version. |
| `scheduler.kubeScheduler.resources` | object | `{}` | Kubernetes CPU and memory requests and limits for the container. |
| `scheduler.kubeTimeout` | string | `""` | Timeout in seconds for kube-apiserver requests; empty keeps the binary default and 0 means no timeout. |
| `scheduler.leaderElect` | bool | `true` | Enable scheduler leader election. |
| `scheduler.livenessProbe` | bool | `false` | Enable the scheduler liveness probe. |
| `scheduler.metricsBindAddress` | string | `":9395"` | Listen address for scheduler Prometheus metrics. |
| `scheduler.networkPolicy.enabled` | bool | `false` | Restrict scheduler HTTP ingress to selected device-plugin and kube-system peers. Validate CNI handling of hostNetwork API-server traffic before enabling. |
| `scheduler.nodeLockExpire` | string | `"5m"` | Duration after which a stale node allocation lock may be reclaimed. |
| `scheduler.nodeLockRetryTimeout` | string | `""` | Maximum time Bind retries a node allocation lock. Empty keeps the binary default of 28s; 0 disables retry. |
| `scheduler.nodeName` | string | `""` | Bind the scheduler Pod to this node; empty leaves node selection to Kubernetes. |
| `scheduler.overwriteEnv` | string | `"false"` | Inject NVIDIA_VISIBLE_DEVICES=none or an empty ASCEND_VISIBLE_DEVICES into containers that do not request the corresponding device resources. Pod and container annotations can override this default. |
| `scheduler.patch.enabled` | bool | `true` | Whether to use kube-webhook-certgen to generate self-signed certificates |
| `scheduler.patch.image.pullPolicy` | string | `"IfNotPresent"` | Kubernetes container image pull policy. |
| `scheduler.patch.image.pullSecrets` | list | `[]` | Names of existing image-pull Secrets for the component images. |
| `scheduler.patch.image.registry` | string | `"docker.io"` | Container image registry; global.imageRegistry takes priority when set. |
| `scheduler.patch.image.repository` | string | `"jettech/kube-webhook-certgen"` | Container image repository name. |
| `scheduler.patch.image.tag` | string | `"v1.5.2"` | Container image tag. |
| `scheduler.patch.imageNew.pullPolicy` | string | `"IfNotPresent"` | Kubernetes container image pull policy. |
| `scheduler.patch.imageNew.pullSecrets` | list | `[]` | Names of existing image-pull Secrets for the component images. |
| `scheduler.patch.imageNew.registry` | string | `"docker.io"` | Container image registry; global.imageRegistry takes priority when set. |
| `scheduler.patch.imageNew.repository` | string | `"liangjw/kube-webhook-certgen"` | Container image repository name. |
| `scheduler.patch.imageNew.tag` | string | `"v1.1.1"` | Container image tag. |
| `scheduler.patch.nodeSelector` | object | `{}` | Required node labels for Kubernetes Pod placement. |
| `scheduler.patch.podAnnotations` | object | `{}` | Additional annotations on the Pod template. |
| `scheduler.patch.priorityClassName` | string | `""` | PriorityClass for admission certificate creation and patch Jobs. |
| `scheduler.patch.runAsUser` | int | `2000` | User ID for admission certificate creation and patch Jobs. |
| `scheduler.patch.tolerations` | list | `[]` | Kubernetes Pod tolerations for node taints. |
| `scheduler.podAnnotations` | object | `{}` | Additional annotations on the Pod template. |
| `scheduler.podDisruptionBudget.minAvailable` | int | `1` | Minimum number of available scheduler pods during voluntary disruptions (only rendered when `scheduler.leaderElect` is `true` and `scheduler.replicas` is greater than `1`) |
| `scheduler.replicas` | int | `1` | Scheduler replica count when leader election is enabled; otherwise the chart uses one replica. |
| `scheduler.service.annotations` | object | `{}` | Additional Kubernetes annotations. |
| `scheduler.service.httpPort` | int | `443` | HTTP port |
| `scheduler.service.httpTargetPort` | int | `9443` | Scheduler container port for webhook and NUMA refit HTTP requests. |
| `scheduler.service.labels` | object | `{}` | Additional Kubernetes labels. |
| `scheduler.service.monitorPort` | int | `31993` | Monitor port |
| `scheduler.service.monitorTargetPort` | string | `"metrics"` | Monitor target port |
| `scheduler.service.schedulerPort` | int | `31998` | Scheduler NodePort |
| `scheduler.service.type` | string | `"ClusterIP"` | Service type |
| `scheduler.tolerations` | list | `[]` | Kubernetes Pod tolerations for node taints. |
| `schedulerName` | string | `"hami-scheduler"` | Scheduler name assigned to Pods handled by HAMi. |

### NVIDIA device plugin

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `devicePlugin.deviceListStrategy` | string | `"envvar"` | NVIDIA device-list strategy passed through DEVICE_LIST_STRATEGY. Options are `envvar`, `volume-mounts`, and `cdi-annotations`. |
| `devicePlugin.disablecorelimit` | string | `"false"` | Value passed to the NVIDIA device-plugin disable-core-limit flag. `"true"` disables the core limit; `"false"` enables it. |
| `devicePlugin.enabled` | bool | `true` | Deploy the NVIDIA device-plugin DaemonSet and its supporting resources. |
| `devicePlugin.extraArgs` | list | `["-v=4"]` | Device plugin extra arguments |
| `devicePlugin.extraEnvs` | object | `{}` | Device plugin extra environments |
| `devicePlugin.gdrcopyEnabled` | bool | `nil` | Set GDRCOPY_ENABLED; null leaves the environment variable unset. |
| `devicePlugin.gdsEnabled` | bool | `nil` | Set GDS_ENABLED; null leaves the environment variable unset. |
| `devicePlugin.gpuOperatorToolkitReady.enabled` | bool | `false` | Wait for the GPU Operator toolkit-ready marker before starting the device plugin. |
| `devicePlugin.gpuOperatorToolkitReady.hostPath` | string | `"/run/nvidia/validations"` | Host directory containing the GPU Operator toolkit-ready marker. |
| `devicePlugin.gpuOperatorToolkitReady.securityContext.privileged` | bool | `true` | Run the container with Kubernetes privileged security context. |
| `devicePlugin.gpuOperatorToolkitReady.securityContext.runAsUser` | int | `0` | User ID for the container process. |
| `devicePlugin.hostNetwork` | bool | `false` | Use the host network for the NVIDIA device-plugin Pod. |
| `devicePlugin.hostPID` | bool | `true` | Share the host PID namespace with the NVIDIA device-plugin Pod. |
| `devicePlugin.hostPIDBroker.enabled` | bool | `false` | Allow HAMi-core to obtain host process IDs through the device plugin; requires hostPID. |
| `devicePlugin.image.pullPolicy` | string | `"IfNotPresent"` | Kubernetes container image pull policy. |
| `devicePlugin.image.pullSecrets` | list | `[]` | Names of existing image-pull Secrets for the component images. |
| `devicePlugin.image.registry` | string | `"docker.io"` | Container image registry; global.imageRegistry takes priority when set. |
| `devicePlugin.image.repository` | string | `"projecthami/hami"` | Container image repository name. |
| `devicePlugin.image.tag` | string | `""` | Container image tag; an empty tag uses global.imageTag. |
| `devicePlugin.libPath` | string | `"/usr/local/vgpu"` | Host library directory mounted by the NVIDIA device plugin. |
| `devicePlugin.migStrategy` | string | `"none"` | NVIDIA device-plugin MIG strategy: none or mixed. |
| `devicePlugin.mofedEnabled` | bool | `nil` | Set MOFED_ENABLED; null leaves the environment variable unset. |
| `devicePlugin.monitor.ctrPath` | string | `"/usr/local/vgpu/containers"` | Host path containing HAMi container allocation records for the vGPU monitor. |
| `devicePlugin.monitor.extraArgs` | list | `["-v=4"]` | Monitor extra arguments |
| `devicePlugin.monitor.extraEnvs` | object | `{}` | Monitor extra environments |
| `devicePlugin.monitor.image.pullPolicy` | string | `"IfNotPresent"` | Kubernetes container image pull policy. |
| `devicePlugin.monitor.image.pullSecrets` | list | `[]` | Names of existing image-pull Secrets for the component images. |
| `devicePlugin.monitor.image.registry` | string | `"docker.io"` | Container image registry; global.imageRegistry takes priority when set. |
| `devicePlugin.monitor.image.repository` | string | `"projecthami/hami"` | Container image repository name. |
| `devicePlugin.monitor.image.tag` | string | `""` | Container image tag; an empty tag uses global.imageTag. |
| `devicePlugin.monitor.resources` | object | `{}` | Kubernetes CPU and memory requests and limits for the container. |
| `devicePlugin.monitor.resyncInterval` | string | `"5m"` | Interval at which the vGPU monitor resynchronizes container allocation records. |
| `devicePlugin.monitor.securityContext.allowPrivilegeEscalation` | bool | `false` | Allow the container process to gain additional privileges. |
| `devicePlugin.monitor.securityContext.capabilities.add` | list | `["SYS_ADMIN"]` | Linux capabilities added to the container. |
| `devicePlugin.monitor.securityContext.capabilities.drop` | list | `["ALL"]` | Linux capabilities removed from the container. |
| `devicePlugin.nodeConfiguration.config` | string | `"{\n  \"nodeconfig\": [\n    {\n      \"name\": \"your-node-name\",\n      \"operatingmode\": \"hami-core\",\n      \"devicememoryscaling\": 1,\n      \"devicesplitcount\": 10,\n      \"preconfigureddevicememory\": 0,\n      \"enablenumatopology\": false,\n      \"migstrategy\": \"none\",\n      \"filterdevices\": {\n        \"uuid\": [],\n        \"index\": []\n      },\n      \"enablegetpreferredallocation\": false\n    }\n  ]\n}\n"` | Complete JSON node configuration. Overridden by externalConfigName; per-node settings override the global device config. |
| `devicePlugin.nodeConfiguration.externalConfigName` | string | `""` | Existing node-configuration ConfigMap. When set, the chart uses it and does not create its own node ConfigMap. |
| `devicePlugin.numaRefit.caFile` | string | `""` | Path to a mounted CA bundle for scheduler refit TLS verification. |
| `devicePlugin.numaRefit.caSecret` | string | `""` | Secret containing ca.crt to mount for refit TLS verification when caFile is empty. |
| `devicePlugin.numaRefit.enabled` | bool | `false` | Allow NUMA alignment refits through the scheduler; also requires devices.nvidia.enableNumaTopology and per-node enablegetpreferredallocation. |
| `devicePlugin.numaRefit.schedulerEndpoint` | string | `""` | Scheduler URL used for refit requests; empty derives the in-cluster scheduler Service URL. |
| `devicePlugin.numaRefit.tlsInsecure` | bool | `true` | Skip TLS certificate verification for scheduler refit requests. |
| `devicePlugin.nvidiaDriverRoot` | string | `"auto"` | NVIDIA driver root on the host. auto reads the GPU Operator driver-ready contract and uses / when it is absent. |
| `devicePlugin.nvidiaHookPath` | string | `nil` | NVIDIA CDI hook path; null leaves NVIDIA_CDI_HOOK_PATH unset. |
| `devicePlugin.nvidiaNodeSelector.gpu` | string | `"on"` | Required gpu node-label value for the NVIDIA device-plugin DaemonSet. |
| `devicePlugin.passDeviceSpecsEnabled` | bool | `true` | Pass device specifications to kubelet through PASS_DEVICE_SPECS. |
| `devicePlugin.pluginPath` | string | `"/var/lib/kubelet/device-plugins"` | Host directory containing kubelet device-plugin sockets. |
| `devicePlugin.podAnnotations` | object | `{}` | Additional annotations on the Pod template. |
| `devicePlugin.resources` | object | `{}` | Kubernetes CPU and memory requests and limits for the container. |
| `devicePlugin.securityContext.allowPrivilegeEscalation` | bool | `true` | Allow the container process to gain additional privileges. |
| `devicePlugin.securityContext.capabilities.add` | list | `["SYS_ADMIN"]` | Linux capabilities added to the container. |
| `devicePlugin.securityContext.capabilities.drop` | list | `["ALL"]` | Linux capabilities removed from the container. |
| `devicePlugin.securityContext.privileged` | bool | `true` | Run the container with Kubernetes privileged security context. |
| `devicePlugin.service.annotations` | object | `{}` | Additional Kubernetes annotations. |
| `devicePlugin.service.httpPort` | int | `31992` | HTTP port |
| `devicePlugin.service.labels` | object | `{}` | Additional Kubernetes labels. |
| `devicePlugin.service.type` | string | `"NodePort"` | Service type |
| `devicePlugin.tolerations` | list | `[{"effect":"NoSchedule","key":"nvidia.com/gpu","operator":"Exists"}]` | Tolerations applied to device plugin Pods |
| `devicePlugin.updateStrategy.rollingUpdate.maxUnavailable` | int | `1` | Maximum unavailable NVIDIA device-plugin Pods during a rolling update. |
| `devicePlugin.updateStrategy.type` | string | `"RollingUpdate"` | Kubernetes DaemonSet update strategy for the NVIDIA device plugin. |

### Mock device plugin

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `mockDevicePlugin.enabled` | bool | `false` | Deploy the mock device plugin for scheduler testing. |
| `mockDevicePlugin.image.pullPolicy` | string | `"IfNotPresent"` | Kubernetes container image pull policy. |
| `mockDevicePlugin.image.pullSecrets` | list | `[]` | Names of existing image-pull Secrets for the component images. |
| `mockDevicePlugin.image.registry` | string | `"docker.io"` | Container image registry; global.imageRegistry takes priority when set. |
| `mockDevicePlugin.image.repository` | string | `"projecthami/mock-device-plugin"` | Container image repository name. |
| `mockDevicePlugin.image.tag` | string | `"1.0.1"` | Container image tag. |

### Metrics

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `legacyMetrics` | bool | `false` | Expose legacy metric names alongside the current scheduler and vGPU monitor metrics. |
| `prometheus.enabled` | bool | `false` | Render Prometheus Operator ServiceMonitor resources; requires the ServiceMonitor CRD. |

### Platform and security

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `openshift.securityContextConstraints.create` | bool | `true` | Create the named device-plugin SCC and its use ClusterRole when OpenShift support is enabled. Set this to false only when both the SCC and `system:openshift:scc:<name>` ClusterRole already exist, such as for the built-in `privileged` SCC. |
| `openshift.securityContextConstraints.name` | string | `"hami-device-plugin"` | SCC granted to enabled device-plugin service accounts. When `create=false`, the matching `system:openshift:scc:<name>` ClusterRole must already exist. The built-in `privileged` SCC requires `create=false`. |
| `platform.openshift` | bool | `false` | Render OpenShift security constraints and platform-specific device-plugin settings. |
| `podSecurityPolicy.enabled` | bool | `false` | Create PodSecurityPolicy resources on Kubernetes versions that support them. |
| `selinux.enabled` | bool | `false` | Relabel shared host vGPU directories for SELinux-enabled nodes. |
| `selinux.level` | string | `"s0"` | SELinux level applied to shared host vGPU directories. |
| `selinux.type` | string | `"container_file_t"` | SELinux type applied to shared host vGPU directories. |

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
