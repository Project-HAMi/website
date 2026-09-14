---
title: Install HAMi on Google Kubernetes Engine
sidebar_label: HAMi on GKE
---

This guide covers the GKE-specific configuration for installing HAMi with NVIDIA GPU Operator on **GKE Standard** nodes using the `UBUNTU_CONTAINERD` image. GPU Operator is not supported on GKE Autopilot.

Start with [Prerequisites](./prerequisites.md) for the shared node requirements. Apply the settings below before following the [GPU Operator installation guide](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/getting-started.html) and [Online Installation from Helm](./online-installation.md). For CDI configuration, see [NVIDIA CDI support](./configure-cdi.md).

## Choose who manages the driver

GKE can install NVIDIA drivers on GPU nodes. Decide whether GKE or GPU Operator will manage the driver before preparing the node pool. See [NVIDIA's GKE guide](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/google-gke.html) for the two installation methods.

For either method, set `gke-no-default-nvidia-gpu-device-plugin=true` in the GPU node pool's `--node-labels` to disable GKE's NVIDIA Device Plugin. Preserve other required labels, including HAMi's `gpu=on` label. Also set GPU Operator's `devicePlugin.enabled=false` so that HAMi handles GPU registration.

### Let GPU Operator install the driver

Set `gpu-driver-version=disabled` in the node pool's `--accelerator` option to disable GKE's automatic driver installation. Enable the Operator's driver and Toolkit components with `driver.enabled=true` and `toolkit.enabled=true`.

### Use a GKE-installed driver

Ensure the driver is installed before installing GPU Operator. For new or replacement nodes, follow the [Google driver installer workflow](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/google-gke.html#using-the-google-driver-installer).

:::note Automatic driver installation

On GKE `1.34.10-gke.1328000` Ubuntu nodes, GKE's NVIDIA Device Plugin Pod also contains the driver installer. The `gke-no-default-nvidia-gpu-device-plugin=true` label prevents the entire Pod from running, including driver installation. Do not rely on `gpu-driver-version=default` alone to install drivers on new nodes with this label. Prepare the driver installer separately using the workflow above.

:::

Add the following settings to the GPU Operator values file:

```yaml
driver:
  enabled: false
hostPaths:
  driverInstallDir: /home/kubernetes/bin/nvidia
toolkit:
  installDir: /home/kubernetes/bin/nvidia
```

GKE uses `/home/kubernetes/bin/nvidia` for driver files and Toolkit installation. When merging these values, preserve the other Toolkit settings, including `toolkit.env` from the next section.

On Ubuntu nodes where GKE provides `nvidia-smi` at `/home/kubernetes/bin/nvidia/bin/nvidia-smi`, GPU Operator also needs `/usr/bin/nvidia-smi` to recognize the host-installed driver. If that path is missing, apply the [driver-path DaemonSet](/examples/gke-nvidia-driver-path.yaml) **before installing GPU Operator**:

```bash
kubectl apply -f https://project-hami.io/examples/gke-nvidia-driver-path.yaml
kubectl rollout status -n kube-system daemonset/gke-nvidia-driver-path
```

The DaemonSet selects Ubuntu nodes labeled `gpu=on` and creates the symlink without replacing an existing file. Keep it alongside the driver installer to prepare replacement nodes.

Set HAMi's `devicePlugin.nvidiaDriverRoot=/`. Although the driver files are under `/home/kubernetes/bin/nvidia`, device nodes remain under `/dev`; the installation directory is not the runtime driver root. For CDI, use `/home/kubernetes/bin/nvidia/toolkit/nvidia-ctk` as `devicePlugin.nvidiaHookPath` in the [CDI configuration](./configure-cdi.md#configure-the-helm-chart).

After installing GPU Operator, check that it recognizes the host driver:

```bash
kubectl exec -n gpu-operator daemonset/nvidia-container-toolkit-daemonset \
  -c nvidia-container-toolkit-ctr -- cat /run/nvidia/validations/driver-ready
```

The output should include `IS_HOST_DRIVER=true`, `NVIDIA_DRIVER_ROOT=/`, and `NVIDIA_DEV_ROOT=/`.

## Set the containerd configuration source

On **GKE 1.33 or later**, add this setting to the GPU Operator values file:

```yaml
toolkit:
  env:
    - name: RUNTIME_CONFIG_SOURCE
      value: file
```

This makes Toolkit read the containerd configuration file directly. It avoids a [known GKE issue](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/google-gke.html#prerequisites) that can cause Toolkit to misconfigure containerd and prevent Operator containers from starting. Apply this setting whether CDI is enabled or disabled, and preserve any other required `toolkit.env` entries.

## Allow critical-priority Pods

GKE requires a ResourceQuota to allow Pods with `system-node-critical` or `system-cluster-critical` priority in namespaces other than `kube-system`.

Before installing GPU Operator, create its namespace if it does not already exist:

```bash
kubectl create namespace gpu-operator
```

Save the following as `critical-pods-quota.yaml`:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: critical-pods
spec:
  hard:
    pods: "100"
  scopeSelector:
    matchExpressions:
      - operator: In
        scopeName: PriorityClass
        values:
          - system-node-critical
          - system-cluster-critical
```

Apply the quota to the Operator namespace:

```bash
kubectl apply -n gpu-operator -f critical-pods-quota.yaml
```

If installing HAMi outside `kube-system`, create its namespace and apply the same quota there before installation.

## Next steps

1. Follow the [GPU Operator installation guide](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/getting-started.html), using the values prepared above, and confirm that its components are ready.
2. If using CDI, complete the [NVIDIA CDI configuration](./configure-cdi.md) with the driver root and Toolkit path for your nodes.
3. Follow [Online Installation from Helm](./online-installation.md) to install HAMi with your values file and verify the installation.
