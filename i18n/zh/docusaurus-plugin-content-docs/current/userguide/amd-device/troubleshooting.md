---
title: AMD GPU 共享故障排查
sidebar_label: 故障排查
translated: true
---

## 现象和原因

| 现象 | 可能的原因 |
| --- | --- |
| Pod 一直 `Pending`，原因为 `CardInsufficientCore` 或 `CardInsufficientMemory`。 | 其他 Pod 占用了核心或显存。没有设置 `amd.com/gpucores` 的 Pod 会预留 100% 的核心。 |
| Pod 一直 `Pending`，原因为 `NodeInsufficientDevice`。 | 可分配的 `amd.com/gpu` 为 0（插件未运行或 GPU 不健康），或者请求需要的不同 GPU 数量超过节点所有。 |
| Pod 一直 `Pending`，原因为 `CardNotHealth`。 | 插件把该 GPU 发布为不健康：无法打开它的 DRM 节点，或 AMD Device Metrics Exporter 报告了故障。查看节点事件 `AMDGPUUnhealthy`。 |
| Pod 一直 `Pending`，原因为 `CardTypeMismatch` 或 `CardUuidMismatch`。 | 没有 GPU 符合 `amd.com/use-gputype` 或 `amd.com/use-gpu-uuid`，或者所有符合的 GPU 都被 `nouse` 注解排除。 |
| Pod 一直 `Pending`，原因为 `ResourceQuotaNotFit`。 | 命名空间 `ResourceQuota` 中 `limits.amd.com/gpumem` 已用完。 |
| Pod 一直 `Pending`，原因为 `ExclusiveDeviceAllocateConflict`。 | Pod 使用 `mutex` 策略，而所有 GPU 都被其他 Pod 占用。 |
| Pod 失败，提示 `no binding pod found`。 | 旧版插件收到了一个不是由 HAMi 调度的 Pod。当前版本会为这类 Pod 提供整卡。 |
| 带 init 容器的切片 Pod 得到整张 GPU（日志为 `annotation allocation unavailable`）。 | 插件早于跳过 init 容器槽位的注解映射修复。请升级插件。 |
| 切片 Pod 因 `UnexpectedAdmissionError` 失败。 | GPU 没有足够的空闲 CU 满足请求，常见原因是在 RDNA 上切片被向上取整到完整 WGP。读取 `cuPerWGP` 的 HAMi 调度器会让这类 Pod 保持 `Pending`。 |
| 插件 Pod 以用法提示退出。 | chart 和镜像来自不同的版本。 |
| 重启后可分配的 `amd.com/gpu` 为 0。 | 等待一次注册（30 秒）。检查是否有其他插件占用了 `amd.com/gpu`。 |
| kubelet 日志中出现 `device plugin already connected`。 | 有两个插件注册了 `amd.com/gpu`，例如上游的 ROCm 插件。移除其中一个。 |
| 切片没有进程内的显存限制。 | 镜像无法加载 hook（musl、静态链接，或 glibc 早于 2.34）。节点支持时，内核 `dmem` 限制仍然有效，因此只有 `dmem` 也不可用或已关闭（内核早于 6.14、没有 systemd cgroup 驱动，或 `dp.dmemBackend=false`）时，切片才完全没有限制。启用 `muslFailClosed` 时会拒绝此类 Pod，除非 `dmem` 已经限制了它。 |
| 使用 `hipMallocAsync` 的 Pod 在超过限制时中止。 | 没有 hook 时只有 `dmem` 限制生效，ROCm 运行时会中止进程。 |
| 只设置 `amd.com/gpumem` 的 Pod 占满了 GPU 的算力。 | 没有 `amd.com/gpucores` 的请求会预留全部 CU。请设置 `amd.com/gpucores`。 |
| 节点上的 `hami.io/mutex.lock` 一直存在。 | 某次绑定没有完成。该锁在 HAMi 的锁超时（默认 5 分钟）后过期。 |
| 非 root Pod 无法打开 `/dev/kfd`。 | 为节点的 `video` 和 `render` 组设置 `runAsUser` 和 `supplementalGroups`。组 ID 因节点而异。 |

## 命令

```bash
# 插件 Pod
kubectl -n kube-system get pods -l name=amd-gpu-dp-ds
# 插件日志
kubectl -n kube-system logs ds/amd-gpu-device-plugin-daemonset
# 节点注册的 GPU
kubectl get node <node> -o jsonpath='{.metadata.annotations.hami\.io/node-amd-register}'
# Pod 的分配结果
kubectl get pod <pod> -o jsonpath='{.metadata.annotations.hami\.io/amd-devices-allocated}'
```

检查宿主机上是否存在 `/dev/kfd` 和 `/dev/dri`。可以用 `dp.logVerbosity` 提高日志级别（4 增加拓扑解析，5 增加注解解码）。

## 术语表

- **CU**：计算单元。**WGP**：工作组处理器，RDNA 上的一对 CU。
- **CDNA、RDNA**：AMD 的数据中心（Instinct）和消费级 GPU 系列。**gfx**：ISA 名称，例如 gfx942（MI300 系列）或 gfx12（RDNA4）。
- **SPX、DPX、QPX、CPX**：分别有 1、2、4、8 个分区的计算分区模式。**NPS**：内存分区模式。**XCP、XCC**：一个分区及其计算芯片。
- **XGMI**：GPU 之间的互联链路。**VF**：SR-IOV 虚拟功能，不能更改分区。
- **`dmem`**：按 cgroup 限制显存的内核 cgroup 控制器。**CDI**：容器设备接口（Container Device Interface）。
- **HAMi**：预留共享份额的调度器和 webhook。**Hook**：`libamvgpu.so`。
