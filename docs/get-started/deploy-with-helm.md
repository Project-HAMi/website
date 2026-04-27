---
title: Deploy HAMi using Helm
---

This guide covers:

- Configuring NVIDIA container runtime on each GPU node
- Deploying HAMi using Helm
- Launching a vGPU task
- Verifying container resource limits

## Prerequisites {#prerequisites}

- [Helm](https://helm.sh/zh/docs/) v3+
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) v1.16+
- [CUDA](https://developer.nvidia.com/cuda-toolkit) v10.2+
- [NVIDIA Driver](https://www.nvidia.cn/drivers/unix/) v440+

## Installation {#installation}

### 1. Configure nvidia-container-toolkit {#configure-nvidia-container-toolkit}

Perform the following steps on all GPU nodes.

This guide assumes that NVIDIA drivers and the `nvidia-container-toolkit` are already installed, and that `nvidia-container-runtime` is set as the default low-level runtime.

See [nvidia-container-toolkit installation guide](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html).

The following example applies to Debian-based systems using Docker or containerd:

#### Install the `nvidia-container-toolkit` {#install-the-nvidia-container-toolkit}

```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
  | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list \
  | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
  | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
```

#### Configure Docker {#configure-docker}

When running Kubernetes with Docker, edit the configuration file (usually `/etc/docker/daemon.json`) to set `nvidia-container-runtime` as the default runtime:

```json
{
  "default-runtime": "nvidia",
  "runtimes": {
    "nvidia": {
      "path": "/usr/bin/nvidia-container-runtime",
      "runtimeArgs": []
    }
  }
}
```

Restart Docker:

```bash
sudo systemctl daemon-reload && systemctl restart docker
```

#### Configure containerd {#configure-containerd}

When using Kubernetes with containerd, modify the configuration file (usually `/etc/containerd/config.toml`) to set `nvidia-container-runtime` as the default runtime:

```toml
version = 2
[plugins]
  [plugins."io.containerd.grpc.v1.cri"]
    [plugins."io.containerd.grpc.v1.cri".containerd]
      default_runtime_name = "nvidia"

      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]
        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.nvidia]
          privileged_without_host_devices = false
          runtime_engine = ""
          runtime_root = ""
          runtime_type = "io.containerd.runc.v2"
          [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.nvidia.options]
            BinaryName = "/usr/bin/nvidia-container-runtime"
```

Restart containerd:

```bash
sudo systemctl daemon-reload && systemctl restart containerd
```

### 2. Label your nodes {#label-your-nodes}

Label your GPU nodes for HAMi scheduling with `gpu=on`. Nodes without this label cannot be managed by the scheduler.

```bash
kubectl label nodes {nodeid} gpu=on
```

### 3. Deploy HAMi using Helm {#deploy-hami-using-helm}

Check your Kubernetes version:

```bash
kubectl version
```

Add the Helm repository:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
```

During installation, set the Kubernetes scheduler image to match your cluster version. For example, if your cluster version is 1.29.0:

```bash
helm install hami hami-charts/hami \
  --set scheduler.kubeScheduler.imageTag=v1.29.0 \
  -n kube-system
```

If successful, both `vgpu-device-plugin` and `vgpu-scheduler` pods should be in the `Running` state.

## Demo {#demo}

### 1. Submit demo task {#submit-demo-task}

Containers can now request NVIDIA vGPUs using the `nvidia.com/gpu` resource type.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:18.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 1 # Request 1 vGPU
          nvidia.com/gpumem: 10240 # Each vGPU provides 10240 MiB device memory (optional)
```

### 2. Verify container resource limits {#verify-in-container-resource-control}

Run the following command:

```bash
kubectl exec -it gpu-pod nvidia-smi
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
