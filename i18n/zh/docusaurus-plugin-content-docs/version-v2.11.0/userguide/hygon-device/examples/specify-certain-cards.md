---
title: 将任务分配给特定的 HCU
sidebar_label: 指定 HCU
translated: true
---

要将任务分配给特定的 HCU，只需在注释字段中分配 `hygon.com/use-gpuuuid`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    hygon.com/use-gpuuuid: "HCU-123,HCU-456" # 指定以逗号分隔的 HCU UUID
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:18.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          hygon.com/hcunum: 1 # 请求一个 HCU 卡
```
