---
title: 独占整卡
description: 通过申请整卡核心数独占一张太初元碁显卡，并核对 HAMi 回写到 Pod 的核心掩码。
translated: true
---

该后端没有单独的独占资源。容器通过申请某张卡的全部核心来独占整卡——4 核卡即 `4`。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: teco-whole-card
spec:
  containers:
    - name: ctr
      image: ubuntu:22.04
      command: ["sleep"]
      args: ["infinity"]
      resources:
        limits:
          tecorigin.com/gpucore: 4
```

由于调度器不会拆分本可由单卡容纳的请求，在 4 核卡节点上申请 `4` 个核心只能由一张拥有四个空闲核心的卡满足，不会有其他容器共享该卡。

:::note

核心数必须与节点上的卡型一致。3 核卡对应的独占请求是 `3`，写 `4` 会被拆成 3 + 1 分布在两张卡上。

:::

申请多张整卡只是把核心数相加：

```yaml
      resources:
        limits:
          tecorigin.com/gpucore: 8 # 两张完整的 4 核卡
```

HAMi 会用尽可能少的卡满足该请求，因此这里正好占用两张整卡，不会把第三张卡切碎。

## 查看分配结果

```bash
kubectl get pod teco-whole-card -o yaml | grep hami.io/tecorigin-devices-allocated
```

整张 4 核卡显示掩码 `15`（`0b1111`）：

```text
hami.io/tecorigin-devices-allocated: 3CP100241200184,Tecorigin,0,15
```
