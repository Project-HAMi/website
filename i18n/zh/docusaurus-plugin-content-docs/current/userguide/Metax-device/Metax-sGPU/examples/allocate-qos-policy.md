---
title: 分配特定 Qos Policy 的设备
translated: true
---

用户可以通过 `metax-tech.com/sgpu-qos-policy` 为任务配置 Qos Policy 参数以指定 sGPU 使用的调度策略。具体的 sGPU 调度策略说明参见下表。

| 调度策略   | 描述  |
| --- | --- |
| `best-effort`   | sGPU 不限制算力   |
| `fixed-share`   | sGPU 有固定的算力配额，且无法超过固定配额使用  |
| `burst-share`   | sGPU 有固定的算力配额，若 GPU 卡还有空闲算力，就可以被 sGPU 使用 |

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
  annotations:
    metax-tech.com/sgpu-qos-policy: "best-effort" # 分配特定的 qos sgpu
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      imagePullPolicy: IfNotPresent
      command: ["sleep","infinity"]
      resources:
        limits:
          metax-tech.com/sgpu: 1 # 请求 1 个 GPU
          metax-tech.com/vcore: 60 # 每个 GPU 使用 60% 的计算核
          metax-tech.com/vmemory: 4 # 每个 GPU 需要 4 GiB 设备显存
```
