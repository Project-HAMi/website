---
title: 为容器分配设备核心和显存资源
sidebar_label: 分配核心和显存
translated: true
---

要分配设备核心资源的一部分，你只需在容器中使用 `mthreads.com/vgpu` 请求的摩尔线程 GPU 数量的同时，分配 `mthreads.com/sgpu-memory` 和 `mthreads.com/sgpu-core`。

下面的示例申请 16 GiB 显存 / 50% 算力的切片，该取值在 MTT S4000 和 MTT S5000 上均有效：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpushare-pod-default
spec:
  restartPolicy: OnFailure
  containers:
    - image: core.harbor.zlidc.mthreads.com:30003/mt-ai/lm-qy2:v17-mpc
      imagePullPolicy: IfNotPresent
      name: gpushare-pod-1
      command: ["sleep"]
      args: ["100000"]
      resources:
        limits:
          mthreads.com/vgpu: 1
          mthreads.com/sgpu-memory: 32
          mthreads.com/sgpu-core: 8
```

在 MTT S5000 上，可以申请最大至整卡 80 GiB 的更大切片（需要安装 HAMi 时将 `devices.mthreads.memoryPerCard` 设置为 `[160]`）：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpushare-pod-s5000
spec:
  restartPolicy: OnFailure
  containers:
    - image: core.harbor.zlidc.mthreads.com:30003/mt-ai/lm-qy2:v17-mpc
      imagePullPolicy: IfNotPresent
      name: gpushare-pod-1
      command: ["sleep"]
      args: ["100000"]
      resources:
        limits:
          mthreads.com/vgpu: 1
          mthreads.com/sgpu-memory: 128 # 128 x 512 MiB = 64 GiB，仅 MTT S5000 支持
          mthreads.com/sgpu-core: 8
```
