---
title: AMD GPU 共享的工作原理
sidebar_label: 工作原理
translated: true
---

HAMi 通过三个部分共享 AMD GPU。HAMi 调度器和 webhook 决定哪个 Pod 获得哪张 GPU 的哪一份。[amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin) 运行在每个 AMD 节点上，发布 GPU，并在 kubelet 启动容器时限制容器。[amd-hami-core](https://github.com/Project-HAMi/amd-hami-core) 提供 `libamvgpu.so`，即在容器内执行显存限制的库。所有组件都处于 1.0 之前（`0.0.x`），采用 Apache 2.0 许可证。该插件基于 AMD 的 ROCm device plugin 发展而来。

## 什么在限制 Pod

- **计算单元。** 插件设置 `HSA_CU_MASK`，由 ROCm 运行时执行。在 RDNA 上，一个切片由完整的 WGP（CU 对）组成。
- **显存。** 通过 `LD_AUDIT` 加载的 `libamvgpu.so` hook，以及在内核 6.14 或更新版本上通过 `dmem` cgroup 控制器施加的硬限制。
- **整卡请求**没有 hook，也没有 CU 限制，因此任何镜像都能使用。

插件包含三个二进制：`k8s-device-plugin`（插件本身）、`k8s-vgpu-monitor`（可选的 Prometheus 指标）和 `k8s-node-labeller`（可选的 `amd.com/gpu.*` 节点标签，来自上游项目）。

## Pod 如何获得 GPU

1. **Webhook（HAMi）。** 检查 `amd.com/gpucores` 在 1 到 100 之间，并把 Pod 交给 HAMi 调度器。
2. **调度器（HAMi）。** 读取节点注解，选出节点和 GPU，并在 Pod 上写入 `hami.io/amd-devices-to-allocate` 和 `hami.io/amd-devices-allocated`。每个容器占一个槽位，先是 init 容器，再是应用容器。插件会把槽位映射回对应的容器，因此带 init 容器的 Pod 的切片限制会落在正确的容器上。
3. **绑定（HAMi）。** 获取节点锁（`hami.io/mutex.lock`），并设置 `hami.io/bind-phase=allocating`。
4. **Kubelet** 调用插件的 `Allocate`。
5. **插件 `Allocate`。** 找到 Pod，把分配结果转换成设备节点（`/dev/kfd`、`/dev/dri/*` 或 CDI 名称）、`ROCR_VISIBLE_DEVICES`、`HIP_VISIBLE_DEVICES` 和 `HSA_CU_MASK`。对于切片，还会加入 `HIP_DEVICE_MEMORY_LIMIT_<i>`、`LD_AUDIT` 以及 hook 的只读挂载，把 CU 位记录到 Pod 注解 `hami.io/amd-cu-allocated`，并启动 `dmem` 限制。然后设置 `bind-phase=success` 并释放锁（出错时为 `failed`）。
6. 如果没有 HAMi 跟踪的待处理 Pod，例如不是由 HAMi 调度的 Pod，插件会把 kubelet 传入的 id 当作整卡提供。

插件每 30 秒重新发布一次节点注解，每 `-pulse` 秒重新向 kubelet 发送一次设备健康状态。

## 资源

| 资源 | 含义 | 由谁执行 |
| --- | --- | --- |
| `amd.com/gpu` | GPU 数量。在 `cu` 模式下，kubelet 为每一份共享看到一个设备，因此可分配数量等于 GPU 数乘以共享份数（`dp.splitCount`，默认 10，gfx12 上为 2）。一个硬分区条目只计一次。 | HAMi `Fit`，然后是插件 |
| `amd.com/gpucores` | 每张 GPU 的 CU 百分比，1 到 100。省略表示 100。 | HAMi 预留，插件设置 `HSA_CU_MASK` |
| `amd.com/gpumem` | 每张 GPU 的显存，单位 MiB。省略表示全部。 | HAMi 预留，hook 和 `dmem` 限制执行 |
| `amd.com/gpumem-percentage` | GPU 显存的占比，最大 100（HAMi 会换算成 MiB）。 | HAMi |

只设置 `amd.com/gpumem` 的请求仍然会预留 100% 的核心，因此一张 GPU 上同一时间只能运行一个这样的 Pod。需要共享 GPU 的 Pod 都应设置 `amd.com/gpucores`。只设置 `amd.com/gpumem-percentage` 的请求，webhook 会为它补上一张 GPU。

HAMi 调度器还支持这些 Pod 注解：`amd.com/use-gputype`、`amd.com/nouse-gputype`、`amd.com/use-gpu-uuid`、`amd.com/nouse-gpu-uuid`、`amd.com/numa-bind`、`amd.com/link-bind` 和 `hami.io/gpu-scheduler-policy`。

当显存隔离很重要时，不要把整卡 Pod 和切片放在同一张卡上：整卡 Pod 没有 `dmem` 限制，也没有 hook。

## 插件发布的内容

节点注解 `hami.io/node-amd-register` 是一个 JSON 列表，每个已注册设备一项（一张整卡，或它的一个硬分区）：

| 字段 | 值 |
| --- | --- |
| `id` | AMD SMI UUID；XCP 分区为 `GPU-<unique_id>`。两种运行模式下相同。 |
| `index`、`numa`、`type`、`health` | DRM card 次设备号、NUMA 节点、市场名称；如果无法打开 DRM 节点，或 exporter 报告 GPU 不健康，则 `health` 为 false。 |
| `count` | 共享份数：`-split_count`，否则 gfx12 上为 2，其他为 10。硬分区条目为 1。 |
| `devmem`、`devcore` | 显存（MiB，乘以 `-device_memory_scaling`）和有效 CU 数。 |
| `custominfo` | `pciBDF`、`cuPerWGP`（RDNA 上为 2）、`computeQueues`、`xgmiPeers`（可通过 XGMI 到达的 GPU 的 PCI 地址）以及分区配置。 |

其他节点注解有 `hami.io/amd-operating-mode` 和 `hami.io/amd-compute-partition`，它们按节点覆盖 `OPERATING_MODE` 和 `COMPUTE_PARTITION`。

插件会发送节点事件 `AMDGPUUnhealthy`、`AMDGPUMissing`、`AMDGPURecovered` 和 `AMDGPUModeChangedInUse`。启用 `-report_node_capacity` 时，节点还会把 `amd.com/gpumem` 和 `amd.com/gpucores` 作为容量上报。没有可提供的 GPU 时，插件会清除该注解。

## 显存库

`libamvgpu.so` 来自 amd-hami-core，通过 `LD_AUDIT` 加载：

- 它包装了 HIP 的分配调用（`hipMalloc`、`hipMallocAsync`、`hipMalloc3D`、数组、内存池、虚拟内存等），超过限制时返回内存不足。`hipMemGetInfo` 和设备属性把限制值报告为总量。
- 进程之间通过内存映射文件（`/tmp/hipdevshr.cache`）共享记账。在真正分配之前先做预留，因此并发分配不会全部通过。
- 它不做 CU 掩码。它把 `HSA_CU_MASK`、`AMD_TASK_PRIORITY` 和 `HIP_OVERSUBSCRIBE` 固定为 Pod spec 中的值（从 `/proc/1/environ` 读取），因此进程无法用 `setenv` 扩大自己的切片。

| 变量 | 含义 |
| --- | --- |
| `LD_AUDIT` | 加载 hook。切片由插件设置。 |
| `HIP_DEVICE_MEMORY_LIMIT_<i>` | 第 `i` 张 GPU 的显存限制，例如 `4096m`。 |
| `HIP_OVERSUBSCRIBE` | 让 `hipMalloc` 从托管内存分配。`-device_memory_scaling` 大于 1 时设置。 |
| `AMD_TASK_PRIORITY` | 队列优先级。0 为高优先级类别，数值越大优先级越低。由用户在 Pod spec 中设置。 |
| `LIBHIP_LOG_LEVEL` | hook 的日志级别，1（错误）到 4（调试）。 |
| `HIP_DEVICE_MEMORY_SHARED_CACHE`、`ACTIVE_OOM_KILLER` | 其他 hook 设置，详见 amd-hami-core 仓库。 |

hook 的局限：

- 丢失 `LD_AUDIT` 的进程（例如使用 `env -i`）、静态二进制和 musl 镜像都在没有 hook 的情况下运行。其中 `dmem` 限制仍然有效，但超过限制的 `hipMallocAsync` 会让进程在 ROCm 运行时中中止。
- 构建基线为 glibc 2.34。`hipMallocMipmappedArray` 不会被拦截。
- 每个容器最多支持 64 个设备和 1024 个进程。
- 没有 `LD_AUDIT` 启动的子进程同样不受 CU 掩码约束。
