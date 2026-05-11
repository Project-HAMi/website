---
title: Prerequisites
---

Before installing HAMi, make sure the following tools and dependencies are properly installed in your environment:

- NVIDIA drivers >= 440
- nvidia-docker version > 2.0
- default runtime configured as nvidia for containerd/docker/cri-o container runtime
- Kubernetes version >= 1.18
- glibc >= 2.17 & glibc < 2.30
- kernel version >= 3.10
- helm > 3.0

## Preparing your GPU Nodes

Execute the following steps on all your GPU nodes.

This README assumes pre-installation of NVIDIA drivers and the `nvidia-container-toolkit`. Additionally, it assumes configuration of the `nvidia-container-runtime` as the default low-level runtime.

For details see [Installing the NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html).

### Example for debian-based systems with Docker and containerd

#### Install the `nvidia-container-toolkit`

```bash
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
  && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
```

#### Configure Docker

When running Kubernetes with Docker, use the `nvidia-ctk` tool to automatically configure Docker:

```bash
sudo nvidia-ctk runtime configure --runtime=docker
```

And then restart Docker:

```bash
sudo systemctl daemon-reload && sudo systemctl restart docker
```

#### Configure containerd

When running Kubernetes with containerd, use the `nvidia-ctk` tool to automatically configure containerd:

```bash
sudo nvidia-ctk runtime configure --runtime=containerd
```

And then restart containerd:

```bash
sudo systemctl daemon-reload && sudo systemctl restart containerd
```

### Label your nodes

Label your GPU nodes for scheduling with HAMi by adding the label "gpu=on". Without this label, the nodes cannot be managed by the HAMi scheduler.

```bash
kubectl label nodes {nodeid} gpu=on
```
