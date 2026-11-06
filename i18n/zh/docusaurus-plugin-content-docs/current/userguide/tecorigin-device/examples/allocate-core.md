---
title: 为容器分配核心
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

超过单卡核心数的请求会被拆分，并优先使用最少张卡，同时在候选组合中选择最紧凑的搭配：先填满空闲核心较少的卡，以免留下碎片。在空闲 4 核卡的节点上，`6` 会占用一张卡的 4 个核心和另一张卡的 2 个核心。

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

两者同时设置时以 limits 为准；只设置 requests 同样生效，适用于仅填写 `resources.requests` 的工作负载：

```yaml
      resources:
        requests:
          tecorigin.com/gpucore: 1
```

`0` 表示“不使用设备”：容器会正常调度，但不分配太初元碁核心，而不是调度失败。小数或负数会被判定为非法设备请求。

## 查看分配结果

```bash
kubectl get pod teco-six-cores -o yaml | grep hami.io/tecorigin-devices-allocated
```

该值为每个容器在每张卡上的一个条目：`<显卡序列号>,<类型>,<显存 MiB>,<核心掩码>`，其中掩码以十进制表示——4 核卡上的 `15` 代表全部四个核心。