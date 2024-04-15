---
title: Prequisities
---

## Prerequisites

- [Helm](https://helm.sh/zh/docs/) version v3+
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) version v1.16+
- [CUDA](https://developer.nvidia.com/cuda-toolkit) version v10.2+
- [NvidiaDriver](https://www.nvidia.cn/drivers/unix/) v440+

## Preparing your GPU Nodes

Execute the following steps on all your GPU nodes.

This README assumes pre-installation of NVIDIA drivers and the `nvidia-container-toolkit`. Additionally, it assumes configuration of the `nvidia-container-runtime` as the default low-level runtime.

Please see: <https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html>

### Example for debian-based systems with `Docker` and `containerd`

#### Install the `nvidia-container-toolkit`

```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | sudo tee /etc/apt/sources.list.d/libnvidia-container.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
```

#### Configure `Docker`

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


#### Configure `containerd`

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

### Label your nodes

Label your GPU nodes for scheduling with HAMi by adding the label "gpu=on". Without this label, the nodes cannot be managed by our scheduler.

```
kubectl label nodes {nodeid} gpu=on
```
