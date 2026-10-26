---
title: Enable Iluvatar GPU Sharing
---

## Introduction

**HAMi now supports iluvatar.ai/gpu (i.e., MR-V100, BI-V150, BI-V100) by implementing most device-sharing features as NVIDIA GPUs**, including:

**GPU sharing**: Each task can allocate a portion of GPU instead of a whole GPU card, thus GPU can be shared among multiple tasks.

**Device Memory Control**: GPUs can be allocated with a specific device memory size, with hard limits enforced to prevent exceeding the allocation.

**Device Core Control**: GPUs can be allocated with limited compute cores, with hard limits enforced to prevent exceeding the allocation.

**Device UUID Selection**: You can specify which GPU devices to use or exclude using annotations.

**No task YAML changes required**: All GPU jobs are automatically supported after installation.

## Prerequisites

- Iluvatar gpu-manager (please consult your device provider)
- driver version > 3.1.0

## Enabling GPU-sharing Support

- Deploy gpu-manager on iluvatar nodes (please consult your device provider to acquire its package and document)

:::caution

Install only gpu-manager. Do not install the gpu-admission package.

:::

Add the following to the HAMi values file and follow [Online installation](../../installation/online-installation.md):

```yaml
devices:
  iluvatar:
    enabled: true
```

This enables Iluvatar scheduling; install gpu-manager separately as described above. Supported models and resource names are configured through `devices.iluvatar.configs`. If you customize them, also update `devices.iluvatar.customresources`. Both lists are replaced in full when overridden. See the [Chart values reference](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md) and [complete defaults](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml); do not edit the generated global ConfigMap.

## Device Granularity

HAMi allocates Iluvatar GPU compute cores in percentage points and device memory in fixed-size units.

### Memory Allocation

- Each unit of `iluvatar.ai/<card-type>.vMem` represents 256 MiB of device memory
- If no memory request is specified, the system defaults to using 100% of the available memory
- Memory allocation is enforced with hard limits to ensure tasks do not exceed their allocated memory

### Core Allocation

- Each unit of `iluvatar.ai/<card-type>.vCore` represents 1% of the available compute cores
- Core allocation is enforced with hard limits to ensure tasks do not exceed their allocated cores
- When requesting multiple GPUs, the system will automatically set the core resources based on the number of GPUs requested

## Running Iluvatar jobs

Iluvatar GPUs can now be requested by a container using the `iluvatar.ai/BI-V150-vgpu`, `iluvatar.ai/BI-V150.vMem` and `iluvatar.ai/BI-V150.vCore` resource type:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: BI-V150-poddemo
spec:
  restartPolicy: Never
  containers:
    - name: BI-V150-poddemo
      image: registry.iluvatar.com.cn:10443/saas/mr-bi150-4.3.0-x86-ubuntu22.04-py3.10-base-base:v1.0
      command:
        - bash
      args:
        - -c
        - |
          set -ex
          echo "export LD_LIBRARY_PATH=/usr/local/corex/lib64:$LD_LIBRARY_PATH">> /root/.bashrc
          cp -f /usr/local/iluvatar/lib64/libcuda.* /usr/local/corex/lib64/
          cp -f /usr/local/iluvatar/lib64/libixml.* /usr/local/corex/lib64/
          source /root/.bashrc
          sleep 360000
      resources:
        requests:
          iluvatar.ai/BI-V150-vgpu: 1
          iluvatar.ai/BI-V150.vCore: 50
          iluvatar.ai/BI-V150.vMem: 64
        limits:
          iluvatar.ai/BI-V150-vgpu: 1
          iluvatar.ai/BI-V150.vCore: 50
          iluvatar.ai/BI-V150.vMem: 64
```

:::note

Each unit of `iluvatar.ai/<card-type>.vMem` represents 256 MiB of device memory. Use a plain integer without memory suffixes such as `Mi`, `Gi`, or `G`. In the example, `64` units allocate 16 GiB per GPU.

:::

## Device UUID Selection

You can specify which GPU devices to use or exclude using annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: poddemo
  annotations:
    # Use specific GPU devices (comma-separated list)
    hami.io/use-<card-type>-uuid: "device-uuid-1,device-uuid-2"
    # Or exclude specific GPU devices (comma-separated list)
    hami.io/no-use-<card-type>-uuid: "device-uuid-1,device-uuid-2"
spec:
  # ... rest of pod spec
```

### Finding Device UUIDs

You can find the UUIDs of Iluvatar GPUs on a node using the following command:

```bash
kubectl get pod <pod-name> -o yaml | grep -A 10 "hami.io/<card-type>-devices-allocated"
```

Or by examining the node annotations:

```bash
kubectl get node <node-name> -o yaml | grep -A 10 "hami.io/node-<card-type>-register"
```

Look for annotations containing device information in the node status.

## Notes

- You need to set the following prestart command in order for the device-share to work properly

  ```sh
      set -ex
      echo "export LD_LIBRARY_PATH=/usr/local/corex/lib64:$LD_LIBRARY_PATH">> /root/.bashrc
      cp -f /usr/local/iluvatar/lib64/libcuda.* /usr/local/corex/lib64/
      cp -f /usr/local/iluvatar/lib64/libixml.* /usr/local/corex/lib64/
      source /root/.bashrc
  ```

- Virtualization takes effect only for containers that apply for one GPU (i.e., iluvatar.ai/vgpu=1). When requesting multiple GPUs, the system will automatically set the core resources based on the number of GPUs requested.

- The `iluvatar.ai/<card-type>.vMem` resource is only effective when `iluvatar.ai/<card-type>-vgpu=1`.

- Multi-device requests (`iluvatar.ai/<card-type>-vgpu= > 1`) do not support vGPU mode.
