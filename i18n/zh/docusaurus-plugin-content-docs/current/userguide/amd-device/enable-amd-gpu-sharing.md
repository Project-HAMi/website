---
title: 启用 AMD GPU 共享
sidebar_label: GPU 共享
translated: true
---

## 简介

HAMi 通过以下资源在 Pod 之间共享 AMD GPU（Radeon 和 Instinct）：

- `amd.com/gpu`：GPU 数量
- `amd.com/gpumem`：每张 GPU 的设备显存，单位 MiB
- `amd.com/gpumem-percentage`：每张 GPU 的设备显存占其 VRAM 的百分比（0-100）；同时将 `amd.com/gpumem` 设置为大于 0 的整数时，显存申请量以 `amd.com/gpumem` 为准
- `amd.com/gpucores`：每张 GPU 的计算单元百分比（1-100）

当 `amd.com/gpumem` 未设置或为 0 时，百分比 0 表示申请整卡显存。

未申请显存和算力的 Pod 获得整张 GPU。只设置 `amd.com/gpumem-percentage` 的 Pod，webhook 会为它补上一张 GPU。

:::note

HAMi v2.10.0 已包含显存、算力、类型和 UUID 相关功能。以下功能需要更新的 HAMi 版本，并在下文相应位置标注：`amd.com/gpumem-percentage`、RDNA 上核心请求按完整 WGP 向上取整、命名空间 ResourceQuota 检查、根据可分配 GPU 判断节点健康、`amd.com/numa-bind`、`amd.com/link-bind`、AMD 的 `topology-aware` 策略，以及 `devices.amd.runtimeClassName`。

:::

### 节点需求 {#节点需求}

- 带有 ROCm 支持的 AMD GPU 的 Linux amd64 节点，已安装 `amdgpu` 内核驱动，并存在 `/dev/kfd` 和 `/dev/dri`。驱动安装请参见 [ROCm 安装指南](https://rocm.docs.amd.com/projects/install-on-linux/en/latest/)。
- 已安装 HAMi 调度器的 Kubernetes 集群。如果集群中没有 NVIDIA GPU，安装 HAMi 时关闭其自带的 device plugin：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm install hami hami-charts/hami -n kube-system --set devicePlugin.enabled=false
```

- 同一批节点上不能有其他插件注册 `amd.com/gpu`，例如上游的 ROCm device plugin。kubelet 不能由两个插件提供同一个资源：它会拒绝第二次注册（`device plugin already connected`），先注册的插件继续提供服务。

### 部署

1. 按上面的方式安装 HAMi chart。它会向调度器注册 AMD 资源（`values.yaml` 中的 `devices.amd.*`）。如果要给所有申请 AMD GPU 的 Pod 设置 runtime class，设置 `devices.amd.runtimeClassName`；Pod 自己设置了 `runtimeClassName` 时保持不变，不申请 GPU 的 Pod 不受影响（需要比 v2.10.0 更新的 HAMi 版本，[Project-HAMi/HAMi#3194](https://github.com/Project-HAMi/HAMi/pull/3194)）。
2. 在 AMD 节点上安装 [amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin)。它把每张 GPU 发布到节点注解 `hami.io/node-amd-register`，为 Pod 分配 CU 切片和显存限制；当 DRM 设备无法打开，或 AMD Device Metrics Exporter 报告 GPU 不健康时，将该 GPU 标记为不健康。在所需插件版本的源码目录中执行（最新版本为 v0.0.3）：

```bash
helm upgrade --install amd-gpu ./helm/amd-gpu --namespace kube-system --create-namespace
```

然后确认插件正在运行，并且节点上报了 GPU：

```bash
kubectl -n kube-system get pods -l name=amd-gpu-dp-ds
kubectl get node <node> -o jsonpath='{.status.allocatable.amd\.com/gpu}'
kubectl get node <node> -o jsonpath='{.metadata.annotations.hami\.io/node-amd-register}'
```

在 `cu` 模式下，`amd.com/gpu` 是 GPU 数量乘以共享份数（见[注意事项](#注意事项)）。该注解列出每张 GPU 的 UUID、产品名称、VRAM 和 CU 数量，以及 PCI 地址、`cuPerWGP`，对通过 XGMI 互联的 GPU 还有 `xgmiPeers`。被 exporter 报告为不健康的 GPU 不带 `health` 发布，调度器会以 `CardNotHealth` 拒绝它。

显存限制由 [amd-hami-core](https://github.com/Project-HAMi/amd-hami-core)（`libamvgpu`，由插件注入）执行；如果节点具有 `dmem` cgroup 控制器并使用 systemd cgroup 驱动，内核也会同时限制。

显存限制的前提条件和局限：

- hook 要求工作负载镜像中的 glibc 为 2.34 或更新版本。在 musl 和静态链接的镜像上不会加载 hook。在更旧的 glibc 镜像上，加载器会拒绝它并报告 `GLIBC_2.34 not found`（在 Ubuntu 18.04 上的测试中 Pod 仍然启动）。无论哪种情况，Pod 都没有进程内上限，只有节点支持时的内核 `dmem` 限制在起作用。插件的 `dp.muslFailClosed.enabled` 设置（默认关闭，实验性）会拒绝此类 Pod；除非 `dmem` 已经限制了它的显存，此时插件会省去 hook，Pod 照常运行。
- 内核层限制需要启用 `dmem` 控制器的 cgroup v2（内核 6.14 或更新版本）和 systemd cgroup 驱动；否则只有 hook 执行限制。
- hook 在进程内工作，因此去掉 `LD_AUDIT` 的进程可以绕过它。整卡请求既没有 hook，也没有 `dmem` 限制。
- 示例 Pod 以镜像的默认用户（root）运行，并关闭了权限提升。非 root Pod 还需要设置 `runAsUser`，以及节点上 `video` 和 `render` 组的 `supplementalGroups`，这些组 ID 因节点而异。
- amd-device-plugin 的版本要与镜像所属的 chart 版本一致；来自 `main` 的 chart 需要用 `main` 构建的镜像。

### 运行 AMD 任务

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-gpu-cores
spec:
  containers:
    - name: rocm
      image: rocm/dev-ubuntu-24.04:7.2.4
      command: ["bash", "-c", "sleep infinity"]
      resources:
        limits:
          amd.com/gpu: 1
          amd.com/gpumem: 4096 # MiB
          amd.com/gpucores: 25 # GPU 计算单元的百分比
```

更多示例：

- [分配整张 GPU](./examples/default-use.md)
- [分配设备显存](./examples/use-memory.md)和[按百分比分配](./examples/use-memory-percentage.md)
- [分配设备核心和显存](./examples/allocate-core-and-memory.md)
- 用 `amd.com/use-gputype` 和 `amd.com/nouse-gputype` 选择或避开某种 GPU 类型：[选择](./examples/specify-card-type-to-use.md)、[避开](./examples/specify-card-type-not-use.md)
- 用 `amd.com/use-gpu-uuid` 和 `amd.com/nouse-gpu-uuid` 按 UUID 选择或避开 GPU：[选择](./examples/specify-uuid-to-use.md)、[避开](./examples/specify-uuid-not-use.md)
- 让同一个 Pod 的 GPU 位于同一个 NUMA 节点，或使用通过 XGMI 互联的 GPU：[numa-bind](./examples/numa-bind.md)、[link-bind](./examples/link-bind.md)
- 选择节点上挑选 GPU 的方式：[调度策略](./examples/scheduler-policy.md)
- 为 Pod 设置队列优先级：[任务优先级](./examples/task-priority.md)

### 调度行为

- **多 GPU Pod。** 设置 `amd.com/numa-bind: "true"` 让所有 GPU 位于同一个 NUMA 节点，或设置 `amd.com/link-bind: "true"` 要求所有 GPU 之间两两通过 XGMI 互联。`topology-aware` 策略会选择 XGMI 链路最多的一组，但不是硬性要求。这些功能需要比 v2.10.0 更新的 HAMi 版本。只使用空闲 GPU 的 `mutex` 策略已包含在 v2.10.0 中。
- **命名空间配额。** 调度器在放置 Pod 之前会检查命名空间 `ResourceQuota` 中的 `limits.amd.com/gpumem`，包括由整卡或百分比请求换算出的显存。超出配额的 Pod 保持 `Pending`，原因为 `ResourceQuotaNotFit`；其他命名空间不受影响（需要比 v2.10.0 更新的 HAMi 版本）。
- **节点健康。** 节点上可分配的 `amd.com/gpu` 为 0 时，调度器让新 Pod 保持 `Pending`，插件重新上报 GPU 后 Pod 开始运行（需要比 v2.10.0 更新的 HAMi 版本）。

### 注意事项

- **核心是 CU 掩码。** `amd.com/gpucores` 会转换为 `HSA_CU_MASK`。在 RDNA GPU 上，请求会向上取整到完整的 WGP（2 个 CU），插件会把该粒度发布为 `cuPerWGP`。掩码由 ROCm 运行时执行，并由 `libamvgpu` 固定；未经过 `LD_AUDIT` hook 启动的子进程不受限制。
- **共享份数。** 插件会把每张 GPU 发布多次：RDNA4（gfx12）为 2 次，因为更多进程共享时其吞吐量会下降，其他为 10 次。插件 chart 中的 `dp.splitCount` 可以覆盖该值。
- **整卡 Pod** 既没有 CU 掩码，也没有显存限制，并且不会加载 `libamvgpu`。
- **不设置 `amd.com/gpucores` 的请求获得全部 CU。** 调度器会为它预留整张 GPU 的算力范围，因此只设置了 `amd.com/gpumem` 的 Pod 会占满该 GPU 的算力，下一个这样的 Pod 要等它结束。需要共享 GPU 的 Pod 都应设置 `amd.com/gpucores`。
- **显存超分。** 插件 chart 中的 `dp.deviceMemoryScaling` 大于 1 时，会注册比 GPU 实际更多的 VRAM。此时 Pod 会得到 `HIP_OVERSUBSCRIBE=true`，`hipMalloc` 从托管内存分配，CDNA 上需要启用 XNACK。
- **计算分区。** 在可以划分计算分区（`spx`、`dpx`、`qpx`、`cpx`）的 Instinct GPU 上，`dp.operatingMode=partition` 注册硬分区而不是 CU 切片，`-resource_naming_strategy=mixed` 会按模式命名分区。切换模式前先排空节点。参见[配置](./configuration.md#运行模式)。
- **监控。** 在插件 chart 中设置 `monitor.enabled=true` 会运行 `k8s-vgpu-monitor`。它在 9394 端口上按容器提供 `hami_vgpu_memory_used_bytes` 和 `hami_vgpu_memory_limit_bytes`，按 GPU 提供 `hami_host_gpu_memory_used_bytes`、`hami_host_gpu_utilization_ratio`、`hami_host_gpu_temperature_celsius` 和 `hami_host_gpu_power_usage_watts`，指标名称与 NVIDIA monitor 一致。不报告按容器的利用率：内核不按进程统计计算时间。
- **调度器指标**中的 AMD 核心以 GPU 的百分比表示。

### 已测试的配置和已知缺口

插件以及 HAMi 中的 AMD 相关改动在一块真实的 AMD Instinct MI325X（单张 GPU，以虚拟功能形式呈现）上运行过，环境为 k3s、内核 6.8 和 7.0、ROCm 6.2 和 7.2，以及 PyTorch、TensorFlow、JAX 和 vLLM 示例 Pod。本指南中的显存限制、CU 掩码、队列优先级、命名空间配额和示例清单都在该 GPU 上检查过。带 XGMI 和 NUMA 的多 GPU、裸机 MI300、MI325 和 MI355 上的计算分区、RDNA 显卡以及真实硬件故障没有在硬件上运行过。详情见 [AMD GPU 测试状态](./verification-status.md)。

### 了解更多

- [AMD GPU 共享的工作原理](./how-it-works.md)：请求流程、节点注册信息和显存库。
- [配置 AMD device plugin](./configuration.md)：所有 chart 值、运行模式和计算分区、`dmem`、CDI 和指标。
- [AMD GPU 共享故障排查](./troubleshooting.md)：现象、原因和术语表。
- [AMD GPU 测试状态](./verification-status.md)：在真实 GPU 上验证了什么、没有验证什么。
