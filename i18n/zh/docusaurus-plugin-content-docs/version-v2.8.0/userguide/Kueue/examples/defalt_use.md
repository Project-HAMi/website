---
title: 默认 Kueue 使用示例
---

本示例演示了如何将 Kueue 与 HAMi vGPU 资源配合使用。示例包含一套完整的配置，用于创建
ResourceFlavor、ClusterQueue、LocalQueue，以及一个请求 vGPU 资源的示例 Deployment。

在应用此示例之前，请确保已安装 HAMi 和 Kueue，并且已在 Kueue 中启用 ResourceTransformation
配置（参见 [如何在 HAMi 上使用 Kueue](../how-to-use-kueue.md)）。

```yaml
apiVersion: kueue.x-k8s.io/v1beta1
kind: ResourceFlavor
metadata:
  name: hami-flavor
spec:
  nodeLabels:
    gpu: "on"
---
apiVersion: kueue.x-k8s.io/v1beta1
kind: ClusterQueue
metadata:
  name: hami-queue
spec:
  namespaceSelector: {}
  resourceGroups:
  - coveredResources:
    - nvidia.com/gpu
    - nvidia.com/total-gpucores
    - nvidia.com/total-gpumem
    flavors:
    - name: hami-flavor
      resources:
      - name: nvidia.com/gpu
        nominalQuota: 20
      - name: nvidia.com/total-gpucores
        nominalQuota: 600
      - name: nvidia.com/total-gpumem
        nominalQuota: 20480
---
apiVersion: v1
kind: Namespace
metadata:
  name: kueue-test
---
apiVersion: kueue.x-k8s.io/v1beta1
kind: LocalQueue
metadata:
  name: user-queue
  namespace: kueue-test
spec:
  clusterQueue: "hami-queue"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gpu-burn
  namespace: kueue-test
  labels:
    kueue.x-k8s.io/queue-name: user-queue
spec:
  replicas: 1
  selector:
    matchLabels:
      app-name: gpu-burn
  template:
    metadata:
      labels:
        app-name: gpu-burn
    spec:
      containers:
      - args:
        - while :; do /app/gpu_burn 300 || true; sleep 300; done
        command:
        - /bin/sh
        - -lc
        image: oguzpastirmaci/gpu-burn:latest
        imagePullPolicy: IfNotPresent
        name: main
        resources:
          limits:
            nvidia.com/gpu: "2"        # 请求 2 个 vGPU 实例
            nvidia.com/gpucores: "30"  # 每个 vGPU 为 30 核
            nvidia.com/gpumem: "1024"  # 每个 vGPU 为 1024 MiB
```
