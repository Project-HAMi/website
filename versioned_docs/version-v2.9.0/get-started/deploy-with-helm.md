---
title: Quick Start
sidebar_label: Get Started
translated: true
---

Get HAMi up and running in minutes by deploying the Helm chart and submitting your first shared GPU workload.

## Prerequisites {#prerequisites}

Before deploying HAMi, ensure your GPU nodes meet the following prerequisites:

- [Helm](https://helm.sh/docs/) v3+
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) v1.23+
- [CUDA](https://developer.nvidia.com/cuda-toolkit) v10.2+
- [NVIDIA Driver](https://www.nvidia.cn/drivers/unix/) v440+
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) (with `nvidia-container-runtime` configured as the container runtime)

---

## 1. Label your nodes {#label-your-nodes}

Label the target GPU nodes with `gpu=on`. Nodes without this label will not be managed by HAMi:

```bash
kubectl label nodes <node-name> gpu=on
```

---

## 2. Deploy HAMi using Helm {#deploy-hami-using-helm}

Add the official HAMi Helm repository and deploy the chart:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
helm install hami hami-charts/hami -n kube-system
```

Verify that the `hami-scheduler` and `hami-device-plugin` pods are running:

```bash
kubectl get pods -n kube-system | grep hami
```

---

## 3. Submit a vGPU Workload {#submit-a-vgpu-workload}

Create a Pod requesting 1 vGPU with 10240 MiB of GPU memory limit:

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
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 10240
```

Apply the manifest and wait for the Pod to become ready:

```bash
kubectl apply -f gpu-pod.yaml
kubectl wait --for=condition=Ready pod/gpu-pod --timeout=120s
```

---

## 4. Verify GPU Memory Isolation {#verify-gpu-memory-isolation}

Execute `nvidia-smi` inside the running container:

```bash
kubectl exec -it gpu-pod -- nvidia-smi
```

Expected output showing HAMi-core hard memory limit (`10240MiB`):

```text
[HAMI-core Msg]: Initializing.....
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 550.54.15              Driver Version: 550.54.15      CUDA Version: 12.4     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|=========================================+========================+======================|
|   0  Tesla V100-PCIE-32GB           On  |   00000000:3E:00.0 Off |                    0 |
| N/A   29C    P0             24W /  250W |       0MiB /  10240MiB |      0%      Default |
+-----------------------------------------------------------------------------------------+
```

---

## Cleanup {#cleanup}

Delete the test Pod:

```bash
kubectl delete pod gpu-pod
```
