---
title: 使用 Lupine 访问远程 GPU
sidebar_label: 远程 GPU
---

HAMi 可以将工作负载调度到客户端节点，通过 [Lupine](https://github.com/lupinemachines/lupine) 在另一个 GPU 服务端节点上执行 CUDA 调用。客户端可以是纯 CPU 节点，无需 NVIDIA 驱动。HAMi 负责选择服务端并自动交付客户端库。

## 前提条件

- HAMi 版本为 v2.11.0 或更高。
- GPU 服务端节点安装 NVIDIA 驱动及 NVIDIA 容器运行时。
- 客户端 Pod 能通过 TCP 访问服务端节点的 InternalIP 及配置端口。
- 启用 HAMi admission webhook，并确保 Lupine 客户端与服务端版本兼容。

当前自动库交付面向仓库提供的 amd64 Ubuntu 24.04 CUDA/vLLM 示例镜像，其他镜像可能需要额外适配，详见[库交付与兼容性](#库交付与兼容性)。

镜像源和离线部署的配置请参阅[在线安装](../../installation/online-installation.md)及[离线安装](../../installation/offline-installation.md)。

## 配置服务端

在 device plugin 节点配置中启用远程功能：

```yaml
devicePlugin:
  enabled: true
  nvidiaNodeSelector:
    gpu: "on"
  nodeConfiguration:
    config: |
      {
        "nodeconfig": [
          {
            "name": "gpu-server-1",
            "operatingmode": "remote"
          }
        ]
      }
devices:
  remotegpu:
    enabled: true
```

`gpu-server-1` 为需要开启远程 GPU 功能的节点名称。

device plugin 仍运行在 GPU 服务端节点上。在 `remote` 模式下，它注册远程 GPU 信息，不向本地 kubelet 发布 GPU 资源，并自动设置用于发现服务端的 `hami.io/lupine-server` 标签。服务端默认监听 `14833` 端口。

创建工作负载前，等待 HAMi scheduler、device plugin 和 Lupine server Pod 就绪。检查发现标签和组件状态：

```bash
kubectl get node gpu-server-1 --show-labels
kubectl get pods -n kube-system -o wide
```

### 资源及镜像配置

| 配置 | 含义 |
| --- | --- |
| `nvidia.com/remote-gpu` | 所选服务端的物理 GPU 数量。 |
| `nvidia.com/remote-gpu-memory` | **每张 GPU** 的显存限额，单位 MiB，由 HAMi-core 执行限制。 |
| `devices.remotegpu.libImage` | 交付用于显存限制的 HAMi-core 的镜像。未设置时使用 HAMi device plugin 镜像；空字符串关闭显存限制。 |
| `devices.remotegpu.clientImage` | 交付 Lupine 客户端库的镜像。空字符串关闭自动客户端库交付。 |

:::warning 当前版本限制

一个工作负载独占整个 GPU 服务端。GPU 数量应设为该服务端的物理卡数，因为端点会暴露其全部 GPU。设置较小显存限额不会让其他工作负载共享剩余服务端容量。以下双卡示例应在有两张 A100 的服务端顺序运行，或分别使用不同服务端。

:::

## 运行 CUDA 示例

在 HAMi 源码目录使用 [default_use.yaml](https://github.com/Project-HAMi/HAMi/blob/master/examples/remotegpu/default_use.yaml)：

```bash
kubectl apply -f examples/remotegpu/default_use.yaml
kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/remote-gpu-pod --timeout=600s
kubectl logs remote-gpu-pod -c cuda-container
kubectl delete -f examples/remotegpu/default_use.yaml
```

示例使用 `nvidia/cuda:13.0.2-devel-ubuntu24.04`，请求两张远程 GPU，每张限额 3000 MiB。程序编译 `sm_80` 内核，并检查每张 GPU 计算 `35 + 7` 都返回 `42`。更换 GPU 代际时需要调整编译架构。此处通过实际计算检查远程 CUDA 调用；启用自动客户端库交付时，HAMi 还会交付兼容 Lupine 的 `nvidia-smi`。

## 运行 vLLM 示例

使用 [vllm_deployment.yaml](https://github.com/Project-HAMi/HAMi/blob/master/examples/remotegpu/vllm_deployment.yaml)：

```bash
kubectl apply -f examples/remotegpu/vllm_deployment.yaml
kubectl rollout status deployment/vllm-remote-gpu --timeout=900s
kubectl port-forward service/vllm-remote-gpu 8000:8000
```

在另一个终端发起推理请求：

```bash
curl -fsS http://127.0.0.1:8000/v1/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"Qwen/Qwen3-8B","prompt":"The capital of France is","max_tokens":16,"temperature":0}'
```

:::note 绝对路径加载的库

此 vLLM 镜像按绝对路径加载 NCCL，示例因此把 `libnccl.so.2` 挂到 `/usr/local/lib/python3.12/dist-packages/nvidia/nccl/lib/libnccl.so.2`。更换镜像时核对这个路径；其他按绝对路径加载的库同样需要特殊处理。

:::

## 库交付与兼容性

HAMi 使用 init container 注入 Lupine 劫持库。CUDA/NVML 库和 `libnghttp2.so.14` 以单文件方式挂载到 `/usr/local/nvidia/lib64`，该目录已经在示例镜像的库搜索路径中。其他自定义镜像可能不遵循该约束，自动注入机制可能无法正常生效。详见 [HAMi issue #3250](https://github.com/Project-HAMi/HAMi/issues/3250)。

启用显存限制时，另一个 init container 交付 HAMi-core，并将其加入 `LD_PRELOAD`。HAMi-core 将 CUDA 调用转发到 Lupine，后者按需加载。

对于自行提供库的镜像，可以设置以下 **Pod** annotation：

```yaml
hami.io/remote-gpu-client-injection: "disabled"
```

此配置关闭该 Pod 的自动 Lupine 库交付。服务端地址、工作负载身份注入及已配置的 HAMi-core 显存限制仍然生效。关闭交付后，工作负载需要自行提供上述 NCCL 显式挂载等配置所用的库。

容器和 GPU 指标请参阅[远程 GPU 监控](./remote-gpu-monitoring.md)。
