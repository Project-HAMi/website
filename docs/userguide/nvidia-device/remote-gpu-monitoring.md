---
title: Remote GPU monitoring
sidebar_label: Remote GPU monitoring
---

HAMi supports remote GPU monitoring by running a separate `remoteGPUmonitor` sidecar container in each Lupine server Pod.

## Enable monitoring

Monitoring is enabled by default. The configuration is:

```yaml
devices:
  remotegpu:
    enabled: true
    monitor:
      enabled: true
```

## Verify collection

```bash
kubectl get pods -n hami-system -l app.kubernetes.io/component=hami-lupine-server
kubectl logs -n hami-system -l app.kubernetes.io/component=hami-lupine-server -c remote-gpu-monitor --tail=100
kubectl port-forward -n hami-system service/hami-remote-monitor 31993:31993
```

In another terminal, query the monitor:

```bash
curl -fsS http://127.0.0.1:31993/readyz
curl -fsS http://127.0.0.1:31993/metrics | grep -E '^hami_(remote_gpumonitor_collect_success|vgpu_memory_used_bytes|container_device_utilization_ratio)'
```

A `hami_remote_gpumonitor_collect_success` value of `1` indicates a successful scrape. Start a remote GPU workload to see container usage; missing usage metrics do not mean zero usage. See [real-time GPU usage](../monitoring/real-time-usage.md) for Prometheus and dashboard guidance.

## Metrics

Remote monitoring supports the host memory and utilization metrics and the container memory, memory limit and SM utilization metrics listed in [real-time device usage](../monitoring/real-time-device-usage.md#hami). These metrics use the same names, units and labels as the local monitor and include `zone="vGPU"`. Other metrics on that page, such as memory controller utilization and last-kernel time, are not provided by the remote monitor.

The remote monitor also exposes `hami_remote_gpumonitor_collect_success`, with the `node` label: `1` means the scrape and attribution succeeded, and `0` means collection failed.
