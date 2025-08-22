---
title: 分配任务到特定类型
translated: true
---

## 分配任务到特定类型

要将任务分配到特定的 GPU 类型，只需在注释字段中分配 `nvidia.com/use-gputype`。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    nvidia.com/use-gputype: "A100,V100"
    #在此示例中，我们希望在 A100 或 V100 上运行此作业
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:18.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 2 # 请求 2 个 vGPU
```

> **注意：** *您可以将此任务分配给多种 GPU 类型，使用逗号分隔。在此示例中，我们希望在 A100 或 V100 上运行此作业*