---
title: Prerequisites
sidebar_label: Prerequisites
---

Before installing HAMi, prepare the Kubernetes cluster and device nodes as described below.

## Cluster requirements

- Kubernetes 1.23 or later, with a working container runtime.
- Helm and `kubectl` installed, and an account with permission to install HAMi's cluster resources.
- Nodes that meet the device driver's operating system and kernel requirements. See the device guides below for driver and runtime setup.

## Find your device's prerequisites {#device-prerequisites}

| Device | Prerequisites and setup |
| --- | --- |
| NVIDIA GPU | [Prepare NVIDIA GPU nodes](#preparing-your-gpu-nodes) |
| Huawei Ascend NPU | [Prerequisites](../userguide/ascend-device/enable-ascend-sharing.md#prerequisites) |
| AMD GPU | [Prerequisites](../userguide/amd-device/enable-amd-gpu-sharing.md#prerequisites) |
| Cambricon MLU | [Prerequisites](../userguide/cambricon-device/enable-cambricon-mlu-sharing.md#prerequisites) |
| Hygon DCU | [Prerequisites](../userguide/hygon-device/enable-hygon-dcu-sharing.md#prerequisites) |
| Moore Threads GPU | [Prerequisites](../userguide/mthreads-device/enable-mthreads-gpu-sharing.md#prerequisites) |
| Iluvatar GPU | [Prerequisites](../userguide/iluvatar-device/enable-iluvatar-gpu-sharing.md#prerequisites) |
| Enflame GCU | [Prerequisites](../userguide/enflame-device/enable-enflame-gcu-sharing.md#prerequisites) |
| AWS Neuron | [Prerequisites](../userguide/awsneuron-device/enable-awsneuron-managing.md#prerequisites) |
| Kunlunxin XPU | [Whole-device scheduling](../userguide/kunlunxin-device/enable-kunlunxin-schedule.md#prerequisites) / [vXPU sharing](../userguide/kunlunxin-device/enable-kunlunxin-vxpu.md#prerequisites) |
| MetaX GPU | [Whole-device scheduling](../userguide/metax-device/metax-gpu/enable-metax-gpu-schedule.md#prerequisites) / [sGPU sharing](../userguide/metax-device/metax-sgpu/enable-metax-gpu-sharing.md#prerequisites) |
| Biren GPU | [Device setup](../userguide/biren-device/enable-biren-sharing.md#using-biren-devices) |
| Vastai | [Device setup](../userguide/vastai/enable-vastai-sharing.md#using-vastai-devices) |

## Prepare NVIDIA GPU nodes {#preparing-your-gpu-nodes}

Install a driver compatible with the GPU model and the workload's CUDA version on each NVIDIA GPU node. Configure NVIDIA Container Toolkit for the container runtime used by Kubernetes.

### Prepare nodes with NVIDIA GPU Operator

[NVIDIA GPU Operator](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/getting-started.html) automates driver and Container Toolkit installation. Choose the Helm values that match how the driver and Toolkit are managed:

| Driver management | Toolkit management | GPU Operator Helm values                        |
| ----------------- | ------------------ | ----------------------------------------------- |
| GPU Operator      | GPU Operator       | `driver.enabled=true`, `toolkit.enabled=true`   |
| Host or VM image  | GPU Operator       | `driver.enabled=false`, `toolkit.enabled=true`  |
| Host or VM image  | Host               | `driver.enabled=false`, `toolkit.enabled=false` |

When the host manages both the driver and Toolkit, GPU Operator is optional. To use the Operator for other components, disable its driver and Toolkit installation as shown above.

:::warning

Set GPU Operator's `devicePlugin.enabled=false` and keep HAMi's NVIDIA Device Plugin enabled. Disable any separately installed NVIDIA Device Plugin on the same nodes to avoid duplicate registration of `nvidia.com/gpu` with kubelet.

:::

The following example uses GPU Operator **v26.3.3** and HAMi's default `envvar` device allocation strategy. Before installing:

- Check the operating system, kernel, and Kubernetes versions against the [Operator support matrix](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/platform-support.html).
- Confirm that the cluster meets the Pod Security Admission requirements in the Operator installation guide.
- If Node Feature Discovery is already installed, set `nfd.enabled=false`.

If GPU Operator is already installed, update the relevant settings in its existing Helm values and preserve the other settings. If the nodes have running GPU workloads, confirm the device injection mode before changing `cdi.enabled`.

:::note CDI and runtime selection

Starting with GPU Operator 25.10, CDI is enabled by default, and `cdi.default` is deprecated and ignored. This example sets `cdi.enabled=false` to use the NVIDIA runtime with HAMi's `envvar` strategy. See the [GPU Operator 25.10 release notes](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/25.10/release-notes.html).

To use CDI, configure the container runtime and HAMi's CDI settings as described in [Enable NVIDIA CDI support for HAMi](./configure-cdi.md).

:::

For distributions with an embedded containerd, such as K3s, specify the distribution's containerd configuration file and socket paths in GPU Operator. See the [Operator containerd configuration options](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/getting-started.html#specifying-configuration-options-for-containerd) and [K3s runtime configuration](https://docs.k3s.io/advanced#nvidia-container-runtime).

Save the following GPU Operator values as `gpu-operator-values.yaml`. If the host already manages the driver, set `driver.enabled=false`:

```yaml
driver:
  enabled: true
toolkit:
  enabled: true
devicePlugin:
  enabled: false
cdi:
  enabled: false
```

Install GPU Operator:

```bash
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update
helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator --create-namespace \
  --version v26.3.3 \
  --values gpu-operator-values.yaml \
  --wait
```

After installation, check GPU Operator's status:

```bash
kubectl get clusterpolicies
kubectl get pods,daemonsets -n gpu-operator
```

Confirm that:

- The ClusterPolicy status is `ready`.
- The enabled driver and Toolkit components are ready.
- GPU Operator is not running an NVIDIA Device Plugin DaemonSet or Pod.

Newly prepared nodes usually have no `nvidia.com/gpu` capacity until HAMi's NVIDIA Device Plugin is running.

### Install the driver and Toolkit on the host

Install a suitable driver on each NVIDIA GPU node. Install and configure Toolkit using the [NVIDIA Container Toolkit installation guide](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html).

For HAMi's default `envvar` strategy, configure the NVIDIA runtime as the default, or select it through a RuntimeClass when installing HAMi. On nodes with a standalone containerd service, configure the default runtime with:

```bash
sudo nvidia-ctk runtime configure --runtime=containerd --set-as-default
sudo systemctl restart containerd
```

For a Kubernetes cluster using Docker through a CRI adapter, configure Docker instead:

```bash
sudo nvidia-ctk runtime configure --runtime=docker --set-as-default
sudo systemctl restart docker
```

For CRI-O or distribution-managed runtimes, use the runtime-specific instructions in the Toolkit or distribution documentation. K3s generates its containerd configuration; use [K3s configuration options or templates](https://docs.k3s.io/advanced#configuring-containerd) for persistent changes.

### Match HAMi settings to the node environment

For the GPU Operator setup below, verify that the `nvidia` RuntimeClass exists and uses the NVIDIA runtime handler configured on the nodes:

```bash
kubectl get runtimeclass nvidia -o yaml
```

The example below explicitly selects this RuntimeClass for the HAMi NVIDIA Device Plugin and `envvar` workloads. With the default CDI configuration in GPU Operator 25.10+, containers using `NVIDIA_VISIBLE_DEVICES` need the NVIDIA runtime. See [GPU Operator 25.10+ troubleshooting](../troubleshooting/troubleshooting.md#nvidia-toolkit-gpu-operator-25-10).

:::warning Toolkit readiness check

Enable `devicePlugin.gpuOperatorToolkitReady.enabled` only when GPU Operator manages Toolkit and its validator creates `/run/nvidia/validations/toolkit-ready`. Before installing HAMi, check that the file exists on each target NVIDIA GPU node:

```bash
sudo ls -l /run/nvidia/validations/toolkit-ready
```

If the file is missing, inspect the Toolkit and validator Pods on that node and fix the validation failure before continuing. If the Operator uses a different validation directory, set `devicePlugin.gpuOperatorToolkitReady.hostPath` to that directory. The `toolkit-validation` init container has no timeout: HAMi's NVIDIA Device Plugin stays in `Init` while the file is absent. For host-managed Toolkit, disable this check after verifying the runtime configuration.

:::

When GPU Operator manages both the driver and Toolkit, save the following HAMi values as `hami-nvidia-values.yaml`:

```yaml
devicePlugin:
  runtimeClassName: nvidia
  deviceListStrategy: envvar
  nvidiaDriverRoot: /run/nvidia/driver
  gpuOperatorToolkitReady:
    enabled: true
```

- If the host manages the driver, set `devicePlugin.nvidiaDriverRoot` to `/`. The path must match the actual node layout.
- If the host manages Toolkit, set `devicePlugin.gpuOperatorToolkitReady.enabled=false`. Enabling this option makes HAMi wait for the Operator's Toolkit readiness marker.
- If the RuntimeClass has a different name, set `devicePlugin.runtimeClassName` to that name. For host-managed runtimes that already use NVIDIA as the default, this value can be omitted.
- For CDI, use the values in the [NVIDIA CDI guide](./configure-cdi.md), including the driver root and the actual `nvidia-ctk` hook path.

### Label NVIDIA GPU nodes {#label-your-nodes}

By default, HAMi's NVIDIA Device Plugin selects nodes using `devicePlugin.nvidiaNodeSelector: {gpu: "on"}`. Label the NVIDIA GPU nodes to match:

```bash
kubectl label nodes <node-name> gpu=on
```

If you customize `devicePlugin.nvidiaNodeSelector`, label the nodes to match that selector.

## Install HAMi

Once the nodes are ready, install HAMi using [Online Installation from Helm](./online-installation.md) or [Offline Installation](./offline-installation.md).

If using the NVIDIA settings above, add `--values hami-nvidia-values.yaml` to the installation command. Follow the installation guide to set `scheduler.kubeScheduler.image.tag` to match the Kubernetes server version.
