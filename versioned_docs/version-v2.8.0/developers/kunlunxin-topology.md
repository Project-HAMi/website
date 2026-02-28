---
title: Kunlunxin Topology-Aware Scheduling
---

## Background

When multiple XPUs are configured on a single P800 server, performance is optimized
when GPUs are connected to or located within the same NUMA node, as shown below.
This setup establishes a specific topology among all GPUs in the server.

![img](../resources/kunlunxin_topo.jpg)

When a user job requests a specific number of `kunlunxin.com/xpu` resources,
Kubernetes schedules the pods to appropriate nodes to minimize resource fragmentation
and maintain high performance. The XPU device then performs fine-grained resource allocation
on the selected node based on the following criteria:

1. Only 1, 2, 4, or 8-card allocations are allowed.
2. Allocations of 1, 2, or 4 XPUs must not span across NUMA nodes.
3. Fragmentation should be minimized after allocation.

## Filter

The filtering phase identifies all nodes eligible for allocation. For each node,
the best XPU combination plan is selected and cached for use in the scoring phase.
The selection process is shown below:

![img](../resources/kunlunxin_filter.png)

## Score

In the scoring phase, all filtered nodes are evaluated and scored to select the optimal one
for scheduling. We introduce a metric called **MTF** (Minimized Tasks to Fill),
which quantifies how well a node can accommodate future tasks after allocation.

The table below shows examples of XPU occupation and proper MTF values:

| XPU Occupation | MTF | Description |
|----------------|-----|-------------|
| 11111111       | 0   | Fully occupied; no more tasks can be scheduled |
| 00000000       | 1   | A task requiring 8 XPUs can fully utilize it |
| 00000011       | 2   | A 4-XPU task and a 2-XPU task can be scheduled |
| 00000001       | 3   | A 4-XPU, 2-XPU, and 1-XPU task can fill it |
| 00010001       | 4   | Two 2-XPU tasks and two 1-XPU tasks can fill it |

The node score is derived from the **delta(MTF)** — the change in MTF value after allocation.
A smaller delta(MTF) indicates a better fit and results in a higher score.
The scoring logic is shown below:

| delta(MTF) | Score | Example |
|------------|-------|---------|
|   -1       | 2000  | 00000111->00001111 |
|    0       | 1000  | 00000111->00110111 |
|    1       | 0     | 00001111->00011111 |
|    2       | -1000 | 00000000->00000001 |

## Bind

In the bind phase, the allocation result is patched into the pod annotations. For example:

```yaml
BAIDU_COM_DEVICE_IDX=0,1,2,3
```
