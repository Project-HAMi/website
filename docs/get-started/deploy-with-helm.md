---
title: Deploy HAMi using Helm
sidebar_label: Deploy HAMi using Helm
---

This guide prepares NVIDIA GPU nodes, installs HAMi with Helm, and verifies GPU memory limits with a sample Pod. For other devices, follow the corresponding [device guide](../installation/prerequisites.md#find-your-devices-prerequisites).

## Prerequisites {#prerequisites}

- Meet the [cluster requirements](../installation/prerequisites.md#cluster-requirements), including Kubernetes, Helm, `kubectl`, and installation permissions.
- Prepare the NVIDIA driver and Container Toolkit using [GPU Operator or host installation](../installation/prerequisites.md#preparing-your-gpu-nodes). The driver must support the GPU model and the workload's CUDA version.

## Installation {#installation}

### Prepare NVIDIA GPU nodes {#configure-nvidia-container-toolkit}

Follow [Prepare NVIDIA GPU nodes](../installation/prerequisites.md#preparing-your-gpu-nodes) to configure the driver, Toolkit, and container runtime. Choose the HAMi values for the driver and Toolkit management methods, RuntimeClass, and device allocation strategy in that guide. Save them as `hami-nvidia-values.yaml` for the Helm command below.

When using GPU Operator, disable its NVIDIA Device Plugin and complete the RuntimeClass and Toolkit readiness checks before installing HAMi. With GPU Operator 25.10+ and HAMi's `envvar` strategy, use the guide's `devicePlugin.runtimeClassName=nvidia` setting. For CDI, follow [Enable NVIDIA CDI support for HAMi](../installation/configure-cdi.md).

### Label NVIDIA GPU nodes {#label-your-nodes}

HAMi's NVIDIA Device Plugin uses the `gpu=on` node label by default. Add it to the nodes HAMi should manage:

```bash
kubectl label nodes <node-name> gpu=on
```

If `devicePlugin.nvidiaNodeSelector` is customized, use labels that match that selector.

### Deploy HAMi using Helm {#deploy-hami-using-helm}

Check the Kubernetes server version:

```bash
kubectl version
```

Add the Helm repository:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
```

Set `scheduler.kubeScheduler.image.tag` to match the server version. For example, for Kubernetes v1.29.0:

```bash
helm install hami hami-charts/hami -n kube-system \
  --values hami-nvidia-values.yaml \
  --set scheduler.kubeScheduler.image.tag=v1.29.0
```

Check that the `hami-device-plugin` and `hami-scheduler` Pods are `Running` and `Ready`:

```bash
kubectl get pods -n kube-system
```

## Demo {#demo}

### Submit demo task {#submit-demo-task}

Containers can now request NVIDIA vGPUs using the `nvidia.com/gpu` resource type.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 1 # Request 1 vGPU
          nvidia.com/gpumem: 10240 # Each vGPU provides 10240 MiB device memory (optional)
```

Wait for the pod to be ready:

```bash
kubectl wait --for=condition=Ready pod/gpu-pod --timeout=120s
```

### Verify container resource limits {#verify-in-container-resource-control}

Run the following command:

```bash
kubectl exec -it gpu-pod -- nvidia-smi
```

Expected output:

```text
[HAMI-core Msg(28:140561996502848:libvgpu.c:836)]: Initializing.....
Wed Apr 10 09:28:58 2024
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 550.54.15              Driver Version: 550.54.15      CUDA Version: 12.4     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  Tesla V100-PCIE-32GB           On  |   00000000:3E:00.0 Off |                    0 |
| N/A   29C    P0             24W /  250W |       0MiB /  10240MiB |      0%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+

+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI        PID   Type   Process name                              GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|  No running processes found                                                             |
+-----------------------------------------------------------------------------------------+
[HAMI-core Msg(28:140561996502848:multiprocess_memory_limit.c:434)]: Calling exit handler 28
```

## Cleanup

```bash
kubectl delete pod gpu-pod
```

## Next steps

- [Validate HAMi](./verify-hami) - deeper validation including native GPU stack checks
- [Configure HAMi](../userguide/configure) - resource limits, scheduling policies, and more
- [Device Sharing](../key-features/device-sharing) - how GPU sharing works under the hood
