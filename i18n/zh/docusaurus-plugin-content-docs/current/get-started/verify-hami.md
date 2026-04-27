---
title: 验证 HAMi 部署与 vGPU 行为
sidebar_label: 验证 HAMi
---

部署 HAMi 之后，验证安装是否正常工作以及 vGPU 资源隔离是否符合预期至关重要。本指南将带你逐步完成验证流程，从检查原生 GPU 栈到确认容器内的 vGPU 行为。

## 适用范围与前提条件

本指南假设 HAMi 已经安装完成（例如，通过快速开始部分中的[使用 Helm 部署 HAMi](/docs/get-started/deploy-with-helm) 指南）。

本文档的目标不是重复安装步骤，而是验证 HAMi 在真实的 Kubernetes 环境中是否正常工作，包括 GPU 访问和 vGPU 行为。

如果 HAMi 尚未安装，请先按照部署指南完成安装。

## 步骤 0：配置节点容器运行时（如果尚未配置）

HAMi 要求在所有 GPU 节点上安装 `nvidia-container-toolkit`，并将其设置为默认的低级别运行时。

### 1. 安装 nvidia-container-toolkit（以 Debian/Ubuntu 为例）

```bash
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
  && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
```

### 2. 配置运行时

* 对于 containerd：编辑 `/etc/containerd/config.toml`，将默认运行时名称设置为 `"nvidia"`，二进制文件名称设置为 `"/usr/bin/nvidia-container-runtime"`。

  * 重启服务：

    ```bash
    sudo systemctl daemon-reload && sudo systemctl restart containerd
    ```

* 对于 Docker：编辑 `/etc/docker/daemon.json`，设置 `"default-runtime": "nvidia"`。

  * 重启服务：

    ```bash
    sudo systemctl daemon-reload && sudo systemctl restart docker
    ```

## 步骤 1：验证原生 GPU 栈（关键预检步骤）

在安装 HAMi 之前，必须证明 Kubernetes 能够原生访问 GPU。

此步骤独立于 HAMi 验证你的 GPU 栈。

### 1. 部署原生测试 Pod

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: cuda-test
spec:
  restartPolicy: Never
  containers:
    - name: cuda
      image: nvcr.io/nvidia/cuda:12.2.0-base-ubuntu22.04
      command: ["nvidia-smi"]
      resources:
        limits:
          nvidia.com/gpu: 1
EOF
```

预期结果：你应该能看到有效的 `nvidia-smi` 输出。如果失败，请勿继续操作。先修复 GPU 配置。

### 2. 验证执行结果

```bash
kubectl wait --for=condition=Succeeded pod/cuda-test --timeout=60s
kubectl logs cuda-test
```

注意：你必须看到标准的 `nvidia-smi` 输出。如果失败，请勿继续。

## 步骤 2：验证 HAMi 安装

确认基准验证通过后，确保 HAMi 已安装且其组件正常运行。

如果你已经部署了 HAMi，可以跳过安装命令，仅验证组件是否正常运行。

### 1. 为节点打标签

```bash
kubectl label nodes $(hostname) gpu=on --overwrite
```

### 2. 使用 Helm 部署

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm install hami hami-charts/hami -n kube-system
```

### 3. 验证组件状态

```bash
kubectl get pods -n kube-system | grep hami
```

预期结果：`hami-scheduler` 和 `vgpu-device-plugin` Pod 均应处于 `Running` 状态。

## 步骤 3：启动并验证 vGPU 任务

让我们验证 HAMi 是否正确执行了分数级资源限制（vGPU）。

### 1. 提交 vGPU 演示任务

```bash
cat <<EOF | kubectl apply -f -
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
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 10240
EOF
```

### 2. 验证容器内的资源控制

```bash
kubectl wait --for=condition=Ready pod/gpu-pod --timeout=60s
kubectl exec -it gpu-pod -- nvidia-smi
```

预期结果：你将看到 `[HAMI-core Msg...]` 初始化行，且 `nvidia-smi` 表格中 Total Memory 将精确显示为 `10240MiB`，证明 vGPU 隔离已生效。

## 故障排查顺序

如果遇到问题，请按以下顺序排查：

1. 硬件/驱动：在主机上直接运行 `nvidia-smi`。
2. 容器运行时：确保在 K8s 之外 `sudo ctr run` 或 `docker run` 可以正常工作。
3. 残留插件：移除冲突的插件：`kubectl delete daemonset nvidia-device-plugin-daemonset -n kube-system --ignore-not-found`。
4. 节点资源：验证 K8s 是否识别到 GPU：`kubectl get nodes -o jsonpath='{.items[*].status.allocatable}' | grep -i nvidia`。
5. 调度器层：检查 HAMi 日志：`kubectl logs -n kube-system -l app=hami-scheduler`。

## 清理

```bash
kubectl delete pod cuda-test gpu-pod --ignore-not-found
```
