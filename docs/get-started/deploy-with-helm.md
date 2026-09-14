---
title: Deploy HAMi using Helm
sidebar_label: Deploy HAMi using Helm
---

This guide explains how to install HAMi with Helm, then uses an NVIDIA GPU example to run a Pod and check the GPU memory visible to the container.

## Prerequisites {#prerequisites}

- Meet the [cluster requirements](../installation/prerequisites.md#cluster-requirements), including Kubernetes, Helm, `kubectl`, and installation permissions.
- NVIDIA GPUs: prepare the nodes as described below. The driver must support the GPU model and the workload's CUDA version.
- Other devices: open the corresponding guide from the [device prerequisites directory](../installation/prerequisites.md#device-prerequisites) and configure the driver, container runtime, node labels, and other environment requirements. Then return to [Deploy HAMi using Helm](#deploy-hami-using-helm) below and install with the Helm parameters required by that device guide.

## Installation {#installation}

### Prepare NVIDIA GPU nodes {#configure-nvidia-container-toolkit}

Follow the [node preparation steps in Prerequisites](../installation/prerequisites.md#preparing-your-gpu-nodes) to install the NVIDIA driver and Container Toolkit through GPU Operator or on the host, and configure the container runtime.

Adjust the HAMi values from that page to match how the driver and Toolkit are managed, the RuntimeClass, and the device allocation strategy. Save them as `hami-nvidia-values.yaml` for the Helm installation command below.

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

Set `scheduler.kubeScheduler.image.tag` to match the server version. The example below uses Kubernetes v1.29.0. Add the parameters for your devices before running it:

- NVIDIA GPUs: add `--values hami-nvidia-values.yaml` to the command below to use the configuration file prepared earlier.
- Other devices: add the `--values` or `--set` parameters required by the corresponding device guide.

```bash
helm install hami hami-charts/hami -n kube-system \
  --set scheduler.kubeScheduler.image.tag=v1.29.0
```

Check that the `hami-scheduler` and the device plugin Pods for your devices are `Running` and `Ready`. NVIDIA Device Plugin Pod names contain `hami-device-plugin`:

```bash
kubectl get pods -n kube-system
```

## NVIDIA GPU example {#demo}

For other devices, see the [corresponding device guide](../installation/prerequisites.md#device-prerequisites) for resource names and verification steps.

### Submit demo task {#submit-demo-task}

The following Pod requests one vGPU with `nvidia.com/gpu` and sets its memory to 10240 MiB with `nvidia.com/gpumem`. Save the configuration as `gpu-pod.yaml`:

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
          nvidia.com/gpumem: 10240 # GPU memory per vGPU, in MiB (optional)
```

Create the Pod and wait for it to be ready:

```bash
kubectl apply -f gpu-pod.yaml
kubectl wait --for=condition=Ready pod/gpu-pod --timeout=120s
```

If the wait times out, check the Pod status and errors in `Events` to troubleshoot scheduling or container startup. Continue once the Pod is ready.

```bash
kubectl describe pod gpu-pod
```

### Check the GPU memory visible to the container {#verify-in-container-resource-control}

Run `nvidia-smi` in the container:

```bash
kubectl exec -it gpu-pod -- nvidia-smi
```

Check that the total memory in the `Memory-Usage` column matches the configured `10240MiB`. Example output is shown below; the GPU model, driver version, and timestamp depend on the environment:

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

Delete the sample Pod after verification:

```bash
kubectl delete pod gpu-pod
```

## Next steps

- [Validate HAMi](./verify-hami) - deeper validation including native GPU stack checks
- [Configure HAMi](../userguide/configure) - resource limits, scheduling policies, and more
- [Device Sharing](../key-features/device-sharing) - how GPU sharing works under the hood
