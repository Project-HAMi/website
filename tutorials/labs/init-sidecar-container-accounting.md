---
title: "Lab 20: Init and Sidecar Container GPU Resource Accounting"
description: "Verify regular init container GPU memory reclamation versus persistent native sidecar accounting (KEP-753) with HAMi."
sidebar_label: "Lab 20: Init & Sidecar Accounting"
lab:
  level: Intermediate
  duration: about 45 minutes
  environment: Linux (kind) · macOS · fake GPU (Lab 5 nvml-mock) · no real GPU required
  cost: free
  authors:
    - GiGiKoneti
  verified: "2026-10-08"
tags:
  - scheduling
  - init-containers
  - sidecar-containers
  - resource-accounting
  - fake-gpu
toc_max_heading_level: 2
---

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem';

In Kubernetes 1.29+ (or Kubernetes 1.28 with the `SidecarContainers` feature gate enabled), Kubernetes supports [Native Sidecar Containers (KEP-753)](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/) by allowing `restartPolicy: Always` inside `spec.initContainers`. While regular init containers run sequentially to completion before application containers start, native sidecars remain running for the entire lifecycle of the Pod.

When workloads request GPU resources (such as vGPU memory via `nvidia.com/gpumem`), how does HAMi prevent GPU oversubscription while still reclaiming memory when regular init containers finish?

This lab walks you through verifying **HAMi's GPU resource accounting engine** ([HAMi PR #2723](https://github.com/Project-HAMi/HAMi/pull/2723)). You will learn:

1. How HAMi performs **post-init memory shrinking** when regular init containers complete.
2. How HAMi enforces **cumulative accounting** for native sidecar containers so they never oversubscribe the GPU.
3. How declaration ordering impacts the peak allocation formula.

Best of all: **no physical NVIDIA GPU is required**. You can run this entire lab on your laptop using [Lab 5: Fake-GPU Scheduling with nvml-mock](./nvml-mock.md) without physical hardware, or on any Kubernetes cluster with NVIDIA GPUs and HAMi installed.

---

## The Core Problem

Consider an 8000 MiB GPU slice shared across containers in a Pod:

```mermaid
%% title: Regular Init Container vs Native Sidecar Memory Lifecycle
flowchart TB
    subgraph RegularInit["Case A: Regular Init Container"]
        direction TB
        R1["Init Container: 5000 MiB<br/>(Runs to completion)"] -->|Exits 0| R2["Post-Init Shrink<br/>3000 MiB reclaimed"]
        R2 --> R3["App Container: 2000 MiB<br/>(Starts execution)"]
        R4["Effective Stored Usage: 2000 MiB<br/>(Shrunk from 5000 MiB peak)"]
    end

    subgraph NativeSidecar["Case B: Native Sidecar Container (KEP-753)"]
        direction TB
        S1["Sidecar: 2000 MiB<br/>(restartPolicy: Always)"]
        S2["App Container: 4000 MiB<br/>(Runs concurrently)"]
        S1 -.->|Runs in parallel| S2
        S3["Effective Stored Usage: 2000 + 4000 = 6000 MiB<br/>(Never shrunk)"]
    end
```

### The Upstream Accounting Formula

Before PR #2723, HAMi classified containers solely by their position in `spec.initContainers`. Because sidecars are declared in `initContainers`, a naive `max(init, app)` calculation would treat a 2000 MiB sidecar and a 4000 MiB app container as requiring only `max(2000, 4000) = 4000 MiB`, under-accounting the real demand (6000 MiB) and allowing another pod to schedule and crash the card with CUDA out-of-memory errors.

HAMi addresses this by implementing an ordering-aware formula matching the Kubernetes API server specification per GPU device UUID:

```text
effective[uuid] = max(
  max_{i in regular inits} (init_i[uuid] + sum_{j < i, j in sidecars} sidecar_j[uuid]),
  sum apps[uuid] + sum sidecars[uuid]
)
```

- **Regular init containers** contribute to the initial peak, but once they exit 0, HAMi shrinks stored usage to steady-state demand (`sum apps + sum sidecars`).
- **Native sidecars** (`restartPolicy: Always`) are summed cumulatively with app containers and are **never** dropped by the shrink gate.

---

## Lab Flow Overview

```mermaid
%% title: Lab 20 Execution Flow
flowchart LR
    Step1["Step 1<br/>Environment Setup<br/>(Fake GPU Cluster)"] --> Step2["Step 2<br/>Regular Init Container<br/>(Observe Memory Shrink)"]
    Step2 --> Step3["Step 3<br/>Native Sidecar<br/>(Persistent Accounting)"]
    Step3 --> Step4["Step 4<br/>Oversubscription<br/>Prevention"]
    Step4 --> Step5["Step 5<br/>Mixed Workload<br/>(Ordering Verification)"]
```

| Step | Focus | Verification Method |
| :-- | :-- | :-- |
| **Step 1** | Cluster Readiness | Confirm HAMi scheduler & fake GPU device registration |
| **Step 2** | Regular Init Container | Check `hami.io/vgpu-devices-allocated` before & after init exit 0 |
| **Step 3** | Native Sidecar Container | Verify cumulative addition of sidecar + app GPU memory |
| **Step 4** | Oversubscription Guard | Verify that competing pods exceeding card capacity stay `Pending` |
| **Step 5** | Mixed Workloads | Trace peak-to-steady-state transition with both sidecars and inits |

---

## Step 1: Environment Setup

Ensure you have a running Kubernetes cluster with HAMi installed. You can use an existing cluster or spin up a simulated GPU environment in minutes:

<Tabs groupId="env">
<TabItem value="lab5" label="Option A: kind + nvml-mock (Lab 5)" default>

Follow [Lab 5: Fake-GPU Scheduling with nvml-mock](./nvml-mock.md) to bootstrap a kind cluster with simulated A100 GPUs. `nvml-mock` mocks the NVML library, allowing HAMi's device plugin to register full virtual GPU memory slicing (`nvidia.com/gpumem`) without physical GPUs.

Verify your node reports virtual GPU resources:

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,GPU:.status.allocatable."nvidia\.com/gpu"
```

Expected output:

```text
NAME                 GPU
nvml-mock-worker     80
```

</TabItem>
<TabItem value="real" label="Option B: Real NVIDIA GPU Cluster">

If you have a physical GPU cluster with HAMi installed, ensure node allocations are healthy:

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,GPU:.status.allocatable."nvidia\.com/gpu"
```

</TabItem>
</Tabs>

Verify the HAMi scheduler and admission webhook are running:

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/name=hami
```

:::tip Kubernetes Version & Feature Gate

Native sidecar containers graduated to Beta and are enabled by default in **Kubernetes 1.29+**. If testing on Kubernetes 1.28, the `SidecarContainers` feature gate is Alpha and must be explicitly enabled (`SidecarContainers=true`) on the control-plane and node components. Kubernetes 1.29 or newer is recommended.

:::

---

## Step 2: Regular Init Container Memory Shrinking

In this step, we deploy a Pod with a regular init container (representing a model-weight downloader or converter) that requests 5000 MiB of GPU memory, followed by an application container that requests 2000 MiB.

### 1. Inspect the Manifest

Review [`examples/20-init-sidecar-accounting/01-regular-init-container.yaml`](https://github.com/Project-HAMi/website/blob/master/tutorials/labs/examples/20-init-sidecar-accounting/01-regular-init-container.yaml):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: regular-init-pod
spec:
  restartPolicy: Never
  initContainers:
    - name: model-prep
      image: busybox:1.36
      command: ["sh", "-c", "echo 'Preparing model weights on GPU...' && sleep 15 && echo 'Done'"]
      env:
        - name: CUDA_DISABLE_CONTROL
          value: "true"
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 5000 # 5000 MiB during init (peak allocation)
  containers:
    - name: inference-app
      image: busybox:1.36
      command: ["sh", "-c", "echo 'Inference app running...' && sleep infinity"]
      env:
        - name: CUDA_DISABLE_CONTROL
          value: "true"
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 2000 # 2000 MiB during execution (steady state)
```

### 2. Deploy and Observe the Init Phase

Apply the manifest:

```bash
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/website/master/tutorials/labs/examples/20-init-sidecar-accounting/01-regular-init-container.yaml
```

Immediately check the Pod status:

```bash
kubectl get pod regular-init-pod
```

Expected output:

```text
NAME               READY   STATUS     RESTARTS   AGE
regular-init-pod   0/1     Init:0/1   0          3s
```

Now, check the HAMi allocation annotation while the init container is running:

```bash
kubectl get pod regular-init-pod -o jsonpath='{.metadata.annotations.hami\.io/vgpu-devices-allocated}'; echo
```

Expected output shows entries for both the init container and the app container bound to the same GPU:

```text
GPU-12345678-1234-1234-1234-123456780001,NVIDIA,5000,0:;GPU-12345678-1234-1234-1234-123456780001,NVIDIA,2000,0:;
```

:::info Understanding HAMi Allocation Annotation Format

The `hami.io/vgpu-devices-allocated` annotation uses a delimited string format:

- **Semicolons (`;`)** separate containers in declaration order. In this Pod, entry 0 (`GPU-...,NVIDIA,5000,0:`) represents `model-prep`, and entry 1 (`GPU-...,NVIDIA,2000,0:`) represents `inference-app`.
- **Colons (`:`)** separate multiple GPU devices assigned to the same container.
- **Commas (`,`)** separate device fields: `<UUID>,<Vendor>,<VRAM_MiB>,<Cores%>` (with an optional trailing `<Slots>`).

Here, both containers are scheduled onto the same virtual GPU with 5000 MiB reserved for the init task and 2000 MiB for the app during Pod initialization.

:::

### 3. Observe Post-Init Memory Shrinking

Wait 15 seconds for the init container to finish and the application container to start:

```bash
kubectl get pod regular-init-pod
```

Expected output:

```text
NAME               READY   STATUS    RESTARTS   AGE
regular-init-pod   1/1     Running   0          22s
```

Check the init container's termination status:

```bash
kubectl get pod regular-init-pod -o jsonpath='{.status.initContainerStatuses[0].state.terminated.exitCode}'
```

Expected output:

```text
0
```

Because `exitCode == 0`, HAMi's scheduler detects that the regular init container completed successfully (`util.AllNonSidecarInitContainersSucceeded`). In `pkg/scheduler/scheduler.go`, the scheduler invokes `device.SteadyStateDeviceUsage` to fire the **post-init shrink**:

- HAMi releases the 5000 MiB reserved for `model-prep`.
- The stored GPU usage on the node in the scheduler cache shrinks from **5000 MiB** down to **2000 MiB** (the application container's steady-state demand only), freeing **3000 MiB** back to the allocatable pool!

Verify that the post-init shrink event fired in the HAMi scheduler logs by selecting the scheduler Pod specifically (distinguishing it from device-plugin DaemonSet Pods):

```bash
SCHEDULER_POD=$(kubectl get pod -n kube-system -l app.kubernetes.io/name=hami -o jsonpath='{.items[?(@.spec.containers[*].name=="hami-scheduler")].metadata.name}')
kubectl logs -n kube-system "$SCHEDULER_POD" -c hami-scheduler --tail=100 | grep "shrunk usage to steady state"
```

Expected output:

```text
"Non-sidecar init containers completed, shrunk usage to steady state" pod="default/regular-init-pod" oldUsage=... newUsage=...
```

To verify that the freed capacity is available for scheduling, deploy a temporary test pod requesting 3000 MiB (the exact reclaimed amount):

```bash
kubectl run shrink-verify --image=busybox:1.36 --restart=Never \
  --overrides='{"spec":{"containers":[{"name":"v","image":"busybox:1.36","command":["sh","-c","sleep 5"],"resources":{"limits":{"nvidia.com/gpu":"1","nvidia.com/gpumem":"3000"}}}]}}'
```

Confirm `shrink-verify` schedules and reaches `Running` without pending:

```bash
kubectl get pod shrink-verify
```

Clean up the test pods:

```bash
kubectl delete pod regular-init-pod shrink-verify --wait=false
```

---

## Step 3: Native Sidecar Container GPU Accounting

Now let's examine a native sidecar container. A sidecar container is declared in `initContainers` but includes `restartPolicy: Always`. It starts before the application container and runs alongside it for the entire life of the Pod (e.g. an inference metrics proxy or token caching daemon).

### 1. Inspect the Manifest

Review [`examples/20-init-sidecar-accounting/02-native-sidecar-container.yaml`](https://github.com/Project-HAMi/website/blob/master/tutorials/labs/examples/20-init-sidecar-accounting/02-native-sidecar-container.yaml):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: native-sidecar-pod
spec:
  restartPolicy: Never
  initContainers:
    - name: proxy-sidecar
      image: busybox:1.36
      restartPolicy: Always # <-- KEP-753 Native Sidecar
      command: ["sh", "-c", "echo 'Inference proxy sidecar running...' && sleep infinity"]
      env:
        - name: CUDA_DISABLE_CONTROL
          value: "true"
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 2000 # 2000 MiB
  containers:
    - name: inference-app
      image: busybox:1.36
      command: ["sh", "-c", "echo 'Main inference app running...' && sleep infinity"]
      env:
        - name: CUDA_DISABLE_CONTROL
          value: "true"
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 4000 # 4000 MiB
```

### 2. Deploy and Inspect

Deploy the sidecar pod:

```bash
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/website/master/tutorials/labs/examples/20-init-sidecar-accounting/02-native-sidecar-container.yaml
```

Wait a few seconds for both containers to reach `Running`:

```bash
kubectl get pod native-sidecar-pod
```

Expected output:

```text
NAME                 READY   STATUS    RESTARTS   AGE
native-sidecar-pod   2/2     Running   0          10s
```

Notice `READY: 2/2`! Both the sidecar init container and the application container are running concurrently.

Inspect the allocation annotation:

```bash
kubectl get pod native-sidecar-pod -o jsonpath='{.metadata.annotations.hami\.io/vgpu-devices-allocated}'; echo
```

Expected output:

```text
GPU-12345678-1234-1234-1234-123456780001,NVIDIA,2000,0:;GPU-12345678-1234-1234-1234-123456780001,NVIDIA,4000,0:;
```

The delimited annotation confirms:

- **Container index 0 (`proxy-sidecar`)**: allocated 2000 MiB.
- **Container index 1 (`inference-app`)**: allocated 4000 MiB on the same GPU.

### 3. Verify Steady-State Preservation

Unlike regular init containers:

- `proxy-sidecar` does not terminate (`exitCode 0` never occurs).
- HAMi's shrink gate explicitly checks whether `restartPolicy` is set to `Always`: `isSidecar(c) := c.RestartPolicy != nil && *c.RestartPolicy == corev1.ContainerRestartPolicyAlways`.
- Because this container is a sidecar, HAMi's `SteadyStateDeviceUsage` retains its 2000 MiB quota. The effective usage remains:

  ```text
  effectiveUsage = 2000 MiB (sidecar) + 4000 MiB (app) = 6000 MiB
  ```

---

## Step 4: Proving GPU Oversubscription Prevention

Why is this accounting critical? Let's demonstrate what happens when a competing workload attempts to schedule onto the remaining GPU memory.

In Lab 5, each simulated NVIDIA A100 GPU has a total capacity of **40960 MiB**.

### 1. Identify the Target GPU and Calculate Free Capacity

First, extract the GPU UUID assigned to `native-sidecar-pod`:

```bash
TARGET_GPU=$(kubectl get pod native-sidecar-pod -o jsonpath='{.metadata.annotations.hami\.io/vgpu-devices-allocated}' | cut -d',' -f1)
echo "Target GPU: ${TARGET_GPU}"
```

Calculate the card memory balance:

- Total GPU capacity on `${TARGET_GPU}`: **40960 MiB**.
- `native-sidecar-pod` consumes: `2000 MiB (sidecar) + 4000 MiB (app) = 6000 MiB`.
- Remaining free memory on `${TARGET_GPU}`: `40960 - 6000 = 34960 MiB`.

### 2. Attempt to Schedule a 36000 MiB Competing Pod

Review [`examples/20-init-sidecar-accounting/04-oversubscription-prevention.yaml`](https://github.com/Project-HAMi/website/blob/master/tutorials/labs/examples/20-init-sidecar-accounting/04-oversubscription-prevention.yaml):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: competing-workload-pod
  labels:
    app: competing-workload
  annotations:
    # Pin this workload to the same GPU card hosting native-sidecar-pod
    # Replace TARGET_GPU_UUID with the allocated GPU UUID from Step 3
    nvidia.com/use-gpuuuid: "TARGET_GPU_UUID"
spec:
  restartPolicy: Never
  containers:
    - name: worker
      image: busybox:1.36
      command: ["sh", "-c", "echo 'Competing workload running...' && sleep infinity"]
      env:
        - name: CUDA_DISABLE_CONTROL
          value: "true"
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 36000 # Requests 36000 MiB: exceeds the 34960 MiB remaining on a 40960 MiB A100 GPU
```

Deploy the competing pod pinned to `${TARGET_GPU}`:

```bash
sed "s/TARGET_GPU_UUID/${TARGET_GPU}/g" \
  tutorials/labs/examples/20-init-sidecar-accounting/04-oversubscription-prevention.yaml | kubectl apply -f -
```

Check the pod status:

```bash
kubectl get pod competing-workload-pod
```

Expected output:

```text
NAME                     READY   STATUS    RESTARTS   AGE
competing-workload-pod   0/1     Pending   0          6s
```

Check the scheduling failure event:

```bash
kubectl describe pod competing-workload-pod | grep -A 3 Events:
```

Expected output:

```text
Events:
  Type     Reason            Age   From            Message
  ----     ------            ----  ----            -------
  Warning  FailedScheduling  10s   hami-scheduler  0/1 nodes are available: 1 Insufficient Memory (need 36000, free 34960).
```

:::tip[Before vs. After HAMi PR #2723]

- **Before PR #2723:** The sidecar was grouped under regular inits using `max(2000, 4000) = 4000 MiB`. The scheduler would have believed `40960 - 4000 = 36960 MiB` was free, incorrectly scheduling `competing-workload-pod` (36000 &lt;= 36960) onto `${TARGET_GPU}` and causing physical CUDA OOM errors (`2000 + 4000 + 36000 = 42000 > 40960 MiB`) at runtime.
- **After PR #2723:** HAMi accounts the real 6000 MiB demand, recognizes that only 34960 MiB is free, and keeps the competing workload safely in `Pending` state.

:::

:::note Sizing for Custom Card Capacities

If your test cluster uses a different GPU model or virtual slice size `C` (such as an 8000 MiB slice), choose a competing request `M` satisfying:

```text
C - (M_sidecar + M_app) < M <= C - max(M_sidecar, M_app)
```

For example, on an 8000 MiB card with a 2000 MiB sidecar and 4000 MiB app, setting `M = 4000 MiB` satisfies `8000 - 6000 = 2000 < 4000 <= 8000 - 4000 = 4000`, yielding `need 4000, free 2000`.

:::

Clean up the competing pod:

```bash
kubectl delete pod competing-workload-pod
kubectl delete pod native-sidecar-pod
```

---

## Step 5: Mixed Workloads & Declaration Ordering

What happens when a Pod uses **both** a native sidecar and a regular init container?

According to Kubernetes upstream specifications, init containers execute in declaration order:

- Any native sidecar declared _before_ a regular init container is already active when that init container executes.
- Therefore, the init container's peak demand must include the preceding sidecars!

### 1. Inspect the Mixed Manifest

Review [`examples/20-init-sidecar-accounting/03-mixed-workload-ordering.yaml`](https://github.com/Project-HAMi/website/blob/master/tutorials/labs/examples/20-init-sidecar-accounting/03-mixed-workload-ordering.yaml):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mixed-workload-pod
spec:
  restartPolicy: Never
  initContainers:
    # 1. Preceding Sidecar: 2000 MiB (starts and runs indefinitely)
    - name: cache-sidecar
      image: busybox:1.36
      restartPolicy: Always
      command: ["sh", "-c", "sleep infinity"]
      env:
        - name: CUDA_DISABLE_CONTROL
          value: "true"
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 2000

    # 2. Regular Init: 5000 MiB (runs 15 seconds, then exits 0)
    - name: weights-loader
      image: busybox:1.36
      command: ["sh", "-c", "sleep 15"]
      env:
        - name: CUDA_DISABLE_CONTROL
          value: "true"
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 5000

  # 3. Main Application: 4000 MiB
  containers:
    - name: serving-engine
      image: busybox:1.36
      command: ["sh", "-c", "sleep infinity"]
      env:
        - name: CUDA_DISABLE_CONTROL
          value: "true"
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 4000
```

### 2. Calculate the Transition

Applying the ordering-aware formula:

```text
Peak Phase = max(weights-loader + cache-sidecar, serving-engine + cache-sidecar)
           = max(5000 + 2000, 4000 + 2000) = 7000 MiB

Steady-State Phase = serving-engine + cache-sidecar
                   = 4000 + 2000 = 6000 MiB
```

### 3. Deploy and Verify

Deploy the mixed workload:

```bash
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/website/master/tutorials/labs/examples/20-init-sidecar-accounting/03-mixed-workload-ordering.yaml
```

During the first 15 seconds:

- `cache-sidecar` is running.
- `weights-loader` is running.
- HAMi accounts **7000 MiB** peak demand.

After 15 seconds:

- `weights-loader` exits with code 0.
- `serving-engine` starts.
- HAMi fires the post-init shrink, releasing the 5000 MiB from `weights-loader` while preserving `cache-sidecar` (2000 MiB) + `serving-engine` (4000 MiB) = **6000 MiB** steady-state demand!

Verify both running containers:

```bash
kubectl get pod mixed-workload-pod
```

Expected output:

```text
NAME                 READY   STATUS    RESTARTS   AGE
mixed-workload-pod   2/2     Running   0          25s
```

Clean up:

```bash
kubectl delete pod mixed-workload-pod
```

---

## Key Takeaways

| Feature | Regular Init Container | Native Sidecar Container (`restartPolicy: Always`) |
| :-- | :-- | :-- |
| **Declaration** | `spec.initContainers` | `spec.initContainers` with `restartPolicy: Always` |
| **Lifecycle** | Runs sequentially to completion | Starts before apps, runs for Pod lifetime |
| **Accounting Rule** | Evaluated in `init_peak` | Added cumulatively to app containers (`sum sidecar + sum app`) |
| **Memory Shrink** | Reclaimed when `exitCode == 0` | **Never** reclaimed; held for Pod lifetime |
| **Upstream Alignment** | Matches Kubernetes Pod init semantics | Full conformance with KEP-753 resource model |

---

## References

- [HAMi PR #2723: Account Native Sidecar Container GPU Resources](https://github.com/Project-HAMi/HAMi/pull/2723)
- [HAMi PR #1773: Correct Init Container Resource Calculation](https://github.com/Project-HAMi/HAMi/pull/1773)
- [Sidecar Container GPU Resource Accounting Design Doc](/docs/next/developers/sidecar-container-design)
- [Kubernetes KEP-753: Native Sidecar Containers](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/753-sidecar-containers)
