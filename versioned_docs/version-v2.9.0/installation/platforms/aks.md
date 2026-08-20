---
title: HAMi on Microsoft Azure (AKS)
sidebar_label: Microsoft Azure (AKS)
---

This guide provides step-by-step instructions for deploying and running HAMi on **Azure Kubernetes Service (AKS)** to enable GPU sharing and resource virtualization across NVIDIA GPU node pools.

## Overview

Azure Kubernetes Service offers several GPU-enabled VM series (such as the `NCv3`, `NCasT4_v3`, `NVadsA10_v5`, and `NDv4` families). By default, Kubernetes assigns whole physical GPUs to single containers. HAMi allows multiple pods to share the same physical GPU with fine-grained memory and compute core isolation on AKS.

## Prerequisites

Before deploying HAMi on AKS, ensure you have:

- **Azure CLI (`az`)**: Installed and authenticated (`az login`).
- **`kubectl`** and **`helm` (v3.0+)**: Installed locally.
- An existing AKS cluster with a GPU-enabled node pool (or follow the steps below to create one).
- Kubernetes server version `>= 1.23`.

## Step 1: Create a GPU Node Pool in AKS

If your cluster does not yet have GPU nodes, add a GPU node pool using the Azure CLI. 

For example, to create a node pool with NVIDIA V100 GPUs (`Standard_NC6s_v3`):

```bash
az aks nodepool add \
  --resource-group <MY_RESOURCE_GROUP> \
  --cluster-name <MY_AKS_CLUSTER> \
  --name gpunodes \
  --node-count 2 \
  --node-vm-size Standard_NC6s_v3 \
  --node-taints sku=gpu:NoSchedule \
  --labels gpu=on
```

:::note
Common Azure GPU VM sizes include:
- `Standard_NC6s_v3` (1x NVIDIA Tesla V100 16GB)
- `Standard_NC4as_T4_v3` (1x NVIDIA Tesla T4 16GB)
- `Standard_NV6ads_A10_v5` (1x NVIDIA A10 24GB)
- `Standard_ND96amsr_A100_v4` (8x NVIDIA A100 80GB)
:::

### Label Your Nodes

HAMi monitors and schedules workloads only on nodes with the label `gpu=on`. If your node pool was created without this label, add it manually:

```bash
kubectl label nodes <node-name> gpu=on
```

### Install NVIDIA Drivers

Ensure NVIDIA drivers are installed on the GPU nodes. You can either:
- Use AKS automated GPU driver provisioning (`--enable-gpu-driver-daemonset` on supported Azure Linux / Ubuntu images).
- Or install the [NVIDIA GPU Operator](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/index.html) with driver installation enabled.

## Step 2: Prevent Device Plugin Conflicts

AKS clusters may automatically deploy the default NVIDIA Kubernetes Device Plugin (`nvidia-device-plugin-daemonset`).

If both the default NVIDIA device plugin and HAMi's device plugin run simultaneously, both will attempt to register `nvidia.com/gpu` with the kubelet, causing double-registration conflicts.

1. Check if the default NVIDIA device plugin DaemonSet is running:

   ```bash
   kubectl get ds -n kube-system -l app=nvidia-device-plugin-daemonset
   ```

1. If present, disable or remove the default DaemonSet so that HAMi can act as the sole GPU resource registrar:

   ```bash
   kubectl delete ds <daemonset-name> -n kube-system
   ```

## Step 3: Install HAMi via Helm

### Add the HAMi Helm Repository

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
```

### Identify Your Kubernetes Version

Get your AKS cluster Kubernetes version:

```bash
kubectl version --short
```

### Create AKS Custom Values

Create a file named `custom-aks-values.yaml`. Make sure to configure the `tolerations` matching your AKS GPU node taints (`sku=gpu:NoSchedule`), set `scheduler.kubeScheduler.image.tag` to match your cluster version, and optionally enable scheduler High Availability:

```yaml
scheduler:
  leaderElect: true
  replicaCount: 2
  kubeScheduler:
    image:
      # Set tag to match your AKS Kubernetes server version (e.g. v1.29.0)
      tag: "v1.29.0"

devicePlugin:
  tolerations:
    - key: "sku"
      operator: "Equal"
      value: "gpu"
      effect: "NoSchedule"
    - key: "nvidia.com/gpu"
      operator: "Exists"
      effect: "NoSchedule"
```

### Deploy the Chart

Deploy HAMi to the `kube-system` namespace:

```bash
helm install hami hami-charts/hami \
  -f custom-aks-values.yaml \
  -n kube-system
```

## Step 4: Verify Your Installation

### 1. Verify Pod Status

Check that the HAMi scheduler and device plugin pods are in `Running` state:

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/name=hami
```

Expected output:

```text
NAME                                  READY   STATUS    RESTARTS   AGE
hami-device-plugin-xxxxx              1/1     Running   0          2m
hami-device-plugin-yyyyy              1/1     Running   0          2m
hami-scheduler-6d8b97bc49-abcde       1/1     Running   0          2m
hami-scheduler-6d8b97bc49-fghij       1/1     Running   0          2m
```

### 2. Verify Node Extended Resources

Check that your GPU node advertises HAMi virtual GPU resources (`nvidia.com/gpumem` and `nvidia.com/gpucores`):

```bash
kubectl describe node <gpu-node-name> | grep -E "(nvidia.com/gpu|nvidia.com/gpumem|nvidia.com/gpucores):"
```

Expected output shows `nvidia.com/gpu`, `nvidia.com/gpumem` (in MiB), and `nvidia.com/gpucores` (percentage):

```text
 nvidia.com/gpu:        1
 nvidia.com/gpumem:     16280
 nvidia.com/gpucores:   100
```

## Step 5: Run a Smoke Test Workload

Submit a test Pod that requests a fraction of the GPU memory (e.g., 4000 MiB) and 40% of GPU compute cores:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: aks-gpu-test
spec:
  restartPolicy: OnFailure
  tolerations:
    - key: "sku"
      operator: "Equal"
      value: "gpu"
      effect: "NoSchedule"
  containers:
    - name: cuda-test
      image: nvidia/cuda:12.2.0-base-ubuntu22.04
      command: ["nvidia-smi"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 4000
          nvidia.com/gpucores: 40
```

Apply the pod manifest and inspect logs:

```bash
kubectl apply -f aks-gpu-test.yaml
kubectl logs aks-gpu-test
```

## AKS-Specific Gotchas & Troubleshooting

- **Node Taint Mismatches**: If `hami-device-plugin` pods remain in `Pending` state, check your GPU node taints (`kubectl describe node <node-name>`) and ensure all taints are present in `devicePlugin.tolerations` within `values.yaml`.
- **Node Auto-scaling**: If you enable the AKS Cluster Autoscaler on GPU node pools, new nodes will automatically receive the node labels and taints defined during node pool creation. Ensure `gpu=on` is set on the nodepool configuration.
- **Image Pull Issues**: If your AKS cluster is in a restricted or private virtual network, consider mirroring HAMi container images to an Azure Container Registry (ACR) and configuring `image.repository` in `values.yaml`.
