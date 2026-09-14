---
title: Prerequisites
sidebar_label: Prerequisites
translated: true
---

Before installing HAMi, prepare the Kubernetes cluster and device nodes as described below.

## Cluster requirements

- Kubernetes 1.23 or later, with a working container runtime.
- Helm and `kubectl`, with permission to install HAMi's cluster resources.
- Nodes that meet the device driver's operating system and kernel requirements. See the device guides below for driver and runtime setup.

## Find your device's prerequisites

Select your device for prerequisites and installation instructions.

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

Each NVIDIA GPU node needs a driver compatible with the GPU model and workload's CUDA version, and NVIDIA Container Toolkit configured for the container runtime used by Kubernetes.

### Prepare nodes with NVIDIA GPU Operator

[NVIDIA GPU Operator](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/getting-started.html) automates driver and Container Toolkit installation. Set its Helm values according to how each component is managed:

| Driver management | Toolkit management | GPU Operator Helm values                        |
| ----------------- | ------------------ | ----------------------------------------------- |
| GPU Operator      | GPU Operator       | `driver.enabled=true`, `toolkit.enabled=true`   |
| Host or VM image  | GPU Operator       | `driver.enabled=false`, `toolkit.enabled=true`  |
| Host or VM image  | Host               | `driver.enabled=false`, `toolkit.enabled=false` |

When both components are installed on the host, GPU Operator is optional. If it is deployed for other components, disable its driver and Toolkit installation as shown above.

:::warning

Set GPU Operator's `devicePlugin.enabled=false` and keep HAMi's NVIDIA Device Plugin enabled. Disable any separately installed NVIDIA Device Plugin on the same nodes to avoid duplicate registration of `nvidia.com/gpu` with kubelet.

:::

The following example uses GPU Operator **v26.3.3** with HAMi's default `envvar` device allocation strategy. Before installing, check the operating system, kernel, and Kubernetes requirements in the [Operator support matrix](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/platform-support.html). Follow the Operator installation prerequisites for Pod Security Admission; if Node Feature Discovery is already installed, also set `nfd.enabled=false`.

Save these **GPU Operator values** as `gpu-operator-values.yaml`. Set `driver.enabled=false` if the host already manages the driver:

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

For an existing GPU Operator installation, update its existing Helm values, preserving the cluster's other settings. Select the injection mode before changing `cdi.enabled` on nodes with running GPU workloads.

:::note CDI and runtime selection

GPU Operator 26.3 enables CDI by default. Since GPU Operator 25.10, `cdi.default` has been deprecated and ignored. This example explicitly sets `cdi.enabled=false` to use the NVIDIA runtime with HAMi's `envvar` strategy. See the [GPU Operator 26.3 release notes](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/release-notes.html).

To use CDI, configure the container runtime and HAMi's CDI settings as described in [Enable NVIDIA CDI support for HAMi](./configure-cdi.md).

:::

For distributions with an embedded containerd, such as K3s, configure GPU Operator with the distribution's containerd configuration and socket paths. See the [Operator containerd configuration options](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/getting-started.html#specifying-configuration-options-for-containerd) and [K3s runtime configuration](https://docs.k3s.io/advanced#nvidia-container-runtime).

Check that the ClusterPolicy reaches `ready`, the enabled driver and Toolkit components are ready, and no NVIDIA Device Plugin DaemonSet or Pod is running from the Operator:

```bash
kubectl get clusterpolicies
kubectl get pods,daemonsets -n gpu-operator
```

On freshly prepared nodes, `nvidia.com/gpu` capacity is not expected until HAMi's NVIDIA Device Plugin is running.

### Install the driver and Toolkit on the host

To manage the driver and Toolkit on the host, install a suitable NVIDIA driver and follow the [NVIDIA Container Toolkit installation guide](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) on every NVIDIA GPU node.

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

Save the following **HAMi values** as `hami-nvidia-values.yaml` when GPU Operator manages both the driver and Toolkit:

```yaml
devicePlugin:
  deviceListStrategy: envvar
  nvidiaDriverRoot: /run/nvidia/driver
  gpuOperatorToolkitReady:
    enabled: true
```

- If the host manages the driver, set `devicePlugin.nvidiaDriverRoot` to `/`. The path must match the actual node layout.
- If the host manages Toolkit, leave `devicePlugin.gpuOperatorToolkitReady.enabled=false`; this option waits for the Operator's Toolkit readiness marker.
- If the NVIDIA runtime is not the default, verify that a RuntimeClass such as `nvidia` maps to the configured NVIDIA runtime handler, then set `devicePlugin.runtimeClassName=nvidia`. HAMi uses this value for its NVIDIA Device Plugin and injects it into NVIDIA GPU workload Pods.
- For CDI, use the values in the [NVIDIA CDI guide](./configure-cdi.md), including the driver root and the actual `nvidia-ctk` hook path.

### Label NVIDIA GPU nodes {#label-your-nodes}

By default, HAMi's NVIDIA Device Plugin selects nodes using `devicePlugin.nvidiaNodeSelector: {gpu: "on"}`. Label the NVIDIA GPU nodes to match:

```bash
kubectl label nodes <node-name> gpu=on
```

If you customize `devicePlugin.nvidiaNodeSelector`, label the nodes to match that selector.

## Install HAMi

Continue with [Online Installation from Helm](./online-installation.md) or [Offline Installation](./offline-installation.md). For the NVIDIA path above, add `--values hami-nvidia-values.yaml` to the HAMi installation command, and match `scheduler.kubeScheduler.image.tag` to the Kubernetes server version as described in the installation guide.
