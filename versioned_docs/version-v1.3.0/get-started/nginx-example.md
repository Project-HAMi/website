---
title: Deploy HAMi using helm
---

This guide will cover:
- Configure nvidia container runtime in each GPU nodes
- Install HAMi using helm
- Launch a vGPU task
- Check if the corresponding device resources are limited inside container

### Prerequisites
- [Helm](https://helm.sh/zh/docs/) version v3+
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) version v1.16+
- [CUDA](https://developer.nvidia.com/cuda-toolkit) version v10.2+
- [NvidiaDriver](https://www.nvidia.cn/drivers/unix/) v440+

### Installation

#### 1. Configure nvidia-container-toolkit
<summary> Configure nvidia-container-toolkit </summary>

Execute the following steps on all your GPU nodes.

This README assumes pre-installation of NVIDIA drivers and the `nvidia-container-toolkit`. Additionally, it assumes configuration of the `nvidia-container-runtime` as the default low-level runtime.

Please see: <https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html>

#### Example for debian-based systems with `Docker` and `containerd`

##### Install the `nvidia-container-toolkit`

```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | sudo tee /etc/apt/sources.list.d/libnvidia-container.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
```

##### Configure `Docker`

When running `Kubernetes` with `Docker`, edit the configuration file, typically located at `/etc/docker/daemon.json`, to set up `nvidia-container-runtime` as the default low-level runtime:

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

And then restart `Docker`:

```
sudo systemctl daemon-reload && systemctl restart docker
```

##### Configure `containerd`

When running `Kubernetes` with `containerd`, modify the configuration file typically located at `/etc/containerd/config.toml`, to set up
`nvidia-container-runtime` as the default low-level runtime:

```
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

And then restart `containerd`:

```
sudo systemctl daemon-reload && systemctl restart containerd
```

#### 2. Label your nodes
Label your GPU nodes for scheduling with HAMi by adding the label "gpu=on". Without this label, the nodes cannot be managed by our scheduler.

```
kubectl label nodes {nodeid} gpu=on
```

#### 3. Deploy HAMi using helm:

First, you need to check your Kubernetes version by using the following command:

```
kubectl version
```

Then, add our repo in helm

```
helm repo add hami-charts https://project-hami.github.io/HAMi/
```

During installation, set the Kubernetes scheduler image version to match your Kubernetes server version. For instance, if your cluster server version is 1.16.8, use the following command for deployment:

```
helm install hami hami-charts/hami --set scheduler.kubeScheduler.imageTag=v1.16.8 -n kube-system
```

If everything goes well, you will see both vgpu-device-plugin and vgpu-scheduler pods are in the Running state

### Demo

#### 1. Submit demo task:

Containers can now request NVIDIA vGPUs using the `nvidia.com/gpu`` resource type.

```
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
          nvidia.com/gpu: 1 # requesting 1 vGPUs
          nvidia.com/gpumem: 10240 # Each vGPU contains 3000m device memory （Optional,Integer）
```

#### Verify in container resouce control

Execute the following query command:

```
kubectl exec -it gpu-pod nvidia-smi
```

The result should be 

```
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


