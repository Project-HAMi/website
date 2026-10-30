---
title: 远程 GPU 监控
sidebar_label: 远程 GPU 监控
---

HAMi 通过在 Lupine 服务端 Pod 中运行独立的 `remoteGPUmonitor` sidecar 容器提供远程 GPU 监控支持。

## 如何启用

默认启用，配置位于：

```yaml
devices:
  remotegpu:
    enabled: true
    monitor:
      enabled: true
```

## 验证采集

```bash
kubectl get pods -n hami-system -l app.kubernetes.io/component=hami-lupine-server
kubectl logs -n hami-system -l app.kubernetes.io/component=hami-lupine-server -c remote-gpu-monitor --tail=100
kubectl port-forward -n hami-system service/hami-remote-monitor 31993:31993
```

在另一个终端查询 monitor：

```bash
curl -fsS http://127.0.0.1:31993/readyz
curl -fsS http://127.0.0.1:31993/metrics | grep -E '^hami_(remote_gpumonitor_collect_success|vgpu_memory_used_bytes|container_device_utilization_ratio)'
```

`hami_remote_gpumonitor_collect_success` 为 `1` 表示采集成功。启动远程 GPU 工作负载后可查看容器使用量；缺少使用指标不代表使用量为零。Prometheus 和 dashboard 配置请参考[实时 GPU 使用情况](../monitoring/real-time-usage.md)。

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
