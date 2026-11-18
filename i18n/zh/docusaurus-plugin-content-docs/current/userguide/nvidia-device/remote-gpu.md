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

## 监控远程 GPU 工作负载 {#monitor-remote-gpu-workloads}

远程 GPU 监控默认关闭。要为由 Helm Chart 部署的 Lupine 服务端启用监控，请在 Helm values 中添加以下设置：

```yaml
devices:
  remotegpu:
    enabled: true
    server:
      enabled: true
    monitor:
      enabled: true
```

Chart 在每个 Lupine 服务端 Pod 中以 sidecar 方式运行 `remoteGPUmonitor`。`devicePlugin.monitor.image` 配置的镜像需包含该二进制文件。Lupine 服务端镜像需在指标中将 `LUPINE_WORKLOAD_ID` 暴露为 `client_id`，以便 HAMi 将用量关联到对应的工作负载 Pod。sidecar 通过回环地址从 `devices.remotegpu.defaultPort` 读取 Lupine 的 `/metrics`，并在 `devices.remotegpu.monitor.port`（默认 31993）提供 HAMi 指标。

### 使用 Prometheus 抓取指标

Chart 会创建名为 `<chart-fullname>-remote-monitor` 的 ClusterIP Service。如果 `prometheus.enabled` 为 `true`，且集群在部署 Chart 前已安装 ServiceMonitor CRD，Chart 还会创建 ServiceMonitor。请配置 Prometheus 实例，使其选中该 ServiceMonitor。`remote-metrics` 端点会抓取 Lupine 服务端 Pod 的 `/metrics`。

### 检查就绪状态和指标

在 HAMi 命名空间中找到监控 Service，然后转发其端口。请根据实际部署调整 `namespace` 和 `service`。端口转发会检查该 Service 选中的一个服务端 Pod。如果修改了监控端口，请将第二个 `31993` 替换为配置的 Service 端口。

```bash
namespace=kube-system
service=hami-remote-monitor
kubectl -n "$namespace" get svc -l app.kubernetes.io/component=hami-lupine-server
kubectl -n "$namespace" port-forward "svc/$service" 31993:31993
```

在另一个终端中执行：

```bash
curl --fail --show-error --silent --output /dev/null http://127.0.0.1:31993/readyz
curl --fail --show-error --silent http://127.0.0.1:31993/metrics
```

监控组件完成 Kubernetes Pod 缓存同步后，`/readyz` 会返回 HTTP 200。可在指标输出中查看 `hami_remote_gpumonitor_collect_success` 来确认采集状态。值为 `0` 表示采集失败。此时请检查 `remote-gpu-monitor` 容器日志，并确认 Lupine 服务端在配置的端口上提供 `/metrics`。

对于能够关联到工作负载的样本，可查看 `hami_vgpu_memory_used_bytes`、`hami_vgpu_memory_limit_bytes` 和 `hami_container_device_utilization_ratio`。服务端 GPU 用量可通过 `hami_host_gpu_memory_used_bytes` 和 `hami_host_gpu_utilization_ratio` 查看。`node` 标签表示 GPU 所在的服务端节点。

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
