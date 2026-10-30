---
title: 远程 GPU 监控
sidebar_label: 远程 GPU 监控
---

HAMi 在 chart 管理的每个 Lupine 服务端 Pod 中运行独立的 `remoteGPUmonitor` 容器。它抓取同一 Pod 中 Lupine 服务端的 `/metrics`，并通过集群范围的只读 Pod informer 将工作负载身份映射到容器。该组件不需要 NVML、CUDA 库、宿主机 PID 命名空间或宿主机文件系统挂载，ServiceAccount 仅需读取 Pod。

使用包含 `remoteGPUmonitor` 的 HAMi 镜像，可通过 `make docker` 构建镜像，或使用 `make remoteGPUmonitor` 构建二进制。monitor 使用 `devicePlugin.monitor.image`。Lupine 客户端和服务端需要支持监控及 `LUPINE_WORKLOAD_ID` 元数据（Lupine 提交 `b990d4aa2c33719e649604f6657bcfc9f5d7f895` 或之后版本）；旧版本仍可调用 GPU，但缺少身份的样本无法归属到容器。

```yaml
devices:
  remotegpu:
    enabled: true
    monitor:
      enabled: true
      port: 31993
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
```

## 外部 Lupine 服务端

对于外部管理的 Lupine 服务端，需要单独部署 monitor，并参照 `remotemonitorrole.yaml` 创建允许 `get`、`list`、`watch` Pod 的 ClusterRole，参照 `remotemonitor.yaml` 创建 ServiceAccount 和 ClusterRoleBinding。这些 chart 模板受 chart 管理服务端的配置条件控制：可启用相关设置来渲染模板，或自行创建等价资源。启动参数包括 `--node=<GPU 服务端节点名>`、`--lupine-metrics-url=http://<服务端>:<端口>/metrics` 和 `--metrics-bind-address=:31993`。chart 只为自身管理的服务端 DaemonSet 创建 monitor；使用 hostNetwork 时应确保监听端口空闲。

## 验证采集

对于安装在 `kube-system` 命名空间、名为 `hami` 的 release，检查服务端 Pod 和 monitor 容器：

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/component=hami-lupine-server
kubectl logs -n kube-system -l app.kubernetes.io/component=hami-lupine-server -c remote-gpu-monitor --tail=100
kubectl port-forward -n kube-system service/hami-remote-monitor 31993:31993
```

在另一个终端查询 monitor：

```bash
curl -fsS http://127.0.0.1:31993/readyz
curl -fsS http://127.0.0.1:31993/metrics | grep -E '^hami_(remote_gpumonitor_collect_success|vgpu_memory_used_bytes|container_device_utilization_ratio)'
```

如果命名空间、release 名或端口不同，请替换为实际配置。`hami_remote_gpumonitor_collect_success` 为 `1` 表示采集成功。启动远程 GPU 工作负载后可查看容器使用量；缺少使用指标不代表使用量为零。Prometheus 和 dashboard 配置请参考[实时 GPU 使用情况](../monitoring/real-time-usage.md)。

## 身份与归属

admission 通过 Downward API 设置 `HAMI_REMOTE_POD_UID`，并设置 `LUPINE_WORKLOAD_ID=$(HAMI_REMOTE_POD_UID)/<容器名>`。kubelet 启动各容器时展开 UID，包括 init container。monitor 根据指定 GPU 服务端节点的调度分配 annotation 精确匹配 Pod UID、容器名和 GPU UUID；旧 Pod 的数据不会归属到重建后的同名 Pod，未知身份或未分配 GPU 的样本会被忽略。身份字段用于归属，不是认证凭据。

分配 annotation 按 init container、普通容器的顺序记录设备，并由此确定 `vdevice_index`。同一容器的显存使用量相加，SM 利用率相加并限制在 100。Lupine 将工作负载身份作为 `client_id` 输出，不再输出独立的 `workload_id` 标签；身份、地址、hostname、进程名和 GPU 都相同的进程已由 Lupine 聚合。HAMi 将剩余来源序列汇总为容器/GPU 指标，不暴露进程标签。完整来源标签完全重复的样本会使抓取失败，避免重复计数，不需要额外的 Prometheus recording rule。

身份未设置、无效，或同一进程的连接报告了相互冲突的身份时，Lupine 会退回使用进程 ID。该值不能匹配 HAMi 的 Pod UID/容器身份，因而不计入容器使用指标。

## 指标

本地和远程 monitor 使用相同的指标名称、HELP 文本、单位和标签，并附加 `zone="vGPU"`。

| 指标 | 标签 | 单位 |
| --- | --- | --- |
| `hami_host_gpu_memory_used_bytes` | node、device_index、device_uuid、device_type | 字节 |
| `hami_host_gpu_utilization_ratio` | node、device_index、device_uuid、device_type | 0–100 百分比 |
| `hami_vgpu_memory_used_bytes` | namespace、pod、container、vdevice_index、device_uuid | 字节 |
| `hami_container_device_memory_bytes` | 相同的容器标签 | 字节 |
| `hami_vgpu_memory_limit_bytes` | 相同的容器标签 | 字节 |
| `hami_container_device_utilization_ratio` | 相同的容器标签 | 0–100 百分比 |
| `hami_remote_gpumonitor_collect_success` | node | 成功为 1，失败为 0 |

显存限额使用分配设备的容量；如果注入了 `CUDA_DEVICE_MEMORY_LIMIT`，则取两者中较小的值。利用率是进程样本相加，并非并发 GPU 活动时间的精确并集。Lupine 无法提供的温度、功耗、ECC、显存控制器利用率和最近内核时间等指标不会输出，缺失的使用量也不会被补成零。

抓取超时为 3 秒，响应上限为 16 MiB。HTTP 错误、指标格式错误、NVML 不可用或 Pod 缓存未同步时只输出采集失败指标，不重放旧值。`/healthz` 检查进程，`/readyz` 检查 informer 同步状态。启用 `prometheus.enabled` 且存在 ServiceMonitor CRD 时，chart 会创建 Service 和可选的 ServiceMonitor。本地 monitor 也可能在服务端节点输出物理 GPU 指标，应选择相应的抓取任务，避免重复累加。
