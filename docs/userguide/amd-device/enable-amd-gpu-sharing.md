---
title: Enable AMD GPU Sharing
sidebar_label: GPU Sharing
---

## Introduction

HAMi supports sharing AMD Instinct/ROCm GPUs. Workloads request device memory and compute-unit (CU) share through standard Kubernetes resources, without application code changes.

**GPU sharing**: Multiple tasks can share one AMD GPU instead of occupying a whole card.

**Device memory control**: Allocate a specific amount of device memory (MiB). HAMi enforces a hard limit so usage cannot exceed the allocation.

**Device compute core limitation**: Allocate a percentage of compute units (`amd.com/gpucores: 25` means about 25% of the device CUs).

:::caution

Use the [amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin) image and Helm chart. Do not deploy the upstream ROCm `k8s-device-plugin` image for HAMi soft vGPU.

Fractional memory isolation loads `libamvgpu.so` through glibc `LD_AUDIT` and currently requires glibc symbols through `GLIBC_2.34`. Workload images based on older glibc (for example Ubuntu 20.04 or RHEL 8) or musl/Alpine are not supported yet. See [HAMi#2265](https://github.com/Project-HAMi/HAMi/issues/2265).

:::

## Prerequisites

Deploy these components:

| Component | Role | Key requirement |
| --- | --- | --- |
| HAMi | Scheduling, allocation, and admission | Scheduler is running and manages the three AMD resources |
| AMD GPU Operator (recommended) | Driver and ROCm environment | Disable the Operator native device-plugin |
| [amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin) | Register AMD resources, allocate CUs, inject runtime limits | Deploy chart/image `0.0.1` or newer; discovers VRAM/CU via amd-smi/libdrm |

Nodes also need a working AMD driver and ROCm (validated with ROCm 7.0.2). Verify with:

```bash
amd-smi static --gpu 0
```

The output should include the device model, VRAM, and `NUM_COMPUTE_UNITS`.

## Enabling AMD GPU Sharing

### Configure HAMi

After installing HAMi, confirm the scheduler manages all AMD vGPU resources. The values file should include:

```yaml
devices:
  amd:
    customresources:
      - amd.com/gpu
      - amd.com/gpumem
      - amd.com/gpucores
```

Confirm the scheduler is running:

```bash
kubectl -n kube-system get pods | grep hami-scheduler
```

### Disable the AMD GPU Operator device-plugin

If you use the [AMD GPU Operator](https://github.com/ROCm/gpu-operator) for drivers and ROCm, disable its native device-plugin so it does not compete with HAMi `amd-device-plugin` for `amd.com/gpu`:

```bash
kubectl -n kube-amd-gpu patch deviceconfig default --type=merge -p \
  '{"spec":{"devicePlugin":{"enableDevicePlugin":false}}}'
```

`amd-device-plugin` reads per-device VRAM, CU count, UUID, and product name through amd-smi/libdrm, so the Operator node-labeller is optional for HAMi soft vGPU.

### Deploy amd-device-plugin

Deploy [amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin) to all AMD GPU nodes. Chart `0.0.1` defaults to image `ghcr.io/project-hami/amd-device-plugin:0.0.1` and installs the bundled `libamvgpu.so` hook onto the node through a `postStart` lifecycle hook:

```bash
helm upgrade --install amd-gpu \
  https://github.com/Project-HAMi/amd-device-plugin/releases/download/amd-gpu-helm-0.0.1/amd-gpu-0.0.1.tgz \
  --namespace kube-system \
  --create-namespace
```

If the GHCR package is private in your environment, configure `imagePullSecrets`. You can also clone the repository and install from `./helm/amd-gpu`.

Wait for the DaemonSet:

```bash
kubectl -n kube-system rollout status ds/amd-gpu-device-plugin-daemonset
```

Confirm the device-plugin registered full device info with HAMi:

```bash
kubectl get node <node-name> -o jsonpath='{.metadata.annotations.hami\.io/node-amd-register}'
```

The result must include `devmem` and `devcore`. Example for MI300X VF:

```json
[
  {
    "id": "8eff74b5-0000-1000-801b-b56457addd1b",
    "index": 0,
    "count": 10,
    "devmem": 196288,
    "devcore": 304,
    "type": "AMD Instinct MI300X VF",
    "numa": 0,
    "health": true,
    "devicevendor": "amd",
    "custominfo": {
      "pciBDF": "0000:83:00.0"
    }
  }
]
```

## Running AMD vGPU Jobs

Request AMD GPUs with `amd.com/gpu`, `amd.com/gpumem`, and `amd.com/gpucores`:

- `amd.com/gpu`: number of AMD GPUs
- `amd.com/gpumem`: device memory quota per GPU, in MiB
- `amd.com/gpucores`: CU quota percentage per GPU, range 0-100; for example `25` allocates about 76 CUs on a 304-CU device

Use a glibc workload image that meets the `GLIBC_2.34` requirement above (for example a recent `rocm/pytorch` tag):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-vgpu-example
spec:
  schedulerName: hami-scheduler
  restartPolicy: Never
  containers:
    - name: pytorch
      image: rocm/pytorch:latest
      command: ["bash", "-c"]
      args:
        - |
          env | grep -E 'LD_AUDIT|HIP_DEVICE_MEMORY_LIMIT'
          python3 -c 'import torch; print(torch.cuda.mem_get_info(0)); print(torch.cuda.get_device_name(0))'
          sleep 300
      resources:
        requests:
          amd.com/gpu: 1
          amd.com/gpumem: 49152
          amd.com/gpucores: 25
        limits:
          amd.com/gpu: 1
          amd.com/gpumem: 49152
          amd.com/gpucores: 25
```

```bash
kubectl apply -f amd-vgpu-example.yaml
kubectl get pod amd-vgpu-example -o wide
kubectl logs amd-vgpu-example
```

On success, logs look like:

```text
LD_AUDIT=/usr/local/vgpu/libamvgpu.so
HIP_DEVICE_MEMORY_LIMIT=49152m
(51539607552, 51539607552)
AMD Instinct MI300X VF
```

`51539607552` is bytes, about 48 GiB. You can submit two identical 48 GiB / 25% CU workloads to verify sharing.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| `node unregistered` | Check that `amd-device-plugin` is running and `hami.io/node-amd-register` contains `devmem` and `devcore`. Restart the DaemonSet if needed. |
| `CardInsufficientMemory` | The Pod requests more memory than the device has free. Lower `amd.com/gpumem` or wait for other workloads to finish. |
| `insufficient free CUs` | Delete finished AMD vGPU test Pods and restart `amd-device-plugin` to clear stale allocations. |
| Memory inside the container still shows the full physical size | Check that the Pod env includes `LD_AUDIT` and `HIP_DEVICE_MEMORY_LIMIT`, and that the workload image has a compatible glibc. |
| Workload fails to start / cannot load `libamvgpu.so` | Switch to a glibc image with `GLIBC_2.34` or newer. musl/Alpine and older distros are not supported yet. |

Clean up after testing:

```bash
kubectl delete pod amd-vgpu-example
```

## Notes

1. Deploy [amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin) `0.0.1` or newer (`ghcr.io/project-hami/amd-device-plugin`).
2. Keep the AMD GPU Operator native device-plugin disabled while using HAMi AMD soft vGPU sharing.
3. Omitting `amd.com/gpucores` allocates all CUs on each requested GPU.
4. The bundled `libamvgpu.so` delivery is temporary and will move to `amd-hami-core` once that project publishes a consumption pipeline.
