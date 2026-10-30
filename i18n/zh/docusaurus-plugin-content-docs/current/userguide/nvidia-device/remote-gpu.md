---
title: 使用 Lupine 访问远程 GPU
sidebar_label: 远程 GPU
---

HAMi 可以将工作负载调度到客户端节点，通过 [Lupine](https://github.com/lupinemachines/lupine) 在另一个 GPU 服务端节点上执行 CUDA 调用。客户端可以是纯 CPU 节点，无需 NVIDIA 驱动。HAMi 负责选择服务端并自动交付客户端库。

## 前提条件

- 使用包含远程 GPU 客户端自动交付功能的 HAMi chart 和镜像。源码构建请参考[构建 HAMi](../../developers/build.md)。
- GPU 服务端节点需要 NVIDIA 驱动及 NVIDIA 容器运行时。运行工作负载的客户端节点与 GPU 服务端节点分离。
- 客户端 Pod 能通过 TCP 访问服务端节点的 InternalIP 及配置端口，默认端口为 `14833`。
- 启用 HAMi admission webhook，Lupine 客户端、服务端和工作负载 ABI 需要兼容。

当前自动库交付面向仓库提供的 amd64 Ubuntu 24.04 CUDA/vLLM 示例镜像，其他镜像可能需要额外适配，详见[库交付与兼容性](#库交付与兼容性)。

## 配置服务端

在 HAMi 源码目录创建 `remote-values.yaml`。将 `gpu-server-1` 替换为 GPU 节点名，将 `<matching-hami-build-tag>` 替换为包含该功能的 HAMi 构建标签：

```yaml
global:
  imageTag: "<matching-hami-build-tag>"
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
    defaultPort: 14833
    clientImage: ghcr.io/lupinemachines/lupine-client:cuda-13.3.1-ubuntu24.04
    server:
      enabled: true
      runtimeClassName: nvidia
      image:
        registry: ghcr.io
        repository: lupinemachines/lupine-server
        tag: cuda-13.3.1-ubuntu24.04
```

`runtimeClassName` 应指向集群中选择 NVIDIA 运行时的现有 RuntimeClass；如果 NVIDIA 已是默认运行时，则设为空。升级已有安装时，保留其他节点配置条目和现有 Helm 配置。

```bash
kubectl label node gpu-server-1 gpu=on --overwrite
helm upgrade --install hami ./charts/hami -n kube-system --create-namespace -f remote-values.yaml
```

device plugin 仍运行在 GPU 服务端节点上。在 `remote` 模式下，它注册远程 GPU 信息，不向本地 kubelet 发布 GPU 资源，并自动设置用于发现服务端的 `hami.io/lupine-server` 标签。chart 管理的服务端使用空标签值，监听 `defaultPort`。不要给纯 CPU 客户端节点打 `gpu=on` 标签。

非空的发现标签值表示由 chart 之外管理的服务端端口，chart 不会在这些节点运行服务端。`remote`、`hami-core` 和 `mig` 是节点的不同运行模式。

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
| `devices.remotegpu.libImage` | 交付用于显存限制的 HAMi-core 的镜像。未设置时使用 device plugin 镜像；空字符串关闭显存限制。 |
| `devices.remotegpu.clientImage` | 交付 Lupine 客户端库的镜像。空字符串关闭自动客户端库交付。 |

一个工作负载独占**整个 GPU 服务端**。GPU 数量应设为该服务端的物理卡数，因为端点会暴露其全部 GPU。设置较小显存限额不会让其他工作负载共享剩余服务端容量。以下双卡示例应在有两张 A100 的服务端顺序运行，或分别使用不同服务端。

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

示例使用 `vllm/vllm-openai:v0.25.1-ubuntu2404`，以 float16 加载 `Qwen/Qwen3-8B`，通过两张 GPU 做张量并行。HAMi 为每张 GPU 设置 20480 MiB（20 GiB）限额。vLLM 的 `--gpu-memory-utilization=0.8` 在该显存视图内规划预算，不代替 HAMi 的配额。容器主机内存的 requests/limits 与显存独立。

上下文上限为 4096 token，并发序列上限为 4。eager 执行、TRITON attention、同步 CUDA launch 和 cuBLAS 偏好是兼容性设置，不是吞吐量调优。Deployment 使用 `Recreate`，避免更新时旧副本仍占用服务端而新副本需要额外服务端。

下载模型需要联网。示例的模型缓存随 Pod 删除而丢失，持久化缓存应改用 PVC。使用结束后删除工作负载：

```bash
kubectl delete -f examples/remotegpu/vllm_deployment.yaml
```

### 通过绝对路径加载的库

该 vLLM 镜像中的 PyTorch 通过绝对路径加载 NCCL。因此示例将注入的 `hami-lupine-client` 卷内的 `libnccl.so.2` 挂载到：

```text
/usr/local/lib/python3.12/dist-packages/nvidia/nccl/lib/libnccl.so.2
```

这是使用 `subPath: libnccl.so.2` 的标准 `volumeMounts` 配置，无需特定库的 HAMi annotation。由于控制器会在 Pod admission 之前校验挂载引用，Deployment 显式声明该 `emptyDir` 卷，由 HAMi 复用并填充。更换 vLLM 镜像时需要重新确认目标路径。其他通过绝对路径加载的库也可用此方式处理。

## 库交付与兼容性

HAMi 添加 `hami-lupine-client` init container 和存放客户端库的 `emptyDir`。完整库目录位于 `/opt/lupine/lib`。CUDA/NVML 库和 `libnghttp2.so.14` 以单文件方式挂载到 `/usr/local/nvidia/lib64`，该目录已经在示例镜像的库搜索路径中。目录内其他文件会保留，HAMi 不注入或修改 `LD_LIBRARY_PATH`。

客户端镜像必须包含 `/opt/lupine/lib`、`sh`、`cp` 和 `nvidia-smi`。HAMi 在 `/usr/bin/nvidia-smi` 挂载包装脚本，仅为该命令设置 `LD_LIBRARY_PATH`，以加载 Lupine NVML。init container 从 Debian/Ubuntu multiarch 目录或常见的 `/usr/lib64`、`/lib64`、`/usr/lib`、`/lib` 查找 `libnghttp2.so.14`，缺失时会报错并初始化失败。这用于补齐示例中已知缺失的依赖，并不打包全部依赖；工作负载镜像仍需提供兼容的 glibc、OpenSSL 和 libstdc++。

启用显存限制时，另一个 init container 交付 HAMi-core，并将其加入 `LD_PRELOAD`。HAMi-core 将 CUDA 调用转发到 Lupine，后者按需加载。HAMi 还向远程 GPU 工作负载注入 `LUPINE_SERVER`、`LUPINE_WORKLOAD_ID` 和 `NVIDIA_VISIBLE_DEVICES=void`。

对于自行提供库的镜像，可以设置以下 **Pod** annotation（Deployment 中位于 `spec.template.metadata.annotations`）：

```yaml
hami.io/remote-gpu-client-injection: "disabled"
```

此配置关闭该 Pod 的自动 Lupine 库交付。服务端地址、工作负载身份注入及已配置的 HAMi-core 显存限制仍然生效。关闭交付后，工作负载也需要自行提供上述 NCCL 显式挂载等配置所用的库。

显存限额要求 Lupine 服务端支持客户端使用的 NVML RPC，包括 `nvmlDeviceGetProcessUtilization`，并使用包含 NVML 缺失符号保护的 HAMi-core（上游提交 `a3bae57` 或之后版本）。如果 `nvmlDeviceGetP2PStatus` 不可用，vLLM 可能记录 NVLink 检测错误后继续启动；应通过就绪状态和实际推理请求判断工作负载健康情况。

容器和 GPU 指标请参阅[远程 GPU 监控](./remote-gpu-monitoring.md)。
