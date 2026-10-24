---
title: Upgrade HAMi
---

:::warning Supported Source Version

This guide only applies to upgrades from HAMi v2.10 to the new Chart. Following these instructions directly from other versions is not recommended. If you are running an earlier version, first follow the [v2.10 upgrade guide](/docs/installation/upgrade) to upgrade HAMi to v2.10, then continue with this guide.

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
```

### Check the HAMi Version

Before upgrading, confirm that the currently installed version is HAMi 2.10:

```bash
helm list -n "${namespace}" --filter "^${release}$"
```

### Back Up Helm Values

Before upgrading, save the user configuration for the current release:

```bash
helm get values "${release}" -n "${namespace}" -o yaml > previous-values.yaml
```

## Migrate and Create Values

When upgrading from v2.10 to the latest Chart, all device-related fields move under `devices.<vendor>`. First create `my-values.yaml` from the backed-up values, migrate the fields, and validate rendering before performing the upgrade.

### Create values.yaml

Create `my-values.yaml` from `previous-values.yaml` as a starting point for preparing the upgrade configuration:

```bash
cp previous-values.yaml my-values.yaml
```

After copying the file, update the device fields as described in the next section. Do not use the entire old configuration directly for the upgrade. Include any other custom settings that you need to retain in `my-values.yaml`. Do not restore the entire old ConfigMap after the upgrade, as this would overwrite the new default configuration.

### Migrate Device Fields

The standard resource names for Enflame, Kunlun, Vastai, and Biren are now automatically added to the scheduler extender from the corresponding device fields. For these four device types, `customresources` contains only additional resources and defaults to an empty list. Remove any standard resource entries copied from the old values.

Before migrating, review the old values file and any device configuration that was manually modified in the old `hami-scheduler-device` ConfigMap (the actual name varies with the release and naming overrides). Use the defaults from the Chart version installed before the upgrade as the baseline. Include only settings that differ from those defaults and still need to be retained after the upgrade in the new values.

- For device fields in the old values, use the vendor-specific mappings below to migrate them to the new paths and remove the old paths.
- For configuration modified directly in the ConfigMap, find the corresponding Helm values fields before migrating. Do not copy the entire ConfigMap contents into values. The old fields in the tables below refer to old Helm values paths, not ConfigMap field paths.
- Remove device fields that match the old version's defaults from `my-values.yaml`. There is no need to add them at the corresponding new paths; let the new Chart use its defaults.

Do not decide whether a value needs migration solely because it is `0`, `false`, or an empty string; compare it with the old version's defaults. The new values must not contain any of the old fields listed below, or the new Chart will refuse to render.

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

#### Cambricon

| v2.10 Field        | Latest Field                           |
| ------------------ | -------------------------------------- |
| `mluResourceName`  | `devices.cambricon.resourceCountName`  |
| `mluResourceMem`   | `devices.cambricon.resourceMemoryName` |
| `mluResourceCores` | `devices.cambricon.resourceCoreName`   |

#### Hygon

| v2.10 Field        | Latest Field                       |
| ------------------ | ---------------------------------- |
| `dcuResourceName`  | `devices.hygon.resourceCountName`  |
| `dcuResourceMem`   | `devices.hygon.resourceMemoryName` |
| `dcuResourceCores` | `devices.hygon.resourceCoreName`   |

#### MetaX

| v2.10 Field              | Latest Field                        |
| ------------------------ | ----------------------------------- |
| `metaxResourceName`      | `devices.metax.resourceVCountName`  |
| `metaxResourceCore`      | `devices.metax.resourceVCoreName`   |
| `metaxResourceMem`       | `devices.metax.resourceVMemoryName` |
| `metaxsGPUTopologyAware` | `devices.metax.sgpuTopologyAware`   |

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

Update the Helm repository and render the configuration using the new Chart version:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update

helm template "${release}" hami-charts/hami \
  --namespace "${namespace}" \
  --version 2.11.0 \
  --values my-values.yaml
```

## Perform the Upgrade

Render the release again using the migrated values and the Chart defaults:

```bash
helm upgrade "${release}" hami-charts/hami \
  --namespace "${namespace}" \
  --version 2.11.0 \
  --reset-values \
  --values my-values.yaml
```

`--reset-values` discards the old values stored in the release. All overrides that need to be retained must be included in `my-values.yaml` or supplied through other `--values` files.

Do not use `--reuse-values` or `--reset-then-reuse-values` for this migration. They carry removed fields from the old values into the new Chart, causing rendering to fail.

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

kubectl logs gpu-test-pod
kubectl delete pod gpu-test-pod
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

If workloads still behave abnormally after rollback, first restore the GPU workloads from before the maintenance window, then check the scheduler, device plugin, and node logs.

## Getting Help

If you encounter issues during the upgrade:

1. Check the [troubleshooting guide](../troubleshooting/troubleshooting.md)
2. Review scheduler and device plugin logs
3. Check [GitHub Issues](https://github.com/Project-HAMi/HAMi/issues)
4. Ask in the [community discussions](https://github.com/Project-HAMi/HAMi/discussions)

## See Also

- [Installation Guide](./online-installation.md)
- [Uninstallation Guide](./uninstall.md)
- [Devices Supported by HAMi](../userguide/device-supported.md)
- [HAMi Documentation](../core-concepts/introduction.md)
