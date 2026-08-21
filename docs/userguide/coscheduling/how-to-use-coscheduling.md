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

To close that gap, the extender retries the node lock for Pods that belong to a PodGroup:

- A Pod counts as a group member if it carries a non-empty `scheduling.x-k8s.io/pod-group` label. Such a Pod polls the lock every 100 ms until `--node-lock-retry-timeout` expires.
- Any partially acquired lock is released before each retry, so a Pod requesting devices from more than one vendor cannot leave a stale lock behind.
- Errors that are not lock contention are returned immediately and are not retried.
- Pods that belong to no group keep the original fail-fast behavior.

:::note

`--node-lock-retry-timeout` is available in builds newer than v2.9.0. Passing it to an older extender makes the container exit on an unknown flag, so only add it once you are running a build that includes it.

:::

## Prerequisites

- A Kubernetes cluster with GPU nodes and HAMi installed.
- A [scheduler-plugins release](https://github.com/kubernetes-sigs/scheduler-plugins/releases) built against your Kubernetes minor version. The minor version of scheduler-plugins matches the Kubernetes client packages it is compiled with, so pick the release that matches your cluster from the [compatibility matrix](https://github.com/kubernetes-sigs/scheduler-plugins#compatibility-matrix). The examples below use v0.34.7, which is built against Kubernetes v1.34.
- Helm 3.10 or later.
- `kubectl` with cluster-admin rights.

## 1. Install HAMi with the scheduler-plugins kube-scheduler

The HAMi scheduler Pod runs two containers: an upstream `kube-scheduler` and the HAMi `vgpu-scheduler-extender`. Coscheduling is compiled into the scheduler-plugins build of kube-scheduler, so point the chart at that image instead of the stock one:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update

helm install hami hami-charts/hami \
  --namespace kube-system \
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

## 3. Deploy the scheduler-plugins controller

Gang admission itself does not need the controller: the Coscheduling plugin decides on `PodGroup` spec and its own in-memory bookkeeping. What the controller adds is `PodGroup.status` — it reconciles `phase`, `running`, `succeeded`, and `failed`, which is what `kubectl get podgroup` reports and what you need to follow a group's progress. It ships as a separate image in the same release.

Deploy the controller from the release manifest:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/scheduler-plugins/v0.34.7/manifests/install/all-in-one.yaml
```

That manifest creates the `scheduler-plugins` namespace, the controller Deployment, and the controller RBAC. It does **not** install a second scheduler, so it is safe to apply alongside the HAMi scheduler. The `system:kube-scheduler:plugins` ClusterRole it also creates is bound to the `system:kube-scheduler` user and does not cover the HAMi scheduler ServiceAccount — [step 5](#5-grant-access-to-podgroups) handles that separately.

Confirm the controller is up:

```bash
kubectl rollout status deploy/scheduler-plugins-controller -n scheduler-plugins
```

## 4. Enable Coscheduling in the scheduler config

The chart renders the KubeSchedulerConfiguration into the `hami-scheduler` ConfigMap. Add the plugin to the profile:

```bash
kubectl edit configmap hami-scheduler -n kube-system
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
kubectl rollout restart deploy/hami-scheduler -n kube-system
kubectl rollout status deploy/hami-scheduler -n kube-system
```

## 5. Grant access to PodGroups

The scheduler ServiceAccount installed by the chart cannot read `PodGroup` resources. The Coscheduling plugin only reads them — it resolves a Pod's group, counts siblings, and compares the total against `minMember` — so read-only access is all the scheduler needs:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: hami-podgroup-reader
rules:
  - apiGroups: ["scheduling.x-k8s.io"]
    resources: ["podgroups"]
    verbs: ["get", "list", "watch"]
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
    namespace: kube-system
```

The ServiceAccount is named after the Helm release: a release named `hami` produces `hami-scheduler`. Adjust the `name` and `namespace` if you installed under a different release name or namespace.

Writes to `PodGroup.status` come from the controller deployed in [step 3](#3-deploy-the-scheduler-plugins-controller), which carries its own ServiceAccount and RBAC, so the scheduler never needs `create`, `update`, or `patch` here.

Without this ClusterRole the scheduler's PodGroup lister stays empty. `PreFilter` still passes — it treats a group it cannot resolve as no group at all — but `Permit` then rejects every member with `PodGroup not found`, and the group stays Pending.

## 6. Submit a gang

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

The manifest above defines one Pod that belongs to the gang. Create additional Pods with the same `scheduling.x-k8s.io/pod-group` label to satisfy `minMember`. Each Pod should have a distinct name; otherwise, the group cannot reach the required number of members and the Pods will remain Pending.

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

Two extender flags control node lock behavior: `--node-lock-retry-timeout` bounds how long `Bind` retries a contended lock for a group member, and `--node-lock-timeout` bounds how long a lock stays valid before another Pod may take it over. Both are described in [Global Config](../configure.md#scheduler-configs-extender-arguments).

Set the retry timeout through the chart. `scheduler.extender.extraArgs` replaces the default list, so keep the existing entries:

```bash
helm upgrade hami hami-charts/hami -n kube-system --reuse-values \
  --set-json 'scheduler.extender.extraArgs=["--debug","-v=4","--node-lock-retry-timeout=28s"]'
```

:::warning

Keep `--node-lock-retry-timeout` below the extender `httpTimeout` in the KubeSchedulerConfiguration, which the chart sets to `30s`. If the retry outlives the HTTP call, kube-scheduler abandons the bind request while the extender is still waiting for the lock, and the Pod is retried from the top.

:::

The default of `28s` leaves 2 seconds of headroom under that `30s` timeout.

## Troubleshooting

**Pods stay Pending with `BindingFailed: node <name> has been locked within 5m0s`**

The retry is not active for these Pods. Check that the `scheduling.x-k8s.io/pod-group` label is on the Pod itself (not on the PodGroup only, and not in annotations), and that `--node-lock-retry-timeout` is not set to `0`.

**The scheduler container crash-loops on startup**

Look for `only one queue sort plugin required` in the kube-scheduler logs. `PrioritySort` is still enabled alongside Coscheduling. See [step 4](#4-enable-coscheduling-in-the-scheduler-config).

**All members of a group stay Pending and no node is ever selected**

Either fewer than `minMember` members were created, or the scheduler cannot read `PodGroup` resources. The two cases log differently: a short group is rejected in `PreFilter` with `cannot find enough sibling pods`, while missing RBAC surfaces in `Permit` as `PodGroup not found`. For the latter, confirm the RBAC from [step 5](#5-grant-access-to-podgroups) is applied.

**`kubectl get podgroup` reports no status**

The `scheduler-plugins-controller` is missing or crash-looping. Gang scheduling still works, but the status view does not. Check `kubectl get deploy -n scheduler-plugins` and confirm [step 3](#3-deploy-the-scheduler-plugins-controller) was applied. A `forbidden` error on `podgroups/status` in the controller logs means its own RBAC was not created — re-apply the manifest from that step.

**Containers fail with `libdl.so.2: cannot open shared object file`**

HAMi injects `LD_PRELOAD` pointing at a glibc build of `libvgpu.so`. Images based on musl, such as `busybox` and `alpine`, cannot load it. Use a glibc image for GPU workloads.

## Related links

- [Coscheduling plugin](https://github.com/kubernetes-sigs/scheduler-plugins/tree/master/pkg/coscheduling)
- [scheduler-plugins releases](https://github.com/kubernetes-sigs/scheduler-plugins/releases)
- [Global Config](../configure.md)
- [How to use KAI Scheduler with HAMi](../kai-scheduler/how-to-use-kai-scheduler.md)
