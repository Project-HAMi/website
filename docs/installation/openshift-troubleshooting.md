---
id: openshift-troubleshooting
title: OpenShift Troubleshooting
sidebar_label: Troubleshooting
---

Diagnose and resolve common issues when running HAMi on Red Hat OpenShift.

## Device Plugin Pods in CrashLoopBackOff

### Symptom

```bash
oc get pods -n kube-system -l app=hami-device-plugin
# NAME                              READY   STATUS             RESTARTS   AGE
# hami-device-plugin-xxxxx          0/2     CrashLoopBackOff   5          5m
```

### Diagnosis

Check the pod logs:

```bash
oc logs -n kube-system hami-device-plugin-xxxxx -c nvidia-device-plugin
oc logs -n kube-system hami-device-plugin-xxxxx -c vgpu-device-plugin
```

### Common Causes and Fixes

#### 1. SCC Not Granted

**Check if SCC is assigned:**

```bash
oc get pod hami-device-plugin-xxxxx -n kube-system \
  -o jsonpath='{.metadata.annotations.openshift\.io/scc}'
```

**Expected output:** `hami-scc` (or `privileged` if using existing SCC)

**If empty or wrong SCC, grant it:**

```bash
# For HAMi-created SCC
oc adm policy add-scc-to-user hami-scc \
  -z hami-device-plugin -n kube-system

# For existing privileged SCC
oc adm policy add-scc-to-user privileged \
  -z hami-device-plugin -n kube-system
```

**Verify the grant:**

```bash
oc get scc hami-scc -o yaml | grep -A 5 users:
```

Should show:
```yaml
users:
- system:serviceaccount:kube-system:hami-device-plugin
```

#### 2. Wrong NVIDIA Driver Root

**Symptom in logs:**
```
Error: failed to load NVML: could not load NVML library
Error: library not found in /usr/lib/x86_64-linux-gnu
```

**Find the correct driver root:**

```bash
oc get clusterpolicy gpu-cluster-policy \
  -o jsonpath='{.spec.driver.manager.env[?(@.name=="DRIVER_ROOT")].value}'
```

**Verify the path exists on GPU nodes:**

```bash
oc debug node/<gpu-node-name>
chroot /host
ls -la /run/nvidia/driver
```

**Update Helm values:**

```yaml
devicePlugin:
  nvidiaDriverRoot: /run/nvidia/driver  # Use the correct path
```

**Upgrade the release:**

```bash
helm upgrade hami hami-charts/hami \
  --namespace kube-system \
  --values values-openshift.yaml \
  --reuse-values
```

#### 3. SELinux Blocking Access

**Check for AVC denials:**

```bash
oc debug node/<gpu-node-name>
chroot /host
ausearch -m AVC -ts recent | grep -E "nvidia|hami|vgpu"
```

**Example denial:**
```
type=AVC msg=audit(...): avc:  denied  { read write } for  pid=12345 comm="nvidia-device-p" path="/usr/local/vgpu/lib/libnvidia-ml.so.1" dev="dm-0" ino=123456 scontext=system_u:system_r:container_t:s0:c0,c1 tcontext=unconfined_u:object_r:usr_t:s0 tclass=file permissive=0
```

**Fix:** Enable SELinux relabeling in Helm values:

```yaml
devicePlugin:
  selinux:
    enabled: true
```

**Verify SELinux labels after enabling:**

```bash
oc debug node/<gpu-node-name>
chroot /host
ls -lZ /usr/local/vgpu/lib/
```

Expected context: `container_file_t` or `svirt_sandbox_file_t`

#### 4. GPU Operator Not Ready

**Check GPU Operator status:**

```bash
oc get pods -n nvidia-gpu-operator

# All pods should be Running
```

**Common GPU Operator issues:**

```bash
# Check ClusterPolicy status
oc get clusterpolicy gpu-cluster-policy -o yaml

# Look for status.state: ready

# Check GPU Operator logs
oc logs -n nvidia-gpu-operator deployment/gpu-operator
```

**Fix:** Ensure GPU Operator is fully deployed before installing HAMi:

```bash
# Wait for GPU Operator
oc wait --for=condition=ready pod \
  -l app=nvidia-device-plugin-daemonset \
  -n nvidia-gpu-operator \
  --timeout=5m

# Then install HAMi
helm install hami ...
```

## Scheduler Pod Not Starting

### Symptom

```bash
oc get pods -n kube-system -l app=hami-scheduler
# NAME                    READY   STATUS    RESTARTS   AGE
# hami-scheduler-xxxxx    0/2     Pending   0          2m
```

### Diagnosis

```bash
oc describe pod hami-scheduler-xxxxx -n kube-system
```

### Common Causes and Fixes

#### 1. Port Conflict

**Symptom in events:**
```
Error: failed to bind port 9443: address already in use
```

**Check if port is in use:**

```bash
oc get svc -n kube-system | grep 9443
```

**Fix:** Change the scheduler port in Helm values:

```yaml
scheduler:
  service:
    httpTargetPort: 9444  # Use a different port
```

#### 2. Certificate Job Failed

**Check certificate generation job:**

```bash
oc get jobs -n kube-system | grep hami
oc logs job/hami-cert-gen -n kube-system
```

**Common failure:** Job pod lacks SCC permissions

**Fix:**

```bash
# Grant SCC to certificate job service account
oc adm policy add-scc-to-user anyuid \
  -z hami-scheduler -n kube-system
```

## Pods Not Scheduling to GPUs

### Symptom

Pod requesting GPUs remains in `Pending` state:

```bash
oc get pod gpu-workload
# NAME           READY   STATUS    RESTARTS   AGE
# gpu-workload   0/1     Pending   0          30s
```

### Diagnosis

```bash
oc describe pod gpu-workload
```

### Common Causes and Fixes

#### 1. GPU Operator Taint Not Tolerated

**Symptom in events:**
```
0/3 nodes are available: 1 node(s) had untolerated taint {nvidia.com/gpu: true}
```

**Check HAMi device plugin tolerations:**

```bash
oc get daemonset hami-device-plugin -n kube-system \
  -o jsonpath='{.spec.template.spec.tolerations}'
```

**Should include:**
```json
[{"key":"nvidia.com/gpu","operator":"Exists","effect":"NoSchedule"}]
```

**Fix (if missing):** Upgrade to Chart v2.11.0+ which includes this toleration by default.

#### 2. No GPU Nodes Available

**Check GPU node labels:**

```bash
oc get nodes -l nvidia.com/gpu.present=true
```

**If empty, check Node Feature Discovery:**

```bash
# Ensure NFD is enabled in GPU Operator
oc get clusterpolicy gpu-cluster-policy \
  -o jsonpath='{.spec.nfd.enabled}'

# Should return: true
```

**Enable NFD if disabled:**

```bash
oc patch clusterpolicy gpu-cluster-policy \
  --type merge \
  --patch '{"spec":{"nfd":{"enabled":true}}}'
```

#### 3. Insufficient GPU Resources

**Check GPU capacity:**

```bash
oc describe node <gpu-node-name> | grep -A 5 "Allocated resources"
```

**Example output:**
```
  Resource           Requests    Limits
  --------           --------    ------
  nvidia.com/gpu     2           2
  nvidia.com/gpumem  16384Mi     16384Mi
```

If `Requests` equals `Limits`, the GPU is fully allocated.

**Fix:** Scale down workloads or add more GPU nodes.

## vGPU Workload Failures

### Symptom

Pod starts but container crashes or hangs:

```bash
oc get pod gpu-workload
# NAME           READY   STATUS    RESTARTS   AGE
# gpu-workload   0/1     Error     3          1m
```

### Diagnosis

```bash
oc logs gpu-workload
oc describe pod gpu-workload
```

### Common Causes and Fixes

#### 1. CUDA Library Not Found

**Symptom in logs:**
```
nvidia-smi: error while loading shared libraries: libnvidia-ml.so.1: cannot open shared object file
```

**Check vGPU library mount:**

```bash
oc debug node/<gpu-node-name>
chroot /host
ls -la /usr/local/vgpu/lib/
```

**Should contain:**
```
libnvidia-ml.so.1
libcuda.so.1
```

**Fix:** Ensure device plugin is running and has initialized the shared library directory.

#### 2. vGPU Lock Directory Permission Denied

**Symptom in logs:**
```
Error: failed to acquire vGPU lock: permission denied
```

**Check lock directory:**

```bash
oc debug node/<gpu-node-name>
chroot /host
ls -ld /tmp/vgpulock
```

**Expected permissions:**
```
drwxrwxrwt 2 root root 4096 ... /tmp/vgpulock
```

**Fix:** Delete and let device plugin recreate:

```bash
oc debug node/<gpu-node-name>
chroot /host
rm -rf /tmp/vgpulock
exit

# Restart device plugin to recreate
oc delete pod -n kube-system -l app=hami-device-plugin
```

#### 3. Memory Limit Exceeded

**Symptom in logs:**
```
CUDA error: out of memory
```

**Check requested vs available memory:**

```bash
# Pod requests
oc get pod gpu-workload -o jsonpath='{.spec.containers[0].resources.limits}'

# Node capacity
oc describe node <gpu-node-name> | grep nvidia.com/gpumem
```

**Fix:** Reduce the pod's GPU memory request or scale down other GPU workloads.

## SELinux Denials

### Symptom

Pods fail with permission errors despite correct SCC:

```bash
oc logs gpu-workload
# Error: failed to open /dev/nvidia0: operation not permitted
```

### Diagnosis

**Check for AVC denials:**

```bash
oc debug node/<gpu-node-name>
chroot /host

# Check recent denials
ausearch -m AVC -ts recent

# Filter for GPU-related denials
ausearch -m AVC -ts recent | grep -E "nvidia|cuda"
```

**Example denial:**
```
type=AVC msg=audit(...): avc:  denied  { read write } for  comm="cuda-app" path="/dev/nvidia0" dev="devtmpfs" scontext=system_u:system_r:container_t:s0 tcontext=system_u:object_r:device_t:s0 tclass=chr_file permissive=0
```

### Fix

**Option 1: Enable SELinux relabeling (recommended)**

```yaml
devicePlugin:
  selinux:
    enabled: true
```

**Option 2: Set SELinux to permissive (not recommended for production)**

```bash
oc debug node/<gpu-node-name>
chroot /host
setenforce 0
```

**Option 3: Create custom SELinux policy module**

```bash
# Generate policy from denials
ausearch -m AVC -ts recent | audit2allow -M hami_gpu

# Load the policy
semodule -i hami_gpu.pp
```

## Diagnostic Commands

### Comprehensive Health Check

```bash
#!/bin/bash
# HAMi OpenShift diagnostic script

echo "=== HAMi Components ==="
oc get pods -n kube-system -l app=hami

echo "\n=== SecurityContextConstraints ==="
oc get scc hami-scc 2>/dev/null || echo "hami-scc not found"

echo "\n=== SCC Users ==="
oc get scc hami-scc -o yaml 2>/dev/null | grep -A 10 users:

echo "\n=== GPU Nodes ==="
oc get nodes -l nvidia.com/gpu.present=true

echo "\n=== GPU Operator Status ==="
oc get pods -n nvidia-gpu-operator

echo "\n=== Device Plugin Logs (last 20 lines) ==="
oc logs -n kube-system -l app=hami-device-plugin --tail=20 -c nvidia-device-plugin

echo "\n=== GPU Capacity ==="
oc describe nodes -l nvidia.com/gpu.present=true | grep -A 5 "Allocated resources"
```

Save as `hami-diagnostics.sh` and run:

```bash
chmod +x hami-diagnostics.sh
./hami-diagnostics.sh > hami-diagnostics.txt
```

### Per-Node GPU Check

```bash
# Run on each GPU node
oc debug node/<gpu-node-name>
chroot /host

# Check NVIDIA driver
nvidia-smi

# Check vGPU libraries
ls -la /usr/local/vgpu/lib/

# Check lock directory
ls -ld /tmp/vgpulock

# Check SELinux mode
getenforce

# Check for AVC denials
ausearch -m AVC -ts today | grep -E "nvidia|hami|vgpu"
```

## Getting Help

If you encounter issues not covered here:

1. **Check HAMi logs:**
   ```bash
   oc logs -n kube-system -l app=hami-device-plugin --all-containers
   oc logs -n kube-system -l app=hami-scheduler --all-containers
   ```

2. **Run diagnostics:**
   ```bash
   ./hami-diagnostics.sh > diagnostics.txt
   ```

3. **Open an issue:** [HAMi GitHub Issues](https://github.com/Project-HAMi/HAMi/issues)
   - Include: OpenShift version, GPU Operator version, HAMi Chart version
   - Attach: `diagnostics.txt`, relevant pod logs

4. **Check existing issues:** [OpenShift label](https://github.com/Project-HAMi/HAMi/issues?q=label%3Aopenshift)

## Related Documentation

- [OpenShift Installation Guide](openshift-installation.md)
- [OpenShift Examples](openshift-examples.md)
- [General Troubleshooting](../troubleshooting/troubleshooting.md)
