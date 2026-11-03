---
title: Install HAMi on Azure Kubernetes Service
sidebar_label: HAMi on AKS
description: Install HAMi on a driver-only NVIDIA GPU node pool in Azure Kubernetes Service, then verify vGPU scheduling.
---

This guide covers the AKS-specific configuration for installing classic HAMi on a Linux NVIDIA GPU node pool where AKS installs the driver and HAMi is the only device plugin. It requires HAMi 2.10.0 or later. GPU Operator, Windows node pools, and Node Auto Provisioning are not covered.

Start with [Prerequisites](./prerequisites.md) for the shared node requirements. Apply the settings below before following [Online Installation from Helm](./online-installation.md). For CDI configuration, see [NVIDIA CDI support](./configure-cdi.md).

:::note Limitations

AKS manages the `namespaceSelector` of the HAMi webhook and excludes control-plane and AKS-managed namespaces, so HAMi does not mutate Pods there. This guide sets `manageNamespaceSelector: false` to avoid Helm ownership conflicts ([HAMi issue #2039](https://github.com/Project-HAMi/HAMi/issues/2039)). As a result, the chart's namespace-level `hami.io/webhook: ignore` label and `whitelistNamespaces` do not apply. Use the per-Pod `hami.io/webhook: ignore` label instead.

:::

## Create a driver-only GPU node pool

AKS calls this a **driver-only** setup: AKS installs the NVIDIA driver, and you own the Kubernetes device plugin. Select an [AKS-supported NVIDIA GPU VM size](https://learn.microsoft.com/azure/aks/use-nvidia-gpu#supported-gpu-enabled-vms) with quota in your region. The example uses `Standard_NC4as_T4_v3`.

:::warning Do not use the AKS full managed GPU stack

The full managed GPU profile installs an NVIDIA device plugin that advertises `nvidia.com/gpu`, the same resource HAMi's device plugin registers. Do not run both on the same nodes. The GPU management mode, driver choice, and MIG strategy cannot be changed after node-pool creation. If `gpuProfile.nvidia.managementMode` is `Managed`, create a replacement driver-only node pool.

:::

Use a current Azure CLI. See [Before you begin](https://learn.microsoft.com/azure/aks/aks-managed-gpu-nodes?tabs=add-ubuntu-gpu-node-pool%2Cmig-single%2Cdriver-only#before-you-begin) for the required `az` version.

Create a dedicated user node pool. The `gpu=on` label is HAMi's node selector and is reapplied by AKS to nodes created during scale-out, reimage, and node-image upgrade:

```bash
az aks nodepool add \
  --resource-group <resource-group> \
  --cluster-name <aks-cluster> \
  --name gpunp \
  --mode User \
  --node-count 1 \
  --node-vm-size Standard_NC4as_T4_v3 \
  --os-sku Ubuntu \
  --node-osdisk-type Managed \
  --labels gpu=on \
  --node-taints sku=gpu:NoSchedule \
  --gpu-driver Install \
  --enable-managed-gpu=false
```

`--gpu-driver Install` and `--enable-managed-gpu=false` select the driver-only profile. Reserve the `gpu=on` label for HAMi-owned pools. Older Azure CLI versions can omit `managementMode` from `az aks nodepool show`, so read the profile from the ARM response:

```bash
az rest --method get \
  --url "https://management.azure.com$(az aks nodepool show \
    --resource-group <resource-group> --cluster-name <aks-cluster> \
    --name gpunp --query id --output tsv)?api-version=2026-01-02-preview" \
  --query properties.gpuProfile --output yaml
```

The driver must be `Install`, and `managementMode` must be empty or `Unmanaged`.

Confirm that no other plugin owns the node. Both values must be empty:

```bash
kubectl get node <gpu-node> \
  -o jsonpath='{.status.allocatable.nvidia\.com/gpu}{"\n"}{.metadata.labels.kubernetes\.azure\.com/dcgm-exporter}{"\n"}'
```

A value in the first line means a device plugin already advertises `nvidia.com/gpu`. `enabled` in the second line indicates the full managed stack. The AKS managed plugin might not appear in `kubectl get daemonsets`, so do not rely on that check alone.

## Configure the HAMi Helm values

Save the following as `aks-values.yaml`:

```yaml
scheduler:
  admissionWebhook:
    manageNamespaceSelector: false

devicePlugin:
  nvidiaDriverRoot: "/"
  nvidiaNodeSelector:
    kubernetes.azure.com/agentpool: gpunp
  tolerations:
    - key: sku
      operator: Equal
      value: gpu
      effect: NoSchedule
    - key: nvidia.com/gpu
      operator: Exists
      effect: NoSchedule
```

- `manageNamespaceSelector: false` lets AKS own the webhook `namespaceSelector` and avoids Helm server-side apply conflicts. See the limitations above.
- `nvidiaDriverRoot: "/"` uses the driver installed on the node host.
- `nvidiaNodeSelector` limits HAMi's device plugin to the dedicated pool.
- `tolerations` replaces the chart's empty default and covers the AKS `sku=gpu` taint plus the `nvidia.com/gpu` taint used by some node images.

Install the chart with this file, and reuse it for every `helm upgrade`:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update hami-charts
helm upgrade --install hami hami-charts/hami \
  --namespace kube-system \
  --version 2.10.0 \
  --values aks-values.yaml \
  --wait
```

## Verify the installation

Check that HAMi registered the GPU and advertises logical slots. With the default `devicePlugin.deviceSplitCount: 10`, a one-GPU node reports ten `nvidia.com/gpu` slots:

```bash
kubectl get node <gpu-node> \
  -o jsonpath='{.metadata.annotations.hami\.io/node-nvidia-register}{"\n"}{.status.allocatable.nvidia\.com/gpu}{"\n"}'
```

AKS adds exclusions to the live webhook `namespaceSelector` for control-plane and AKS-managed namespaces, and HAMi does not mutate Pods there. Run HAMi workloads in an application namespace that the live selector permits:

```bash
kubectl get mutatingwebhookconfiguration hami-webhook \
  -o jsonpath='{.webhooks[0].namespaceSelector}{"\n"}'
```

Run a Pod that requests 2048 MiB of GPU memory and tolerates the pool taint:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hami-vgpu-test
  namespace: <app-namespace>
spec:
  restartPolicy: Never
  nodeSelector:
    kubernetes.azure.com/agentpool: gpunp
  tolerations:
    - key: sku
      operator: Equal
      value: gpu
      effect: NoSchedule
  containers:
    - name: cuda
      image: nvcr.io/nvidia/cuda:12.4.1-base-ubuntu22.04
      command: ["sleep", "3600"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 2048
          nvidia.com/gpucores: 20
```

`kubectl get pod hami-vgpu-test -n <app-namespace> -o jsonpath='{.spec.schedulerName}'` must print `hami-scheduler`, and `kubectl exec -n <app-namespace> hami-vgpu-test -- nvidia-smi --query-gpu=name,memory.total --format=csv,noheader` must report 2048 MiB instead of the physical memory. A Running Pod is not enough: the webhook failure policy is `Ignore`, so a webhook connectivity failure creates the Pod without HAMi's scheduler. For the full memory-limit test, see [Validate HAMi setup and vGPU behavior](../get-started/verify-hami.md). Delete the test Pod afterwards.

HAMi-core provides CUDA and NVML software-level isolation. It is not a hardware boundary like MIG and should not isolate mutually untrusted tenants.

## Node lifecycle

AKS replaces nodes during scale-out, reimage, repair, and node-image upgrades, so do not install packages or edit containerd over SSH. After any node-pool lifecycle operation, check that every node in the pool is Ready, runs a `hami-device-plugin` Pod, and has a nonempty `hami.io/node-nvidia-register` annotation before it accepts workloads.

## Autoscaling

Use a fixed-size pool. HAMi's `nvidia.com/gpu` is a logical slot count, `nvidia.com/gpumem` and `nvidia.com/gpucores` are not published in node `Capacity` or `Allocatable`, and the upstream Cluster Autoscaler does not call HAMi's scheduler extender when it simulates scale-up. Size HAMi GPU pools manually, or validate a workload-specific design before production use.

## GPU Operator, MIG, and DRA

- **GPU Operator:** The procedure above does not use it. If you need it, follow the [AKS GPU Operator guide](https://learn.microsoft.com/azure/aks/nvidia-gpu-operator) on a separate pool created with `--gpu-driver None`, set `devicePlugin.enabled=false` in the Operator values, and make its operands tolerate the `sku=gpu` taint. HAMi's device plugin runs only on nodes that match `devicePlugin.nvidiaNodeSelector`, so to serve that pool, label its nodes and set the selector to a label both pools share, such as `gpu: "on"`. Otherwise the pool has no device plugin and advertises no `nvidia.com/gpu` slots. The Operator enables CDI by default, so also follow [NVIDIA CDI support](./configure-cdi.md) and check the driver root and `nvidia-ctk` path on the actual node.
- **MIG:** AKS-managed MIG sets the profile and resource publication at pool creation. Do not combine it with HAMi dynamic MIG unless you have validated that combination.
- **DRA:** HAMi-DRA is a separate model. Do not install it with classic HAMi on the same GPUs. See [HAMi-DRA installation](./how-to-use-hami-dra.md).

## Troubleshooting

### The HAMi device-plugin Pod is Pending

The node must carry the `kubernetes.azure.com/agentpool=<node-pool>` label, where `<node-pool>` is your node pool name (`gpunp` in this guide). The Helm values must also configure the device plugin Pods to tolerate the `sku=gpu:NoSchedule` taint. Check the node labels and taints with `kubectl describe node <gpu-node>`.

### Node-pool creation reports `OverconstrainedAllocationRequest`

Azure could not place the requested region, VM size, disk type, and networking combination. This is not a HAMi error. The command above uses `--node-osdisk-type Managed` so that ephemeral-disk capacity is not an extra constraint. Choose another AKS-supported GPU VM size or region with quota and capacity.

### The device plugin cannot discover NVML devices

Read the device plugin logs with `kubectl logs -n kube-system -l app.kubernetes.io/component=hami-device-plugin --all-containers`. For this driver-only path, keep `nvidiaDriverRoot: "/"` and do not copy GPU Operator paths into it.

### Helm upgrade reports a `namespaceSelector` ownership conflict

Use HAMi 2.10.0 or later and set `scheduler.admissionWebhook.manageNamespaceSelector: false`. Confirm the applied value with `helm get values hami -n kube-system`.

### More than one device plugin is present

Competing plugins cannot share nodes. Find the source: the AKS full managed profile (`managementMode` is `Managed`, so replace the node pool), GPU Operator (disable its `devicePlugin` operand), or a manual DaemonSet.

## Uninstall

Delete or drain GPU workloads first, then remove HAMi as described in the [uninstall guide](./uninstall.md):

```bash
helm uninstall hami --namespace kube-system
```

The driver-only pool has no device plugin after HAMi is removed. Install the standard NVIDIA device plugin before running GPU workloads on a retained pool, or delete the pool:

```bash
az aks nodepool delete \
  --resource-group <resource-group> \
  --cluster-name <aks-cluster> \
  --name gpunp
```

## References

- [Use GPUs on AKS](https://learn.microsoft.com/azure/aks/use-nvidia-gpu)
- [AKS-managed GPU node pools](https://learn.microsoft.com/azure/aks/aks-managed-gpu-nodes)
- [HAMi AKS webhook ownership issue](https://github.com/Project-HAMi/HAMi/issues/2039)
