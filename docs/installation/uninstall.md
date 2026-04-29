---
title: Uninstall
---

## Prerequisites

Before uninstalling HAMi, make sure you have:

- Access to your Kubernetes cluster with `kubectl`
- Helm 3.x installed
- Administrative privileges to uninstall resources from `kube-system` namespace

## Uninstalling HAMi

### Basic Uninstallation

The simplest way to uninstall HAMi is using Helm:

```bash
helm uninstall hami -n kube-system
```

This command will remove all HAMi resources, including:
- Scheduler pods
- Device plugin DaemonSets
- ConfigMaps and Secrets
- RBAC roles and bindings

:::note

**Important:** Uninstalling HAMi won't automatically stop or kill running GPU tasks. Container processes will continue to use GPU resources even after HAMi components are removed.

:::

### Complete Cleanup (Optional)

If you want to perform a complete cleanup and remove all HAMi-related resources, follow these steps:

#### 1. Stop or reschedule running tasks

Before uninstalling, consider gracefully stopping your GPU workloads:

```bash
kubectl delete pods -l gpu-workload=true --all-namespaces --grace-period=30
```

Or reschedule them to nodes without GPU requirements.

#### 2. Verify no HAMi pods are running

After uninstallation, verify that HAMi components are removed:

```bash
kubectl get pods -n kube-system | grep -i hami
```

Should return no results.

#### 3. Clean up HAMi ConfigMaps (if custom configuration was used)

```bash
kubectl delete configmap hami-scheduler-device -n kube-system --ignore-not-found
```

#### 4. Remove any PersistentVolumes created by HAMi (if applicable)

```bash
kubectl get pv | grep hami
kubectl delete pv <pv-name>  # if any HAMi-related PVs exist
```

## Verification

To verify that HAMi has been completely removed from your cluster:

```bash
# Check if HAMi helm release is gone
helm list -n kube-system | grep hami

# Verify no HAMi pods exist
kubectl get pods --all-namespaces | grep -i hami

# Check for remaining HAMi resources
kubectl get all -n kube-system -o wide | grep -i hami
```

All commands should return no results if uninstallation was successful.

## Reinstalling HAMi

To reinstall HAMi, follow the [installation guide](./online-installation.md).

## Troubleshooting

### HAMi pods stuck in terminating state

If HAMi pods are stuck in the "Terminating" state, you can force delete them:

```bash
kubectl delete pods -n kube-system -l app=hami --grace-period=0 --force
```

Then try the uninstall command again.

### Helm release not found error

If you get an error that the helm release is not found, HAMi is already uninstalled:

```bash
Error: release named "hami" not found
```

You can verify this by checking the pods as shown in the verification section above.

### GPU resources still in use after uninstallation

If GPU resources are still allocated to pods after uninstalling HAMi, it means those pods are still running. You'll need to:

1. Stop the pods that are using GPUs
2. Check node status to see GPU availability
3. Wait for pods to be rescheduled by Kubernetes

```bash
# Check which nodes have GPU resources
kubectl describe nodes | grep -A 5 "Allocated resources"

# Restart a node if necessary (use with caution)
kubectl drain <node-name> --ignore-daemonsets
kubectl uncordon <node-name>
```

## See Also

- [Installation Guide](./online-installation.md)
- [HAMi Documentation](../core-concepts/introduction.md)
