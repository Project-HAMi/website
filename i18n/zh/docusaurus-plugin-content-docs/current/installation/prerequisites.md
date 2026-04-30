---
title: 前置条件
---

在安装 HAMi 之前，请确保你的环境中已正确安装以下工具和依赖：

- NVIDIA 驱动版本 >= 440
- nvidia-docker 版本 > 2.0
- 默认运行时配置为 NVIDIA 运行时
- Kubernetes 版本 >= 1.18
- glibc >= 2.17 且 glibc < 2.30
- kernel 版本 >= 3.10
- helm 版本 > 3.0

## 准备 GPU 节点

在所有 GPU 节点上执行以下步骤。

本 README 假设已预先安装 NVIDIA 驱动和 `nvidia-container-toolkit`。此外，
还假设已将 `nvidia-container-runtime` 配置为默认底层运行时。

参阅[安装 NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)。

### Debian 系统示例（Docker + containerd）

#### 安装 `nvidia-container-toolkit`

```bash
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
  && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
```

#### 配置 Docker

在 Kubernetes 使用 Docker 时，可以使用 `nvidia-ctk` 自动配置 Docker：

```bash
sudo nvidia-ctk runtime configure --runtime=docker
```

然后重启 Docker：

```bash
sudo systemctl daemon-reload && sudo systemctl restart docker
```

#### 配置 containerd

在 Kubernetes 使用 containerd 时，可以使用 `nvidia-ctk` 自动配置 containerd：

```bash
sudo nvidia-ctk runtime configure --runtime=containerd
```

然后重启 containerd：

```bash
sudo systemctl daemon-reload && sudo systemctl restart containerd
```

### 为节点打标签

为了让 HAMi 调度器能够识别 GPU 节点，请为 GPU 节点添加标签 `gpu=on`。如果没有该标签，调度器将无法管理这些节点。

```bash
kubectl label nodes {nodeid} gpu=on
```
