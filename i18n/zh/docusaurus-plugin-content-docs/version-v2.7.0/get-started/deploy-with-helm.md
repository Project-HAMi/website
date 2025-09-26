---
title: 使用 Helm 部署 HAMi
---

## 目录 {#toc}

- [先决条件](#prerequisites)
- [安装步骤](#installation)
- [演示](#demo)

本指南将涵盖：

- 为每个 GPU 节点配置 NVIDIA 容器运行时
- 使用 Helm 安装 HAMi
- 启动 vGPU 任务
- 验证容器内设备资源是否受限

## 先决条件 {#prerequisites}

- [Helm](https://helm.sh/zh/docs/) v3+
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) v1.16+
- [CUDA](https://developer.nvidia.com/cuda-toolkit) v10.2+
- [NVIDIA 驱动](https://www.nvidia.cn/drivers/unix/) v440+

## 安装步骤 {#installation}

### 1. 配置 nvidia-container-toolkit {#configure-nvidia-container-toolkit}

<summary> 配置 nvidia-container-toolkit </summary>

在所有 GPU 节点执行以下操作。

本文档假设已预装 NVIDIA 驱动和 `nvidia-container-toolkit`，并已将 `nvidia-container-runtime` 配置为默认底层运行时。

参考：[nvidia-container-toolkit 安装指南](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)

#### 基于 Debian 系统（使用 `Docker` 和 `containerd`）示例 {#example-for-debian-based-systems-with-docker-and-containerd}

##### 安装 `nvidia-container-toolkit` {#install-the-nvidia-container-toolkit}

```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sudo tee /etc/apt/sources.list.d/libnvidia-container.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
```

##### 配置 `Docker` {#configure-docker}

当使用 `Docker` 运行 `Kubernetes` 时，编辑配置文件（通常位于 `/etc/docker/daemon.json`），将
`nvidia-container-runtime` 设为默认底层运行时：

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

```bash
sudo systemctl daemon-reload && systemctl restart docker
```

##### 配置 `containerd` {#configure-containerd}

当使用 `containerd` 运行 `Kubernetes` 时，修改配置文件（通常位于 `/etc/containerd/config.toml`），将
`nvidia-container-runtime` 设为默认底层运行时：

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

然后重启 `containerd`：

```bash
sudo systemctl daemon-reload && systemctl restart containerd
```

#### 2. 标记节点 {#label-your-nodes}

通过添加 "gpu=on" 标签将 GPU 节点标记为可调度 HAMi 任务。未标记的节点将无法被调度器管理。

```bash
kubectl label nodes {节点ID} gpu=on
```

#### 3. 使用 Helm 部署 HAMi {#deploy-hami-using-helm}

首先通过以下命令确认 Kubernetes 版本：

```bash
kubectl version
```

然后添加 Helm 仓库：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
```

安装时需设置 Kubernetes 调度器镜像版本与集群版本匹配。例如集群版本为 1.16.8 时，使用以下命令部署：

```bash
helm install hami hami-charts/hami \
  --set scheduler.kubeScheduler.imageTag=v1.16.8 \
  -n kube-system
```

若一切正常，可见 vgpu-device-plugin 和 vgpu-scheduler 的 Pod 均处于 Running 状态。

### 演示 {#demo}

#### 1. 提交演示任务 {#submit-demo-task}

容器现在可通过 `nvidia.com/gpu` 资源类型申请 NVIDIA vGPU：

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
          nvidia.com/gpu: 1 # 申请 1 个 vGPU
          nvidia.com/gpumem: 10240 # 每个 vGPU 包含 10240m 设备内存（可选，整型）
```

#### 2. 验证容器内资源限制 {#verify-in-container-resouce-control}

执行查询命令：

```bash
kubectl exec -it gpu-pod nvidia-smi
```

预期输出：

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
