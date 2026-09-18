---
sidebar_label: Mthreads MTT S5000
title: Use HAMi with Mthreads MTT S5000
---

## Introduction

HAMi supports GPU sharing on Mthreads MTT S5000 through the vendor's sGPU technology. In this setup, each vendor does what it does best:

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
   - `gpu_ids=0,2,3` binds exactly the listed cards. Use this for a precise layout; its count takes precedence over `total_gpu_num`.

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
           "overcommit_ratio": "1.1"
           "time_slice": "1"
         selector:
           matchLabels:
             mthreads.com/gpu-node: "true"
   ```

3. Verify that the node reports both resource pools:

   ```bash
   kubectl get node <gpu-node> -o json | grep mthreads.com
   ```

   Expect `mthreads.com/gpu` (whole cards), plus `mthreads.com/sgpu-core` (16 units per sliced card) and `mthreads.com/sgpu-memory` (160 units per sliced card on the S5000, each unit equals 512 MiB).

:::note

Unlike the NVIDIA and Ascend device plugins, which write device lists into node annotations (for example `hami.io/node-nvidia-register`), the Mthreads device plugin reports card information through node **labels** such as `mthreads.com/gpu-node` and `mthreads.com/gpu.count`. HAMi's Mthreads support derives per-card information from node capacity (`mthreads.com/sgpu-core` / 16 = number of sliced cards) instead of parsing an annotation device list. Do not expect a `hami.io/node-mthreads-register` annotation on these nodes.

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

HAMi models each Mthreads card with a per-card memory capacity. The default of 96 units matches the MTT S4000 (48 GiB). The MTT S5000 has 80 GiB, so set `memoryPerCard` to `[160]`. Without this, exclusive allocations only get 48 GiB and larger slices (for example 128 units) are rejected. This parameter is cluster-level; clusters mixing S4000 and S5000 need separate node pools per card model.

Install HAMi:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
helm install hami hami-charts/hami -n kube-system -f values.yaml
```

Verify the installation:

```bash
kubectl get pods -n kube-system | grep hami
```

The `hami-scheduler` pod should show `2/2` containers running (kube-scheduler plus the HAMi scheduler extender).

## sGPU Host Configuration

On each GPU node, the running sGPU service exposes configuration nodes under `/proc/sgpu_km`. Each sliced card gets a directory named by its card ID, with the following knobs:

| Node | Range | Description |
| --- | --- | --- |
| `max_inst` | 1-16 | Max slice instances per card. |
| `policy` | 0, 1, 2 | Compute isolation mode. `0`: performance (default), no compute isolation, slices behave like processes on a bare card. `1`: weak isolation, an idle card is fully used by the running container. `2`: strong isolation, time slices are enforced even when other containers are idle (equal split only). |
| `time_slice` | integer, ms | Scheduler time slice length, default 1 ms, minimum 1 ms. Larger values are fairer, smaller values are more efficient. Only affects the weak and strong isolation modes. |
| `overcommit_ratio` | 100-200 | Device memory oversubscription ratio in percent. |

Key points when tuning these values:

- `max_inst`, `policy`, and `time_slice` cannot be changed while containers hold allocations on the card. Set them before allocating slices, or after draining the card.
- Changes delivered through the ClusterConfig `sgpuSpec` are applied by the operator and require a restart of `mt-controller-manager` to take effect. Direct writes to `/proc/sgpu_km` take effect immediately but are lost when the module reloads.
- Device memory stays hard-isolated in every `policy` mode. Only compute behavior differs between modes.
- Per-container knobs such as `weight` (time slice count) are set by the container runtime from the pod's `sgpu-core` request, so HAMi controls them through scheduling.

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
      image: <your-image> # must include the MUSA user-space driver stack
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

Available resource types and slicing rules on the S5000:

| Resource | Unit | Description |
| --- | --- | --- |
| `mthreads.com/vgpu` | sliced card | Number of sliced GPUs. Multi-card tasks request whole cards only. |
| `mthreads.com/sgpu-memory` | 512 MiB | Device memory per slice. Valid values with `memoryPerCard: [160]`: 2, 4, 8, 16, 32, 64, 128, 160. |
| `mthreads.com/sgpu-core` | 1/16 card cores | Compute cores per slice, from 1 to 16. Maps to the container's compute weight. |

To exclusively occupy one sliced card, request `mthreads.com/vgpu` alone. The webhook fills in the full card (`sgpu-core: 16`, `sgpu-memory: 160` on the S5000):

```yaml
resources:
  limits:
    mthreads.com/vgpu: 1
```

Whole cards stay outside HAMi. Pods requesting `mthreads.com/gpu` keep the default scheduler and coexist with sliced pods on the same cluster:

```yaml
resources:
  limits:
    mthreads.com/gpu: 1
```

A container cannot request `mthreads.com/gpu` and any `vgpu`/`sgpu-*` resource at the same time. The admission webhook rejects such pods, because whole cards are allocated by the vendor device plugin outside HAMi's accounting and mixing both would hide oversubscription.
