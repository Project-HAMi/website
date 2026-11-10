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

Set HAMi's `devicePlugin.nvidiaDriverRoot=/` to use the host filesystem, where GPU device nodes are under `/dev`. For CDI, use `/home/kubernetes/bin/nvidia/toolkit/nvidia-ctk` as `devicePlugin.nvidiaHookPath` in the [CDI configuration](./configure-cdi.md#configure-the-helm-chart).

With CDI enabled, the Google driver installer layout works without an additional `nvidia-smi` symlink. If containers cannot access GPU devices after disabling Operator CDI, see [GPU devices missing with CDI disabled](#missing-gpu-devices-with-cdi-disabled).

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

If you install the HAMi chart in `kube-system`, no additional ResourceQuota is needed for HAMi. GKE requires this quota only for Pods with `system-node-critical` or `system-cluster-critical` priority in other namespaces.

GPU Operator still needs the quota if installed outside `kube-system`. For example, when installing it in `gpu-operator`, first create the namespace if it does not already exist:

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

## Troubleshooting

### GPU devices missing with CDI disabled {#missing-gpu-devices-with-cdi-disabled}

When using Google-installed drivers on GKE Ubuntu nodes, disabling GPU Operator CDI can leave containers without GPU devices and cause HAMi monitor to report `NVML: Driver Not Loaded`. Apply the following driver-path patch to resolve this issue.

Apply the [driver-path DaemonSet](/examples/gke-nvidia-driver-path.yaml). It creates the `/usr/bin/nvidia-smi` symlink on Ubuntu nodes labeled `gpu=on`, so GPU Operator can recognize the host driver:

```bash
kubectl apply -f https://project-hami.io/examples/gke-nvidia-driver-path.yaml
kubectl rollout status -n kube-system daemonset/gke-nvidia-driver-path
```

If GPU Operator and HAMi are already installed, restart their components to apply the fix. Replace `gpu-operator` and `hami-system` in the commands below with the namespaces where GPU Operator and HAMi are installed, respectively:

```bash
kubectl rollout restart -n gpu-operator daemonset/nvidia-container-toolkit-daemonset
kubectl rollout status -n gpu-operator daemonset/nvidia-container-toolkit-daemonset
kubectl rollout restart -n gpu-operator daemonset/nvidia-operator-validator
kubectl rollout restart -n hami-system daemonset/hami-device-plugin
kubectl rollout status -n hami-system daemonset/hami-device-plugin
```

Create a new GPU workload to verify device access and confirm that HAMi monitor starts normally. Keep the DaemonSet to apply the same fix to replacement nodes.

## Next steps

1. Follow the [GPU Operator installation guide for GKE](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.3/google-gke.html), using the values prepared above, and confirm that its components are ready.
2. If using CDI, complete the [NVIDIA CDI configuration](./configure-cdi.md) with the driver root and Toolkit path for your nodes.
3. Follow [Online Installation from Helm](./online-installation.md) to install HAMi with your values file and verify the installation.
