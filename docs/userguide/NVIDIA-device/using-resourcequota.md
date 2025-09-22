---
title: Using Extended ResourceQuota for NVIDIA Devices
translated: true
---

## Extended ResourceQuota

HAMi extends the native scheduler, allowing you to use the built-in ResourceQuota to limit resources. For NVIDIA devices, HAMi supports an extended version of ResourceQuota for specialized scenarios. For tasks requesting multiple devices, the native ResourceQuota calculates the request for each resource individually, while the extended ResourceQuota calculates the actual resource request based on the number of devices.
```yaml
resources:
  requests:
    nvidia.com/gpu: 2
    nvidia.com/gpumem: 2000
```
In addition, the extended ResourceQuota also supports limiting GPU memory and compute power requests based on the actual cluster device situation. For example, if a task is about to be scheduled on a GPU with 2000MB of memory, the HAMi scheduler will calculate whether the request is feasible.

## Using Extended ResourceQuota

To ensure HAMi scheduler recognizes the extended ResourceQuota, the resource names should include the limit. prefix. For instance, the following ResourceQuota configuration limits the GPU memory usage in the default namespace to 2000MiB and restricts the use of more than 2 GPUs:
```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: default
spec:
  hard:
    limit.nvidia.com/gpu: 2
    limit.nvidia.com/gpumem: 2000
```