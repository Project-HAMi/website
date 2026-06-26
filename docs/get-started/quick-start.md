---
title: 5-Minute Quick Start
sidebar_label: Quick Start
---

This guide gets HAMi running on an existing Kubernetes cluster with at least one NVIDIA GPU node in under 5 minutes. It uses a minimal Helm-based install path and one test pod to confirm GPU sharing works.

For production setups, offline installs, or non-NVIDIA devices, see the [Installation](../installation/online-installation) section.

## Prerequisites

- A running Kubernetes cluster (v1.18+)
- At least one GPU node with NVIDIA drivers (v440+) and `nvidia-container-toolkit` installed and set as the default container runtime
- Helm v3+
- `kubectl` configured to reach the cluster

:::note The node runtime must already be configured before installing HAMi. If it is not, follow the [Prerequisites](../installation/prerequisites) guide first, then return here. :::

## Step 1 - Install HAMi

Add the HAMi Helm repository:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
```

Get your Kubernetes server version:

```bash
kubectl version
```

Look for the `Server Version` line in the output. Install HAMi, replacing `v1.XX.X` with that version:

```bash
helm install hami hami-charts/hami \
  --set scheduler.kubeScheduler.imageTag=v1.XX.X \
  -n kube-system
```

Label each GPU node so HAMi can schedule workloads onto it. Replace `<node-name>` with the output of `kubectl get nodes`:

```bash
kubectl label nodes <node-name> gpu=on
```

## Step 2 - Verify HAMi is running

```bash
kubectl get pods -n kube-system | grep hami
```

Expected output:

```text
hami-device-plugin-<hash>   1/1     Running   0   1m
hami-scheduler-<hash>       1/1     Running   0   1m
```

Both pods must reach `Running` state before submitting workloads. If they do not, check the [Validate HAMi](./verify-hami) guide for troubleshooting steps.

## Step 3 - Run a GPU sharing example

The following pod requests one virtual GPU with a 4096 MiB memory cap. Two such pods can share a single physical GPU simultaneously.

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: hami-quick-test
spec:
  containers:
    - name: test
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 4096
EOF
```

Wait for the pod to be ready:

```bash
kubectl wait --for=condition=Ready pod/hami-quick-test --timeout=120s
```

## Step 4 - Confirm memory isolation

Run `nvidia-smi` inside the pod:

```bash
kubectl exec -it hami-quick-test -- nvidia-smi
```

Expected output (truncated):

```text
[HAMI-core Msg(...)]: Initializing.....
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI ...                                                                          |
|=========================================+========================+======================|
|   0  <GPU model>                     On |   ...                  |                    0 |
|                                         |           0MiB /  4096MiB |      0%      Default |
+-----------------------------------------+------------------------+----------------------+
```

The `Total Memory` column shows `4096MiB`, not the full physical GPU memory. This confirms HAMi is enforcing the virtual GPU memory limit.

## Cleanup

```bash
kubectl delete pod hami-quick-test
```

## Next steps

- [Online Installation](../installation/online-installation) - full Helm options, custom values
- [Validate HAMi](./verify-hami) - deeper validation including native GPU stack checks
- [Configure HAMi](../userguide/configure) - resource limits, scheduling policies, and more
- [Device Sharing](../key-features/device-sharing) - how GPU sharing works under the hood
