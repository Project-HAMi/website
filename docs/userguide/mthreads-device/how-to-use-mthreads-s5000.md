---
sidebar_label: Mthreads MTT S5000
title: Use HAMi with Mthreads MTT S5000
---

## Introduction

HAMi supports GPU sharing on Mthreads MTT S5000 through the vendor's sGPU technology. In this setup, each component handles a distinct part of the stack:

- The Mthreads GPU Operator (Full mode) installs the kernel driver, configures the container runtime, and reports device resources to kubelet, including whole cards (`mthreads.com/gpu`) and sGPU slices (`mthreads.com/sgpu-core`, `mthreads.com/sgpu-memory`).
- HAMi takes over scheduling and admission for sGPU slices, deciding which tasks share which card and how much memory and cores each task gets.

HAMi does not provide the underlying isolation. Memory and core limits are enforced by the Mthreads kernel module and container runtime.

**Use case**:

- MTT S5000 clusters that need sGPU slices with device memory and core limits
- Mixed delivery on one cluster: sGPU slices through HAMi, whole cards through the default scheduler

## Quick Start

### Prerequisites

- A Kubernetes cluster with MTT S5000 GPU nodes. The vendor supports sGPU on MTT S4000 and MTT S5000 (S4000 requires firmware >= 2.1.1).
- [Mthreads GPU Operator](https://docs.mthreads.com/cloud-native/cloud-native-doc-online/) installed in Full mode with sGPU enabled (see below). The vendor requires MT Container Toolkit >= 2.1.0 and MTML >= 2.1.0 for sGPU.
- Helm 3

### Install the Mthreads GPU Operator in Full mode

Full mode containerizes the entire software stack (driver, container toolkit, device plugin, monitoring), so the host does not need a pre-installed driver. Obtain the operator package from Mthreads or your device provider, then follow the vendor documentation. The steps that matter for HAMi integration are:

1. Label the GPU nodes so the operator components land on them:

   ```bash
   kubectl label node <gpu-node> mthreads.com/gpu-node="true"
   ```

2. Enable sGPU and choose which cards to slice. The sGPU capability comes from the vendor's `sgpu_km` kernel module: cards bound to the module join the slice resource pool, and the remaining cards stay in the whole-card pool. The module takes one of two mutually exclusive binding parameters:

   - `total_gpu_num=<N>` binds N cards starting from GPU 0.
   - `gpu_ids=0,2,3` binds exactly the listed cards. Use this for a precise layout. Set either `gpu_ids` or `total_gpu_num`, not both.

   With the GPU Operator in Full mode, the operator installs the module and manages the binding for you. For a persistent host-level setup, keep the parameters in `/etc/modprobe.d/sgpu-km.conf`, for example `options sgpu_km total_gpu_num=1` slices only GPU 0 on each node. On clusters without the operator, load the module manually as described in the [MT sGPU install guide](https://docs.mthreads.com/cloud-native/cloud-native-doc-online/install_guide/sgpu_install).

   Tune the per-card slicing behavior in the ClusterConfig CR with an `sgpuSpec`:

   ```yaml
   apiVersion: mthreads.com/v1alpha4
   kind: ClusterConfig
   metadata:
     name: gpu-cluster-config
   spec:
     nodes:
       - nodePoolName: mthreads-gpu-pool
         sgpuSpec:
           "max_inst": "16" # max slice instances per card
           "policy": "0" # 0: performance, 1: weak isolation, 2: strong isolation
           # Ratio, not percent: 1.0 = 100% (no oversubscription), valid range 1.0-2.0.
           # The per-card node labels report the same setting as a percentage,
           # so 1.1 here appears as mthreads.com/sgpu0.overcommit_ratio=110.
           "overcommit_ratio": "1.0"
           "time_slice": "1"
         selector:
           matchLabels:
             mthreads.com/gpu-node: "true"
   ```

3. Verify that the node reports both resource pools:

   ```bash
   kubectl get node <gpu-node> -o json | grep mthreads.com
   ```

   Example output measured on an S5000 node with 8 physical cards, where cards 0, 2 and 3 are bound to `sgpu_km`:

   ```text
   # kubectl get node <gpu-node> -o json | grep mthreads.com
           "mthreads.com/gpu": "5",
           "mthreads.com/sgpu-core": "48",
           "mthreads.com/sgpu-memory": "480"
   # kubectl get node <gpu-node> -o jsonpath='{.metadata.labels}' | tr ',' '\n' | grep -E 'gpu.count|sgpu.cores'
           mthreads.com/gpu.count=8
           mthreads.com/sgpu.cores=0-2-3
   ```

   The two pools partition the physical cards; they do not overlap. In this example 3 of the 8 cards are bound to `sgpu_km` (`mthreads.com/sgpu.cores=0-2-3`), so those 3 contribute 3×16 = 48 `sgpu-core` units and 3×160 = 480 `sgpu-memory` units, while the remaining 8 − 3 = 5 cards stay whole and are reported as `mthreads.com/gpu=5`.

   Expect `mthreads.com/gpu` (whole cards), plus `mthreads.com/sgpu-core` (16 units per sliced card) and `mthreads.com/sgpu-memory` (160 units per sliced card on the S5000, each unit equals 512 MiB). Use `mthreads.com/sgpu.cores` to confirm exactly which cards the module claimed, and sanity-check the split against `mthreads.com/gpu.count`. Per-card labels also report the model and the memory size, for example `mthreads.com/gpu0.product=MTT-S5000` with `mthreads.com/gpu0.memory=85899345920` (80 GiB), a quick way to confirm the node is all-S5000 before configuring 160-unit slices.

   Because HAMi derives the per-card memory from node capacity rather than from `devices.mthreads.memoryPerCard`, a node reports `sgpu-memory / sgpu-core × 16 = 160` units (80 GiB) per sliced card on the S5000. Verify this on each node model before scheduling large slices:

   ```bash
   kubectl get node <gpu-node> -o jsonpath='{.status.capacity.mthreads\.com/sgpu-memory}{"\n"}{.status.capacity.mthreads\.com/sgpu-core}{"\n"}'
   ```

:::note

The Mthreads device plugin reports card information through node **labels** such as `mthreads.com/gpu-node` and `mthreads.com/gpu.count`. HAMi's Mthreads support derives per-card information from node capacity (`mthreads.com/sgpu-core` / 16 = number of sliced cards) rather than from a node annotation device list. Do not expect a `hami.io/node-mthreads-register` annotation on these nodes.

:::

### Disable the vendor sGPU scheduler and webhook

HAMi's scheduler and webhook replace the vendor's `mt-gpu-scheduler` and `mt-gpu-webhook`. Running both at the same time causes conflicts, since both intercept GPU pods. Patch the ClusterPolicy to turn them off:

```bash
kubectl patch clusterpolicy gpu-cluster-policy --type=merge \
  -p '{"spec":{"gpuScheduler":{"enabled":false},"gpuWebhook":{"enabled":false}}}'
kubectl -n mt-gpu-operator rollout restart deploy/mt-controller-manager
```

The operator only reconciles component state at startup, so the rollout restart is required. After the restart, the `mt-gpu-scheduler`, `mt-gpu-scheduler-controller`, and `mt-gpu-webhook` deployments are removed.

Keep `mt-universal-gpu-device-controller` running. Kubelet device allocation for both whole cards and sGPU slices still relies on it.

### Install HAMi

Create a `values.yaml` file:

```yaml
devices:
  mthreads:
    enabled: true
    # MTT S5000 has 80 GiB device memory = 160 x 512 MiB units per card.
    # The chart default (96) matches the MTT S4000 and must be overridden for S5000.
    memoryPerCard:
      - 160
```

HAMi models each Mthreads card with a per-card memory capacity. The default of 96 units matches the MTT S4000 (48 GiB). The MTT S5000 has 80 GiB, so set `devices.mthreads.memoryPerCard` to `[160]`. Without this, explicit `sgpu-memory` requests above 96 units (for example 128) are rejected at admission. This parameter is a cluster-level list with one entry per card model; a mixed S4000/S5000 cluster can pass `[96, 160]` and needs no separate node pools. An empty list falls back to `[96]`, and a legacy scalar value is converted to a one-item list.

The value only gates which explicit `sgpu-memory` requests admission accepts. Admission runs before a node is chosen, so a request is accepted when it is valid on any configured card model, and the scheduler then enforces the real per-card size of the node it selects. Pods that omit `sgpu-memory` are always sized from the selected node's real card, so a single deployment covers both card models as long as the list contains every model present in the cluster.

:::note

`devices.mthreads.memoryPerCard` requires a HAMi release that includes the mthreads per-card memory feature ([Project-HAMi/HAMi#2988](https://github.com/Project-HAMi/HAMi/pull/2988), merged into master on 2026-09-20, after the v2.10.0 release). On v2.10.0 and earlier charts the value is not rendered into the `hami-scheduler-device` ConfigMap and is silently ignored: the accepted explicit slice values stay at the S4000 list (2, 4, 8, 16, 32, 64, 96), so S5000 slices above 48 GiB are rejected. Node-reported capacity is unaffected.

:::

Install HAMi:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
helm install hami hami-charts/hami -n kube-system -f values.yaml
```

Verify the installation:

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/instance=hami
```

Expect the HAMi scheduler and the Mthreads device controller (`mt-universal-gpu-device-controller`) pods. The suffixes are ReplicaSet-generated and differ on every cluster:

```text
NAME                                             READY   STATUS    RESTARTS   AGE
hami-scheduler-<hash>                            2/2     Running   0          3m
mt-universal-gpu-device-controller-<hash>        1/1     Running   0          3m
```

`hami-scheduler` shows `2/2` containers: `kube-scheduler` plus the HAMi scheduler extender. To confirm the scheduler extender is actually in the pod rather than relying on the count alone:

```bash
kubectl -n kube-system get pod -l app.kubernetes.io/component=hami-scheduler \
  -o jsonpath='{.items[0].spec.containers[*].name}{"\n"}'
```

## sGPU Host Configuration

On each GPU node, the running sGPU service exposes configuration nodes under `/proc/sgpu_km`. Each sliced card gets a directory named by its card ID, with the following knobs:

| Node | Range | Description |
| --- | --- | --- |
| `max_inst` | 1-16 | Max slice instances per card. |
| `policy` | 0, 1, 2 | Compute isolation mode. `0`: performance (default), no compute isolation, slices behave like processes on a bare card. `1`: weak isolation, an idle card is fully used by the running container. `2`: strong isolation, time slices are enforced even when other containers are idle (equal split only). |
| `time_slice` | integer, ms | Scheduler time slice length, default 1 ms, minimum 1 ms. Larger values are fairer, smaller values are more efficient. Only affects the weak and strong isolation modes. |
| `overcommit_ratio` | 100-200 | Device memory oversubscription, expressed as a **percentage** in this `/proc/sgpu_km` view (100 = no oversubscription). The ClusterConfig `sgpuSpec.overcommit_ratio` uses the equivalent **ratio** instead, so 100 here is written `1.0` and 110 is written `1.1` there. The node labels follow the percentage form, for example `mthreads.com/sgpu0.overcommit_ratio=100`. |

Key points when tuning these values:

- `max_inst`, `policy`, and `time_slice` cannot be changed while containers hold allocations on the card. Set them before allocating slices, or after draining the card.
- Changes delivered through the ClusterConfig `sgpuSpec` are applied by the operator and require a restart of `mt-controller-manager` to take effect. Direct writes to `/proc/sgpu_km` take effect immediately but are lost when the module reloads.
- Device memory stays hard-isolated in every `policy` mode. Only compute behavior differs between modes.
- Per-container knobs such as `weight` (time slice count) are set by the container runtime from the pod's `sgpu-core` request, so HAMi controls them through scheduling.

The running values are also published as node labels, one set per sliced card. Measured on an S5000 node with cards 0, 2 and 3 bound to `sgpu_km`:

```text
# kubectl describe node cicpoc-gpu1 | grep 'mthreads.com/sgpu[0-9]'
mthreads.com/sgpu0.max_inst=16
mthreads.com/sgpu0.overcommit_ratio=100
mthreads.com/sgpu0.policy=0
mthreads.com/sgpu0.time_slice=1
mthreads.com/sgpu2.max_inst=16
mthreads.com/sgpu2.overcommit_ratio=100
mthreads.com/sgpu2.policy=0
mthreads.com/sgpu2.time_slice=1
mthreads.com/sgpu3.max_inst=16
mthreads.com/sgpu3.overcommit_ratio=100
mthreads.com/sgpu3.policy=0
mthreads.com/sgpu3.time_slice=1
```

Note that `overcommit_ratio` appears here as `100`, the percentage form that matches the `/proc/sgpu_km` view, while the ClusterConfig `sgpuSpec` takes the equivalent ratio (`1.0`). The card IDs in the label names line up with `mthreads.com/sgpu.cores`.

For the full semantics of each knob, see the vendor's [MT sGPU user guide](https://docs.mthreads.com/cloud-native/cloud-native-doc-online/user_guide/sgpu_guide).

## Usage

Request an sGPU slice with `mthreads.com/vgpu` together with `mthreads.com/sgpu-memory` and `mthreads.com/sgpu-core`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sgpu-pod
spec:
  restartPolicy: OnFailure
  containers:
    - name: task
      image: core.harbor.zlidc.mthreads.com:30003/mt-ai/lm-qy2:v17-mpc # MUSA user-space driver stack (use any MUSA-runtime image)
      command: ["sleep", "infinity"]
      resources:
        limits:
          mthreads.com/vgpu: 1 # request 1 sliced GPU
          mthreads.com/sgpu-memory: 32 # 32 x 512 MiB = 16 GiB
          mthreads.com/sgpu-core: 8 # 8 of 16 core groups (50% of the card)
```

The HAMi webhook rewrites the pod to use `hami-scheduler`, so no `schedulerName` field is needed. Inside the container, the Mthreads runtime injects the granted limits as environment variables:

| Environment variable | Description |
| --- | --- |
| `MTHREADS_VISIBLE_DEVICES` | Card index visible inside the container. |
| `MTHREADS_QOS_MEMORY_LIMIT` | Device memory limit in bytes. The runtime rounds the value up to the next tier: 512 MiB, then 1/2/4/8/16/32/48/64/80 GiB. |
| `MTHREADS_QOS_COMPUTING_POWER_WEIGHT` | Compute weight in time slices, range 1-99999, default 1. |
| `MTHREADS_ALLOCATED_SGPU_MEMORY_DEVICES` | Granted memory units. |
| `MTHREADS_ALLOCATED_SGPU_CORE_DEVICES` | Granted core units. |

`mthreads-gmi` inside the container shows the enforced memory limit, for example `0MiB(16384MiB)` for a 16 GiB slice. An allocation beyond the limit fails, because device memory is hard-isolated.

### Verify a slice with mthreads-gmi

The container's view of the limit is the authoritative check that a slice was enforced as requested:

```bash
kubectl exec -it <pod> -- mthreads-gmi
```

The parenthesized value is the total memory visible in the container. Measured on an S5000 node, where the pod requested `mthreads.com/sgpu-memory: 64` (64 × 512 MiB = 32 GiB):

```text
ID   Name                 |PCIe                |%GPU  Mem
0    MTT S5000            |00000000:03:00.0    |0%    0MiB(32768MiB)
     Physical      P0     |16x(16x)            |40C   YES
```

32 GiB matches `64 × 512 MiB` exactly. A pod requesting `mthreads.com/gpu: 1` on the same node reports the full card instead, `0MiB(81920MiB)`, which is the 80 GiB of an S5000.

:::note

Whole-card capacity is a node-level budget enforced by the vendor device plugin, not by HAMi. Size whole-card workloads against the node's `mthreads.com/gpu` allocatable value, which is the physical card count minus the cards bound to `sgpu_km`. The default scheduler accounts for a pod's extended-resource request before binding completes, so concurrent requests that exceed allocatable capacity stay Pending until capacity frees up.

:::

Available resource types and slicing rules on the S5000:

| Resource | Unit | Description |
| --- | --- | --- |
| `mthreads.com/vgpu` | sliced card | Number of sliced GPUs. Multi-card requests are supported: HAMi pins `sgpu-core` to 16 per card, splits an explicit `sgpu-memory` evenly across the requested cards, and grants each card its full capacity when memory is omitted. |
| `mthreads.com/sgpu-memory` | 512 MiB | Device memory per slice. Valid values with `devices.mthreads.memoryPerCard: [160]`: 2, 4, 8, 16, 32, 64, 128, 160. |
| `mthreads.com/sgpu-core` | 1/16 card cores | Compute cores per slice, from 1 to 16. Maps to the container's compute weight; actual GPU time depends on the vendor scheduling policy and competing workloads. |

To exclusively occupy one sliced card, request `mthreads.com/vgpu` alone. The webhook grants the full sliced card: it sets `sgpu-core` to 16, and leaves `sgpu-memory` unset so the scheduler derives it from the selected node's real per-card capacity (160 units = 80 GiB on the S5000):

```yaml
resources:
  limits:
    mthreads.com/vgpu: 1
```

The same form with `mthreads.com/vgpu: 2` occupies two full sliced cards: the webhook sets `sgpu-core` to 32 (16 per card) and likewise leaves `sgpu-memory` unset.

Whole cards stay outside HAMi. Pods requesting `mthreads.com/gpu` keep the default scheduler and coexist with sliced pods on the same cluster:

```yaml
resources:
  limits:
    mthreads.com/gpu: 1
```

A container cannot request `mthreads.com/gpu` and any `vgpu`/`sgpu-*` resource at the same time. The admission webhook rejects such pods, because whole cards are allocated by the vendor device plugin outside HAMi's accounting and mixing both would hide oversubscription.

Measured on S5000 nodes with 3 of 8 cards bound to `sgpu_km`: a sliced pod (`mthreads.com/vgpu: 1`, `sgpu-memory: 64`, `sgpu-core: 9`) ran alongside whole-card pods requesting `mthreads.com/gpu: 1`, `2` and `3`. The slice saw `0MiB(32768MiB)`, each whole card saw the full `0MiB(81920MiB)`, and the multi-card whole-card pods listed 2 and 3 devices respectively.
