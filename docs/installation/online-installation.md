---
sidebar_label: Online installation from Helm
title: Online installation from Helm
---

Install a new HAMi release with the official Helm chart. For an existing release, follow [Upgrade](./upgrade.md).

## Before installation

Complete the [cluster and device prerequisites](./prerequisites.md). Prepare the driver, container runtime, node labels, and values required by the device guide. For NVIDIA, save the applicable runtime and GPU Operator settings as `hami-nvidia-values.yaml`. Other vendors may require a separately deployed device plugin; enabling a vendor in HAMi does not install that vendor's plugin unless the chart provides it.

## Add the Helm repository {#add-hami-repo}

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update hami-charts
helm search repo hami-charts/hami --versions
```

Select a chart version and use the matching version of this documentation. Next describes the development branch and may include settings absent from published charts.

## Prepare values

Inspect the defaults for the selected version:

```bash
helm show values hami-charts/hami --version <chart-version>
```

Create `my-values.yaml` containing the overrides needed for the installation. For NVIDIA, start with the file prepared in the prerequisites guide. See [Configuration](../userguide/configure.md) for sharing limits, scheduling policies, and configuration precedence.

## Deploy HAMi {#deploy-hami}

These examples use release `hami` in namespace `kube-system`. Substitute the actual release and namespace where needed. Replace `<chart-version>` with the version selected above:

```bash
helm install hami hami-charts/hami \
  --namespace kube-system \
  --version <chart-version> \
  --values my-values.yaml
```

The chart detects the Kubernetes server version and selects the matching kube-scheduler image. To override the tag, set `scheduler.kubeScheduler.image.tag` in the values file. This image does not use `global.imageTag`.

### NVIDIA driver discovery {#nvidia-driver-discovery}

When `devicePlugin.nvidiaDriverRoot=auto`, the device plugin reads `/run/nvidia/validations/driver-ready`. If the file is absent, HAMi assumes a host-installed driver and uses `/` for both the driver and device roots. When HAMi starts before GPU Operator validation completes, wait for GPU Operator to become ready and restart the HAMi device plugin DaemonSet.

The detected roots only describe the host paths that the device plugin returns to the runtime: `NVIDIA_DRIVER_ROOT` is used in generated CDI specifications and `NVIDIA_DEV_ROOT` is used for `DeviceSpec.HostPath` when `devicePlugin.passDeviceSpecsEnabled=true`. The device plugin itself initializes NVML and discovers GPUs through the driver libraries and device nodes that the NVIDIA Container Toolkit injects into its container, so the chart mounts only the GPU Operator validation directory read-only. This requires the device plugin Pod to run with the NVIDIA runtime, either because it is the node's default container runtime or through `devices.nvidia.runtimeClassName`.

CDI specifications must reference the host driver layout, which can differ from the layout inside the device plugin container. When `devicePlugin.deviceListStrategy` includes a `cdi-*` strategy, the chart additionally mounts the host root read-only at `/host`; the device plugin uses that mount directly for host-installed drivers, or appends the GPU Operator path suffix (`/run/nvidia/driver`) for GPU Operator installations. Set `devicePlugin.nvidiaDriverRoot` explicitly to mount only the driver root instead.

## Verify installation {#verify-installation}

Check the scheduler and the device plugin Pods for the selected devices:

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/instance=hami
kubectl rollout status deployment/hami-scheduler -n kube-system
```

For the chart-managed NVIDIA device plugin, also check:

```bash
kubectl rollout status daemonset/hami-device-plugin -n kube-system
```

A ready deployment confirms component startup. Run the [NVIDIA example](../get-started/deploy-with-helm.md#demo) or the verification steps in the [device guide](./prerequisites.md#device-prerequisites) to check allocation and workload behavior. Device plugins installed separately have their own resource names and namespaces.

For subsequent changes, use [Upgrade](./upgrade.md). See [Configuration](../userguide/configure.md) for profiling and cache cleanup, or [Troubleshooting](../troubleshooting/troubleshooting.md) for failures.
