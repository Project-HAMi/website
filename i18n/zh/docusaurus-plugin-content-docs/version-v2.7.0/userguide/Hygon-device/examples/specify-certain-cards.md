---
title: 将任务分配给特定的 DCU
translated: true
---

## 将任务分配给特定的 DCU

要将任务分配给特定的 DCU，只需在注释字段中分配  `hygon.com/use-gpuuuid`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    hygon.com/use-gpuuuid: "DCU-123,DCU-456" # 指定以逗号分隔的 DCU UUID
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:18.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          hygon.com/dcunum: 1 # 请求两个 DCU 卡
```