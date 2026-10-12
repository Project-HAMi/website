---
title: 启用 AMD GPU 共享
sidebar_label: GPU 共享
translated: true
---

## 简介

HAMi 通过以下资源在 Pod 之间共享 AMD GPU（Radeon 和 Instinct）：

- `amd.com/gpu`：GPU 数量
- `amd.com/gpumem`：每张 GPU 的设备显存，单位 MiB
- `amd.com/gpumem-percentage`：每张 GPU 的设备显存占其 VRAM 的百分比（1-100）；同时设置 `amd.com/gpumem` 时以 `amd.com/gpumem` 为准
- `amd.com/gpucores`：每张 GPU 的计算单元百分比（1-100）

未申请显存和算力的 Pod 获得整张 GPU。

### 部署

1. 照常安装 HAMi chart。它会向调度器注册 AMD 资源（`values.yaml` 中的 `devices.amd.*`）。
2. 在 AMD 节点上安装 [amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin)。它把每张 GPU 发布到节点注解 `hami.io/node-amd-register`，为 Pod 分配 CU 切片和显存限制；当 DRM 设备无法打开，或 AMD Device Metrics Exporter 报告 GPU 不健康时，将该 GPU 标记为不健康。

显存限制由 [amd-hami-core](https://github.com/Project-HAMi/amd-hami-core)（`libamvgpu`，由插件注入）执行；如果节点具有 `dmem` cgroup 控制器并使用 systemd cgroup 驱动，内核也会同时限制。

显存限制的前提条件和局限：

- hook 要求工作负载镜像中的 glibc 为 2.34 或更新版本。在 musl、静态链接或 glibc 更旧的镜像上不会加载 hook，Pod 将在没有进程内上限的情况下运行；插件的 `dp.muslFailClosed.enabled` 设置（默认关闭，实验性）会改为拒绝此类 Pod。
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

### 注意事项

- **核心是 CU 掩码。** `amd.com/gpucores` 会转换为 `HSA_CU_MASK`。在 RDNA GPU 上，请求会向上取整到完整的 WGP（2 个 CU），插件会把该粒度发布为 `cuPerWGP`。掩码由 ROCm 运行时执行，并由 `libamvgpu` 固定；未经过 `LD_AUDIT` hook 启动的子进程不受限制。
- **共享份数。** 插件会把每张 GPU 发布多次：RDNA4（gfx12）为 2 次，因为更多进程共享时其吞吐量会下降，其他为 10 次。插件 chart 中的 `dp.splitCount` 可以覆盖该值。
- **整卡 Pod** 既没有 CU 掩码，也没有显存限制，并且不会加载 `libamvgpu`。
- **监控。** 在插件 chart 中设置 `monitor.enabled=true` 会运行 `k8s-vgpu-monitor`。它在 9394 端口上按容器提供 `hami_vgpu_memory_used_bytes` 和 `hami_vgpu_memory_limit_bytes`，按 GPU 提供 `hami_host_gpu_memory_used_bytes`、`hami_host_gpu_utilization_ratio`、`hami_host_gpu_temperature_celsius` 和 `hami_host_gpu_power_usage_watts`，指标名称与 NVIDIA monitor 一致。不报告按容器的利用率：内核不按进程统计计算时间。
- **调度器指标**中的 AMD 核心以 GPU 的百分比表示。
