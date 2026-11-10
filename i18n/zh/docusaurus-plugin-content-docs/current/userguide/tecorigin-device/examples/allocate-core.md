---
title: 为容器分配核心
description: 申请太初元碁显卡的一个或多个核心，了解请求如何跨卡拆分，并核对 HAMi 记录的分配结果。
translated: true
---

`tecorigin.com/gpucore` 是**核心数**，不是卡数。以下示例假设显卡为 4 核，因此单卡提供 4 个核心，8 卡节点共 32 个核心。

## 单个核心

申请一个核心的容器会获得某张卡的一个核心，其他容器仍可使用同一张卡剩余的核心。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: teco-one-core
spec:
  containers:
    - name: ctr
      image: ubuntu:22.04
      command: ["sleep"]
      args: ["infinity"]
      resources:
        limits:
          tecorigin.com/gpucore: 1
```

## 一张卡上的部分核心

占用一张卡的两个核心。调度器优先使用单卡，并取最低的空闲核心，因此只要还存在拥有两个空闲核心的卡，该请求就不会被拆分到两张卡上。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: teco-two-cores
spec:
  containers:
    - name: ctr
      image: ubuntu:22.04
      command: ["sleep"]
      args: ["infinity"]
      resources:
        limits:
          tecorigin.com/gpucore: 2
```

## 跨多张卡

超过单卡核心数的请求会用最少的卡数承载，并在这类组合中选择空闲核心总量最贴近请求的一组，因此已部分占用的卡会优先于整卡空闲的卡。核心再从选中的卡中按空闲核心数由多到少依次取用。在全部空闲的 4 核卡节点上，`6` 会占用一张卡的 4 个核心和另一张卡的 2 个核心；若候选卡分别有 4 个和 3 个空闲核心，则先从前者取 4 个、再从后者取 2 个，后者剩余 1 个核心。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: teco-six-cores
spec:
  containers:
    - name: ctr
      image: ubuntu:22.04
      command: ["sleep"]
      args: ["infinity"]
      resources:
        limits:
          tecorigin.com/gpucore: 6
```

只有当请求能够在不超出物理最少卡数的前提下被满足时，节点才可用。若某节点需要三张卡才能满足本可由两张卡满足的请求，该请求不会被放到该节点上。

## requests 与 limits

当两者同时设置时，limit 优先级更高。对于 `tecorigin.com/gpucore` 这类扩展资源，request 和 limit 必须设置为相同的值。

```yaml
      resources:
        limits:
          tecorigin.com/gpucore: 1
        requests:
          tecorigin.com/gpucore: 1
```

`0` 代表不申请太初元碁核，但仍然会触发 HAMI 准入 webhook 校验。例如：特权容器搭配 `tecorigin.com/gpucore: 0` 有可能被 webhook 拒绝。小数、负数会被判定为非法设备请求。
> 建议：如果不需要太初元碁设备，直接省略该资源字段，不要设置为 `0`。

## 查看分配结果

```bash
kubectl get pod teco-six-cores -o yaml | grep hami.io/tecorigin-devices-allocated
```

该值为每个容器在每张卡上的一个条目：`<显卡序列号>,<类型>,<显存 MiB>,<核心掩码>`，其中掩码以十进制表示——4 核卡上的 `15` 代表全部四个核心。
