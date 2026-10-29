---
title: 配置 AMD device plugin
sidebar_label: 配置
translated: true
---

插件 chart 会把它的 values 作为参数传给插件。[chart README](https://github.com/Project-HAMi/amd-device-plugin/blob/main/helm/amd-gpu/README.md) 列出了所有 values。chart 和镜像必须来自同一个提交或发布版本：镜像标签默认取 chart 的 `appVersion`（一个已发布的版本），而来自 `main` 的 chart 会传入已发布镜像不认识的参数，Pod 会以用法提示退出。要运行 `main`，请用同一份源码构建镜像，并设置 `dp.image.repository` 和 `dp.image.tag`。

插件需要 `NODE_NAME`，以及修改 node、`nodes/status` 和 Pod 并创建事件的 RBAC 权限，chart 已授予这两项。节点 labeller 需要 `DS_NODE_NAME`。

## Values 和参数

HAMi 与 `amd-device-plugin` 使用不同的 Chart 和 values 文件：

- HAMi：通过 `devices.amd.*` 设置调度器使用的资源名称和默认值，见 [HAMi Chart values 参数表](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md)。
- AMD 插件：通过 `dp.*` 配置插件，通过 `monitor.*` 配置监控，完整 Chart values 见[插件 Chart values 参数表](https://github.com/Project-HAMi/amd-device-plugin/blob/main/helm/amd-gpu/README.md)。

下表列出插件 Chart values 与命令行参数、环境变量的对应关系。模式切换和可选功能的前置条件见下文。

| Helm value | 参数或变量 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `dp.image.repository`、`dp.image.tag` |  | `ghcr.io/project-hami/amd-device-plugin`、chart 的 `appVersion` | 镜像。 |
| `dp.splitCount` | `-split_count` | `0` | 一张 GPU 可以被多少个 Pod 共享。`0` 按每张 GPU 选择：gfx12 上为 2，其他为 10。其他值对所有 GPU 生效。负值会报错退出。 |
| `dp.operatingMode` | `OPERATING_MODE` | `cu` | `cu` 按 CU 切分整张 GPU。`partition` 使用 Instinct GPU 的硬件计算分区。 |
| `dp.computePartition` | `COMPUTE_PARTITION` | 空 | 在 partition 模式下，启动时把空闲 GPU 切换到的计算分区（`spx`、`dpx`、`qpx` 或 `cpx`）。 |
| `dp.allocatorPolicy` | `-allocator_policy` | `besteffort` | kubelet 为多 GPU Pod 选择 GPU 的方式：`besteffort`（与 `binpack` 相同，选最近的 GPU）或 `spread`（选最远的 GPU）。 |
| `dp.dmemBackend` | `-dmem_backend` | `true` | 同时用内核 `dmem` cgroup 控制器限制切片的显存。 |
| `dp.excludeGPUs` | `-exclude_gpus` | 空 | 本节点自己保留的 GPU，写成 PCI 地址（`0000:06:00.0`）或 DRM card（`card1`）。一张都不剩时，过期的注册信息会被清除。 |
| `dp.deviceMemoryScaling` | `-device_memory_scaling` | `1` | 对每张 GPU 注册的显存做倍数放大。大于 `1` 时，Pod 会得到 `HIP_OVERSUBSCRIBE=true`，`hipMalloc` 从托管内存分配（CDNA 上需要 XNACK）。 |
| `dp.reportNodeCapacity` | `-report_node_capacity` | `false` | 把健康 GPU 的显存（`amd.com/gpumem`，MiB）和计算单元（`amd.com/gpucores`）发布为节点容量和可分配量。关闭后这些条目会被移除。 |
| `dp.cdi.enabled`、`dp.cdi.specDir` | `-cdi_spec_dir` | 关闭、`/var/run/cdi` | 通过 CDI 注入 GPU。 |
| `dp.muslFailClosed.*` | `-musl_fail_closed`、`-ctr_path`、`-containerd_socket` | 关闭 | 拒绝镜像无法加载显存 hook 的切片。实验性功能。 |
|  | `-resource_naming_strategy` | `single` | `single` 或 `mixed`，见下文。 |
| `dp.hipLogLevel` | Pod 中的 `LIBHIP_LOG_LEVEL` | `0` | Pod 中显存 hook 的日志级别（1 错误、2 警告、3 信息、4 调试）。`0` 保持库的默认值。 |
| `dp.logVerbosity` | `-v` | `2` | 日志详细程度。4 增加拓扑解析，5 增加注解解码。 |
| `dp.healthPulse` | `-pulse` | `10`（chart）、`0`（参数） | GPU 健康检查的间隔秒数。`0` 表示关闭。 |
| `dp.hookInstaller.enabled` |  | `true` | 把镜像中的 `libamvgpu.so` 复制到每个节点的 `<dp.hostHookPath>/vgpu`。 |
| `dp.hostHookPath` |  | `/usr/local` | hook 在宿主机上的目录。工作负载中始终位于 `/usr/local/vgpu/libamvgpu.so`。 |
| `monitor.enabled`（顶层） |  | `false` | 运行 `k8s-vgpu-monitor`。 |
| `monitor.metricsBindAddress`（顶层） | `-metrics_bind_address` | `:9394` | monitor 提供 `/metrics` 的地址；容器端口和抓取注解随之变化。 |

## 运行模式

插件以两种模式之一注册 AMD GPU：

- **`cu`（默认）。** 每张整卡注册为一个软设备（默认共享份数，`Mode` 为空），按 CU 和显存切分。
- **`partition`。** 设备注册为硬计算分区，`Mode` 设置为分区类型（`spx`、`qpx`），`Count: 1`。设备 ID 与 `cu` 模式相同，因此切换模式之前分配的 Pod 仍保持原有记账。发给 kubelet 的列表只包含硬设备条目。KFD 拓扑中带有 `amdgpu_xcp_*` 分区的整卡会被这些分区取代，其他已分区的 GPU 注册为一个硬设备。没有计算分区类型的 GPU，以及无法更改分区的 GPU（SR-IOV 虚拟功能没有 `available_compute_partition` 文件），保持软设备。

模式按优先级从低到高解析：默认 `cu`，然后是 `OPERATING_MODE` 变量（chart 值 `dp.operatingMode`），最后是节点注解 `hami.io/amd-operating-mode`。注解只在插件启动时读取一次，因此修改后需要重启插件 Pod。日志会以 `operating mode: <mode>` 显示解析结果。

### 切换运行模式

先排空节点。在一种模式下放置的 Pod 保留该模式的共享份数和 CU 布局，因此在 GPU Pod 运行时切换，可能让调度器和节点对空闲资源的判断不一致。如果 GPU 在仍有 Pod 使用时被切换，插件会记录警告，并发出一个点名这些 Pod 的节点 Warning 事件 `AMDGPUModeChangedInUse`，但不会停止它们。

1. 隔离并排空节点，或删除所有申请 `amd.com/gpu` 的 Pod。
2. 设置节点注解 `hami.io/amd-operating-mode`，或 chart 值 `dp.operatingMode`。
3. 重启插件 Pod：`kubectl -n kube-system rollout restart ds/amd-gpu-device-plugin-daemonset`。
4. 检查日志中的 `operating mode: <mode>`，并确认 `kubectl get node <node> -o jsonpath='{.status.allocatable}'` 中的 `amd.com/gpu` 与新模式一致。
5. 取消节点隔离。

分区数量按 GPU 计：`amd-smi set -g <id> --compute-partition qpx` 只切换一张 GPU，同一节点上可以混用 `spx` 和 `qpx` 的 GPU。从早于[设备 ID 修复](https://github.com/Project-HAMi/amd-device-plugin/pull/159)且运行在 `partition` 模式的版本升级时，同样需要先排空，因为该版本分配的 Pod 记录在新版本不认识的 ID 下。

### MI355X 分区

| 配置  | 每张 GPU 的分区数 | 每个分区的 CU 数 | `Mode` |
| ----- | ----------------- | ---------------- | ------ |
| `spx` | 1                 | 256              | `spx`  |
| `dpx` | 2                 | 128              | `dpx`  |
| `qpx` | 4                 | 64               | `qpx`  |
| `cpx` | 8                 | 32               | `cpx`  |

每张 MI355X 有 256 个 CU 和 294896 MiB 显存（288 GB）。插件注册整卡还是 `amdgpu_xcp_*` 分区，取决于内核的 KFD 拓扑，而不是插件。在列出 XCP render 次设备号的内核上，每个分区注册均分的显存和 CU（`qpx`：每张 GPU 4 个设备，各 73728 MiB 和 64 个 CU）。在内核 6.8.0-136 上拓扑中没有这些信息，因此 `qpx` 节点为每张 GPU 注册一个硬的整卡条目，同一张 GPU 的各分区共用同一个 ROCr `unique_id`。需要在节点上执行的检查见 [MI355X 分区](https://github.com/Project-HAMi/amd-device-plugin/blob/main/docs/user-guide/mi355x-partitioning.md)。

## `dmem` 显存限制

显存 hook 在进程内限制显存，因此需要 glibc 2.34 或更新版本，并且可以被绕过。`dmem` 限制由内核执行。它默认开启，但除非节点同时满足以下条件，否则插件在启动时会把它关闭并输出一行日志：

- 启用了 `dmem` 控制器的 cgroup v2（内核 6.14 或更新版本，列在 `/sys/fs/cgroup/cgroup.controllers` 中；内核 6.8 没有），
- 使用 systemd cgroup 驱动（存在 `/sys/fs/cgroup/kubepods.slice`）。

对每张被切片的 GPU，插件会在容器启动后不久，在后台把 `drm/<bdf>/vram <bytes>` 写入 Pod cgroup 的 `dmem.max`。把 `dmem.max` 降到当前用量以下并不会回收显存，所以工作负载在限制生效之前分配的显存会保持已分配状态。整卡 Pod 没有 `dmem` 限制。

## musl fail-closed

`dp.muslFailClosed.enabled=true` 会让插件在切片 Pod 启动前用 `ctr` 检查它的镜像。如果镜像基于 musl、静态链接，或使用早于 2.34 的 glibc，显存 hook 就无法加载，因此 Pod 会被拒绝；除非 `dmem` 已经限制了它的显存，此时插件会省去 hook。containerd 的 socket 和数据目录必须以 `mountPropagation: HostToContainer` 挂载。该功能是实验性的。

`dp.muslFailClosed.ctrPath` 和 `dp.muslFailClosed.containerdDataDir` 的 chart 默认值是 RKE2 的路径。在 k3s 上，把 `ctrPath` 设置为 `/var/lib/rancher/k3s/data/current/bin/ctr`，把 `containerdDataDir` 设置为 `/var/lib/rancher/k3s/agent/containerd`。其他发行版需要覆盖 `containerdSocketDir` 和 `containerdSocket`。

kubelet 在准入 Pod 时调用插件，早于拉取镜像。如果镜像还不在节点上，插件会在后台开始拉取，并以 `image is not on the node yet` 拒绝第一个 Pod。重试（例如 Deployment 重新创建 Pod）时会找到镜像并正常启动。

## CDI

设置 `dp.cdi.enabled=true` 后，插件会把 `amd.com/gpu` 的 CDI 规范写入 `dp.cdi.specDir`，每个 DRM card 一个设备，外加 `/dev/kfd`，并返回 CDI 设备名称而不是设备节点。容器运行时必须启用 CDI 并读取该目录（containerd 2.x 和 CRI-O 默认如此）。device plugin 返回 CDI 设备需要 Kubernetes 1.28 或更新版本（`DevicePluginCDIDevices` 特性门控，自 1.29 起默认开启）。关闭 CDI 不会删除规范：`amd.com-gpu.json` 会留在 `dp.cdi.specDir` 中，这无害，因为 Pod 会重新获得设备节点，直到你删除它或节点重启。

## 资源命名策略

这只对被划分为计算分区（例如 `cpx`）的 Instinct GPU 有意义：

- **`single`**（默认）：每张 GPU 和每个分区都是 `amd.com/gpu`。当节点上所有 GPU 使用相同的分区模式时使用。
- **`mixed`**：分区按模式命名，例如 `amd.com/cpx_nps4`，未分区的 GPU 仍是 `amd.com/gpu`。无法更改分区的 GPU（SR-IOV 虚拟功能）视为未分区。当一个节点混用多种分区模式时使用。

## 可选组件

- **来自 AMD Device Metrics Exporter 的 GPU 健康状态。** 安装 [exporter](https://github.com/ROCm/device-metrics-exporter)，并在 `/var/lib/amd-metrics-exporter/` 启用它的 gRPC socket。插件随后也会使用 exporter 上报的每张 GPU 的健康状态，例如出现 ECC 错误之后。没有它时，插件仍会检查每张 GPU 的设备节点能否打开。
- **GPU 指标。** `monitor.enabled=true` 会在每个 GPU 节点上运行 `k8s-vgpu-monitor`。它在 9394 端口以 HAMi NVIDIA vGPU monitor 的指标名称提供 Prometheus 指标：按容器提供 `hami_vgpu_memory_used_bytes` 和 `hami_vgpu_memory_limit_bytes`，按 GPU 提供 `hami_host_gpu_memory_used_bytes`、`hami_host_gpu_memory_total_bytes`、`hami_host_gpu_utilization_ratio`、`hami_host_gpu_temperature_celsius` 和 `hami_host_gpu_power_usage_watts`，另外按节点提供 `hami_vgpumonitor_collect_success`（最近一次采集完全成功为 1，任何部分失败为 0）。容器显存来自 `dmem` cgroup 控制器，因此需要 systemd cgroup 驱动和带有该控制器的内核。不报告按容器的利用率，因为内核不按进程统计计算时间。
- **节点 labeller。** `k8s-ds-amdgpu-labeller.yaml` 部署上游的 labeller，它会添加 `amd.com/gpu.*` 节点标签，例如显存、CU 数量、设备 ID 和系列：

```bash
kubectl apply -f k8s-ds-amdgpu-labeller.yaml
```
