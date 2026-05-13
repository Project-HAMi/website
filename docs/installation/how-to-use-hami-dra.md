---
linktitle: HAMi DRA
title: HAMi DRA for Kubernetes
translated: true
---

## Introduction

HAMi has provided support for K8s [DRA](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/) (Dynamic Resource Allocation).
By installing the [HAMi DRA webhook](https://github.com/Project-HAMi/HAMi-DRA) in your cluster, you can get a consistent user experience in DRA mode that matches the traditional usage.

## Prerequisites

- Kubernetes version >= 1.34 with DRA Consumable Capacity [featuregate](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/) enabled
- [CDI](https://github.com/cncf-tags/container-device-interface?tab=readme-ov-file#how-to-configure-cdi) must be enabled in the underlying container runtime (such as containerd or CRI-O)

## Installation

The HAMi DRA webhook requires cert-manager for TLS certificates. Install it first:

```bash
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --set crds.enabled=true
```

Add the HAMi chart repository and update:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
```

Then install HAMi with DRA enabled:

```bash
helm -n hami-system install hami hami-charts/hami \
  --set dra.enabled=true \
  --create-namespace
# If the GPU driver is pre-installed on the host (not managed by GPU Operator), add `--set hami-dra.drivers.nvidia.containerDriver=false`.
```

:::note

DRA mode is not compatible with traditional mode. Do not enable both at the same time.

:::

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

## Supported Devices

The implementation of DRA functionality requires support from the corresponding device's DRA Driver. Currently supported devices include:

- [NVIDIA GPU](../userguide/nvidia-device/dynamic-resource-allocation)

Please refer to the corresponding page to install the device driver.

## Usage

HAMi DRA supports two usage modes: **DRA native mode** and **DevicePlugin-compatible mode**.

### DRA native mode

Create a ResourceClaim to request GPU with specific cores and memory:

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

HAMi DRA provides the same monitoring capabilities as the traditional model. When installing HAMi DRA, the monitoring service will be enabled by default. You can expose the monitoring service to the local environment via NodePort or add Prometheus collection to access monitoring metrics.

You can view the monitoring metrics provided by HAMi DRA on the [Device Allocation Monitoring page](../userguide/monitoring/device-allocation).

For more information, please refer to [HAMi DRA monitor](https://github.com/Project-HAMi/HAMi-DRA/blob/main/docs/MONITOR.md)
