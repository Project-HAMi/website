---
title: 前提条件
translated: true
---

## 先决条件

- NVIDIA 驱动版本 >= 440
- nvidia-docker 版本 > 2.0
- 默认运行时配置为 NVIDIA 运行时
- Kubernetes 版本 >= 1.18
- glibc >= 2.17 & glibc < 2.30
- kernel 版本 >= 3.10
- helm 版本 > 3.0

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

在使用 `Docker` 运行 `Kubernetes` 时，使用 `nvidia-ctk` 工具自动配置 Docker：

```bash
sudo nvidia-ctk runtime configure --runtime=docker
```

然后重启 `Docker`：

```bash
sudo systemctl daemon-reload && systemctl restart docker
```

#### 配置 `containerd`

在使用 `containerd` 运行 `Kubernetes` 时，使用 `nvidia-ctk` 工具自动配置 containerd：

```bash
sudo nvidia-ctk runtime configure --runtime=containerd
```

然后重启 `containerd`：

```bash
sudo systemctl daemon-reload && systemctl restart containerd
```

### 给节点打标签

通过添加标签 "gpu=on" 来为 HAMi 调度标记您的 GPU 节点。没有此标签，节点无法被我们的调度器管理。

```
kubectl label nodes {nodeid} gpu=on