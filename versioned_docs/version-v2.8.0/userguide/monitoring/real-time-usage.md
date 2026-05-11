---
title: Real-time GPU Usage
sidebar_label: Real-time Usage
---

Real-time monitoring allows you to track GPU utilization, memory usage, and resource allocation across your Kubernetes cluster as workloads run. HAMi provides tools to observe GPU behavior dynamically.

## Monitoring with kubectl

### Check Node GPU Resources

View current GPU capacity and allocatable resources on a node:

```bash
kubectl get node <node-name> -o json | jq '.status.allocatable' | grep -i gpu
```

### Inspect Pod GPU Allocation

See which GPUs are allocated to a specific pod:

```bash
kubectl get pod <pod-name> -o json | jq '.metadata.annotations' | grep -i gpu
```

Or view all GPU-related information:

```bash
kubectl describe pod <pod-name>
```

## Monitoring Inside Containers

### Check Allocated GPU Inside Pod

Inside a running container, you can check which GPUs are visible:

```bash
kubectl exec -it <pod-name> -- nvidia-smi
```

This shows the virtual GPU configuration as seen by the container, including allocated memory and cores.

### Real-time GPU Usage

To monitor GPU usage while a workload runs:

```bash
kubectl exec -it <pod-name> -- watch -n 1 nvidia-smi
```

This updates the GPU metrics every second, showing:
- GPU utilization percentage
- Memory usage and limits
- Running processes

## Node-Level Monitoring

### Monitor All GPUs on a Node

SSH into the node and run:

```bash
nvidia-smi
```

For continuous monitoring:

```bash
watch -n 1 nvidia-smi
```

### Check HAMi Device Plugin Status

Verify the HAMi device plugin is running and reporting resources:

```bash
kubectl get pods -n kube-system | grep hami
kubectl logs -n kube-system -l app=hami-scheduler -f
```

## Resource Annotation Tracking

HAMi stores GPU information in node annotations. View them with:

```bash
kubectl get node <node-name> -o yaml | grep -A 10 "hami.io/node"
```

This shows detailed GPU information including:
- GPU UUIDs
- Memory capacity
- Compute core count
- Device models

## Integration with Monitoring Tools

For production environments, integrate HAMi with tools like:

- **Prometheus**: Scrape kubelet metrics for GPU resource data
- **Grafana**: Visualize GPU utilization trends over time
- **Kubernetes Dashboard**: View GPU resources in the web UI

Refer to the Kubernetes documentation for setting up monitoring with these tools.

## Troubleshooting

If you notice GPU allocation inconsistencies:

1. Check pod resource requests/limits match HAMi annotations
2. Verify the HAMi scheduler is running
3. Check device plugin logs for errors
4. Ensure nodes have the required GPU labels

For more details, see the [troubleshooting guide](../../troubleshooting/troubleshooting.md).
