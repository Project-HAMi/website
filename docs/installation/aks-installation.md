---
title: Install HAMi on Azure Kubernetes Service
sidebar_label: Azure Kubernetes Service (AKS)
description: Install and validate classic HAMi on an AKS NVIDIA GPU node pool without conflicting device plugins.
---

This guide installs classic HAMi on an Azure Kubernetes Service (AKS) Linux cluster and verifies the complete path from the AKS GPU driver to HAMi's fractional GPU memory enforcement.

The installation uses this ownership model:

| Component                                     | Owner              |
| --------------------------------------------- | ------------------ |
| NVIDIA GPU driver                             | AKS                |
| NVIDIA container runtime integration          | AKS GPU node image |
| Kubernetes device plugin for `nvidia.com/gpu` | HAMi               |
| Fractional GPU scheduling and allocation      | HAMi               |
| Virtual GPU metrics                           | HAMi               |

AKS calls this a **driver-only** or **self-managed GPU** setup. AKS installs the host driver, but HAMi is the only Kubernetes device plugin on the target nodes.

:::warning Do not use the AKS full managed GPU stack with classic HAMi

The AKS full managed GPU profile installs an NVIDIA device plugin that advertises `nvidia.com/gpu`. HAMi installs its own device plugin for the same resource. Do not run both on the same nodes.

If `gpuProfile.nvidia.managementMode` is `Managed`, create a replacement driver-only node pool. The GPU management mode, driver choice, and MIG strategy cannot be changed after node-pool creation.

:::

## Support boundaries

| Configuration | Status in this guide |
| --- | --- |
| Linux AKS user node pool with AKS-installed driver | Covered |
| HAMi 2.10.0 or later | Required |
| Ubuntu AKS GPU node image | Covered |
| AKS full managed GPU stack | Not compatible with classic HAMi |
| NVIDIA GPU Operator | Advanced alternative; not part of the tested procedure |
| Windows GPU node pool | Not supported by HAMi |
| AKS-managed MIG | Do not combine with this procedure |
| HAMi-DRA | Separate installation mode |
| Cluster Autoscaler for fractional HAMi workloads | Not currently supported; see [Autoscaling](#autoscaling) |
| Node Auto Provisioning | Not covered |

This guide uses `Standard_NC4as_T4_v3` as a concrete example. Select an [AKS-supported NVIDIA GPU VM size](https://learn.microsoft.com/azure/aks/use-nvidia-gpu#supported-gpu-enabled-vms) that is available and has quota in your region.

## Procedure overview

You will:

1. Create a driver-only GPU node pool with a durable HAMi label and AKS GPU taint.
2. Use a temporary NVIDIA device plugin and CUDA Job to validate the AKS driver and runtime.
3. Remove the temporary plugin so HAMi becomes the only device-plugin owner.
4. Install HAMi with AKS-safe admission-webhook settings.
5. Verify device registration, fractional scheduling, and GPU memory enforcement.
6. Remove the validation workloads and repeat the health checks after node lifecycle operations.

## Prerequisites

You need:

- An existing cluster on a [currently supported AKS Kubernetes version](https://learn.microsoft.com/azure/aks/supported-kubernetes-versions).
- A Linux system node pool where the HAMi scheduler can run.
- Azure CLI 2.85.0 or later.
- The `aks-preview` Azure CLI extension, version 19.0.0b29 or later.
- `kubectl` configured for the cluster.
- Helm 3.
- Azure quota for the selected NVIDIA GPU VM size.

GPU nodes incur Azure compute charges. Delete validation workloads and any temporary node pool when you finish.

Set the values used throughout the guide:

```bash
export RESOURCE_GROUP="<resource-group>"
export AKS_CLUSTER="<aks-cluster>"
export GPU_NODE_POOL="gpunp"
export GPU_VM_SIZE="Standard_NC4as_T4_v3"

export LOCATION="$(
  az aks show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$AKS_CLUSTER" \
    --query location \
    --output tsv
)"
```

Confirm the cluster version and connect `kubectl`:

```bash
az aks show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER" \
  --query '{location:location,kubernetesVersion:kubernetesVersion}' \
  --output yaml

az aks get-credentials \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER" \
  --overwrite-existing

kubectl cluster-info
```

Confirm that the selected VM size exists in the region and inspect any subscription restrictions:

```bash
az vm list-skus \
  --location "$LOCATION" \
  --size "$GPU_VM_SIZE" \
  --all \
  --query "[?name=='${GPU_VM_SIZE}' && resourceType=='virtualMachines'].{name:name,restrictions:restrictions}" \
  --output yaml
```

Do not continue if the command returns no matching SKU or reports a restriction that prevents deployment. Select another region or VM size, or request quota.

## 1. Create a driver-only GPU node pool

Create a dedicated user node pool. The node-pool label is durable: AKS applies it to nodes created during scale-out, reimage, and node-image upgrade.

```bash
az aks nodepool add \
  --resource-group "$RESOURCE_GROUP" \
  --cluster-name "$AKS_CLUSTER" \
  --name "$GPU_NODE_POOL" \
  --mode User \
  --node-count 1 \
  --node-vm-size "$GPU_VM_SIZE" \
  --os-sku Ubuntu \
  --node-osdisk-type Managed \
  --labels gpu=on \
  --node-taints sku=gpu:NoSchedule \
  --gpu-driver Install \
  --enable-managed-gpu=false
```

The two GPU flags explicitly select the driver-only profile. AKS installs the NVIDIA driver, while the Kubernetes device plugin remains your responsibility.

The command explicitly selects a managed OS disk instead of relying on the SKU-dependent AKS default. If you prefer ephemeral OS disks, validate that the selected VM size and region can allocate them before changing this setting.

Reserve the `gpu=on` label for HAMi-owned pools. Do not apply it to a pool managed by the AKS full GPU stack or another device plugin.

Check the node-pool state, then read the GPU profile directly from the ARM response. The raw query avoids older Azure CLI models silently omitting `managementMode`.

```bash
check_gpu_profile() {
  local gpu_pool_id gpu_profile_url gpu_management_mode

  gpu_pool_id="$(
    az aks nodepool show \
      --resource-group "$RESOURCE_GROUP" \
      --cluster-name "$AKS_CLUSTER" \
      --name "$GPU_NODE_POOL" \
      --query id \
      --output tsv
  )"
  gpu_profile_url="https://management.azure.com${gpu_pool_id}?api-version=2026-01-02-preview"

  az aks nodepool show \
    --resource-group "$RESOURCE_GROUP" \
    --cluster-name "$AKS_CLUSTER" \
    --name "$GPU_NODE_POOL" \
    --query '{
      provisioningState:provisioningState,
      driver:gpuProfile.driver,
      labels:nodeLabels,
      taints:nodeTaints
    }' \
    --output yaml

  az rest \
    --method get \
    --url "$gpu_profile_url" \
    --query properties.gpuProfile \
    --output yaml

  if ! gpu_management_mode="$(
    az rest \
      --method get \
      --url "$gpu_profile_url" \
      --query properties.gpuProfile.nvidia.managementMode \
      --output tsv
  )"; then
    echo "Stop: could not read the raw GPU management mode." >&2
    return 1
  fi

  case "$gpu_management_mode" in
    "" | None | null | Unmanaged) ;;
    Managed)
      echo "Stop: the AKS managed GPU stack owns this pool." >&2
      return 1
      ;;
    *)
      echo "Stop: could not verify the GPU management mode." >&2
      return 1
      ;;
  esac
}

check_gpu_profile
```

Confirm all of the following before continuing:

- `provisioningState` is `Succeeded`.
- `driver` is `Install`.
- The raw ARM `managementMode` is empty or `Unmanaged`; it must not be `Managed`. An `az rest` error fails the check.
- The labels include `gpu: on`.
- The taints include `sku=gpu:NoSchedule`.

Wait for the node and inspect the AKS and HAMi labels:

```bash
wait_for_gpu_node() {
  GPU_NODE=""
  for _ in {1..90}; do
    GPU_NODE="$(
      kubectl get nodes \
        --selector="kubernetes.azure.com/agentpool=$GPU_NODE_POOL" \
        --output=jsonpath='{.items[0].metadata.name}' \
        2>/dev/null || true
    )"
    [ -n "$GPU_NODE" ] && break
    sleep 10
  done

  if [ -z "$GPU_NODE" ]; then
    echo "No node from pool $GPU_NODE_POOL registered within 15 minutes." >&2
    return 1
  fi

  export GPU_NODE
  if ! kubectl wait --for=condition=Ready "node/$GPU_NODE" --timeout=15m; then
    return 1
  fi

  kubectl get nodes \
    --selector="kubernetes.azure.com/agentpool=$GPU_NODE_POOL" \
    --label-columns=gpu,kubernetes.azure.com/accelerator
}

wait_for_gpu_node
```

The node should report `gpu=on` and `kubernetes.azure.com/accelerator=nvidia`.

## 2. Verify the native GPU stack

Before installing HAMi, verify the AKS driver and runtime independently. Use a temporary NVIDIA device plugin only for this preflight test. AKS configures the NVIDIA runtime on its GPU nodes, so these baseline Pods do not need a `RuntimeClass`.

First, make sure the target pool is not already managed by another device plugin:

```bash
kubectl get node "$GPU_NODE" \
  --output=jsonpath='{"Advertised GPU resource: "}{.status.allocatable.nvidia\.com/gpu}{"\n"}'

kubectl get node "$GPU_NODE" \
  --output=jsonpath='{"AKS DCGM exporter: "}{.metadata.labels.kubernetes\.azure\.com/dcgm-exporter}{"\n"}'

kubectl get daemonsets --all-namespaces \
  --output=custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name' \
  | grep -E 'hami-device-plugin|nvidia-device-plugin' || true
```

For a new driver-only pool:

- `Advertised GPU resource` must be empty. A value means a device plugin is already advertising `nvidia.com/gpu`.
- `AKS DCGM exporter` must be empty. `enabled` indicates the AKS full managed stack.
- The DaemonSet command should return no matching object.

The AKS managed device plugin is a node-level, DaemonSet-equivalent component and might not appear in `kubectl get daemonsets`. Do not rely on the DaemonSet check alone. If any check indicates another owner, stop and resolve ownership before continuing.

Install the temporary plugin, scoped to the dedicated node pool:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nvidia-device-plugin-daemonset
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: nvidia-device-plugin-ds
  updateStrategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        name: nvidia-device-plugin-ds
    spec:
      priorityClassName: system-node-critical
      nodeSelector:
        kubernetes.azure.com/agentpool: "$GPU_NODE_POOL"
      tolerations:
        - key: sku
          operator: Equal
          value: gpu
          effect: NoSchedule
      containers:
        - name: nvidia-device-plugin-ctr
          image: nvcr.io/nvidia/k8s-device-plugin:v0.18.0
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
          volumeMounts:
            - name: kubelet-device-plugins-dir
              mountPath: /var/lib/kubelet/device-plugins
      volumes:
        - name: kubelet-device-plugins-dir
          hostPath:
            path: /var/lib/kubelet/device-plugins
            type: Directory
EOF

kubectl rollout status \
  daemonset/nvidia-device-plugin-daemonset \
  --namespace kube-system \
  --timeout=5m
```

If the rollout times out, inspect the plugin before continuing:

```bash
kubectl logs \
  --namespace kube-system \
  --selector='name=nvidia-device-plugin-ds' \
  --tail=100

kubectl describe daemonset nvidia-device-plugin-daemonset \
  --namespace kube-system
```

Confirm that the plugin registered the physical GPU with kubelet:

```bash
kubectl get node "$GPU_NODE" \
  --output=jsonpath='{"Preflight GPU count: "}{.status.allocatable.nvidia\.com/gpu}{"\n"}'
```

For the one-GPU VM size used in this guide, the expected count is `1`. Registration can take a few seconds after the DaemonSet becomes ready; rerun the command before continuing if the value is initially empty.

Run `nvidia-smi` in a GPU Job:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: aks-gpu-preflight
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      nodeSelector:
        kubernetes.azure.com/agentpool: "$GPU_NODE_POOL"
      tolerations:
        - key: sku
          operator: Equal
          value: gpu
          effect: NoSchedule
      containers:
        - name: nvidia-smi
          image: nvcr.io/nvidia/cuda:12.4.1-base-ubuntu22.04
          command: ["nvidia-smi"]
          resources:
            limits:
              nvidia.com/gpu: 1
EOF

kubectl wait \
  --for=condition=complete \
  job/aks-gpu-preflight \
  --timeout=10m

kubectl logs job/aks-gpu-preflight
```

The log must contain the GPU model, driver version, and CUDA version. Do not continue if the Job fails: run `kubectl describe job aks-gpu-preflight` and `kubectl logs job/aks-gpu-preflight`, then fix the AKS driver/runtime path first. `kubectl wait --for=condition=complete` waits until its timeout when a Job fails.

## 3. Remove the temporary device plugin

HAMi must be the only component advertising `nvidia.com/gpu` on these nodes. Remove the preflight workload and temporary plugin:

```bash
kubectl delete job aks-gpu-preflight
kubectl delete daemonset nvidia-device-plugin-daemonset --namespace kube-system

kubectl wait \
  --for=delete \
  pod \
  --selector=name=nvidia-device-plugin-ds \
  --namespace kube-system \
  --timeout=2m
```

Confirm that no NVIDIA or HAMi device-plugin DaemonSet remains:

```bash
kubectl get daemonsets --all-namespaces \
  --output=custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name' \
  | grep -E 'hami-device-plugin|nvidia-device-plugin' || true
```

The command should produce no output.

## 4. Install HAMi

HAMi 2.10.0 added the AKS admission-webhook ownership switch used below. Save the following configuration as `aks-values.yaml`:

```bash
cat > aks-values.yaml <<EOF
scheduler:
  admissionWebhook:
    manageNamespaceSelector: false

devicePlugin:
  nvidiaDriverRoot: "/"
  nvidiaNodeSelector:
    kubernetes.azure.com/agentpool: "$GPU_NODE_POOL"
  tolerations:
    - key: sku
      operator: Equal
      value: gpu
      effect: NoSchedule
    - key: nvidia.com/gpu
      operator: Exists
      effect: NoSchedule
EOF
```

The AKS-specific settings are:

- `manageNamespaceSelector: false`: lets AKS own webhook `namespaceSelector` mutations and prevents Helm server-side apply conflicts. It also means `scheduler.admissionWebhook.whitelistNamespaces` and the namespace-level `hami.io/webhook: ignore` label are not rendered by the chart. Use the per-Pod `hami.io/webhook: ignore` label when a workload must bypass the webhook.
- `nvidiaDriverRoot: "/"`: uses the driver installed on the node host.
- `nvidiaNodeSelector`: uses AKS's pool label to limit HAMi's NVIDIA device plugin to the dedicated GPU pool.
- `tolerations`: replaces the chart's empty default list and covers the AKS `sku=gpu` taint plus the conventional `nvidia.com/gpu` taint used by GPU Operator and some node images.

Keep `aks-values.yaml` with your deployment configuration; use the same file for future `helm upgrade` operations.

Install the published HAMi 2.10.0 chart:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/ --force-update
helm repo update hami-charts

helm upgrade --install hami hami-charts/hami \
  --namespace kube-system \
  --version 2.10.0 \
  --values aks-values.yaml \
  --wait \
  --timeout 10m
```

## 5. Verify HAMi and device ownership

Wait for both components:

```bash
kubectl rollout status \
  deployment/hami-scheduler \
  --namespace kube-system \
  --timeout=5m

kubectl rollout status \
  daemonset/hami-device-plugin \
  --namespace kube-system \
  --timeout=5m

kubectl get pods \
  --namespace kube-system \
  --selector='app.kubernetes.io/instance=hami' \
  --output=wide
```

Confirm that the Helm-rendered webhook does not manage `namespaceSelector`:

```bash
helm get manifest hami --namespace kube-system \
  | awk '
      /^kind: MutatingWebhookConfiguration$/ { capture = 1 }
      capture { print }
      capture && /^---$/ { exit }
    ' \
  | grep -n 'namespaceSelector:' \
  || echo "OK: the HAMi webhook manifest omits namespaceSelector"
```

AKS may add a `namespaceSelector` to the live webhook. That is expected. The important result is that the HAMi Helm manifest does not claim ownership of the field.

Inspect the live field that AKS owns:

```bash
kubectl get mutatingwebhookconfiguration hami-webhook \
  --output=jsonpath='{.webhooks[0].namespaceSelector}{"\n"}'
```

The AKS Admissions Enforcer normally adds exclusions for control-plane and AKS-managed namespaces. Pods in excluded namespaces are not mutated by HAMi, so place HAMi workloads in an application namespace that the live selector permits.

Confirm that HAMi registered the physical GPU:

```bash
kubectl get node "$GPU_NODE" \
  --output=jsonpath='{.metadata.annotations.hami\.io/node-nvidia-register}{"\n"}'
```

The annotation must contain a JSON object for each GPU, including its UUID, memory, core capacity, mode, and health.

Check the logical GPU slots advertised by HAMi:

```bash
kubectl get node "$GPU_NODE" \
  --output=jsonpath='{"HAMi GPU slots: "}{.status.allocatable.nvidia\.com/gpu}{"\n"}'
```

With the default `devicePlugin.deviceSplitCount: 10`, a one-GPU T4 node normally reports ten logical `nvidia.com/gpu` slots.

Finally, confirm that HAMi is the only visible device-plugin DaemonSet:

```bash
kubectl get daemonsets --all-namespaces \
  --output=custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name' \
  | grep -E 'hami-device-plugin|nvidia-device-plugin'
```

The output should contain `hami-device-plugin` and no NVIDIA device-plugin DaemonSet.

## 6. Run a fractional GPU workload

Create a Pod that requests one HAMi vGPU, 2048 MiB of GPU memory, and 20 percent of the GPU cores:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: hami-vgpu-test
spec:
  restartPolicy: Never
  nodeSelector:
    kubernetes.azure.com/agentpool: "$GPU_NODE_POOL"
  tolerations:
    - key: sku
      operator: Equal
      value: gpu
      effect: NoSchedule
  containers:
    - name: cuda
      image: nvcr.io/nvidia/cuda:12.4.1-base-ubuntu22.04
      command: ["sleep", "3600"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 2048
          nvidia.com/gpucores: 20
EOF

kubectl wait \
  --for=condition=Ready \
  pod/hami-vgpu-test \
  --timeout=10m
```

Confirm that the admission webhook selected the HAMi scheduler:

```bash
kubectl get pod hami-vgpu-test \
  --output=jsonpath='{.spec.schedulerName}{"\n"}'
```

Expected output:

```text
hami-scheduler
```

Inspect the physical GPU allocation:

```bash
kubectl get pod hami-vgpu-test \
  --output=jsonpath='{.metadata.annotations.hami\.io/vgpu-devices-allocated}{"\n"}'
```

The annotation has this format:

```text
<GPU-UUID>,NVIDIA,<memory-MiB>,<core-percent>:;
```

Verify the memory visible inside the container:

```bash
kubectl exec hami-vgpu-test -- \
  nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
```

The reported total memory should be `2048 MiB`, not the physical GPU's full memory.

## 7. Prove that the memory limit is enforced

The previous check proves that HAMi changes the visible memory ceiling. The following Job allocates GPU memory in 512 MiB chunks and verifies that allocation fails at the requested 4000 MiB limit:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: hami-memory-limit-test
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      nodeSelector:
        kubernetes.azure.com/agentpool: "$GPU_NODE_POOL"
      tolerations:
        - key: sku
          operator: Equal
          value: gpu
          effect: NoSchedule
      containers:
        - name: pytorch
          image: pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime
          command:
            - python
            - -c
            - |
              import torch

              chunks = []
              try:
                  while True:
                      chunks.append(
                          torch.empty(
                              512,
                              1024,
                              1024,
                              dtype=torch.uint8,
                              device="cuda",
                          )
                      )
                      print(
                          f"Allocated {len(chunks) * 512} MiB",
                          flush=True,
                      )
              except RuntimeError as error:
                  print(
                      f"Hit the limit after {len(chunks) * 512} MiB:",
                      flush=True,
                  )
                  print(str(error).split(".")[0], flush=True)
          resources:
            limits:
              nvidia.com/gpu: 1
              nvidia.com/gpumem: 4000
EOF

kubectl wait \
  --for=condition=complete \
  job/hami-memory-limit-test \
  --timeout=15m

validate_memory_limit() {
  local memory_test_logs allocated_mib

  memory_test_logs="$(kubectl logs job/hami-memory-limit-test)"
  printf '%s\n' "$memory_test_logs"
  if ! printf '%s\n' "$memory_test_logs" | grep -q 'Hit the limit' ||
    ! printf '%s\n' "$memory_test_logs" | grep -qiE 'out of memory'; then
    echo "The expected HAMi memory-limit failure was not found." >&2
    return 1
  fi

  allocated_mib="$(
    printf '%s\n' "$memory_test_logs" \
      | sed -n 's/^Hit the limit after \([0-9][0-9]*\) MiB:.*/\1/p'
  )"

  if [ -z "$allocated_mib" ] ||
    [ "$allocated_mib" -lt 2560 ] ||
    [ "$allocated_mib" -gt 4096 ]; then
    echo "Unexpected allocation limit: ${allocated_mib:-missing} MiB" >&2
    return 1
  fi
}

validate_memory_limit
```

Both `grep` commands and the range check must exit successfully. The output must contain `Hit the limit`, an out-of-memory error, and a successful allocation between 2560 and 4096 MiB. The range allows for CUDA context and allocator overhead while ensuring that the Job did not simply exhaust the physical GPU.

If the Job fails instead of completing, inspect it immediately with `kubectl describe job hami-memory-limit-test` and `kubectl logs job/hami-memory-limit-test`. The completion wait otherwise lasts until its timeout.

:::caution Isolation boundary

HAMi-core provides CUDA/NVML software-level isolation. It is not a hardware security boundary equivalent to MIG, and it should not be treated as isolation for mutually untrusted tenants.

:::

Remove the validation workloads:

```bash
kubectl delete pod hami-vgpu-test
kubectl delete job hami-memory-limit-test
```

## Node lifecycle checks

Do not install packages or edit containerd manually over SSH. AKS replaces nodes during scale-out, reimage, repair, and node-image upgrades.

After any node-pool lifecycle operation, repeat these checks:

```bash
check_replacement_node() {
  GPU_NODE=""
  for _ in {1..90}; do
    GPU_NODE="$(
      kubectl get nodes \
        --selector="kubernetes.azure.com/agentpool=$GPU_NODE_POOL" \
        --output=jsonpath='{.items[0].metadata.name}' \
        2>/dev/null || true
    )"
    [ -n "$GPU_NODE" ] && break
    sleep 10
  done

  if [ -z "$GPU_NODE" ]; then
    echo "No node from pool $GPU_NODE_POOL registered within 15 minutes." >&2
    return 1
  fi

  export GPU_NODE
  if ! kubectl wait --for=condition=Ready "node/$GPU_NODE" --timeout=15m; then
    return 1
  fi

  kubectl get nodes \
    --selector="kubernetes.azure.com/agentpool=$GPU_NODE_POOL" \
    --label-columns=gpu,kubernetes.azure.com/accelerator

  kubectl get pods \
    --namespace kube-system \
    --selector='app.kubernetes.io/component=hami-device-plugin' \
    --output=wide

  kubectl get node "$GPU_NODE" \
    --output=jsonpath='{.metadata.annotations.hami\.io/node-nvidia-register}{"\n"}'
}

check_replacement_node
```

Every replacement node must remain in the expected agent pool, run a ready HAMi device-plugin Pod, and publish a nonempty `hami.io/node-nvidia-register` annotation before accepting workloads. The custom `gpu=on` label should also remain because it is part of the node-pool configuration.

## Autoscaling

This guide intentionally creates a fixed-size GPU node pool.

Do not assume the standard AKS Cluster Autoscaler behavior for whole GPUs also works for HAMi fractional resources:

- HAMi's `nvidia.com/gpu` value is a logical slot count, not a physical GPU count.
- Per-device memory, core usage, topology, and health are maintained in HAMi annotations and scheduler state.
- `nvidia.com/gpumem` and `nvidia.com/gpucores` are not currently published in standard node `Capacity` and `Allocatable`.
- The upstream Cluster Autoscaler does not call HAMi's scheduler extender during normal scale-up simulation.

HAMi has validated an experimental one-Pod scale-up path on a warm AKS node group, but cold-zero groups, multi-Pod bin packing, physical-GPU coverage, and an upstream Cluster Autoscaler release remain incomplete.

For now, manually size HAMi GPU pools or validate a workload-specific autoscaling design before production use. KEDA can change Pod replica counts from DCGM metrics, but it does not make node provisioning aware of HAMi's per-device fractional capacity.

## GPU Operator

The tested installation path in this guide does not use GPU Operator. Use GPU Operator only when you need it to manage additional NVIDIA components, and validate that your selected AKS GPU VM size supports bring-your-own driver installation.

Follow the [AKS GPU Operator guide](https://learn.microsoft.com/azure/aks/nvidia-gpu-operator) on a separate node pool created with `--gpu-driver None`. If the managed GPU preview is enabled, also set `--enable-managed-gpu=false`. Keep HAMi as the sole owner of `nvidia.com/gpu` by disabling the GPU Operator device plugin:

```yaml
# GPU Operator values, not HAMi values
devicePlugin:
  enabled: false
```

The AKS `sku=gpu:NoSchedule` taint must also be tolerated by GPU Operator operands and Node Feature Discovery. Do not install the Operator until all of its GPU-node DaemonSets can tolerate the pool.

GPU Operator 25.10 enables CDI by default. GPU management containers, including HAMi's device plugin and monitor, need the `nvidia` RuntimeClass. Follow [Enable NVIDIA CDI support for HAMi](./configure-cdi) and verify the driver root and `nvidia-ctk` path on the actual node before installing HAMi.

For the default GPU Operator driver and toolkit layout, add these settings to the HAMi values from this guide:

```yaml
devicePlugin:
  gpuOperatorToolkitReady:
    enabled: true
  runtimeClassName: nvidia
  createRuntimeClass: false
  deviceListStrategy: cdi-annotations
  nvidiaDriverRoot: /run/nvidia/driver
  nvidiaHookPath: /usr/local/nvidia/toolkit/nvidia-ctk
```

Do not assume every virtualized GPU SKU can use the Operator's default datacenter driver. Confirm that the selected VM size supports the Operator's driver model before creating the node pool.

## MIG and DRA

AKS-managed MIG configures the MIG profile and NVIDIA resource publication at node-pool creation. HAMi also has its own MIG scheduling modes. Do not combine AKS-managed MIG/device-plugin ownership with HAMi dynamic MIG unless the exact combination has been validated.

HAMi-DRA is a separate installation and scheduling model. Do not install classic HAMi and HAMi-DRA as competing owners of the same GPUs. Start with [HAMi-DRA installation](./how-to-use-hami-dra) and validate the required Kubernetes DRA APIs and CDI support on the selected AKS version.

## Troubleshooting

### The HAMi device-plugin Pod is Pending

Check the node label and taint:

```bash
kubectl get node "$GPU_NODE" --show-labels
kubectl describe node "$GPU_NODE" | grep -A 5 Taints
```

The node must have `kubernetes.azure.com/agentpool=$GPU_NODE_POOL`, and the Helm values must tolerate `sku=gpu:NoSchedule`.

### GPU node-pool creation reports `OverconstrainedAllocationRequest`

This Azure allocation error means the requested combination of region, VM size, disk type, and networking could not be placed at that time. It is not a HAMi error.

The command in this guide uses `--node-osdisk-type Managed` so that ephemeral-disk capacity is not an additional constraint. If allocation still fails, select another AKS-supported GPU VM size or region with quota and capacity, then rerun the SKU check before creating the pool.

### The device plugin cannot discover NVML devices

Inspect its logs:

```bash
kubectl logs \
  --namespace kube-system \
  --selector='app.kubernetes.io/component=hami-device-plugin' \
  --all-containers \
  --tail=200
```

For the driver-only path in this guide, keep `nvidiaDriverRoot: "/"`. Do not copy GPU Operator paths into a host-driver installation.

### A workload uses `default-scheduler`

Inspect the webhook and scheduler:

```bash
kubectl get mutatingwebhookconfiguration hami-webhook --output=yaml
kubectl logs \
  --namespace kube-system \
  --selector='app.kubernetes.io/component=hami-scheduler' \
  --all-containers \
  --tail=200
```

The HAMi webhook failure policy is `Ignore`, so a webhook connectivity failure can allow a Pod to be created without HAMi's scheduler mutation. Do not treat a Running Pod as sufficient validation; always check `.spec.schedulerName` and the allocation annotation.

Also compare the workload namespace labels with the live webhook `namespaceSelector`. The AKS Admissions Enforcer excludes control-plane and AKS-managed namespaces from mutation.

### Helm upgrade reports a `namespaceSelector` ownership conflict

Confirm the chart version and applied value:

```bash
helm list --namespace kube-system
helm get values hami --namespace kube-system
```

Use HAMi 2.10.0 or later and set:

```yaml
scheduler:
  admissionWebhook:
    manageNamespaceSelector: false
```

### More than one device plugin is present

Do not try to make competing plugins share the same nodes. Determine whether the extra plugin comes from the AKS full managed profile, GPU Operator, or a manually installed DaemonSet:

```bash
GPU_POOL_ID="$(
  az aks nodepool show \
    --resource-group "$RESOURCE_GROUP" \
    --cluster-name "$AKS_CLUSTER" \
    --name "$GPU_NODE_POOL" \
    --query id \
    --output tsv
)"

az rest \
  --method get \
  --url "https://management.azure.com${GPU_POOL_ID}?api-version=2026-01-02-preview" \
  --query properties.gpuProfile \
  --output yaml

kubectl get daemonsets --all-namespaces \
  --output=custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name' \
  | grep -E 'hami-device-plugin|nvidia-device-plugin'
```

If the AKS management mode is `Managed`, replace the node pool. If GPU Operator owns the additional plugin, disable its `devicePlugin` operand.

## Uninstall

Remove HAMi:

```bash
helm uninstall hami --namespace kube-system
```

Uninstalling HAMi does not stop running GPU workloads. Delete or safely drain those workloads before uninstalling. Pods that explicitly set `schedulerName: hami-scheduler` remain Pending after the scheduler is removed. See the full [uninstall guide](./uninstall).

After uninstalling HAMi, the driver-only node pool no longer has a Kubernetes device plugin. Before running GPU workloads on a retained pool, install the standard NVIDIA device plugin or GPU Operator.

To remove the GPU pool completely:

```bash
az aks nodepool delete \
  --resource-group "$RESOURCE_GROUP" \
  --cluster-name "$AKS_CLUSTER" \
  --name "$GPU_NODE_POOL"
```

## References

- [Use GPUs on AKS](https://learn.microsoft.com/azure/aks/use-nvidia-gpu)
- [AKS-managed GPU node pools](https://learn.microsoft.com/azure/aks/aks-managed-gpu-nodes)
- [Use NVIDIA GPU Operator on AKS](https://learn.microsoft.com/azure/aks/nvidia-gpu-operator)
- [AKS node-pool labels](https://learn.microsoft.com/azure/aks/use-labels)
- [AKS Cluster Autoscaler](https://learn.microsoft.com/azure/aks/cluster-autoscaler)
- [HAMi Cluster Autoscaler scale-up design](https://github.com/Project-HAMi/HAMi/blob/master/docs/develop/dry-run-filter-design.md)
- [HAMi AKS webhook ownership issue](https://github.com/Project-HAMi/HAMi/issues/2039)
- [HAMi autoscaling issue](https://github.com/Project-HAMi/HAMi/issues/1099)
- [HAMi node capacity proposal](https://github.com/Project-HAMi/HAMi/issues/2839)
