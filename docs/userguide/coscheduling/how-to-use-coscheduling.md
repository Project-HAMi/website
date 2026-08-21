---
title: How to use Coscheduling with HAMi
sidebar_label: How to use Coscheduling
---

[Coscheduling](https://github.com/kubernetes-sigs/scheduler-plugins/tree/master/pkg/coscheduling) is a scheduler plugin from [kubernetes-sigs/scheduler-plugins](https://github.com/kubernetes-sigs/scheduler-plugins) that provides gang scheduling. A group of Pods is admitted only when at least `minMember` of them can be placed at once, which is what distributed training needs: a job either gets all of its GPUs or none of them.

This guide covers running Coscheduling inside the HAMi scheduler and tuning the node lock behavior that gang binding exercises.

## How it works

HAMi and Coscheduling operate at two different points of the scheduling cycle.

Coscheduling works in the **Permit** phase. Each member Pod that passes filtering is parked in a waiting queue. Once `minMember` members are waiting, all of them are released into the bind phase at the same time.

HAMi works in the **Bind** phase, through the extender. Before binding, the extender takes a per-node lock by writing the `hami.io/mutex.lock` annotation onto the Node object:

```text
hami.io/mutex.lock: 2026-06-14T15:05:03Z,default,gang-pod-1
```

The lock serializes device allocation on that node. Without it, two Pods bound at the same moment would both read the same device usage snapshot and could be handed overlapping slices of one GPU. The lock is released by the device plugin once `Allocate()` finishes and the Pod annotations are updated, which takes about 20 ms on a real GPU. A lock that is never released expires after the node lock timeout (5 minutes by default).

These two mechanisms meet at gang release. Coscheduling releases every member in the same millisecond, so if several members target the same node, they contend on a lock that is held for only a few tens of milliseconds. The Pod that loses fails its bind, returns to Pending, and comes back through the default kube-scheduler backoff, which is measured in seconds. A five-member gang converges, but it takes several backoff rounds to do it.

To close that gap, the extender retries the node lock for Pods that carry the Coscheduling group label:

- A Pod with a non-empty `scheduling.x-k8s.io/pod-group` label polls the lock every 100 ms until `--node-lock-retry-timeout` expires.
- Any partially acquired lock is released before each retry, so a Pod requesting devices from more than one vendor cannot leave a stale lock behind.
- Errors that are not lock contention are returned immediately and are not retried.
- Pods without the label keep the original fail-fast behavior.

:::note

`--node-lock-retry-timeout` is available in builds newer than v2.9.0.

:::

## Prerequisites

- A Kubernetes cluster with GPU nodes and HAMi installed.
- A [scheduler-plugins release](https://github.com/kubernetes-sigs/scheduler-plugins/releases) built against your Kubernetes minor version. The examples below use v0.34.7 on Kubernetes v1.35.
- Helm 3.
- `kubectl` with cluster-admin rights.

## 1. Install HAMi with the scheduler-plugins kube-scheduler

The HAMi scheduler Pod runs two containers: an upstream `kube-scheduler` and the HAMi `vgpu-scheduler-extender`. Coscheduling is compiled into the scheduler-plugins build of kube-scheduler, so point the chart at that image instead of the stock one:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update

helm install hami hami-charts/hami \
  --namespace hami-system --create-namespace \
  --set scheduler.kubeScheduler.image.registry=registry.k8s.io \
  --set scheduler.kubeScheduler.image.repository=scheduler-plugins/kube-scheduler \
  --set scheduler.kubeScheduler.image.tag=v0.34.7 \
  --wait --timeout 10m
```

On an existing installation, run the same three `--set` flags through `helm upgrade --reuse-values`.

## 2. Install the PodGroup CRD

Coscheduling reads `PodGroup` resources. Install the CRD from the same scheduler-plugins release:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/scheduler-plugins/v0.34.7/config/crd/bases/scheduling.x-k8s.io_podgroups.yaml
```

## 3. Enable Coscheduling in the scheduler config

The chart renders the KubeSchedulerConfiguration into the `hami-scheduler` ConfigMap. Add the plugin to the profile:

```bash
kubectl edit configmap hami-scheduler -n hami-system
```

The `profiles` entry must look like this:

```yaml
profiles:
  - schedulerName: hami-scheduler
    plugins:
      multiPoint:
        enabled:
          - name: Coscheduling
      queueSort:
        disabled:
          - name: PrioritySort
    pluginConfig:
      - name: Coscheduling
        args:
          permitWaitingTimeSeconds: 10
```

:::warning

`PrioritySort` must be disabled. Coscheduling registers its own queue sort plugin, and kube-scheduler refuses to start with two of them:

```text
only one queue sort plugin required for profile with scheduler name "hami-scheduler", but got 2
```

:::

The ConfigMap is owned by the chart, so `helm upgrade` overwrites this edit. Re-apply it after every upgrade, or manage the ConfigMap outside the chart.

Restart the scheduler to pick up the change:

```bash
kubectl rollout restart deploy/hami-scheduler -n hami-system
kubectl rollout status deploy/hami-scheduler -n hami-system
```

## 4. Grant access to PodGroups

The scheduler ServiceAccount installed by the chart cannot read `PodGroup` resources. Add the permission:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: hami-podgroup-reader
rules:
  - apiGroups: ["scheduling.x-k8s.io"]
    resources: ["podgroups"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: hami-podgroup-reader
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: hami-podgroup-reader
subjects:
  - kind: ServiceAccount
    name: hami-scheduler
    namespace: hami-system
```

Without it, `PreFilter` fails for every member and the whole group stays Pending.

## 5. Submit a gang

Create a `PodGroup` and label every member with its name. Each member requests vGPU resources as usual:

```yaml
apiVersion: scheduling.x-k8s.io/v1alpha1
kind: PodGroup
metadata:
  name: gang-training
spec:
  minMember: 4
  scheduleTimeoutSeconds: 60
---
apiVersion: v1
kind: Pod
metadata:
  name: gang-worker-1
  labels:
    scheduling.x-k8s.io/pod-group: gang-training
spec:
  schedulerName: hami-scheduler
  containers:
    - name: worker
      image: ubuntu:22.04
      command: ["sleep", "3600"]
      resources:
        limits:
          nvidia.com/gpu: "1"
          nvidia.com/gpumem: "3000"
          nvidia.com/gpucores: "30"
```

The manifest above defines one member. Create `minMember` Pods from the same template with distinct names, otherwise the group never reaches its quorum and every member stays Pending.

:::warning

`scheduling.x-k8s.io/pod-group` must be under `metadata.labels`. Placing it under `metadata.annotations` bypasses gang logic without any error: the Pods schedule one by one regardless of `minMember`.

:::

Verify that the group was admitted together:

```bash
kubectl get pods -l scheduling.x-k8s.io/pod-group=gang-training -o wide
```

When fewer than `minMember` members exist, `PreFilter` rejects the group before the HAMi extender is reached:

```text
pre-filter pod gang-worker-1 cannot find enough sibling pods,
current pods number: 3, minMember of group: 5
```

## Tune the node lock

Two independent timeouts control node lock behavior.

| Flag | Default | Description |
| --- | --- | --- |
| `--node-lock-retry-timeout` | `28s` | How long `Bind` retries the node lock for a Pod labeled with `scheduling.x-k8s.io/pod-group`. `0` disables retry and restores fail-fast behavior. Polling interval is 100 ms. |
| `--node-lock-timeout` | `5m` | How long a lock stays valid before another Pod may take it over. Applies to every Pod, not only gang members. |

Set the retry timeout through the chart. `scheduler.extender.extraArgs` replaces the default list, so keep the existing entries:

```bash
helm upgrade hami hami-charts/hami -n hami-system --reuse-values \
  --set-json 'scheduler.extender.extraArgs=["--debug","-v=4","--node-lock-retry-timeout=28s"]'
```

:::warning

Keep `--node-lock-retry-timeout` below the extender `httpTimeout` in the KubeSchedulerConfiguration, which the chart sets to `30s`. If the retry outlives the HTTP call, kube-scheduler abandons the bind request while the extender is still waiting for the lock, and the Pod is retried from the top.

:::

The default of `28s` leaves 2 seconds of headroom under that `30s` timeout.

## Troubleshooting

**Pods stay Pending with `BindingFailed: node <name> has been locked within 5m0s`**

The retry is not active for these Pods. Check that the `scheduling.x-k8s.io/pod-group` label is on the Pod (not the PodGroup only, and not in annotations), and that `--node-lock-retry-timeout` is not set to `0`.

**The scheduler container crash-loops on startup**

Look for `only one queue sort plugin required` in the kube-scheduler logs. `PrioritySort` is still enabled alongside Coscheduling. See [step 3](#3-enable-coscheduling-in-the-scheduler-config).

**All members of a group stay Pending and no node is ever selected**

Either fewer than `minMember` members were created, or the scheduler cannot read `PodGroup` resources. Check the kube-scheduler logs for `PreFilter failed` and confirm the RBAC from [step 4](#4-grant-access-to-podgroups) is applied.

**Containers fail with `libdl.so.2: cannot open shared object file`**

HAMi injects `LD_PRELOAD` pointing at a glibc build of `libvgpu.so`. Images based on musl, such as `busybox` and `alpine`, cannot load it. Use a glibc image for GPU workloads.

## Related links

- [Coscheduling plugin](https://github.com/kubernetes-sigs/scheduler-plugins/tree/master/pkg/coscheduling)
- [scheduler-plugins releases](https://github.com/kubernetes-sigs/scheduler-plugins/releases)
- [Global Config](../configure.md)
- [Using HAMi with Kueue](../kueue/how-to-use-kueue.md)
- [Using HAMi with KAI Scheduler](../kai-scheduler/how-to-use-kai-scheduler.md)
