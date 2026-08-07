---
title: 快速开始
sidebar_label: 快速开始
---

只需几分钟，即可通过部署 Helm Chart 并提交您的第一个 GPU 共享工作负载快速上手 HAMi。

## 先决条件 {#prerequisites}

在部署 HAMi 之前，请确保您的 GPU 节点满足以下前置条件：

- [Helm](https://helm.sh/zh/docs/) v3+
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) v1.23+
- [CUDA](https://developer.nvidia.com/cuda-toolkit) v10.2+
- [NVIDIA 驱动](https://www.nvidia.cn/drivers/unix/) v440+
- [NVIDIA Container Toolkit](../installation/prerequisites) (需预先配置并将 `nvidia-container-runtime` 设为默认容器运行时)

---

## 1. 标记节点 {#label-your-nodes}

使用 `gpu=on` 标签标记目标 GPU 节点。未标记的节点将不会由 HAMi 管理：

```bash
kubectl label nodes <node-name> gpu=on
```

---

## 2. 使用 Helm 部署 HAMi {#deploy-hami-using-helm}

添加官方 HAMi Helm 仓库并进行部署：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
helm install hami hami-charts/hami -n kube-system
```

确认 `hami-scheduler` 和 `hami-device-plugin` 的 Pod 处于 `Running` 状态：

```bash
kubectl get pods -n kube-system | grep hami
```

---

## 3. 提交 vGPU 工作负载 {#submit-a-vgpu-workload}

创建一个申请 1 个 vGPU 及 10240 MiB 显存限制的 Pod：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 10240
```

提交 YAML 并等待 Pod 启动完毕：

```bash
kubectl apply -f gpu-pod.yaml
kubectl wait --for=condition=Ready pod/gpu-pod --timeout=120s
```

---

## 4. 验证 GPU 显存隔离 {#verify-gpu-memory-isolation}

在运行的容器中执行 `nvidia-smi`：

```bash
kubectl exec -it gpu-pod -- nvidia-smi
```

预期输出显示 HAMi-core 的显存硬限制 (`10240MiB`)：

```text
[HAMI-core Msg]: Initializing.....
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 550.54.15              Driver Version: 550.54.15      CUDA Version: 12.4     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|=========================================+========================+======================|
|   0  Tesla V100-PCIE-32GB           On  |   00000000:3E:00.0 Off |                    0 |
| N/A   29C    P0             24W /  250W |       0MiB /  10240MiB |      0%      Default |
+-----------------------------------------------------------------------------------------+
```

---

## 清理资源 {#cleanup}

删除测试 Pod：

```bash
kubectl delete pod gpu-pod
```

---

## 下一步 {#next-steps}

- 参阅 [验证 HAMi 安装](./verify-hami.md) 查看详细验证步骤。
- 参阅 [配置指南](../userguide/configure.md) 了解如何自定义部署参数与设备配置。

