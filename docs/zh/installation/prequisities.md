---
title: 前提条件
translated: true
---

## 先决条件

- [Helm](https://helm.sh/zh/docs/) 版本 v3+
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) 版本 v1.16+
- [CUDA](https://developer.nvidia.com/cuda-toolkit) 版本 v10.2+
- [NvidiaDriver](https://www.nvidia.cn/drivers/unix/) v440+

## 准备您的 GPU 节点

在所有 GPU 节点上执行以下步骤。

本 README 假设已预安装 NVIDIA 驱动程序和 `nvidia-container-toolkit`。此外，还假设将 `nvidia-container-runtime` 配置为默认的低级运行时。

请参阅：[https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)

### 适用于基于 Debian 系统的 `Docker` 和 `containerd` 示例

#### 安装 `nvidia-container-toolkit`

```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | sudo tee /etc/apt/sources.list.d/libnvidia-container.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
```

#### 配置 `Docker`

在使用 `Docker` 运行 `Kubernetes` 时，编辑配置文件，通常位于 `/etc/docker/daemon.json`，以设置 `nvidia-container-runtime` 作为默认的低级运行时：

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

然后重启 `Docker`：

```
sudo systemctl daemon-reload && systemctl restart docker
```

#### 配置 `containerd`

在使用 `containerd` 运行 `Kubernetes` 时，修改配置文件，通常位于 `/etc/containerd/config.toml`，以设置
`nvidia-container-runtime` 作为默认的低级运行时：

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

然后重启 `containerd`：

```
sudo systemctl daemon-reload && systemctl restart containerd
```

### 给节点打标签

通过添加标签 "gpu=on" 来为 HAMi 调度标记您的 GPU 节点。没有此标签，节点无法被我们的调度器管理。

```
kubectl label nodes {nodeid} gpu=on