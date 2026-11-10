---
title: AMD GPU 测试状态
sidebar_label: 测试状态
translated: true
---

本页概述在真实 AMD GPU 上检查了什么、发现了什么，以及还剩什么。完整记录（为每个已合并的 PR 提供一行说明）见 [STATUS.md](https://github.com/Project-HAMi/amd-device-plugin/blob/main/STATUS.md)，项目的简短介绍见 [ONBOARDING.md](https://github.com/Project-HAMi/amd-device-plugin/blob/main/ONBOARDING.md)。这两个文件涵盖 [amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin) 和 [amd-hami-core](https://github.com/Project-HAMi/amd-hami-core) 两个仓库，以及 [HAMi](https://github.com/Project-HAMi/HAMi) 中与 AMD 相关的 PR。

## 测试方式

- 一块真实的 AMD Instinct MI325X（单张 GPU，对机器呈现为虚拟功能），搭配 k3s、HAMi 调度器和由 `main` 构建的插件，内核先是 6.8，后来是 7.0。`dmem` 显存限制需要内核 6.14 或更新版本。
- 同一台机器上还运行了：真实的 AMD Device Metrics Exporter、作为第二个 DaemonSet 的上游 ROCm 插件、已发布的 0.0.2 和 0.0.3 镜像、UBI、alpine、fedora 和旧 glibc 镜像、ROCm 6.2 和 7.2，以及示例 Pod（PyTorch、TensorFlow、JAX 和 vLLM）。
- 多张 GPU 只为 HAMi 调度器做了模拟，方法是在节点注册信息中写入额外的 GPU。

## 已验证的内容

- **切片和 CU 掩码：**各 Pod 之间互不重叠，并且固定住以防 `setenv`。在 25% 的切片中，一个计算 kernel 的速度为每秒 215 个。没有库时，在进程内设置 `HSA_CU_MASK` 会把它放宽到 1015，有库时保持 215。
- **显存限制：**限制为 1 GiB 时，`hipMalloc3D`、数组、内存池和 `hipMemCreate` 都返回内存不足，`hipMemGetInfo` 报告 1 GiB。三个进程各申请 1.5 GiB、总限制 4 GiB：三轮中每一轮都恰好有两个成功。vLLM 引擎在 25% 的切片内运行，看到 16384 MiB。
- **`dmem` 限制**（内核 7.0），以及据此读取的按容器指标。
- **队列优先级：**同一个 25% 切片上的两个进程，`AMD_TASK_PRIORITY` 为 0 和 3 时分别得到每秒 144.7 和 72.3 个 kernel，不设置优先级时各约 108.6。
- **插件生命周期：**已发布的 0.0.2 和 0.0.3 的升级与回滚、kubelet 重启（可分配量在 6 秒内恢复，运行中的 Pod 保持运行）、CDI，以及被 kubelet 拒绝的第二个插件。
- **健康状态：**真实的 Device Metrics Exporter 让健康的 GPU 保持完整的共享份数，测试用的 exporter 则把它降到 0 并发出节点事件。
- **HAMi 调度器功能：**显存百分比、命名空间 ResourceQuota、`mutex` 策略（以及 `binpack,mutex`）、NUMA 和链路绑定、`runtimeClassName`、把核心请求向上取整到完整 WGP，以及端到端测试集（9 个用例通过，0 个失败，2 个跳过）。
- **本文档中的示例：**8 个示例清单都在该 GPU 上应用过。整卡、核心、显存和显存百分比的 Pod 都运行了，类型和 UUID 的 Pod 运行了，或者按其注释所说以 `CardTypeMismatch` 或 `CardUuidMismatch` 保持 `Pending`。
- **显存库的 C 测试**在 AddressSanitizer、UBSan 和 ThreadSanitizer 下通过，glibc 2.34 检查也通过。

## 发现并修复的问题

重新运行每个已合并的 PR 发现了以下真实问题，均已修复。

- 不是由 HAMi 调度的 Pod 启动时失败，提示 `no binding pod found`。
- 固件测试在内核 7.0 上失败，因为 debugfs 的一行多了一个新字段。
- 启用 `muslFailClosed` 时，第一个使用新镜像的 Pod 失败，之后每次重试也失败。
- 关闭 `reportNodeCapacity` 后，节点上仍残留旧值。
- 镜像用一个存在已知标准库漏洞的 Go 版本构建，并且 `go.mod` 使用了 gRPC 的开发标签。
- 使用 `-resource_naming_strategy=mixed` 时，虚拟功能被命名为 `amd.com/spx_nps1`，`amd.com/gpu` 变成 0。
- 对 `dpx`、`qpx` 和 `cpx`，注册信息中每个分区的 XCC 为 0，因为 AMD SMI 只列出当前配置的 XCC。
- 在 HAMi master 上，类型为空的已注册 GPU 永远不会被选中，Pod 因 `NodeInsufficientDevice` 保持 `Pending`。该问题已在 HAMi 中修复。
- 带 init 容器的 Pod 没有得到切片限制（没有 CU 掩码、显存限制、hook 和 `dmem` 限制），因为插件按应用容器索引，没有跳过 HAMi 首先写入的 init 容器槽位，`Allocate` 因此退回到整张 GPU。该问题在 RX 9070 XT 上发现，已修复。

## 尚未验证的内容

- **多张 GPU、XGMI、NUMA 和策略顺序。**只运行了调度器的决策过程，并在注册信息中写入了额外的 GPU。需要一个真实的多 GPU Instinct 节点。
- **计算分区（`dpx`、`qpx`、`cpx`）。**虚拟功能在两种运行模式下都能继续工作，切换会被跳过并输出一行日志，但切换本身、XCP 注册和分区上的 Pod 需要裸机 MI300、MI325 或 MI355。运行插件时设置 `OPERATING_MODE=partition` 和 `COMPUTE_PARTITION`。
- **RDNA 显卡。** 仅在 RX 9070 XT 上验证过上述 init 容器的情况。
- **Device Metrics Exporter 报告的真实硬件故障。**
- **XNACK**，即大于显存的 `hipMalloc` 由主机内存提供（虚拟功能上 XNACK 是关闭的）。
- **双 GPU 的 JAX 示例和 vLLM 模型下载。**模型下载需要一个能访问 Hugging Face 的节点。
- **发布流程、arm64 和其他 Kubernetes 版本。**

## 待解决的问题

- **核心默认值。**没有 `amd.com/gpucores` 的请求会获得全部 CU，因此只设置 `amd.com/gpumem` 的 Pod 会占满该 GPU 的算力。需要共享 GPU 的 Pod 都应设置 `amd.com/gpucores`。
- **k3s 路径。**`muslFailClosed` 的 chart 默认值是 RKE2 路径，因此在 k3s 上必须设置两个值（见[配置](./configuration.md#musl-fail-closed)）。
