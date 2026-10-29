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

### Image sources for networks in China {#image-source}

The chart uses upstream image registries by default (`global.imageSource=upstream`). If pulls from these registries are slow or fail on networks in China, set `global.imageSource=cn`. Check that the selected chart version includes `global.imageSource` in the `helm show values` output above before using it.

:::warning DaoCloud mirror availability

The DaoCloud public mirror (`m.daocloud.io`) may experience congestion or rate limiting. Selecting `cn` does not guarantee faster or successful image pulls. If pulls still fail, use an accessible upstream registry or copy the required images to a registry you control and configure the corresponding image registry and repository values.

:::

To use `global.imageSource=cn`, keep `global.imageRegistry` empty (the default). A non-empty `global.imageRegistry` takes precedence and disables image-source selection.

Merge the following into `my-values.yaml`, preserving any other `global` settings:

```yaml
global:
  imageSource: cn
```

Alternatively, append `--set global.imageSource=cn` to the installation command below.

For supported default image references, `cn` selects Alibaba Cloud mirrors for kube-scheduler and the default pinned certgen image, and [DaoCloud mirrors](https://github.com/DaoCloud/public-image-mirror) for HAMi, mock-device-plugin, and Lupine server/client images. Custom repositories are not automatically rewritten. See the [Chart values reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md) for image overrides and exceptions.

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

Keep `devicePlugin.nvidiaDriverRoot=auto` for automatic discovery. The plugin reads GPU Operator's `/run/nvidia/validations/driver-ready`; if the file is absent, it assumes the driver is installed on the host. If HAMi starts before GPU Operator validation completes, wait for GPU Operator to become ready and restart the HAMi device plugin DaemonSet.

The device plugin Pod must use the NVIDIA runtime to load driver libraries and discover GPUs. Set NVIDIA as the node's default runtime or configure `devices.nvidia.runtimeClassName`. For CDI settings and prerequisites, see [Configure CDI](./configure-cdi.md). Driver-path overrides and their mount behavior are documented in the [Chart values reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md).

## Verify installation {#verify-installation}

The commands below use release `hami` in namespace `kube-system` with the default resource names. For a custom installation, use the actual namespace, release label, and resource names rendered by the chart. For example, release `gpu` with the default naming settings creates `gpu-hami-scheduler` and `gpu-hami-device-plugin`.

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

For subsequent changes, use [Upgrade](./upgrade.md). See [Configuration](../userguide/configure.md) for configuration options, or [Troubleshooting](../troubleshooting/troubleshooting.md) for failures.
