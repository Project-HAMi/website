---
title: 如何在 KAI Scheduler 中使用 HAMi
---

[KAI Scheduler](https://github.com/kai-scheduler/KAI-Scheduler) 是 NVIDIA 开源的 Kubernetes 原生 AI 工作负载调度器。从下个版本起，KAI Scheduler 内置了由 HAMi-core 驱动的 GPU 显存硬隔离能力。只需一个 Helm 参数即可开启，再由节点侧组件在 CUDA 层强制执行显存上限。

关于 KAI Scheduler 为何需要 HAMi-core、两者如何分工的背景，见[生态集成](../../core-concepts/ecosystem-integrations.md)。关于本次采用的公告与背后的开源协作故事，阅读博客：[HAMi-core 被 NVIDIA KAI Scheduler 采用：GPU 共享正式迈入硬隔离时代](/blog/hami-core-adopted-by-nvidia-kai-scheduler)。

> 该集成直接使用 HAMi-core，而非完整 HAMi 平台。KAI Scheduler 保留自身调度能力，仅引入 HAMi-core 提供 GPU 显存隔离。

## 工作原理

KAI Scheduler 负责调度 Pod，并通过其 Admission 组件向每个请求共享 GPU 显存的容器注入 `CUDA_DEVICE_MEMORY_LIMIT` 环境变量。另一个独立组件 `kai-resource-isolator` 以 DaemonSet 形式把 HAMi-core 库分发到每个 GPU 节点，并通过 MutatingWebhook 向这些 Pod 注入库文件和 `ld.so.preload` 配置。运行时，`libvgpu.so` 拦截所有 CUDA 内存分配调用并强制执行上限。最终效果：容器内的 `nvidia-smi` 只显示分配到的切片，而非整张 GPU。

这样就把 KAI Scheduler 原本「协作式」的 GPU 共享（调度器确保请求总量不超过单卡，但不物理阻止超额使用）升级为真正的硬隔离。

## 前置条件

- 一个已安装 NVIDIA GPU，并部署 NVIDIA GPU Operator 或 device plugin 的 Kubernetes 集群。
- KAI Scheduler 下个版本起支持。使用本指南前请确认所用版本已暴露 `binder.plugins.hamicore.enabled` 参数。
- Helm 3。

## 1. 安装启用 hamicore 插件的 KAI Scheduler

安装 KAI Scheduler，启用 GPU 共享并激活 `hamicore` 插件：

```bash
helm install kai-scheduler oci://ghcr.io/nvidia/kai-scheduler \
  --set global.gpuSharing=true \
  --set binder.plugins.hamicore.enabled=true \
  --namespace kai-scheduler --create-namespace
```

`global.gpuSharing=true` 开启 GPU 共享，`binder.plugins.hamicore.enabled=true` 激活 `hamicore` 插件，由其为共享 GPU 的容器注入 `CUDA_DEVICE_MEMORY_LIMIT` 环境变量。

## 2. 部署 kai-resource-isolator

部署节点侧组件，用于分发 HAMi-core 并将其注入 Pod：

```bash
helm install kai-resource-isolator oci://docker.io/projecthami/kai-resource-isolator \
  --namespace kai-resource-isolator --create-namespace \
  --version 1.0.0-chart
```

Chart 版本号带 `-chart` 后缀，如 `1.0.0-chart`。可用版本见 [Docker Hub](https://hub.docker.com/r/projecthami/kai-resource-isolator/tags)。更多定制项参考 [kai-resource-isolator 仓库](https://github.com/Project-HAMi/KAI-resource-isolator)。

部署完成后，任何由 KAI Scheduler 调度、带 `gpu-fraction` 或 `gpu-memory` 注解的 Pod 都会自动获得显存隔离。

## 3. 调度一个隔离的 GPU Pod

通过给 Pod 打上 `gpu-memory` 注解并指定 `kai-scheduler` 调度器，请求 4096 MiB 显存：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-sharing-with-isolation
  labels:
    kai.scheduler/queue: default-queue
  annotations:
    gpu-memory: "4096" # 单位 MiB，不带后缀
spec:
  schedulerName: kai-scheduler
  containers:
    - name: gpu-workload
      image: nvidia/cuda:12.9.2-base-ubuntu24.04
      command: ["sleep", "infinity"]
```

## 验证隔离

进入 Pod 执行 `nvidia-smi`，它只显示分配到的显存，而非整张 GPU 显存。容器无法分配超过上限的显存。

```bash
kubectl exec -it gpu-sharing-with-isolation -- nvidia-smi
```

## 按需关闭隔离

需要时可以跳过隔离：

- **单个 Pod**：添加注解 `kai-resource-isolator.io/inject: "false"`。
- **整个命名空间**：添加标签 `kai-resource-isolator.io/webhook=ignore`。

## 显存数值精度

`gpu-memory` 注解接受整数 MiB（无单位后缀）。KAI Scheduler 内部会换算成两位小数的 GPU 分数，再乘以 GPU 总显存得出强制上限。因此 `nvidia-smi` 看到的值可能与请求值略有出入。例如在 15360 MiB 的 T4 上请求 `4096`，会四舍五入为 `0.27` 分数，最终强制上限为 `4147m`。

## 相关链接

- 上游指南：[HAMi resource isolation in KAI Scheduler](https://github.com/kai-scheduler/KAI-Scheduler/blob/main/docs/gpu-sharing/hami/README.md)
- 隔离组件：[kai-resource-isolator](https://github.com/Project-HAMi/KAI-resource-isolator)
- KAI Scheduler：[github.com/kai-scheduler/KAI-Scheduler](https://github.com/kai-scheduler/KAI-Scheduler)
- HAMi 项目：[github.com/Project-HAMi/HAMi](https://github.com/Project-HAMi/HAMi)
