---
title: Prequisities
---

Before installing HAMi, make sure the following tools and dependencies are properly installed in your environment:

- [Helm](https://helm.sh/zh/docs/) v3+
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) v1.16+
- [CUDA](https://developer.nvidia.com/cuda-toolkit) v10.2+
- [NvidiaDriver](https://www.nvidia.cn/drivers/unix/) v440+

## Preparing your GPU Nodes

Execute the following steps on all your GPU nodes.

This README assumes pre-installation of NVIDIA drivers and the `nvidia-container-toolkit`. Additionally, it assumes configuration of the `nvidia-container-runtime` as the default low-level runtime.

For details see [Installing the NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html).

### Example for debian-based systems with Docker and containerd

#### Install the `nvidia-container-toolkit`

```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | sudo tee /etc/apt/sources.list.d/libnvidia-container.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
```

#### Configure Docker

When running Kubernetes with Docker, use the `nvidia-ctk` tool to automatically configure Docker:

```bash
sudo nvidia-ctk runtime configure --runtime=docker
```

And then restart Docker:

```bash
sudo systemctl daemon-reload && systemctl restart docker
```

#### Configure containerd

When running Kubernetes with containerd, use the `nvidia-ctk` tool to automatically configure containerd:

```bash
sudo nvidia-ctk runtime configure --runtime=containerd
```

And then restart containerd:

```bash
sudo systemctl daemon-reload && systemctl restart containerd
```

### Label your nodes

Label your GPU nodes for scheduling with HAMi by adding the label "gpu=on". Without this label, the nodes cannot be managed by our scheduler.

```bash
kubectl label nodes {nodeid} gpu=on
```
