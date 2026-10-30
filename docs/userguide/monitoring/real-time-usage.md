---
title: Real-time GPU Usage
sidebar_label: Real-time Usage
---

Use HAMi metrics to observe GPU utilization and memory usage. Node Capacity, Allocatable, and allocation annotations describe resource inventory or assignments; they do not measure real-time usage.

## GPU and container metrics

Follow the [Grafana dashboard guide](./grafana-dashboard.md) to configure Prometheus and dashboards. Collect both HAMi metric sources:

| Source                        | Purpose                                     |
| ----------------------------- | ------------------------------------------- |
| HAMi scheduler                | Device inventory, capacity, and allocations |
| vGPU monitor on each GPU node | Physical GPU and container vGPU usage       |

For NVIDIA hardware telemetry, optionally add DCGM Exporter as described in that guide. Other vendors' device plugins and monitors are deployed separately; use the monitoring instructions for the selected vendor.

For Lupine-served GPUs, see [remote GPU monitoring](../nvidia-device/remote-gpu-monitoring.md) for its endpoint and supported metrics.

## Inspect allocations

The following examples use NVIDIA's default resource names. Substitute the actual namespace, Pod, container, and node names.

Check the node's allocatable resources and registered GPU inventory:

```bash
kubectl get node <node-name> -o jsonpath='{.status.allocatable}'
kubectl get node <node-name> -o jsonpath='{.metadata.annotations.hami\.io/node-nvidia-register}'
```

Inspect the Pod's resource requests, allocation annotation, and events:

```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.metadata.annotations.hami\.io/vgpu-devices-allocated}'
```

These values help explain placement and allocation. Use the monitor metrics for actual utilization and memory usage.

## Check NVIDIA device visibility

If `nvidia-smi` is available in the workload image, check the devices visible to a container:

```bash
kubectl exec -n <namespace> <pod-name> -c <container-name> -- nvidia-smi
```

The output depends on the runtime and sharing mode. It does not replace HAMi's allocation information or provide a complete view of a container's compute quota. Running `nvidia-smi` on the host shows the physical GPUs.

## Check component status

For the default `hami` release in `kube-system`:

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/instance=hami
kubectl logs -n kube-system -l app.kubernetes.io/instance=hami,app.kubernetes.io/component=hami-device-plugin -c device-plugin --tail=100
```

Use the actual release labels and namespace for other deployments. Vendor plugins installed separately have their own labels and container names. For allocation failures, also inspect the Pod events and scheduler logs; see [Troubleshooting](../../troubleshooting/troubleshooting.md).
