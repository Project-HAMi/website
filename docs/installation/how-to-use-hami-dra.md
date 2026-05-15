---
linktitle: HAMi DRA
title: HAMi DRA for Kubernetes
translated: true
---

## Introduction

HAMi has provided support for K8s [DRA](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/) (Dynamic Resource Allocation).
The [HAMi DRA webhook](https://github.com/Project-HAMi/HAMi-DRA) is a Kubernetes mutating webhook that automatically converts GPU device resource requests into DRA ResourceClaims, enabling dynamic resource allocation for GPU workloads. It provides a consistent user experience in DRA mode that matches traditional DevicePlugin usage.

## Features

- **Automatic Resource Conversion**: Converts GPU resource requests to ResourceClaims
- **Resource Cleanup**: Automatically removes GPU resources from Pod specs and creates corresponding ResourceClaims
- **Annotation Support**: Supports device selection via Pod annotations (UUID, device type)
- **Metrics Monitoring**: Optional monitor component that collects and exposes GPU resource metrics via Prometheus

## Prerequisites

- Kubernetes version >= 1.34 with DRA Consumable Capacity [featuregate](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/) enabled
- [CDI](https://github.com/cncf-tags/container-device-interface?tab=readme-ov-file#how-to-configure-cdi) must be enabled in the underlying container runtime (such as containerd or CRI-O)
- NVIDIA GPU Driver 440 or later

## Installation

### 1. Install cert-manager

The HAMi DRA webhook requires [cert-manager](https://cert-manager.io/docs/installation/) for TLS certificates. Install it first:

```bash
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

### 2. Add the HAMi-DRA Helm repository

```bash
helm repo add hami-dra https://project-hami.github.io/HAMi-DRA
helm repo update
```

### 3. Install HAMi-DRA

```bash
helm install hami-dra hami-dra/hami-dra
```

If you are not using GPU Operator provided containerd drivers (i.e., the GPU driver is pre-installed on the host), add the `--set` flag:

```bash
helm install hami-dra hami-dra/hami-dra \
  --set drivers.nvidia.containerDriver=false
```

### Upgrade

To upgrade to the latest version in the future:

```bash
helm repo update
helm upgrade hami-dra hami-dra/hami-dra
```

### Verify installation

Check that all pods are running:

```bash
$ kubectl get pods -n hami-system
NAME                                     READY   STATUS    RESTARTS   AGE
hami-dra-driver-kubelet-plugin-bzkr4     1/1     Running   0          73m
hami-hami-dra-monitor-7b484d5f95-bxx6z   1/1     Running   0          74m
hami-hami-dra-webhook-64bfdc6b86-fnwtp   1/1     Running   0          74m
```

Check that GPU devices are published as ResourceSlices:

```bash
$ kubectl get resourceslices
NAME                                             NODE         DRIVER                          POOL         AGE
ecs-a10-sh-hami-core-gpu.project-hami.io-nnxrv   ecs-a10-sh   hami-core-gpu.project-hami.io   ecs-a10-sh   73m
```

## Configuration

### Device Resources

Configure device resource names via `--set` flags or a custom `values.yaml`. The default resource names are:

```yaml
resourceName: "nvidia.com/gpu"
resourceMem: "nvidia.com/gpumem"
resourceCores: "nvidia.com/gpucores"
```

### Monitor Component

The monitor component is optional and collects GPU resource metrics via Prometheus. It is enabled by default.

To expose the monitor service via NodePort:

```yaml
monitor:
  enabled: true
  service:
    type: NodePort
    nodePort:
      metrics: 31995
```

Access metrics:

```bash
curl http://<node-ip>:31995/metrics
```

For detailed monitor configuration, metrics reference, and Prometheus integration, see [HAMi DRA Monitor documentation](https://github.com/Project-HAMi/HAMi-DRA/blob/main/docs/MONITOR.md).

## Supported Devices

The implementation of DRA functionality requires support from the corresponding device's DRA Driver. Currently supported devices include:

- [NVIDIA GPU](../userguide/nvidia-device/dynamic-resource-allocation)

Please refer to the corresponding page to install the device driver.

## Usage

HAMi DRA supports two usage modes: **DRA native mode** and **DevicePlugin-compatible mode**.

### DRA native mode

Create a ResourceClaim to request a GPU with specific cores and memory:

```yaml
apiVersion: resource.k8s.io/v1
kind: ResourceClaim
metadata:
  name: gpu-half-claim
spec:
  devices:
    requests:
    - name: gpu
      exactly:
        deviceClassName: hami-core-gpu.project-hami.io
        allocationMode: ExactCount
        count: 1
        capacity:
          requests:
            cores: 50
            memory: "10Gi"
```

Then reference it in a Pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test-dra
spec:
  containers:
  - name: cuda
    image: nvidia/cuda:13.0.1-base-ubi9
    command: ["sleep", "3600"]
    resources:
      claims:
      - name: gpu
  resourceClaims:
  - name: gpu
    resourceClaimName: gpu-half-claim
  restartPolicy: Never
```

### DevicePlugin-compatible mode

The HAMi DRA webhook automatically converts DevicePlugin-style resource requests into DRA ResourceClaims. Use the same resource syntax as the traditional mode:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test-compatible
spec:
  containers:
  - name: cuda
    image: nvidia/cuda:13.0.1-base-ubi9
    command: ["sleep", "3600"]
    resources:
      limits:
        nvidia.com/gpu: 1
        nvidia.com/gpumem: 10240
        nvidia.com/gpucores: 50
  restartPolicy: Never
```

## Monitoring

HAMi DRA provides the same monitoring capabilities as the traditional model. When installing HAMi DRA, the monitoring service will be enabled by default. You can expose the monitoring service via NodePort or add Prometheus scraping to access monitoring metrics.

You can view the monitoring metrics provided by HAMi DRA on the [Device Allocation Monitoring page](../userguide/monitoring/device-allocation).

For more information, please refer to [HAMi DRA Monitor](https://github.com/Project-HAMi/HAMi-DRA/blob/main/docs/MONITOR.md).
