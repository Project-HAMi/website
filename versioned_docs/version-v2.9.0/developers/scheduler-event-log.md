---
id: scheduler-event-log
title: Scheduler Event Log
sidebar_label: Scheduler Event Log
---

## Current Status

### Ambiguous Event Descriptions Make Problem Diagnosis Difficult

When a user submits a job scheduled by hami-scheduler, the Pod remains in Pending state. The Pod events only show generic messages like "no available node, all node scores do not meet", without providing sufficient details to help users identify root causes.

If the Pod schedules successfully but ends up on unexpected nodes, users need visibility into:

- Number of failed/successful node candidates
- Detailed scoring metrics for candidate nodes

Example: a pending Pod with insufficient information in its events:

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

```
$ kubectl describe pod gpu-pod
...
Events:
  Type     Reason            Age   From            Message
  Warning  FailedScheduling  10s   hami-scheduler  0/1 nodes available: 1 node unregistered
  Warning  FilteringFailed   11s   hami-scheduler  no available node, all node scores do not meet
```

```
$ kubectl logs -f hami-scheduler-d69cb679b-9vtdg -c vgpu-scheduler-extender
I0422 13:42:30.272812       1 pod.go:44] "collect requestreqs" counts=[{"NVIDIA":{"Nums":2,"Type":"NVIDIA","Memreq":3000,"MemPercentagereq":101,"Coresreq":30}}]
I0422 13:42:30.272827       1 scheduler.go:499] All node scores do not meet for pod gpu-pod
I0422 13:42:30.273047       1 event.go:307] "Event occurred" object="default/gpu-pod" type="Warning" reason="FilteringFailed" message="no available node, all node scores do not meet"
```

### Interleaved Logs from Multiple Tasks Make Node Scoring Analysis Impossible

Concurrent node scoring creates interleaved logs across multiple Pods/nodes. For example:

- A 10-node cluster with 8 GPUs/node generates 80 log entries per failed Pod.
- v5-level logs show device details but lack Pod/node context.
- Default v4-level logs lack sufficient diagnostic details.

## Proposal

### Event Enhancements

Display in Pod events:

- Number of failed nodes (for both success/failure cases)
- Scores of successful nodes (when scheduled)

Failure example:

```
Events:
  Type     Reason            Age    From            Message
  Warning  FilteringFailed   2m45s  hami-scheduler  no available node, %d nodes do not meet
```

Success example:

```
Events:
  Type     Reason             Age    From            Message
  Normal   FilteringSucceed   2m45s  hami-scheduler  find fit node(node3), 7 nodes not fit, 2 nodes fit(node3:0.98,node4:0.65)
```

### Log Improvements

Two-level logging system:

**v4-level (Node summary):**

- Failed nodes: Aggregate rejection reasons
- Successful nodes: Display scores

**v5-level (Device details):**

- Per-device failure reasons with standardized error codes

Log format specification:

```
<ErrorReason> <Namespace/PodName> <NodeName> <DeviceUUID>
```

Standardized error codes:

| Raw Message                             | Error Code                        |
| --------------------------------------- | --------------------------------- |
| request devices nums cannot exceed...   | `NodeInsufficientDevice`          |
| card type mismatch...                   | `CardTypeMismatch`                |
| the container wants exclusive access... | `ExclusiveDeviceAllocateConflict` |
| card Insufficient remaining memory      | `CardInsufficientMemory`          |
| card insufficient remaining core        | `CardInsufficientCore`            |
| Numa not fit                            | `NumaNotFit`                      |
| can't allocate core=0 job...            | `CardComputeUnitsExhausted`       |

Example logs:

```
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
