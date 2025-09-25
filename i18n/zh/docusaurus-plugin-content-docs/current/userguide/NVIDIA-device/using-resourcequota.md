---
title: 为 NVIDIA 设备使用扩展的 resourcequota
translated: true
---

## 扩展的resourcequota

HAMi 基于原生调度器扩展，你可以使用原生的 resourcequota 对资源进行限制。对于 NVIDIA 设备，HAMi 支持了在扩展场景下的 resourcequota。对于请求多个设备的任务，原生 resourcequota 会单独计算每个资源的请求量，而扩展的resourcequota 会根据设备数量计算实际的资源请求量。例如，以下任务请求两个 GPU 和 2000MB 的 GPU 内存，它在 HAMi scheduler 中会被正确计算为 4000MB 的资源请求量。
```yaml
resources:
  requests:
    nvidia.com/gpu: 2
    nvidia.com/gpumem: 2000
```
此外，扩展的 resourcequota 还支持根据集群设备实际情况对未指定显存和算力的整或按百分比申请显存的请求进行 quota 计算和限制。例如，如果当前任务即将分配到一个具有 2000MB 显存的 GPU，HAMi scheduler会据此计算是否满足当前配额要求，并将实际分配结果分配到已使用的资源配额中。

## 使用扩展的resourcequota

扩展的 resourcequota 资源命名需要带有"limits."前缀以保证被 HAMi scheduler 识别。例如，下面的 resourcequota 配置将限制default命名空间上所有任务的显存使用量不能超过 2000MiB，并且不能超过 2 个 GPU。
```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: default
spec:
  hard:
    limits.nvidia.com/gpu: 2
    limits.nvidia.com/gpumem: 2000
```