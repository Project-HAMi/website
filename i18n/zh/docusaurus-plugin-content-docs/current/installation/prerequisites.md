---
title: 前提条件
translated: true
---

在安装 HAMi 之前，确保你的环境中已正确安装以下工具和依赖项：

- NVIDIA 驱动版本 >= 440
- nvidia-docker 版本 > 2.0
- 默认运行时配置为 NVIDIA 运行时
- Kubernetes 版本 >= 1.18
- glibc >= 2.17 & glibc < 2.30
- kernel 版本 >= 3.10
- helm 版本 > 3.0

## 准备你的 GPU 节点

在所有 GPU 节点上执行以下步骤。

本 README 假设已预安装 NVIDIA 驱动程序和 `nvidia-container-toolkit`。此外，还假设将 `nvidia-container-runtime` 配置为默认的低级运行时。

参阅：[https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)

### 适用于基于 Debian 系统的 `Docker` 和 `containerd` 示例

#### 安装 `nvidia-container-toolkit`

```bash
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
  && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
```

#### 配置 `Docker`

在使用 `Docker` 运行 `Kubernetes` 时，使用 `nvidia-ctk` 工具自动配置 Docker：

```bash
sudo nvidia-ctk runtime configure --runtime=docker
```

然后重启 `Docker`：

```bash
sudo systemctl daemon-reload && sudo systemctl restart docker
```

#### 配置 `containerd`

在使用 `containerd` 运行 `Kubernetes` 时，使用 `nvidia-ctk` 工具自动配置 containerd：

```bash
sudo nvidia-ctk runtime configure --runtime=containerd
```

然后重启 `containerd`：

```bash
sudo systemctl daemon-reload && sudo systemctl restart containerd
```

### 给节点打标签

通过添加标签 "gpu=on" 来为 HAMi 调度标记你的 GPU 节点。没有此标签，节点无法被我们的调度器管理。

```
kubectl label nodes {nodeid} gpu=on