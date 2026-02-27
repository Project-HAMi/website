---
title: 使用 Helm 部署 HAMi
translated: true
---

本指南将涵盖：

- 在每个 GPU 节点中配置 nvidia 容器运行时
- 使用 helm 安装 HAMi
- 启动 vGPU 任务
- 检查容器内相应的设备资源是否受限

### 前提条件

- [Helm](https://helm.sh/zh/docs/) 版本 v3+
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) 版本 v1.16+
- [CUDA](https://developer.nvidia.com/cuda-toolkit) 版本 v10.2+
- [NvidiaDriver](https://www.nvidia.cn/drivers/unix/) v440+

### 安装

#### 1. 配置 nvidia-container-toolkit

<summary> 配置 nvidia-container-toolkit </summary>

在所有 GPU 节点上执行以下步骤。

此 README 假设已预安装 NVIDIA 驱动程序和 `nvidia-container-toolkit`。此外，假设已将 `nvidia-container-runtime` 配置为默认的低级运行时。

请参阅：[https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)

#### 适用于基于 debian 系统的 `Docker` 和 `containerd` 示例

##### 安装 `nvidia-container-toolkit`

```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | sudo tee /etc/apt/sources.list.d/libnvidia-container.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
```

##### 配置 `Docker`

在使用 `Docker` 运行 `Kubernetes` 时，编辑配置文件，通常位于 `/etc/docker/daemon.json`，以设置 `nvidia-container-runtime` 为默认的低级运行时：

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

##### 配置 `containerd`

在使用 `containerd` 运行 `Kubernetes` 时，修改配置文件，通常位于 `/etc/containerd/config.toml`，以设置 `nvidia-container-runtime` 为默认的低级运行时：

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

#### 2. 给节点打标签

通过添加标签 "gpu=on" 来为调度 HAMi 标记您的 GPU 节点。没有此标签，节点无法被我们的调度器管理。

```
kubectl label nodes {nodeid} gpu=on
```

#### 3. 使用 helm 部署 HAMi

首先，您需要使用以下命令检查您的 Kubernetes 版本：

```
kubectl version
```

然后，在 helm 中添加我们的仓库

```
helm repo add hami-charts https://project-hami.github.io/HAMi/
```

在安装过程中，将 Kubernetes 调度器镜像版本设置为与您的 Kubernetes 服务器版本匹配。例如，如果您的集群服务器版本是 1.16.8，使用以下命令进行部署：

```
helm install hami hami-charts/hami --set scheduler.kubeScheduler.imageTag=v1.16.8 -n kube-system
```

如果一切顺利，您将看到 vgpu-device-plugin 和 vgpu-scheduler pods 处于运行状态

### 演示

#### 1. 提交演示任务

容器现在可以使用 `nvidia.com/gpu` 资源类型请求 NVIDIA vGPUs。

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
          nvidia.com/gpu: 1 # 请求 1 个 vGPUs
          nvidia.com/gpumem: 10240 # 每个 vGPU 包含 3000m 设备显存（可选，整数）
```

#### 在容器资源控制中验证

执行以下查询命令：

```
kubectl exec -it gpu-pod nvidia-smi
```

结果应为

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
