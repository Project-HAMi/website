---
title: Upgrade HAMi
---

:::warning Supported Source Version

This guide only applies to upgrades from HAMi v2.10 to the new Chart. Following these instructions directly from other versions is not recommended. If you are running an earlier version, first follow the [v2.10 upgrade guide](../../versioned_docs/version-v2.10.0/installation/upgrade.md) to upgrade HAMi to v2.10, then continue with this guide.

:::

## Upgrade Impact

:::info Existing Workloads and HAMi-core

Upgrading HAMi replaces hami-scheduler and hami-device-plugin and regenerates the device configuration, **but does not affect running GPU workloads, so there is no need to stop or migrate existing tasks for the upgrade**. However, workloads using HAMi-core do not automatically switch to the new version. HAMi-core is injected when a Pod is created, and running processes do not reload the library. For workloads that need the new HAMi-core version, perform a rolling restart or recreate the Pods after the upgrade.

:::

:::warning Pause New Task Submissions During the Upgrade

During the upgrade, we recommend pausing submission of new HAMi GPU workloads until hami-scheduler, hami-device-plugin, and the admission webhook have finished updating. Rolling updates may cause brief unavailability or configuration version mismatches, which may lead to scheduling failures or injection errors for new tasks.

:::

Device plugins from other vendors are outside the scope of this guide. See [Devices Supported by HAMi](../userguide/device-supported.md).

## Before You Upgrade

### Configure Variables

Set the variables needed for deployment. Adjust the following example to match your environment.

```bash
export namespace=kube-system
export release=hami
export hami_chart_dir="${HOME}/hami-upgrade/HAMi"
```

### Check the HAMi Version

Before upgrading, confirm that the currently installed version is HAMi 2.10:

```bash
helm list -n "${namespace}" --filter "^${release}$"
```

### Back Up the Current Configuration

Before upgrading, save the user configuration for the current release:

```bash
helm get values "${release}" -n "${namespace}" -o yaml > previous-values.yaml
```

Manual changes to the device ConfigMap are not recorded in Helm values. Before upgrading, also save its `data.device-config.yaml` to migrate those changes and check the configuration after a rollback.

The following command uses `hami-scheduler-device` as an example. If you changed the release name or configured naming overrides, replace it with the actual ConfigMap name:

```bash
kubectl get configmap hami-scheduler-device -n "${namespace}" \
  --allow-missing-template-keys=false \
  -o jsonpath='{.data.device-config\.yaml}' > previous-device-config.yaml
```

Confirm that `previous-device-config.yaml` contains the current device configuration and retain this backup. During migration, extract only the settings that need to be retained. Do not restore the entire backup as the new configuration.

### Obtain the Chart

The Chart containing the migration changes has not yet been published to the Helm repository. Use HAMi commit [`def0bf8`](https://github.com/Project-HAMi/HAMi/commit/def0bf82074ca7aff940800c18d5d3402eef5cff) or a later commit that includes it. The following commands use `def0bf8` as an example. All subsequent validation and upgrade commands use the Chart in `${hami_chart_dir}`:

```bash
git clone https://github.com/Project-HAMi/HAMi.git "${hami_chart_dir}"
git -C "${hami_chart_dir}" checkout def0bf82074ca7aff940800c18d5d3402eef5cff
```

:::warning Unreleased Chart and image versions

The Chart at this commit is development code, not a published release. Its `version` and `appVersion` may still refer to the previous release. Pinning the Chart commit does not pin the `latest` image tag used below.

:::

## Migrate and Create Values

When upgrading from v2.10, review changes to Chart values field paths, types, defaults, and configuration semantics. The following guidance covers Chart values changes from v2.10.0 to the example commit `def0bf8`. First create `my-values.yaml` from the backed-up values, complete the migration and rendering validation below, then perform the upgrade. If you use a later commit, also review subsequent values changes.

### Create values.yaml

Create `my-values.yaml` from `previous-values.yaml` as a starting point for preparing the upgrade configuration:

```bash
cp previous-values.yaml my-values.yaml
```

This guide uses HAMi images tagged `latest`. The Chart defaults to the `IfNotPresent` pull policy, so changing only the tag will continue to use old images cached on the nodes. Set the tag in `my-values.yaml` and change the pull policy for the scheduler extender, HAMi device plugin, and monitor to `Always`:

```yaml
global:
  imageTag: latest
scheduler:
  extender:
    image:
      pullPolicy: Always
devicePlugin:
  image:
    pullPolicy: Always
  monitor:
    image:
      pullPolicy: Always
```

With `Always`, the container runtime queries the image registry to resolve the tag when a container starts. The `latest` tag remains mutable, so containers started at different times are not guaranteed to use the same build. Updating the tag in the registry does not automatically restart existing Pods.

If the old values explicitly set `scheduler.extender.image.tag`, `devicePlugin.image.tag`, or `devicePlugin.monitor.image.tag`, remove those overrides.

After copying the file, update the other fields and device fields as described below. Do not use the entire old configuration directly for the upgrade. Include any other custom settings that you need to retain in `my-values.yaml`. Do not restore the entire old ConfigMap after the upgrade, as this would overwrite the new default configuration.

### Migrate Other Fields

First review the non-device configuration in `previous-values.yaml`. Add custom settings that need to be migrated to `my-values.yaml` and remove deleted paths. Even when a field path is unchanged, its type, default, or meaning may have changed. Adjust the values as described below.

#### Images and Scheduler

| Field | Values Change | Migration |
| --- | --- | --- |
| `scheduler.patch.image` | The path has been removed, and the new Chart rejects rendering if it is present | Remove the old path and migrate custom settings that need to be retained to `scheduler.patch.imageNew`. Settings matching the old defaults do not need migration. If `imageNew` is already configured, review and merge the settings to avoid overwriting existing configuration |
| `scheduler.kubeScheduler.image`, `scheduler.patch.imageNew` | The default images are now `registry.k8s.io/kube-scheduler` and `registry.k8s.io/ingress-nginx/kube-webhook-certgen`, respectively. The certgen version is also updated and pinned by digest | Check registry access and custom image overrides. For a China mirror, see [Online Installation](./online-installation.md). Do not change only the registry while retaining a mismatched repository or digest |
| `scheduler.service.type` | The default changes from `NodePort` to `ClusterIP` | If external scrapers, custom webhook URLs, or other callers depend on NodePort, explicitly set `NodePort` and retain the required ports. Use the new default when only in-cluster access is needed |
| `scheduler.service.httpTargetPort` | The default changes from `443` to `9443`; `scheduler.service.httpPort` still defaults to `443` | Remove the old override if a custom container port is unnecessary. If retaining a custom value, ensure it differs from `scheduler.extenderPort` |
| `scheduler.service.monitorTargetPort` | The default changes from the numeric port `9395` to the named port `metrics` | Remove the old override if a fixed port is unnecessary. For a custom metrics port, check that it matches `scheduler.metricsBindAddress` |

- The `podSecurityPolicy.enabled` path is unchanged. Certificate Jobs no longer allow it to be enabled on Kubernetes `1.25` and later. If the old values set it to `true`, change it to `false`.
- `scheduler.patch.imageNew` configures the webhook certificate Job image and does not inherit `global.imageTag`. Do not copy the `latest` setting for HAMi images from above into this field.

#### Device Plugin and Monitor

| Field | Values Change | Migration |
| --- | --- | --- |
| `devicePlugin.monitor.resyncInterval` | The path is retained but no longer controls cache directory cleanup | Configure `devicePlugin.vgpuCache.gracePeriod` with the value previously used for the cleanup grace period. Also retain `resyncInterval` if you need to preserve the monitor's resync and memory mapping release behavior |
| `devicePlugin.nvidiaDriverRoot` | The default changes from `null` to `auto`, which detects paths from GPU Operator driver readiness information. If that information is absent, it assumes a host-installed driver | Check how the driver is installed. In `auto` mode, the device plugin must receive driver libraries and devices through the NVIDIA runtime. Retain the appropriate overrides for deployments using explicit driver paths |
| `devicePlugin.passDeviceSpecsEnabled` | The default changes from `false` to `true` | Explicitly set `false` to retain the previous behavior of not returning device specifications to kubelet. This field has no effect when using only CDI strategies |
| `devicePlugin.tolerations` | The defaults now include a toleration for the `nvidia.com/gpu:NoSchedule` taint | Review which nodes the DaemonSet can run on. An existing custom list replaces the default list, so merge this toleration into your custom list if needed |
| `devicePlugin.monitor.metricsBindAddress`, `devicePlugin.monitor.probes.enabled` | Monitor liveness and readiness probes are enabled by default and access `/metrics` through the Pod IP. Loopback listening addresses are not allowed | Move listening address settings from the old `monitor.extraArgs` to `metricsBindAddress` and ensure the probes and Service can reach that address. Probes can be disabled for troubleshooting, but this does not disable loopback address validation |
| `devicePlugin.extraEnvs`, `devicePlugin.monitor.extraEnvs` | Empty defaults change from `{}` to `[]`; custom environment variables still require a list of Kubernetes EnvVar entries | Remove empty overrides. Specify custom entries as a list containing `name` and either `value` or `valueFrom`, rather than a key-value map |

- `devicePlugin.vgpuCache.gracePeriod` defaults to `5m`. It is the minimum age of a cache directory since its last modification before cleanup, not the cleanup scan interval.
- `devicePlugin.monitor.resyncInterval` still controls the monitor's Pod informer resync and the grace period for releasing memory mappings when a Pod no longer exists. The two settings are independent.

### Migrate Device Fields

The standard resource names for Enflame, Kunlun, Vastai, and Biren are now automatically added to the scheduler extender from the corresponding device fields. For these four device types, `customresources` contains only additional resources and defaults to an empty list. Remove any standard resource entries copied from the old values.

Before migrating, review `previous-values.yaml` and any manually modified device configuration in `previous-device-config.yaml`. Use the defaults from the Chart version installed before the upgrade as the baseline. Include only settings that differ from those defaults and still need to be retained after the upgrade in the new values.

- For device fields in the old values, use the vendor-specific mappings below to migrate them to the new paths and remove the old paths.
- For configuration modified directly in the ConfigMap, find the corresponding Helm values fields before migrating. Do not copy the entire ConfigMap contents into values. The old fields in the tables below refer to old Helm values paths, not ConfigMap field paths.
- Remove device fields that match the old version's defaults from `my-values.yaml`. There is no need to add them at the corresponding new paths; let the new Chart use its defaults.

Do not decide whether a value needs migration solely because it is `0`, `false`, or an empty string; compare it with the old version's defaults. After migration, remove old fields marked as removed or replaced in the tables. For fields that remain compatible, follow their respective guidance. The Chart rejects old fields covered by its validation checks, but fields not covered may be silently ignored. Successful rendering alone does not confirm that migration is complete.

#### NVIDIA

This includes NVIDIA resource fields and NVIDIA Device Plugin configuration fields:

| v2.10 Field                              | Latest Field                                  |
| ---------------------------------------- | --------------------------------------------- |
| `resourceName`                           | `devices.nvidia.resourceCountName`            |
| `resourceMem`                            | `devices.nvidia.resourceMemoryName`           |
| `resourceMemPercentage`                  | `devices.nvidia.resourceMemoryPercentageName` |
| `resourceCores`                          | `devices.nvidia.resourceCoreName`             |
| `resourcePriority`                       | `devices.nvidia.resourcePriorityName`         |
| `devicePlugin.deviceSplitCount`          | `devices.nvidia.deviceSplitCount`             |
| `devicePlugin.deviceMemoryScaling`       | `devices.nvidia.deviceMemoryScaling`          |
| `devicePlugin.deviceCoreScaling`         | `devices.nvidia.deviceCoreScaling`            |
| `devicePlugin.preConfiguredDeviceMemory` | `devices.nvidia.preConfiguredDeviceMemory`    |
| `devicePlugin.enableNumaTopology`        | `devices.nvidia.enableNumaTopology`           |
| `devicePlugin.runtimeClassName`          | `devices.nvidia.runtimeClassName`             |
| `devicePlugin.createRuntimeClass`        | `devices.nvidia.createRuntimeClass`           |

To preserve the effects of your previous configuration, also review the defaults for these NVIDIA values:

| Field | Default and Configuration |
| --- | --- |
| `devicePlugin.monitor.disableHAMiCoreForWholeGPU` | New field that defaults to `true`. When memory and core scaling are both `1`, non-MIG containers meeting the whole-GPU criteria bypass HAMi-core by default, and the monitor collects their metrics directly through NVML. Explicitly set `false` if whole-GPU workloads must continue loading HAMi-core |
| `devices.nvidia.limitDelivery` | Defaults to `file`. In addition to environment variables, limit files are mounted read-only at `/overrideEnv` in the container. Check whether the application uses this path. Set `env` to deliver limits only through environment variables |
| `devices.nvidia.adoptExistingMIGInstances` | By default, HAMi does not adopt MIG instances it has no record of creating. If you previously relied on adopting existing instances, first check their ownership. Enable this only when HAMi exclusively manages the node's MIG layout. See [Dynamic MIG Lifecycle](../developers/dynamic-mig-lifecycle.md) |

#### Cambricon

| v2.10 Field        | Latest Field                           |
| ------------------ | -------------------------------------- |
| `mluResourceName`  | `devices.cambricon.resourceCountName`  |
| `mluResourceMem`   | `devices.cambricon.resourceMemoryName` |
| `mluResourceCores` | `devices.cambricon.resourceCoreName`   |

#### Hygon

[HAMi#2969](https://github.com/Project-HAMi/HAMi/pull/2969) renamed DCU to HCU for Hygon devices across resource names, configuration, and annotations. We recommend upgrading the HCU (formerly DCU) device plugin to the latest official version of [k8s-hcu-device-plugin](https://github.com/HYGON-AI/k8s-hcu-device-plugin) provided by Hygon. For details about the changes and configuration, see [Enable Hygon HCU Sharing](../userguide/hygon-device/enable-hygon-hcu-sharing.md).

| v2.10 Field | v2.10 Default Value | Latest Field | Latest Default Value |
| --- | --- | --- | --- |
| `dcuResourceName` | `hygon.com/dcunum` | `devices.hygon.resourceCountName` | `hygon.com/hcunum` |
| `dcuResourceMem` | `hygon.com/dcumem` | `devices.hygon.resourceMemoryName` | `hygon.com/hcumem` |
| `dcuResourceCores` | `hygon.com/dcucores` | `devices.hygon.resourceCoreName` | `hygon.com/hcucores` |

If you used a development version after v2.10, also migrate `hcuResourceName`, `hcuResourceMem`, and `hcuResourceCores` to the corresponding `devices.hygon.*` paths in the table. The new Chart rejects these old fields as well.

After removing old fields that match the v2.10 defaults, the Chart uses the new `hygon.com/hcu*` resource names. During the upgrade, check the resource names actually exposed by the HCU device plugin and update resource requests in subsequently submitted workloads to match the Chart configuration. Helm rendering validation alone does not confirm that Hygon device migration is complete.

#### MetaX

| v2.10 Field              | Latest Field                        |
| ------------------------ | ----------------------------------- |
| `metaxResourceName`      | `devices.metax.resourceVCountName`  |
| `metaxResourceCore`      | `devices.metax.resourceVCoreName`   |
| `metaxResourceMem`       | `devices.metax.resourceVMemoryName` |
| `metaxsGPUTopologyAware` | `devices.metax.sgpuTopologyAware`   |

In v2.10, `metaxsGPUTopologyAware` uses a string and defaults to `"false"`. The new field, `devices.metax.sgpuTopologyAware`, uses a boolean and defaults to `false`. The Chart still accepts the strings `"true"` and `"false"`, but unquoted boolean values are recommended when migrating. If the old value is the default `"false"`, simply remove the old field. If it is `"true"`, set the new field to `true`.

#### Enflame

| v2.10 Field                    | Latest Field                            |
| ------------------------------ | --------------------------------------- |
| `enflameResourceNameDRSGCU`    | `devices.enflame.resourceNameDRSGCU`    |
| `enflameResourceNameGCUMemory` | `devices.enflame.resourceNameGCUMemory` |
| `enflameResourceNameGCUCore`   | `devices.enflame.resourceNameGCUCore`   |

#### Kunlunxin

| v2.10 Field                 | Latest Field                         |
| --------------------------- | ------------------------------------ |
| `kunlunResourceName`        | `devices.kunlun.resourceCountName`   |
| `kunlunResourceVCountName`  | `devices.kunlun.resourceVCountName`  |
| `kunlunResourceVMemoryName` | `devices.kunlun.resourceVMemoryName` |

#### Vastai

| v2.10 Field          | Latest Field                       |
| -------------------- | ---------------------------------- |
| `vastaiResourceName` | `devices.vastai.resourceCountName` |

#### Biren

| v2.10 Field         | Latest Field                      |
| ------------------- | --------------------------------- |
| `birenResourceName` | `devices.biren.resourceCountName` |

#### Ascend

| Old Configuration | New Configuration or Action |
| --- | --- |
| `devices.ascend.hamiVnpuCore: true` | Migration to `devices.ascend.hamiVnpuMode: hami-core` is recommended; `false` corresponds to `template`. The old boolean field remains supported, and an explicitly set `hamiVnpuMode` takes precedence |
| `devices.ascend.enpu` (development field introduced after v2.10) | Removed. Use `devices.ascend.hamiVnpuMode: enpu` instead. Retaining the old field causes validation to fail |
| `devices.ascend.vnpuDeviceSplitCount` (development field introduced after v2.10) | Replaced by `devices.ascend.deviceSplitCount`, which must be a positive integer. It applies to hami-core and ENPU modes, defaults to `10`, and requires an Ascend device plugin that supports `vnpus.deviceSplitCount` |
| Manually modified `vnpus.configs` | Migrate to `devices.ascend.configs`; the supplied list replaces the entire default list. Use the corresponding `devices.ascend.*` fields and `scheduler.overwriteEnv` for global mode, runtime, and environment variable override settings. Do not restore the entire old `vnpus` configuration |

Upgrade and check the configuration of the Ascend device plugin separately; the HAMi Chart does not deploy it. For modes and compatible version requirements, see [Enable Ascend Sharing](../userguide/ascend-device/enable-ascend-sharing.md).

### Migration Example

Suppose the previous installation used `override-values.yaml` with the following contents:

```yaml
resourceName: nvidia.com/gpu
devicePlugin:
  deviceSplitCount: 20
  disablecorelimit: "true"
```

Here, `resourceName` matches the v2.10 default and does not need to be retained. `deviceSplitCount` was changed from the default of `10` to `20` and needs to be migrated. `disablecorelimit` is a custom setting whose path has not changed, so retain it as is.

Also suppose that the following field in `data.device-config.yaml` in the `hami-scheduler-device` ConfigMap was changed from the default of `0` to `4096` (only the relevant snippet is shown):

```yaml
nvidia:
  defaultMemory: 4096
```

The v2.10 Chart template hardcoded `defaultMemory` to `0`, so it could not be changed through a dedicated values field. [HAMi#3152](https://github.com/Project-HAMi/HAMi/pull/3152) exposed these settings as values fields, so this manual change can now be migrated to `devices.nvidia.defaultMemory`.

The resulting `my-values.yaml` is:

```yaml
devices:
  nvidia:
    deviceSplitCount: 20
    defaultMemory: 4096
devicePlugin:
  disablecorelimit: "true"
```

This file retains only the settings that need overrides: migrated device fields, custom configuration extracted from the ConfigMap, and custom settings whose paths have not changed. Neither the old path for `resourceName` nor its corresponding new path needs to be included; the new Chart provides the default.

`scheduler.overwriteEnv` and other `devicePlugin` settings still use their original paths, including `enabled`, image settings, `deviceListStrategy`, `migStrategy`, `disablecorelimit`, and `nodeConfiguration`. Retain any custom values at their original paths.

If you previously used `device-config.content` or `files/device-config.yaml` in the Chart, they replace the entire generated device configuration rather than merging with `devices.*`. To switch to managing configuration through `devices.*`, first review and migrate the settings that need to be retained, then remove the existing full configuration override.

### Validate the Migrated Configuration

Render the migrated configuration using the local Chart obtained during preparation:

```bash
helm template "${release}" "${hami_chart_dir}/charts/hami" \
  --namespace "${namespace}" \
  --values my-values.yaml
```

## Perform the Upgrade

Render the release again using the migrated values and the Chart defaults:

```bash
helm upgrade "${release}" "${hami_chart_dir}/charts/hami" \
  --namespace "${namespace}" \
  --reset-values \
  --values my-values.yaml
```

`--reset-values` discards the old values stored in the release. All overrides that need to be retained must be included in `my-values.yaml` or supplied through other `--values` files.

Do not use `--reuse-values` or `--reset-then-reuse-values` for this migration. These options carry removed fields from the old values into the new Chart, which may cause rendering to fail. They do not make old fields that are not covered by validation take effect again.

## Post-Upgrade Verification

### Check Workloads

```bash
kubectl get pods -n "${namespace}" \
  -l "app.kubernetes.io/instance=${release}"
kubectl rollout status deployment -n "${namespace}" \
  -l "app.kubernetes.io/instance=${release},app.kubernetes.io/component=hami-scheduler" \
  --timeout=5m
kubectl rollout status daemonset -n "${namespace}" \
  -l "app.kubernetes.io/instance=${release},app.kubernetes.io/component=hami-device-plugin" \
  --timeout=5m
```

Pods should be in the `Running` state, and the Deployment and DaemonSet should have completed their rolling updates.

### Test Device Allocation

Use a small Pod to verify GPU allocation:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test-pod
  namespace: default
spec:
  containers:
  - name: test
    image: nvidia/cuda:12.2.0-runtime-ubuntu22.04
    command: ["nvidia-smi"]
    resources:
      limits:
        nvidia.com/gpu: 1
  restartPolicy: Never
EOF

kubectl logs -n default gpu-test-pod
kubectl delete pod -n default gpu-test-pod
```

Then check node resources and HAMi annotations:

```bash
kubectl describe nodes | grep -A 5 "Allocated resources"
kubectl get nodes -o yaml | grep -A 10 "hami.io"
```

## Rollback

First, view the release history:

```bash
helm history "${release}" -n "${namespace}"
```

Roll back to the previous version:

```bash
helm rollback "${release}" -n "${namespace}"
```

You can also specify a revision:

```bash
helm rollback "${release}" <revision-number> -n "${namespace}"
```

Helm rollback uses the manifests saved in the release history, which do not include records of direct changes to ConfigMaps in the cluster. If you manually modified the device configuration before upgrading, compare it with `previous-device-config.yaml` after rollback and restore the necessary fields. Do not overwrite the entire ConfigMap. Retain the migrated `my-values.yaml` and use its prepared configuration when upgrading again.

If workloads still behave abnormally after rollback, first restore the GPU workloads from before the maintenance window, then check the scheduler, device plugin, and node logs.

## Getting Help

If you encounter issues during the upgrade:

1. Check the [troubleshooting guide](../troubleshooting/troubleshooting.md)
2. Review scheduler and device plugin logs
3. Check [GitHub Issues](https://github.com/Project-HAMi/HAMi/issues)
4. Ask in the [community discussions](https://github.com/Project-HAMi/HAMi/discussions)

## See Also

- [Changelog](/changelog)
- [Installation Guide](./online-installation.md)
- [Uninstallation Guide](./uninstall.md)
- [Devices Supported by HAMi](../userguide/device-supported.md)
- [HAMi Documentation](../core-concepts/introduction.md)
