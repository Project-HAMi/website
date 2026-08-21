---
id: scheduler-event-log
title: 调度器事件日志
translated: true
sidebar_label: 调度器事件日志
---

## 当前状态

### 模糊的事件描述使问题诊断变得困难

当用户提交一个由 hami-scheduler 调度的作业时，Pod 会保持在 Pending 状态。Pod 事件仅显示诸如 "no available node, all node scores do not meet" 之类的通用消息，未提供足够的细节来帮助用户定位根本原因。

如果 Pod 调度成功但最终落到了意外的 node 上，用户需要了解：

- 失败/成功的 node 候选数量
- 候选 node 的详细评分指标

示例：一个 Pending 状态的 Pod，其 event 中信息不足：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: worker01
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: "1"
          nvidia.com/gpumem: "3000"
          nvidia.com/gpucores: "30"
```

```bash
$ kubectl describe pod gpu-pod
...
Events:
  Type     Reason            Age   From            Message
  Warning  FailedScheduling  10s   hami-scheduler  0/1 nodes available: 1 node unregistered
  Warning  FilteringFailed   11s   hami-scheduler  no available node, all node scores do not meet
```

```bash
$ kubectl logs -f hami-scheduler-d69cb679b-9vtdg -c vgpu-scheduler-extender
I0422 13:42:30.272812       1 pod.go:44] "collect requestreqs" counts=[{"NVIDIA":{"Nums":2,"Type":"NVIDIA","Memreq":3000,"MemPercentagereq":101,"Coresreq":30}}]
I0422 13:42:30.272827       1 scheduler.go:499] All node scores do not meet for pod gpu-pod
I0422 13:42:30.273047       1 event.go:307] "Event occurred" object="default/gpu-pod" type="Warning" reason="FilteringFailed" message="no available node, all node scores do not meet"
```

### 多个任务交错的日志使 node 评分分析无法进行

并发的 node 评分会在多个 Pod/node 之间产生交错的日志。例如：

- 一个 10 个 node 的集群，每个 node 8 个 GPU，每个失败的 Pod 会产生 80 条日志。
- v5 级别的日志展示了设备细节，但缺少 Pod/node 上下文。
- 默认的 v4 级别日志缺少足够的诊断细节。

## 方案

### Event 增强

在 Pod 的 event 中展示：

- 失败的 node 数量（包括成功和失败两种情况）
- 成功 node 的评分（调度成功时）

失败示例：

```plaintext
Events:
  Type     Reason            Age    From            Message
  Warning  FilteringFailed   2m45s  hami-scheduler  no available node, %d nodes do not meet
```

成功示例：

```plaintext
Events:
  Type     Reason             Age    From            Message
  Normal   FilteringSucceed   2m45s  hami-scheduler  find fit node(node3), 7 nodes not fit, 2 nodes fit(node3:0.98,node4:0.65)
```

### 日志改进

两级日志系统：

**v4 级别（Node 汇总）：**

- 失败的 node：汇总拒绝原因
- 成功的 node：展示评分

**v5 级别（设备细节）：**

- 每台设备的失败原因，附带标准化的错误码

日志格式规范：

```plaintext
<ErrorReason> <Namespace/PodName> <NodeName> <DeviceUUID>
```

标准化的错误码：

| Raw Message                             | Error Code                        |
| --------------------------------------- | --------------------------------- |
| request devices nums cannot exceed...   | `NodeInsufficientDevice`          |
| card type mismatch...                   | `CardTypeMismatch`                |
| the container wants exclusive access... | `ExclusiveDeviceAllocateConflict` |
| card Insufficient remaining memory      | `CardInsufficientMemory`          |
| card insufficient remaining core        | `CardInsufficientCore`            |
| Numa not fit                            | `NumaNotFit`                      |
| can't allocate core=0 job...            | `CardComputeUnitsExhausted`       |

示例日志：

```plaintext
(v=5) I0422 02:15:42.349712  1 score.go:210] NodeInsufficientDevice pod="llm/deepseek-5996b8569d-kgwgx" node="node2" request devices nums=2 node device nums=1
(v=5) I0422 02:15:42.349712  1 score.go:99]  CardTypeMismatch pod="llm/deepseek-5996b8569d-kgwgx" node="node1" device="GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448"
(v=5) I0422 02:15:42.349712  1 score.go:137] CardInsufficientMemory pod="llm/deepseek-5996b8569d-kgwgx" node="node3" device="GPU-62b7408e-edb2-41d1-bc91-f46165c61130" device total memory=50 request memory=1000
(v=5) I0422 02:15:42.349712  1 score.go:205] NumaNotFit pod="llm/deepseek-5996b8569d-kgwgx" node="node1" device="GPU-cc244283-5652-4c35-81b0-0f54d75c0a56" k.nums=1 numa=true prevnuma=1 device numa=0
(v=5) I0422 02:15:42.349712  1 score.go:142] CardInsufficientCore pod="llm/deepseek-5996b8569d-kgwgx" node="node3" device total core=100 device used core=90 request cores=20
(v=5) I0422 02:15:42.349712  1 score.go:148] ExclusiveDeviceAllocateConflict pod="llm/deepseek-5996b8569d-kgwgx" node="node1" device index=0 used=9
(v=4) I0422 02:15:42.349712  1 score.go:289] NodeUnfitPod pod="llm/deepseek-5996b8569d-kgwgx" node="node1" reason="2/8 NumaNotFit, 3/8 CardInsufficientMemory, 2/8 CardInsufficientCore, 1/8 ExclusiveDeviceAllocateConflict"
(v=4) I0422 02:15:42.349712  1 score.go:300] NodeFitPod pod="llm/deepseek-5996b8569d-kgwgx" node="node3" score="0.65"
(v=4) I0422 02:15:42.349712  1 score.go:300] NodeFitPod pod="llm/deepseek-5996b8569d-kgwgx" node="node5" score="0.85"
```
