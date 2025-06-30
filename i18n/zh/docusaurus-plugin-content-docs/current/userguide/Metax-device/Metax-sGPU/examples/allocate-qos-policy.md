---
title: 分配特定Qos Policy的设备
translated: true
---

## 分配特定Qos Policy的设备

用户可以通过 `metax-tech.com/sgpu-qos-policy` 为任务配置Qos Policy参数以指定sGPU使用的调度策略。具体的sGPU调度策略说明参见下表。

| 调度策略   | 描述  |
| --- | --- |
| `best-effort`   | sGPU不限制算力   |
| `fixed-share`   | sGPU有固定的算力配额，且无法超过固定配额使用  |
| `burst-share`   | sGPU有固定的算力配额，若GPU卡还有空闲算力，就可以被sGPU使用 |

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    metax-tech.com/sgpu-qos-policy: "best-effort" # allocate specific qos sgpu
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      imagePullPolicy: IfNotPresent
      command: ["sleep","infinity"]
      resources:
        limits:
          metax-tech.com/sgpu: 1 # requesting 1 GPU
          metax-tech.com/vcore: 60 # each GPU use 60% of total compute cores
          metax-tech.com/vmemory: 4 # each GPU require 4 GiB device memory
```
