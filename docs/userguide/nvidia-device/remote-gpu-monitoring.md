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

The local and remote monitors use the same metric names, HELP text, units and labels. Both attach `zone="vGPU"`.

| Metric | Labels | Unit |
| --- | --- | --- |
| `hami_host_gpu_memory_used_bytes` | node, device_index, device_uuid, device_type | bytes |
| `hami_host_gpu_utilization_ratio` | node, device_index, device_uuid, device_type | 0–100 percent |
| `hami_vgpu_memory_used_bytes` | namespace, pod, container, vdevice_index, device_uuid | bytes |
| `hami_container_device_memory_bytes` | same container labels | bytes |
| `hami_vgpu_memory_limit_bytes` | same container labels | bytes |
| `hami_container_device_utilization_ratio` | same container labels | 0–100 percent |
| `hami_remote_gpumonitor_collect_success` | node | 1 for success, 0 for failure |
