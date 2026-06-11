---
id: grafana-dashboard
title: Grafana Dashboard
sidebar_label: Grafana Dashboard
---

HAMi ships a pre-built Grafana dashboard that visualizes GPU allocation, memory usage, and per-pod utilization metrics exported by the HAMi device plugin.

## Import the Dashboard

1. Open your Grafana instance and go to **Dashboards > Import**.
2. Download the dashboard template:
   - [gpu-dashboard.json](/grafana/gpu-dashboard.json)
3. Upload the JSON file or paste its contents into the import dialog.
4. Select your Prometheus data source and click **Import**.

## Dashboard Panels

The dashboard includes panels for:

- GPU memory allocation per pod
- GPU core utilization per pod
- Node-level GPU resource availability
- Device plugin health status

## Prometheus Scrape Config

The `hami-device-plugin` pod on each node exposes metrics on port `31992` (configurable via `devicePlugin.monitorPort`). Add a scrape job:

```yaml
scrape_configs:
  - job_name: hami-device-plugin
    static_configs:
      - targets:
          - <node-ip>:31992
```

For Prometheus Operator, create a `ServiceMonitor` targeting the `hami-device-plugin` service on port `31992`.

Key metrics:

| Metric | Description |
| --- | --- |
| `Device_memory_desc_of_container` | Virtual GPU memory allocated to a container |
| `Device_utilization_desc_of_container` | GPU compute utilization per container |
| `Device_memory_limit_of_container` | Memory limit set for the container |

## Prerequisites

- Prometheus is installed and scraping the HAMi device plugin metrics endpoint.
- The HAMi device plugin is running and exposing metrics on the configured port.

For details on enabling metrics collection, see [Real-time GPU Usage](real-time-usage) and [Real-time Device Usage](real-time-device-usage).
