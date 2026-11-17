---
title: Organizing GPU resource fragments with HAMi GPU Descheduler
sidebar_label: GPU defragmentation
id: hami-gpu-descheduler
---

## What is HAMi GPU Descheduler

[HAMi GPU Descheduler](https://github.com/Project-HAMi/gpu-descheduler) is a specialized GPU defragmentation tool designed for HAMi-virtualized Kubernetes clusters. It uses a Mutating Admission Webhook and Custom Resource Definitions (CRDs) to achieve fine-grained scheduling control over GPU workloads on HAMi nodes.

In long-running clusters, GPU resources can become fragmented due to the frequent creation and deletion of Pods. HAMi GPU Descheduler helps consolidate scattered vGPU workloads across nodes, thereby improving overall cluster utilization.

## Core Capabilities

HAMi GPU Descheduler provides the following core capabilities around GPU resource consolidation and optimization.

### Precise Binding

It supports precisely scheduling Pods to specific nodes and GPU devices. Through the `HamiPodPlacement` CRD, you can explicitly specify the target node (`nodeName`) and GPU device indices (`gpuDevices`), achieving fine-grained placement control.

### Active Eviction

It supports actively evicting running Pods and rescheduling them to target nodes.

Active eviction terminates a running Pod and may temporarily reduce availability. Before using it, you must ensure that the workload is managed by a controller (such as a Deployment or StatefulSet) to automatically recreate the evicted Pod. The descheduler waits for a replacement Pod but does not recreate standalone Pods. Also, check workload readiness and disruption protection to avoid unexpected service interruptions.

## Prerequisites

Before deploying HAMi GPU Descheduler, ensure your environment meets the following requirements:

| Component          | Version/Status Requirement  |
| ------------------ | --------------------------- |
| **HAMi Scheduler** | v2.10.0 or later            |
| **Kubernetes**     | v1.24+ (v1.28+ recommended) |
| **Helm**           | v3.8+                       |

## Deploying HAMi GPU Descheduler

Helm deployment is recommended. Run the following command in the project root directory:

```bash
helm install gpu-descheduler ./chart --namespace kube-system --create-namespace
```

**Common parameter reference**:

| Parameter            | Description                                   |
| -------------------- | --------------------------------------------- |
| `--namespace`        | Target namespace for deployment               |
| `--create-namespace` | Auto-create the namespace if it doesn't exist |
| `-f values.yaml`     | Use a custom values file (optional)           |
| `--debug`            | Show detailed debug information               |

## Verifying the Deployment

After deployment, verify that the webhook service is running properly:

```bash
kubectl get pods -n kube-system -l app=gpu-descheduler-webhook -w
```

The deployment is successful when the Pod status shows Running.

You can also view the cluster status through the REST API provided by the webhook service:

```bash

# Run inside the container to view cluster nodes, GPU devices, and health status
curl -s http://localhost:8083/api/v1/cluster-info

# View the current Placement CRD cache and allocation records
curl -s http://localhost:8083/api/v1/placements
```

## Configuring the HamiPodPlacement CRD

`HamiPodPlacement` is the core CRD that guides the Descheduler for precise scheduling. One `HamiPodPlacement` resource is consumed by exactly one Pod.

### Key Requirements

- The target Pod must use `schedulerName: hami-scheduler`.
- The target Pod's labels must match the `podSelector` defined in the `HamiPodPlacement`.

### Example

```yaml
apiVersion: scheduling.hami.placement.com/v1
kind: HamiPodPlacement
metadata:
  name: pin-gpu0
  namespace: default
spec:
  reqID: "pin-gpu0-001" # min length 5, consumed once
  podSelector:
    matchLabels:
      app: my-job
  nodeName: gpu-node-1
  gpuDevices:
    - gpu-0 # or gpu-0/70 for 70% of GPU-0
  # evictPod: my-job-6cd5964877-zdb5z # Pod name in this namespace to be evicted
```

> **Note**: To actively evict an existing Pod and move it to this target, you can add the `evictPod` field (e.g., `evictPod: my-job-6cd5964877-zdb5z`). However, you must first verify that the `nodeName` and `gpuDevices` point to a valid destination. Only add this field after confirming the target is correct, to avoid evicting the existing Pod before validation.

Apply the CRD and check the status:

```bash
kubectl apply -f hami-pod-placement.yaml
kubectl get hamipodplacements -A
```

Relationship with HAMi

HAMi GPU Descheduler is a scheduling optimization component within the HAMi ecosystem:

- **HAMi Scheduler**: Responsible for GPU resource virtualization, scheduling, and isolation.
- **HAMi GPU Descheduler**: Responsible for consolidating, binding, and optimizing already-allocated resources on top of HAMi scheduling.

Together, they form a complete loop from "resource allocation" to "resource layout optimization," helping cluster administrators maintain efficient GPU utilization under dynamic business workloads.

## Summary

HAMi GPU Descheduler provides proactive GPU resource defragmentation capabilities for HAMi-virtualized clusters. Through the combination of a webhook and CRDs, it enables you to:

- Consolidate scattered GPU workloads and improve cluster utilization.
- Precisely bind Pods to specified nodes and GPU devices.
- Actively evict and reschedule Pods to optimize resource layout. In long-running production environments, this component effectively reduces the operational burden caused by GPU resource fragmentation.
