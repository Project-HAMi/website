---
title: Offline Installation
---

If your cluster can’t directly access the internet, you can install HAMi offline.

## Prepare application images

First, select the Chart version to install (see [Prepare the HAMi Chart](#prepare-the-hami-chart) for download instructions), then prepare application images according to that version's defaults and the features you enable. The images and overrides below apply to the Next Chart. For a released version, use the matching documentation and image configuration. Save the required application images as tar archives and copy them into the offline environment:

- `docker.io/projecthami/hami:{HAMi version}`
- `registry.k8s.io/ingress-nginx/kube-webhook-certgen:v1.6.9`
- `registry.k8s.io/kube-scheduler:{your kubernetes version}`

If you use Lupine remote GPUs, also prepare the following images for the features you enable:

- `ghcr.io/lupinemachines/lupine-server:cuda-13.3.1-ubuntu24.04`: the remote GPU server image, configured through `devices.remotegpu.server.image`.
- `ghcr.io/lupinemachines/lupine-client:cuda-13.3.1-ubuntu24.04`: the image that provides Lupine client libraries to workloads, configured through `devices.remotegpu.clientImage`.

:::note China mirrors

When preparing offline images in an internet-connected environment, developers in China can try pulling the corresponding images from `m.daocloud.io/docker.io/projecthami/hami`, `registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler`, `registry.cn-hangzhou.aliyuncs.com/google_containers/kube-webhook-certgen`, `m.daocloud.io/ghcr.io/lupinemachines/lupine-server`, and `m.daocloud.io/ghcr.io/lupinemachines/lupine-client`.

[m.daocloud.io](https://m.daocloud.io) does not guarantee stability or availability and should not be relied on as a stable mirror. If a pull fails, use the upstream registry or another available mirror.

:::

Load the images, tag them with your internal registry, and push them to your registry.

```bash
docker load -i {HAMi_image}.tar
docker tag docker.io/projecthami/hami:{HAMi version} {your_inner_registry}/hami:{HAMi version}
docker push {your_inner_registry}/hami:{HAMi version}
docker tag registry.k8s.io/ingress-nginx/kube-webhook-certgen:v1.6.9 {your_inner_registry}/kube-webhook-certgen:v1.6.9
docker push {your_inner_registry}/kube-webhook-certgen:v1.6.9
docker tag registry.k8s.io/kube-scheduler:{your kubernetes version} {your_inner_registry}/kube-scheduler:{your kubernetes version}
docker push {your_inner_registry}/kube-scheduler:{your kubernetes version}
```

For Lupine remote GPUs, also import the additional images into the internal registry. The configuration below assumes that the server and client images have been pushed to `{your_inner_registry}/lupine-server:cuda-13.3.1-ubuntu24.04` and `{your_inner_registry}/lupine-client:cuda-13.3.1-ubuntu24.04`, respectively.

## Prepare the HAMi Chart

On an internet-connected machine, add the official Helm repository and list the available versions:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update hami-charts
helm search repo hami-charts/hami --versions
```

Replace `{Chart version}` with the selected version and download its Chart package:

```bash
CHART_VERSION="{Chart version}"
helm pull hami-charts/hami --version "$CHART_VERSION" --destination .
helm show values "./hami-${CHART_VERSION}.tgz"
```

Transfer the downloaded `hami-${CHART_VERSION}.tgz` into the offline environment. Use the same Chart version when preparing application images, rendering configuration, and installing.

Downloading a Chart directly from the changing `master` branch is not recommended as a substitute for the selected release. If you need unreleased Next features, select a fixed commit from the [HAMi source repository](https://github.com/Project-HAMi/HAMi), use its `charts/hami` directory, and package it with `helm package` before transferring it into the offline environment.

On the offline machine, enter the directory containing the Chart package and set its local path:

```bash
CHART_PACKAGE="./hami-{Chart version}.tgz"
```

## Configure images

This section covers only the image overrides needed for offline installation. For device enablement, runtimes, nodes, scheduling, and other settings, see the [configuration guide](../userguide/configure.md) and use the documentation version selector to choose the version matching your Chart. Include the settings you need in the overrides file.

First, inspect the local Chart package's defaults:

```bash
helm show values "$CHART_PACKAGE"
```

Create a separate `override-values.yaml` in the same directory and pass it with `-f` to override settings without unpacking or modifying the Chart's bundled `values.yaml`. Replace the placeholders below with the internal registry address and versions used when pushing the images:

```yaml
global:
  imageRegistry: "{your_inner_registry}"
  imageTag: "{HAMi version}"
scheduler:
  kubeScheduler:
    image:
      repository: kube-scheduler
      tag: "{your kubernetes version}"
  extender:
    image:
      repository: hami
  patch:
    imageNew:
      repository: kube-webhook-certgen
      tag: v1.6.9
devicePlugin:
  image:
    repository: hami
  monitor:
    image:
      repository: hami
```

Explicitly override `global.imageTag` and `scheduler.patch.imageNew.tag` with the tags pushed to the internal registry.

`global.imageRegistry` sets the registry address for the component images. The scheduler extender, device plugin, and monitor omit `image.tag` from the overrides file, retaining the Chart's empty defaults and inheriting `global.imageTag`. kube-scheduler and certgen use their own configured tags. Each component's `repository` matches the destination path used when pushing the images.

For deployments with Lupine remote GPUs enabled, merge the following image overrides into the same `override-values.yaml`. The image versions must match the tags you pushed:

```yaml
devices:
  remotegpu:
    server:
      image:
        repository: lupine-server
        tag: cuda-13.3.1-ubuntu24.04
    clientImage: "{your_inner_registry}/lupine-client:cuda-13.3.1-ubuntu24.04"
```

The server image inherits `global.imageRegistry` but not `global.imageTag`, so its default digest must be overridden separately. `clientImage` is a complete image reference and must explicitly use the internal registry address. When `libImage` is unset or `null`, it reuses the internal HAMi image configured above. Explicit `libImage` values and non-empty `sessionImage` values must also point to internal images. If you supply custom `device-config` content, update its image references as well.

After rendering the remote GPU configuration, inspect `libImage`, `clientImage`, and `sessionImage` in the device ConfigMap in addition to the server DaemonSet. These images are used by Pods created later.

## Install HAMi

Set the installation namespace. The example uses `kube-system`; change it as needed. First, render the configuration and check that the namespace, image addresses, and versions are correct. Replace the `--kube-version` placeholder with the target cluster's Kubernetes version:

```bash
NAMESPACE=kube-system
helm template hami "$CHART_PACKAGE" --namespace "$NAMESPACE" \
  -f override-values.yaml \
  --kube-version "{your kubernetes version}" > rendered.yaml
```

After checking the configuration, install using the same overrides file:

```bash
helm install hami "$CHART_PACKAGE" \
  --namespace "$NAMESPACE" --create-namespace \
  -f override-values.yaml
```

## Verify the installation

Run the following command:

```bash
kubectl get pods --namespace "$NAMESPACE"
```

If both the `device-plugin` and `scheduler` are running, HAMi is installed successfully.
