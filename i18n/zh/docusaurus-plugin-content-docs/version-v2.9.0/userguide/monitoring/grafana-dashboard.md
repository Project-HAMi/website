---
title: Grafana 仪表盘
sidebar_label: Grafana 仪表盘
---

HAMi 提供预构建的 Grafana Dashboard，用于可视化 HAMi 设备插件导出的 GPU 分配、显存使用和每 Pod 利用率指标。

## 导入 Dashboard

1. 打开 Grafana 实例，进入 **Dashboards > Import**。
2. 下载 Dashboard 模板：
   - [gpu-dashboard.json](/grafana/gpu-dashboard.json)
3. 上传 JSON 文件或将内容粘贴到导入对话框中。
4. 选择 Prometheus 数据源，点击 **Import**。

## Dashboard 面板

Dashboard 包含以下面板：

- 每 Pod 的 GPU 显存分配
- 每 Pod 的 GPU 核心利用率
- 节点级 GPU 资源可用量
- 设备插件健康状态

## Prometheus 采集配置

每个节点上的 `hami-device-plugin` Pod 在端口 `31992`（可通过 `devicePlugin.monitorPort` 配置）上暴露指标。添加采集任务：

```yaml
scrape_configs:
  - job_name: hami-device-plugin
    static_configs:
      - targets:
          - <node-ip>:31992
```

对于 Prometheus Operator，创建一个 `ServiceMonitor`，指向 `hami-device-plugin` 服务的 `31992` 端口。

关键指标：

| 指标                              | 说明                              |
| --------------------------------- | --------------------------------- |
| `hami_host_gpu_utilization_ratio` | 主机上的 GPU 实时利用率（0–100）  |
| `hami_host_gpu_memory_used_bytes` | 主机上的 GPU 实时设备显存使用情况 |

## 前置条件

- 已安装 Prometheus 并采集 HAMi 设备插件指标端点。
- HAMi 设备插件正在运行并在配置端口上暴露指标。

有关启用指标采集的详细信息，请参见[实时 GPU 用量](real-time-usage)和[实时设备用量](real-time-device-usage)。
