---
title: "Introducing HAMi GPU Descheduler: Automated GPU Defragmentation for Kubernetes"
date: "2026-11-17"
slug: hami-gpu-descheduler
description: "GPU fragmentation can leave a cluster 67% idle while new Pods stay Pending. Learn why it happens and how HAMi GPU Descheduler consolidates scattered vGPU workloads to recover contiguous GPU capacity."
authors: [rootsongjc, yixin_team]
tags: ["HAMi", "GPU", "Kubernetes", "Descheduler"]
---

GPUs are the most expensive resource in a Kubernetes cluster, so most teams share them. With [HAMi](https://github.com/Project-HAMi/HAMi), a single GPU can be split into virtual GPUs and assigned to multiple Pods, each with its own memory and compute isolation.

Sharing, however, introduces a problem that every long-running cluster eventually hits: **GPU fragmentation**. Pods come and go through autoscaling, rolling updates, and failed jobs, and each leaves a small slice of GPU memory behind. One day a Pod asks for a whole GPU, the cluster reports plenty of free memory, yet the Pod stays `Pending`. The capacity is there, but it is scattered in pieces too small to use.

This post explains why GPU fragmentation happens, why it is hard to fix by hand, and how [HAMi GPU Descheduler](https://github.com/Project-HAMi/gpu-descheduler) automates the fix.

<!-- truncate -->

## The problem: capacity without placement

Consider a two-node cluster, each node with 4 GPUs shared through HAMi. Eight Pods hold small vGPU slices:

- Node A: `a` 30%, `b` 40%, `c` 25%, `d` 45%
- Node B: `e` 35%, `f` 20%, `g` 40%, `h` 30%

Across the cluster, only 33% of total GPU memory is in use and 67% is free. Now a new Pod requests **one whole GPU**. No single device anywhere has 100% free, so the scheduler cannot place it. The Pod waits in `Pending` while most of your GPU investment sits idle.

![GPU fragmentation before and after defragmentation](/img/blog/hami-gpu-descheduler/en/gpu-fragmentation.svg#light-only) ![GPU fragmentation before and after defragmentation](/img/blog/hami-gpu-descheduler/en/gpu-fragmentation-dark.svg#dark-only)

This is the same phenomenon as memory or disk fragmentation, with one difference: you cannot `malloc` your way out. A Pod that needs an entire GPU device (for example, a model that does not shard) can only run on a device that is completely free, and slices on different GPUs cannot be combined. Nor is fragmentation only a whole-GPU problem: any vGPU request stalls when it exceeds the largest free slice on any single device. A Pod asking for 70% of a GPU cannot land on cards whose free memory is split into 40% and 30% scraps, either. The whole-GPU request is simply the easiest case to spot.

## Where fragmentation comes from

Fragmentation is not caused by a bug. It is the natural result of a dynamic cluster:

- **Horizontal autoscaling.** Scale-down removes Pods scattered across many nodes, leaving partial GPUs everywhere.
- **Rolling updates.** The new version of a Deployment starts on nodes with room for its slice; the old version leaves holes behind.
- **Retries and failed jobs.** A training job that restarts may land on a different node each time.
- **Mixed workloads.** Inference Pods requesting 20% to 40% of a GPU interleave with jobs that need whole devices.

Over weeks, the cluster drifts from a compact layout to a scattered one. Total utilization looks healthy in dashboards while contiguous free capacity quietly disappears. Worse, the workloads fragmentation blocks are often the ones that matter most: small Pods keep slipping into the gaps, while larger requests, such as training and fine-tuning jobs, are the hardest to place.

## Why fixing it by hand hurts

The manual fix is well known: find the fragments, `kubectl delete pod` the ones you can move, wait for their controllers to recreate them, and hope they land in the right places, possibly pinning them with node selectors. Repeat until some device has a free slice large enough for the waiting Pod.

This works once or twice, but it has real costs:

- Every eviction is a manual disruption decision: you must know which workloads tolerate it.
- Recreated Pods go back through the scheduler, which may spread them out again, undoing your work.
- There is no record of intent, so the layout degrades again and the whole exercise repeats.

What teams need is a way to express "consolidate these workloads onto that node's GPU" as a declarative, one-shot operation. That is exactly what HAMi GPU Descheduler provides.

## HAMi GPU Descheduler

[HAMi GPU Descheduler](https://github.com/Project-HAMi/gpu-descheduler) is a GPU defragmentation tool for HAMi-virtualized Kubernetes clusters. It consolidates scattered vGPU workloads across nodes through two mechanisms: a **Mutating Admission Webhook** and the **`HamiPodPlacement` CRD**. Its role parallels the disk defragmenter of an operating system: pack scattered workloads together and restore contiguous free capacity on each device. It complements the HAMi Scheduler, which virtualizes, schedules, and isolates GPU resources, by repacking what has already been allocated.

![How HAMi GPU Descheduler consolidates fragmented vGPU workloads](/img/blog/hami-gpu-descheduler/en/how-it-works.svg#light-only) ![How HAMi GPU Descheduler consolidates fragmented vGPU workloads](/img/blog/hami-gpu-descheduler/en/how-it-works-dark.svg#dark-only)

The flow works like this:

1. You create a `HamiPodPlacement` describing the desired placement: a target node, GPU devices, the Pod it applies to, and optionally a Pod to evict to make room.
2. If `evictPod` is set, the descheduler evicts that Pod and waits. The workload's controller (Deployment, StatefulSet, etc.) recreates it.
3. When the target Pod, new or recreated, goes through admission, the webhook matches it against the `HamiPodPlacement` (`reqID` plus `podSelector`) and injects the planned placement.
4. The Pod is scheduled to the exact node and GPU device you specified. Each `HamiPodPlacement` is consumed by exactly one Pod, which keeps the operation idempotent and auditable.

Because placement is expressed as a CRD, defragmentation becomes just another Kubernetes operation: declarative, reviewable in git, and safe to automate.

## Defragmenting the cluster

Back to the fragmented two-node cluster from the beginning. Six one-shot placements reach the "after" state in the diagram: Pods `e`, `f`, `g`, and `h` relocate from Node B onto Node A, while `c` and `d` are re-pinned within Node A so the eight Pods pack onto GPUs 0 through 2. A placement for Pod `e` looks like this:

```yaml
apiVersion: scheduling.hami.placement.com/v1
kind: HamiPodPlacement
metadata:
  name: consolidate-e
  namespace: default
spec:
  reqID: "defrag-e-0001" # min length 5, consumed once
  podSelector:
    matchLabels:
      app: inference
  nodeName: gpu-node-a
  gpuDevices:
    - gpu-1 # or gpu-1/70 for 70% of GPU 1
  evictPod: inference-e-6cd5964877-zdb5z # Pod to evict and re-place
```

One caution on `podSelector`: it decides which Pod consumes the placement, and the first matching Pod to pass admission takes it. If every Pod in the namespace carries `app: inference`, a sibling could consume the placement meant for `e`. Labels such as the ReplicaSet's `pod-template-hash` do not solve this: every replica in the same ReplicaSet carries the same value, so a sibling admitted first can still take the placement. Use a label that only the workload being relocated carries, so the selector matches nothing else, and with multi-replica workloads move one replica at a time while no sibling Pod is being created.

### What `evictPod` does

`evictPod` is the field that turns a placement into a relocation. It names one existing Pod in the same namespace as the `HamiPodPlacement` and answers a single question: which running Pod should give up its current GPU so this placement can happen?

The sequence then runs like this. The descheduler evicts the named Pod and waits. The workload controller (Deployment, StatefulSet, or similar) recreates the Pod. The recreated Pod enters admission, matches `reqID` and `podSelector`, and the webhook pins it to the `nodeName` and `gpuDevices` you planned. Without the field, a placement only affects Pods created after it and stays a planning tool; with it, you can actively move workloads that are already running, which is exactly what a consolidation needs.

The field is optional for a reason. Eviction happens before the destination is validated, so confirm that `nodeName` and `gpuDevices` point to a valid destination with enough room before you add it; an invalid target would leave the Pod evicted with nowhere to land. And since the descheduler waits for a replacement but never creates Pods itself, the evicted workload must be managed by a controller. Add `evictPod` deliberately, one Pod at a time.

As each Pod is evicted, recreated, and pinned to a specific GPU on Node A, the layout converges to the "after" state in the diagram: the eight Pods pack onto three GPUs, the new Pod takes the fourth, and **Node B is drained completely**: four whole GPUs recovered with zero capacity added. Cluster GPU-memory utilization rises from 33% to 43% simply by admitting the Pod that could not start before.

The freed node can now be scaled down to cut cost, or repurposed for a large training job that needs whole devices.

:::warning Before you evict

Active eviction terminates a running Pod and may temporarily reduce availability. The workload must be managed by a controller (Deployment, StatefulSet, etc.) so the evicted Pod is recreated, and you should check readiness and disruption protection before starting a consolidation.

:::

## Getting started

Deploy the descheduler with Helm (requires HAMi Scheduler v2.10.0+ and Kubernetes v1.24+, v1.28+ recommended):

```bash
git clone https://github.com/Project-HAMi/gpu-descheduler.git
cd gpu-descheduler
helm install gpu-descheduler ./chart --namespace kube-system --create-namespace
```

Verify the webhook is running:

```bash
kubectl get pods -n kube-system -l app=gpu-descheduler-webhook -w
```

The webhook also exposes a REST API on port 8083 that reports cluster GPU state and placement records, useful for deciding what to consolidate. The port is not exposed through a Service, so forward it to your machine first (the command blocks, so run it in a separate terminal):

```bash
kubectl port-forward -n kube-system deploy/gpu-descheduler-webhook 8083:8083
```

Then query the API:

```bash
# Nodes, GPU devices, and health status
curl -s http://localhost:8083/api/v1/cluster-info

# Current Placement CRD cache and allocation records
curl -s http://localhost:8083/api/v1/placements
```

The target Pod must use `schedulerName: hami-scheduler` and its labels must match the `podSelector` in the `HamiPodPlacement`. See the [user guide](/docs/next/userguide/hami-gpu-descheduler) for the complete walkthrough.

## Conclusion

GPU fragmentation is an availability and cost problem that grows with cluster dynamism: capacity exists but cannot be used, and manual cleanup is fragile and unrecorded. HAMi GPU Descheduler makes defragmentation a declarative, one-shot Kubernetes operation: evict, recreate, and pin, with placement expressed as a CRD and enforced by an admission webhook.

The capability grew out of a production pain point: [HAMi issue #2072](https://github.com/Project-HAMi/HAMi/issues/2072) asked for intra-node defragmentation. Engineers from the [unified training-and-inference platform team](https://www.yxqiche.com/) at Yixin Group, an automotive-finance technology company and a HAMi user in production, designed the webhook-plus-CRD approach, delivered the main implementation, and open-sourced it to the HAMi community; after the repository went public, community maintainers and users kept reviewing and improving it. Thanks to everyone who has shaped it. Today the consolidation plan is still written by a human: which Pods to pack onto which node remains a manual decision, while the descheduler executes the plan precisely and relocations can already cross nodes. The next step under discussion in the community is to automate that planning: detect fragmentation automatically, generate candidate remediation plans for the user to choose from, and extend the view from single nodes to the whole cluster.

If you run HAMi-shared GPUs in a dynamic cluster, watch for `Pending` Pods whose requests exceed the largest free slice on any device; whole-GPU requests are just the easiest to spot. Then try the descheduler:

- **Code and releases:** [github.com/Project-HAMi/gpu-descheduler](https://github.com/Project-HAMi/gpu-descheduler)
- **User guide:** [Organizing GPU resource fragments with HAMi GPU Descheduler](/docs/next/userguide/hami-gpu-descheduler)

## Further reading

- [HAMi GPU Descheduler user guide](/docs/next/userguide/hami-gpu-descheduler)
- [HAMi issue #2072: Intra-defragmentation of vGPU resource nodes](https://github.com/Project-HAMi/HAMi/issues/2072)
- [HAMi project](https://github.com/Project-HAMi/HAMi)
