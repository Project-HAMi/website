---
title: Local Zero-Hardware HAMi Sandbox & Mock GPU Testing
sidebar_label: Local Mock GPU Testing
---

This guide demonstrates how to set up a local, zero-hardware HAMi testing sandbox on a CPU-only machine using [Kind](https://kind.sigs.k8s.io/) (or Minikube) and HAMi's built-in **`mockDevicePlugin`**.

This enables developers, evaluators, and contributors to test `hami-scheduler` resource allocation logic, verify `nvidia.com/gpumem` and `nvidia.com/gpucores` extended resource advertising, inspect mutating webhook annotations, and debug scheduling failure modes without requiring physical NVIDIA GPUs or host-installed CUDA drivers.

:::note MOCK VALIDATION SCOPE

- **MOCK VALIDATED**: Kubernetes extended resource registration (`nvidia.com/gpumem`, `nvidia.com/gpucores`), `hami-scheduler` extender allocation, mutating webhook pod annotations (`hami.io/bind-gpu-idx`), and scheduler oversubscription pending diagnostics.
- **REAL GPU VALIDATION REQUIRED**: Hardware-level CUDA symbol interception (`libvgpu.so`), hard GPU memory enforcement, and physical kernel execution.

:::

## Prerequisites

Before starting, ensure your local CPU-only workstation has the following tools installed:

- **Docker**: Engine v20.10+
- **Kind**: v0.20.0+ (or Minikube)
- **kubectl**: v1.26+
- **Helm**: v3.8+

## Step 1: Create a Local CPU-Only Kind Cluster

Create a standard single-node Kubernetes cluster using Kind:

```bash
kind create cluster --name hami-sandbox
```

Verify that `kubectl` is connected to your local cluster:

```bash
kubectl cluster-info --context kind-hami-sandbox
kubectl get nodes
```

Expected output:

```text
NAME                         STATUS   ROLES           AGE   VERSION
hami-sandbox-control-plane   Ready    control-plane   30s   v1.27.3
```

## Step 2: Deploy HAMi with Mock Device Plugin

Deploy HAMi using Helm, explicitly enabling `mockDevicePlugin.enabled=true` and disabling the default physical `devicePlugin.enabled=false`.

1. Add the official HAMi Helm repository:

   ```bash
   helm repo add hami-charts https://project-hami.github.io/HAMi/
   helm repo update
   ```

2. Install HAMi in the `kube-system` namespace with mock plugin enabled:

   ```bash
   helm install hami hami-charts/hami \
     --namespace kube-system \
     --set mockDevicePlugin.enabled=true \
     --set devicePlugin.enabled=false
   ```

3. Verify that the HAMi components are running:

   ```bash
   kubectl get pods -n kube-system -l 'app.kubernetes.io/name=hami'
   ```

Expected output:

```text
NAME                                       READY   STATUS    RESTARTS   AGE
hami-scheduler-65b7964448-x8j2l            1/1     Running   0          45s
hami-vgpu-mock-device-plugin-ds-7k9lm      1/1     Running   0          45s
```

## Step 3: Verify Node Extended Resource Advertising

The `mockDevicePlugin` registers simulated NVIDIA GPU extended resources to the Kubernetes node allocator.

Inspect the node allocatable capacity:

```bash
kubectl describe node hami-sandbox-control-plane | grep -A 8 "Allocatable:"
```

Expected output:

```text
Allocatable:
  cpu:                8
  ephemeral-storage:  100Gi
  hugepages-2Mi:      0
  memory:             16300Mi
  nvidia.com/gpucores: 100
  nvidia.com/gpumem:   8192
  nvidia.com/gpumem-percentage: 100
  pods:               110
```

Notice that `nvidia.com/gpumem` (8192 MiB) and `nvidia.com/gpucores` (100 core units) are now active allocatable resources on your CPU-only node.

## Step 4: Submit a Fractional vGPU Pod & Verify Scheduling

Submit a test pod requesting a fraction of mock GPU memory and cores:

```yaml
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: mock-gpu-workload
spec:
  containers:
    - name: app
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 3600"]
      resources:
        limits:
          nvidia.com/gpumem: 2048
          nvidia.com/gpucores: 50
EOF
```

Verify that the pod is successfully scheduled (`Running` state):

```bash
kubectl get pod mock-gpu-workload
```

Inspect the pod annotations injected by the `hami-scheduler` mutating webhook:

```bash
kubectl get pod mock-gpu-workload -o yaml | grep -A 10 "annotations:"
```

Expected output:

```yaml
annotations:
  hami.io/bind-gpu-idx: "0"
  hami.io/bind-gpumem: "2048"
  hami.io/bind-gpucores: "50"
```

This confirms that `hami-scheduler` successfully evaluated the extended resource requests, bound the pod to mock GPU index `0`, and recorded the fractional allocation.

## Step 5: Test Oversubscription & Scheduler Diagnostics

To observe how HAMi handles resource exhaustion without physical hardware, submit a second pod requesting more GPU memory than remains available on the node (e.g. requesting `7000` MiB when only `6144` MiB remain allocatable):

```yaml
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: mock-gpu-oversubscribed
spec:
  containers:
    - name: app
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 3600"]
      resources:
        limits:
          nvidia.com/gpumem: 7000
          nvidia.com/gpucores: 50
EOF
```

Check the pod status:

```bash
kubectl get pod mock-gpu-oversubscribed
```

Expected output:

```text
NAME                      READY   STATUS    RESTARTS   AGE
mock-gpu-oversubscribed   0/1     Pending   0          12s
```

Diagnose the scheduling failure reason via cluster events:

```bash
kubectl get events --field-selector reason=FailedScheduling
```

Expected output:

```text
LAST SEEN   TYPE      REASON             OBJECT                        MESSAGE
15s         Warning   FailedScheduling   pod/mock-gpu-oversubscribed   0/1 nodes are available: 1 Insufficient nvidia.com/gpumem. preemption: 0/1 nodes are available: 1 No preemption victims found for incoming pod.
```

Inspect `hami-scheduler` logs to confirm extender decision logs:

```bash
kubectl logs -n kube-system -l app.kubernetes.io/component=hami-scheduler --tail=50
```

## Step 6: Cleanup Local Environment

Delete the test workloads and tear down the Kind sandbox:

```bash
kubectl delete pod mock-gpu-workload mock-gpu-oversubscribed --ignore-not-found
kind delete cluster --name hami-sandbox
```
