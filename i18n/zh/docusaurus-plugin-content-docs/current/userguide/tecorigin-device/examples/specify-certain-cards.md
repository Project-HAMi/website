---
title: 分配到特定设备
sidebar_label: 指定设备
description: 通过 use-gpuuuid 与 nouse-gpuuuid 注解将工作负载绑定到指定显卡，或排除特定显卡。
translated: true
---

工作负载可以通过 Pod 注解绑定到指定显卡，或排除特定显卡。注解值为逗号分隔的显卡序列号，与节点注册注解中的 `id` 字段完全匹配。

## 指定使用某些显卡

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: teco-pinned
  annotations:
    tecorigin.com/use-gpuuuid: "3CP100241200184,3CP100241200185"
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

## 排除某些显卡

```yaml
metadata:
  annotations:
    tecorigin.com/nouse-gpuuuid: "3CP100241200187"
```

`use-gpuuuid` 和 `nouse-gpuuuid` 一起生效：如果设置了白名单，显卡必须在白名单内，并且不能出现在黑名单中。同时设置两个注解是允许的；同时出现在白名单和黑名单里的显卡会被排除。

## 查看显卡序列号

读取节点的注册注解：

```bash
kubectl get node <node-name> -o jsonpath='{.metadata.annotations.hami\.io/node-tecorigin-register}'
```

每个以 `:` 分隔的片段中第一个字段即显卡序列号：

```text
3CP100241200184,4,15296,15,Tecorigin,0,true,0,hami-core:
3CP100241200185,4,15296,15,Tecorigin,0,true,0,hami-core:
```

该序列号同时也是 `teco-smi` 输出的显卡标识，以及 HAMi 在 `hami.io/tecorigin-devices-allocated` 中记录的值。

:::note
序列号在集群内唯一标识一张卡，因此绑定指定卡片等价于绑定节点。
绑定卡片的工作负载如果无法调度，会保持 Pending，分配拒绝原因可能为 `CardTimeSlicingExhausted`、`CardUuidMismatch` 或 `CardInsufficientCore`：
- `CardTimeSlicingExhausted`：节点上某张卡已达到容器数量上限，该卡可能不在允许的UUID列表内。
- `CardUuidMismatch`：调度器尝试选中了不在允许UUID列表中的其他卡片；
- `CardInsufficientCore`：目标卡空闲核不足。
该工作负载不会自动调度到未被允许使用的其他卡片上。
:::
