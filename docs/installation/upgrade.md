---
title: Upgrade
---

## Overview

Upgrading HAMi to a new version should be done carefully to avoid disrupting GPU workloads. This guide covers the upgrade process, compatibility considerations, and best practices.

## Before You Upgrade

### 1. Check Compatibility

Verify that your target HAMi version is compatible with your current Kubernetes version and NVIDIA driver:

```bash
# Current HAMi version
helm list -n kube-system | grep hami

# Kubernetes version
kubectl version --short

# NVIDIA driver version (on GPU nodes)
nvidia-smi | grep "Driver Version"
```

### 2. Backup Current Configuration

Save your current HAMi configuration in case you need to rollback:

```bash
# Backup current values
helm get values hami -n kube-system > hami-backup-values.yaml

# Backup ConfigMaps
kubectl get configmap hami-scheduler-device -n kube-system -o yaml > hami-configmap-backup.yaml

# Check current state
kubectl get all -n kube-system -l app=hami -o yaml > hami-state-backup.yaml
```

### 3. Clear Running Workloads

⚠️ **CRITICAL:** Before upgrading, stop or reschedule all GPU workloads. Upgrading with running tasks can cause segmentation faults and unpredictable behavior.

**Gracefully drain GPU workloads:**

```bash
# Find pods using GPU
kubectl get pods --all-namespaces -o json | jq -r '.items[] | select(.spec.containers[]?.resources.limits | select(. != null) | select(has("nvidia.com/gpu") or has("enflame.com/vgcu"))) | "\(.metadata.namespace) \(.metadata.name)"'

# Delete or reschedule these pods
kubectl delete pods <pod-name> -n <namespace> --grace-period=30
```

Or reschedule to non-GPU nodes if available:

```bash
# Add node selector to force scheduling away from GPU nodes
kubectl patch deployment <deployment-name> -n <namespace> -p '{"spec":{"template":{"spec":{"nodeSelector":{"gpu":"false"}}}}}'
```

### 4. Verify HAMi Components Are Running

Before proceeding, ensure all HAMi components are healthy:

```bash
# Check pod status
kubectl get pods -n kube-system -l app=hami

# Check for errors
kubectl logs -n kube-system -l app=hami-scheduler --tail=50
kubectl logs -n kube-system -l app=hami-device-plugin --tail=50
```

## Upgrade Process

### Standard Upgrade (Recommended)

For most cases, use the standard upgrade process:

```bash
# Update Helm repository
helm repo update hami-charts

# Check available versions
helm search repo hami-charts/hami --versions

# Get current values (preserve custom configuration)
helm get values hami -n kube-system > current-values.yaml

# Perform upgrade
helm upgrade hami hami-charts/hami -n kube-system -f current-values.yaml
```

### In-Place Upgrade (If Using Existing Installation)

If you don't have a custom values file, you can upgrade directly:

```bash
helm repo update hami-charts
helm upgrade hami hami-charts/hami -n kube-system
```

### Uninstall and Reinstall (For Major Version Changes)

For major version upgrades with breaking changes, uninstall first:

```bash
# Uninstall current version
helm uninstall hami -n kube-system

# Update repository
helm repo update

# Reinstall with new version
helm install hami hami-charts/hami -n kube-system
```

## Post-Upgrade Verification

After the upgrade completes, verify that HAMi is functioning correctly:

### 1. Check Pod Status

```bash
kubectl get pods -n kube-system -l app=hami
```

All pods should be in `Running` state.

### 2. Verify Component Health

```bash
# Check scheduler logs for errors
kubectl logs -n kube-system -l app=hami-scheduler | grep -i "error\|warning" | head -20

# Check device plugin logs
kubectl logs -n kube-system -l app=hami-device-plugin | grep -i "error" | head -20
```

### 3. Test GPU Allocation

Deploy a test pod to verify GPU resources are properly allocated:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test-pod
  namespace: default
spec:
  containers:
  - name: test
    image: nvidia/cuda:12.2.0-runtime-ubuntu22.04
    command: ["nvidia-smi"]
    resources:
      limits:
        nvidia.com/gpu: 1
  restartPolicy: Never
EOF

# Check if pod runs successfully
kubectl logs gpu-test-pod

# Clean up
kubectl delete pod gpu-test-pod
```

### 4. Verify Node GPU Status

```bash
# Check GPU allocatable resources on each node
kubectl describe nodes | grep -A 5 "Allocated resources"

# Check HAMi annotations on nodes
kubectl get nodes -o yaml | grep -A 10 "hami.io"
```

## Troubleshooting

### Pods Stuck in Pending State

If pods remain in pending state after upgrade:

```bash
# Check pod events
kubectl describe pod <pod-name>

# Check scheduler logs
kubectl logs -n kube-system -l app=hami-scheduler | grep -i "pending\|error"

# Verify GPU availability
kubectl describe nodes | grep -i "gpu"
```

**Solution:** Restart the HAMi device plugin:

```bash
kubectl rollout restart daemonset/hami-device-plugin -n kube-system
```

### GPU Not Recognized After Upgrade

If GPUs are not being detected:

```bash
# Verify NVIDIA driver is still loaded on nodes
kubectl debug node/<node-name> -it --image=ubuntu

# Inside the debug container
lspci | grep -i gpu
nvidia-smi
exit

# Restart device plugin on affected node
kubectl delete pods -n kube-system -l app=hami-device-plugin --field-selector spec.nodeName=<node-name>
```

### Segmentation Fault During Upgrade

If you see segmentation faults:

1. **Root Cause:** Running workloads during upgrade (as warned above)
2. **Immediate Action:** Restart affected pods:
   ```bash
   kubectl delete pods <affected-pod-name> -n <namespace>
   ```
3. **Prevention:** Always clear workloads before upgrading

### Helm Chart Configuration Changed

If your custom values are no longer compatible:

```bash
# Compare old and new values
helm show values hami-charts/hami > new-defaults.yaml
diff current-values.yaml new-defaults.yaml

# Update your values file with deprecated keys removed
# Then retry the upgrade
helm upgrade hami hami-charts/hami -n kube-system -f current-values.yaml
```

## Rollback Procedures

If something goes wrong during upgrade, you can rollback to the previous version:

### Rollback Using Helm

```bash
# View revision history
helm history hami -n kube-system

# Rollback to previous release
helm rollback hami -n kube-system

# Or rollback to specific revision
helm rollback hami <revision-number> -n kube-system
```

### Manual Rollback

If helm rollback doesn't work:

```bash
# Get previous HAMi version from backup
helm install hami hami-charts/hami -n kube-system --version <previous-version> -f hami-backup-values.yaml

# Or restore from kubectl backup
kubectl apply -f hami-state-backup.yaml
```

## Version Compatibility Matrix

| HAMi Version | Min Kubernetes | Max Kubernetes | NVIDIA Driver | Notes |
|---|---|---|---|---|
| v2.9.x | 1.24 | 1.29 | ≥450.x | Latest stable |
| v2.8.x | 1.23 | 1.28 | ≥450.x | |
| v2.7.x | 1.21 | 1.27 | ≥450.x | |
| v2.6.x | 1.20 | 1.26 | ≥450.x | |

For earlier versions, refer to the [releases page](https://github.com/Project-HAMi/HAMi/releases).

## Best Practices

1. **Test in Staging First** - Always test upgrades in a non-production environment first
2. **Maintain Backups** - Keep ConfigMap and state backups before upgrading
3. **Schedule Maintenance Windows** - Upgrade during low-usage periods
4. **Monitor After Upgrade** - Watch logs and metrics for 30 minutes post-upgrade
5. **Document Changes** - Keep notes of what was upgraded and when
6. **Have Rollback Plan** - Always know how to quickly rollback if needed

## Getting Help

If you encounter issues during upgrade:

1. Check the [troubleshooting guide](../troubleshooting/troubleshooting.md)
2. Review HAMi scheduler and device plugin logs
3. Check [GitHub issues](https://github.com/Project-HAMi/HAMi/issues)
4. Ask in the [community discussions](https://github.com/Project-HAMi/HAMi/discussions)

## See Also

- [Installation Guide](./online-installation.md)
- [Uninstallation Guide](./uninstall.md)
- [HAMi Documentation](../core-concepts/introduction.md)
