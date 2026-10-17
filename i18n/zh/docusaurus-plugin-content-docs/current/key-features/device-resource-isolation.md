---
title: 设备资源隔离
description: HAMi-Core 如何在容器内执行显存和算力限制，以及已知限制。
translated: true
---

一个用于设备隔离的简单演示：一个具有以下资源的任务。

```yaml
resources:
  limits:
    nvidia.com/gpu: 1 # 请求 1 个 vGPU
    nvidia.com/gpumem: 3000 # 每个 vGPU 包含 3000 MiB 设备显存
    nvidia.com/gpucores: 30 # 每个 vGPU 使用 30% 的设备算力
```

在容器内只能看到 3000 MiB 设备显存。

## 工作原理

这个任务的 3000 MiB 显存和 30% 算力限额，由 HAMi-Core（`libvgpu.so`）在容器内部执行，应用不需要做任何修改。下图展示了它如何执行这两项限额：

![HAMi-Core 如何在容器内执行显存和算力限制](/img/docs/zh/core-concepts/resource-isolation.svg)

## HAMi-Core 如何进入容器

Pod 启动时，device plugin 把 `libvgpu.so` 和 `/etc/ld.so.preload` 挂进容器，并通过环境变量传入限额：显存用 `CUDA_DEVICE_MEMORY_LIMIT_<index>`，算力用 `CUDA_DEVICE_SM_LIMIT`。

每个进程启动时，动态链接器都会读取 `/etc/ld.so.preload`。容器里的每个进程都会先加载 HAMi-Core，再加载 CUDA 库。之后，HAMi-Core 拦截其 hook 表中列出的 CUDA 和 NVML 调用。

## 显存

- 每次分配显存前（例如 `cuMemAlloc`），HAMi-Core 把这次申请和容器已经使用的显存相加。总量超过限额时，调用返回 `CUDA_ERROR_OUT_OF_MEMORY`。只有这个容器会收到错误，同一张卡上的其他 Pod 照常运行。
- 通过 NVML 查询显存时，返回的是限额，所以容器里的 `nvidia-smi` 把份额显示为总显存。

![显存隔离：HAMi-Core 把每次分配和限额对照检查](/img/docs/zh/core-concepts/memory-isolation.svg)

## 算力

- 每次提交 kernel 前，HAMi-Core 从一个计数器中扣除令牌。计数器用完时，这次提交会等待。
- 一个后台线程采样 GPU 使用率并补充计数器。容器用量低于份额时多补，高于份额时少补。
- `gpucores` 为 0 或 100 时，HAMi-Core 不限制 kernel 的提交。

![限速开启时的算力限制：kernel 扣除令牌，用完后等待，补充后继续](/img/docs/zh/core-concepts/compute-isolation.svg)

限速有三种模式。集群级用 Helm 参数 `devices.nvidia.gpuCorePolicy` 设置，单个容器用环境变量 `GPU_CORE_UTILIZATION_POLICY` 设置，见[全局配置](../userguide/configure.md)。

| 模式 | 行为 |
| --- | --- |
| `default` | 只有同一张卡上另一个 `nvidia.com/priority` 相同或更高的容器正在运行 kernel 时，才开启限速。一张卡上只有一个容器时，它按全速运行。 |
| `force` | 始终按 `gpucores` 限速。 |
| `disable` | 从不限速。 |

HAMi 不会为 Pod 预留流式多处理器（SM），所以当同卡的其他 Pod 很忙时，隔离只能尽力而为。

## 已知限制

- 限制在软件层面、CUDA API 这一层执行。需要硬件级隔离的负载，请使用 MIG。两者的对比见 FAQ 中的[HAMi vGPU 与 NVIDIA MIG 有何区别](../faq/faq.md#hami-vgpu-与-nvidia-mig-有何区别各适用于什么场景)。
- 设置了 `CUDA_DISABLE_CONTROL=true` 的容器，以及 Docker-in-Docker 中的内层容器，都没有 preload 挂载，限制不会生效。
- webhook 会拒绝申请了 HAMi 资源的特权容器。
- 把 `devicePlugin.disablecorelimit` 设为 `true`，会关闭所有 Pod 的算力限制。

如果限制没有生效，见 [GPU 显存限制未生效](../troubleshooting/troubleshooting.md#gpu-memory-limit-not-enforced)。

## 了解更多

- [GPU 虚拟化原理](../core-concepts/gpu-virtualization.md)：注入和拦截的详细步骤
- [HAMi-core](https://github.com/Project-HAMi/HAMi-core) 源码
