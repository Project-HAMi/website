---
title: Validate HAMi Setup and vGPU Behavior
sidebar_label: Validate HAMi
---

After deploying HAMi, it is essential to verify that the installation is functioning correctly and that vGPU resource isolation is working as expected. This guide walks you through a step-by-step validation process, from checking the native GPU stack to confirming vGPU behavior inside containers.

## Scope and Assumptions

This guide assumes that HAMi is already installed (for example, via the [Deploy HAMi using Helm](/docs/get-started/deploy-with-helm) guide in the Get Started section).

The goal of this document is not to repeat installation steps, but to validate that HAMi is working correctly in a real Kubernetes environment, including GPU access and vGPU behavior.

If HAMi is not yet installed, please follow the deployment guide first.

## Step 0: Configure Node Container Runtime (If not already done)

HAMi requires the `nvidia-container-toolkit` to be installed and set as the default low-level runtime on all your GPU nodes.

### 1. Install nvidia-container-toolkit (Debian/Ubuntu example)

```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
  | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list \
  | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
  | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
```

### 2. Configure your runtime

* For containerd: Edit `/etc/containerd/config.toml` to set the default runtime name to `"nvidia"` and the binary name to `"/usr/bin/nvidia-container-runtime"`.

  * Restart:

    ```bash
    sudo systemctl daemon-reload && sudo systemctl restart containerd
    ```

* For Docker: Edit `/etc/docker/daemon.json` to set `"default-runtime": "nvidia"`.

  * Restart:

    ```bash
    sudo systemctl daemon-reload && sudo systemctl restart docker
    ```

## Step 1: Validate the Native GPU Stack (Crucial Pre-flight Check)

Before installing HAMi, you must prove that Kubernetes can natively access the GPU.

This step validates your GPU stack independently of HAMi.

### 1. Deploy a native test pod

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: cuda-test
spec:
  restartPolicy: Never
  containers:
    - name: cuda
      image: nvcr.io/nvidia/cuda:12.2.0-base-ubuntu22.04
      command: ["nvidia-smi"]
      resources:
        limits:
          nvidia.com/gpu: 1
EOF
```

Expected: You see valid `nvidia-smi` output. If this fails, do NOT continue. Fix your GPU setup first.

### 2. Verify execution

```bash
kubectl wait --for=condition=Succeeded pod/cuda-test --timeout=60s
kubectl logs cuda-test
```

Note: You must see the standard `nvidia-smi` output. Do not proceed if this fails.

## Step 2: Verify HAMi Installation

Once the baseline is verified, ensure that HAMi is installed and its components are running correctly.

If you have already deployed HAMi, you can skip the installation command and only verify that the components are running.

### 1. Label the node

```bash
kubectl label nodes $(hostname) gpu=on --overwrite
```

### 2. Deploy using Helm

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm install hami hami-charts/hami -n kube-system
```

### 3. Verify components

```bash
kubectl get pods -n kube-system | grep hami
```

Expected: Both `hami-scheduler` and `vgpu-device-plugin` pods should be in the `Running` state.

## Step 3: Launch and Verify a vGPU Task

Let's prove HAMi is enforcing fractional resource limits (vGPU).

### 1. Submit a vGPU demo task

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:18.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 10240
EOF
```

### 2. Verify resource control inside the container

```bash
kubectl wait --for=condition=Ready pod/gpu-pod --timeout=60s
kubectl exec -it gpu-pod -- nvidia-smi
```

Expected: You will see the `[HAMI-core Msg...]` initialization lines, and the `nvidia-smi` table will show exactly `10240MiB` of Total Memory, proving vGPU isolation is active.

## Troubleshooting Order

If you encounter issues, follow this sequence:

1. Hardware/Drivers: Run `nvidia-smi` directly on the host.
2. Container Runtime: Ensure `sudo ctr run` or `docker run` works outside K8s.
3. Stale Plugins: Remove conflicting plugins: `kubectl delete daemonset nvidia-device-plugin-daemonset -n kube-system --ignore-not-found`.
4. Node Resources: Verify K8s sees the GPU: `kubectl get nodes -o jsonpath='{.items[*].status.allocatable}' | grep -i nvidia`.
5. Scheduler Layer: Check HAMi logs: `kubectl logs -n kube-system -l app=hami-scheduler`.

## Cleanup

```bash
kubectl delete pod cuda-test gpu-pod --ignore-not-found
```
