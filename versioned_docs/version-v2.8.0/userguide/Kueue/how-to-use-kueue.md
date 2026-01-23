---
title: How to use kueue on HAMi
---

# Using Kueue with HAMi

This guide will help you use Kueue to manage HAMi vGPU resources, including enabling Deployment support, configuring ResourceTransformation, and creating workloads that request vGPU resources.

## Prerequisites

Before you begin, ensure that:

- HAMi is installed in your cluster
- Kueue is installed in your cluster

## Quick Start

### Install Kueue

If Kueue is not already installed, you can install it using:

```bash
kubectl apply --server-side -f https://github.com/kubernetes-sigs/kueue/releases/download/v0.15.0/manifests.yaml
```

After installation, Kueue controllers will run in the `kueue-system` namespace.

## Enable Deployment Support in Kueue

Kueue supports managing Deployments, but you need to enable the `deployment` integration in the Kueue configuration.

### Configure Kueue

Edit the Kueue manager configuration to enable Deployment support:

```bash
kubectl edit configmap kueue-manager-config -n kueue-system
```

Add the following configuration:

```yaml
apiVersion: config.kueue.x-k8s.io/v1beta2
kind: Configuration
integrations:
  frameworks:
    - "deployment"
    - "pod"
```

:::note

Starting from Kueue v0.15, you don't need to explicitly enable the `"pod"` integration to use `"deployment"` integration. For Kueue v0.14 and earlier versions, you need to explicitly enable the `"pod"` integration.

:::

After updating the configuration, restart the Kueue manager:

```bash
kubectl rollout restart deployment kueue-manager -n kueue-system
```

## Configure ResourceTransformation

ResourceTransformation allows Kueue to transform resource requests from one form to another. For HAMi vGPU resources, this enables Kueue to track GPU resources using aggregated metrics like `nvidia.com/total-gpucores` and `nvidia.com/total-gpumem` instead of individual `nvidia.com/gpu` requests.

Edit the Kueue manager configuration to add ResourceTransformation:

```bash
kubectl edit configmap kueue-manager-config -n kueue-system
```

Add the ResourceTransformation configuration to the same Configuration object:

```yaml
apiVersion: config.kueue.x-k8s.io/v1beta2
kind: Configuration
integrations:
  frameworks:
    - "deployment"
    - "pod"
resources:
  transformations:
  - input: nvidia.com/gpucores
    strategy: Replace
    multiplyBy: nvidia.com/gpu
    outputs:
      nvidia.com/total-gpucores: "1"
  - input: nvidia.com/gpumem
    strategy: Replace
    multiplyBy: nvidia.com/gpu
    outputs:
      nvidia.com/total-gpumem: "1"
```

After updating the configuration, restart the Kueue manager:

```bash
kubectl rollout restart deployment kueue-manager -n kueue-system
```

### Create ResourceFlavor

First, create a ResourceFlavor:

```yaml
apiVersion: kueue.x-k8s.io/v1beta2
kind: ResourceFlavor
metadata:
  name: hami-flavor
spec:
  nodeLabels:
    gpu: "on"
```

This ResourceFlavor will only apply to nodes with vGPU functionality enabled.

### Create ClusterQueue

Create a ClusterQueue to track HAMi resources:

```yaml
apiVersion: kueue.x-k8s.io/v1beta2
kind: ClusterQueue
metadata:
  name: hami-queue
spec:
  resourceGroups:
    - coveredResources: ["nvidia.com/gpu", "nvidia.com/total-gpucores", "nvidia.com/total-gpumem"]
      flavors:
        - name: hami-flavor
          resources:
            - name: "nvidia.com/gpu"
              nominalQuota: 80
            - name: "nvidia.com/total-gpucores"
              nominalQuota: 200
            - name: "nvidia.com/total-gpumem"
              nominalQuota: 10240
```

The ClusterQueue tracks:
- `nvidia.com/total-gpucores`: Total GPU cores across all vGPUs (each unit represents 1% of a GPU core)
- `nvidia.com/total-gpumem`: Total GPU memory across all vGPUs (in MiB)

### Create LocalQueue

Create a LocalQueue that references the ClusterQueue:

```yaml
apiVersion: kueue.x-k8s.io/v1beta2
kind: LocalQueue
metadata:
  name: hami-local-queue
  namespace: default
spec:
  clusterQueue: hami-queue
```

## Create Workloads Requesting vGPU Resources

Now you can create Deployments that request vGPU resources. Kueue will automatically transform the resource requests using ResourceTransformation.

### Basic vGPU Deployment

Here's an example Deployment that requests vGPU resources:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vgpu-deployment
  labels:
    app: vgpu-app
    kueue.x-k8s.io/queue-name: hami-local-queue
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vgpu-app
  template:
    metadata:
      labels:
        app: vgpu-app
    spec:
      containers:
        - name: vgpu-container
          image: nvidia/cuda:11.8.0-base-ubuntu22.04
          command: ["sleep", "infinity"]
          resources:
            limits:
              nvidia.com/gpu: 1
              nvidia.com/gpucores: 50
              nvidia.com/gpumem: 1024
```

In this example:
- `kueue.x-k8s.io/queue-name` label associates the Deployment with the `hami-local-queue`
- `nvidia.com/gpu: 1` requests 1 vGPU
- `nvidia.com/gpucores: 50` requests 50% of GPU cores for each vGPU
- `nvidia.com/gpumem: 1024` requests 1024 MiB of GPU memory for each vGPU

### Deployment with Multiple vGPUs

You can also create a Deployment that requests multiple vGPUs:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-vgpu-deployment
  labels:
    app: multi-vgpu-app
    kueue.x-k8s.io/queue-name: hami-local-queue
spec:
  replicas: 1
  selector:
    matchLabels:
      app: multi-vgpu-app
  template:
    metadata:
      labels:
        app: multi-vgpu-app
    spec:
      containers:
        - name: vgpu-container
          image: nvidia/cuda:11.8.0-base-ubuntu22.04
          command: ["sleep", "infinity"]
          resources:
            limits:
              nvidia.com/gpu: 2
              nvidia.com/gpucores: 30
              nvidia.com/gpumem: 1024
```

This Deployment requests 2 vGPUs, each with 30% GPU cores and 1024 MiB GPU memory.

## Verify Resource Usage

To check the resource usage in the ClusterQueue, inspect the `status.flavorsReservation` field:

```bash
kubectl get clusterqueue hami-queue -o yaml
```

The `status.flavorsReservation` shows the current resource consumption:

```yaml
status:
  flavorsReservation:
  - name: hami-flavor
    resources:
    - name: nvidia.com/total-gpucores
      total: "160"  # Current usage: (2 replicas × 1 GPU × 50 cores) + (1 replica × 2 GPUs × 30 cores) = 160
    - name: nvidia.com/total-gpumem
      total: "4096"  # Current usage: (2 replicas × 1 GPU × 1024 MiB) + (1 replica × 2 GPUs × 1024 MiB) = 4096
```

## Resource Transformation Details

Kueue's ResourceTransformation automatically converts HAMi vGPU resource requests:

- `nvidia.com/gpu` × `nvidia.com/gpucores` → `nvidia.com/total-gpucores`
- `nvidia.com/gpu` × `nvidia.com/gpumem` → `nvidia.com/total-gpumem`

For example:
- A Deployment with 2 replicas, each requesting `nvidia.com/gpu: 1`, `nvidia.com/gpucores: 50`, and `nvidia.com/gpumem: 1024`
- Will consume: `nvidia.com/total-gpucores: 100` (2 replicas × 1 GPU × 50 cores) and `nvidia.com/total-gpumem: 2048` (2 replicas × 1 GPU × 1024 MiB)

## Example

See the [example file](./examples/defalt_use.md) for a complete working example.
