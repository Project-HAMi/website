---
title: "Chapter 4: Enter HAMi"
description: "Replace the NVIDIA device plugin with HAMi, follow a Pod through the webhook, scheduler extender, device plugin, and HAMi-core, and rerun the Chapter 3 experiments with memory and compute limits."
sidebar_label: "4. Enter HAMi"
lab:
  level: Intermediate
  duration: about 45 minutes
  environment: the Chapter 3 node with one NVIDIA T4
  authors:
    - togettoyou
  verified: "2026-10-07"
tags:
  - hami-core
  - gpu-sharing
  - isolation
toc_max_heading_level: 2
---

## Scenario

Time-slicing in Chapter 3 put several models on one T4, but every Pod saw the whole card. One greedy Pod took 11 GiB, and the next model was scheduled onto the node and then failed with `CUDA out of memory`. A training job cut the benchmark's throughput in half. The team still wants to share the card, and now each Pod needs a limit: this much memory, this much compute.

This chapter replaces the NVIDIA device plugin with HAMi on the same node and repeats the Chapter 3 experiments.

## What You'll Understand

- Which HAMi component steps in at which point of a Pod's life: the webhook, the scheduler extender, the device plugin, and HAMi-core
- How `nvidia.com/gpumem` limits a Pod's GPU memory and changes what the Pod sees
- How the HAMi scheduler accounts for GPU memory when it places Pods
- How `nvidia.com/gpucores` throttles compute, and why it is a soft limit

## Environment

This chapter adds the following to the Chapter 3 environment:

| Component | Version |
| --------- | ------- |
| HAMi      | v2.10.0 |

## The Principle: Four Components Along the Pod's Path

In Chapter 2, one component, the device plugin, connected the GPU to Kubernetes, and the scheduler only counted devices. HAMi changes three points on that path and adds a library inside the container:

![HAMi three-layer architecture component communication sequence](/img/docs/common/core-concepts/hami-architecture-en.svg)

- **Mutating webhook.** When a Pod that asks for `nvidia.com/gpu` is created, the webhook sets its `schedulerName` to `hami-scheduler`, so the HAMi scheduler handles it.
- **Scheduler extender.** The HAMi scheduler reads each GPU's memory and compute from a node annotation. When it filters nodes, it checks the Pod's `gpumem` and `gpucores` against what is left on each card. It picks a specific GPU and writes the decision into Pod annotations.
- **Device plugin.** HAMi's device plugin registers each GPU as several `nvidia.com/gpu` devices, 10 by default, and writes the GPU's details into the node annotation. At Allocate, it reads the scheduler's decision, sets `NVIDIA_VISIBLE_DEVICES`, adds environment variables with the Pod's limits, and mounts HAMi-core into the container.
- **HAMi-core (`libvgpu.so`).** A library that every process in the container loads first, through `/etc/ld.so.preload`. It intercepts CUDA and NVML calls: memory allocations above the limit fail, memory queries report the limit, and kernel launches are throttled to the compute share.

The full workflow is described in [GPU Virtualization Principles](/docs/core-concepts/gpu-virtualization#workflow-in-detail). Steps 3 to 5 below look at each component on the node.

## Step 1: Remove the NVIDIA Device Plugin

Only one device plugin may register `nvidia.com/gpu` on a node. Uninstall the NVIDIA device plugin from Chapters 2 and 3:

```bash
helm uninstall nvdp --namespace nvidia-device-plugin
```

```plaintext
release "nvdp" uninstalled
```

Check the node's allocatable resources:

```bash
kubectl get node <gpu-node-name> -o jsonpath='{.status.allocatable}' ; echo
```

```plaintext
{"cpu":"8","ephemeral-storage":"190122739807","hugepages-1Gi":"0","hugepages-2Mi":"0","memory":"32370500Ki","nvidia.com/gpu":"0","pods":"110"}
```

`nvidia.com/gpu` is now 0. Nothing on the node can hand out GPUs until HAMi registers. Remove the empty namespace:

```bash
kubectl delete namespace nvidia-device-plugin
```

```plaintext
namespace "nvidia-device-plugin" deleted
```

## Step 2: Install HAMi

HAMi's device plugin runs on nodes labeled `gpu=on`:

```bash
kubectl label node <gpu-node-name> gpu=on
```

```plaintext
node/vm-0-4-ubuntu labeled
```

Add the HAMi chart repository:

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update hami-charts
```

```plaintext
"hami-charts" has been added to your repositories
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "hami-charts" chart repository
Update Complete. ⎈Happy Helming!⎈
```

Install HAMi. The chart defaults match this node: the driver and Toolkit are on the host, and `nvidia` is containerd's default runtime.

```bash
helm install hami hami-charts/hami --namespace kube-system --version 2.10.0
```

```plaintext
NAME: hami
LAST DEPLOYED: Wed Oct  7 00:51:26 2026
NAMESPACE: kube-system
STATUS: deployed
REVISION: 1
DESCRIPTION: Install complete
TEST SUITE: None
NOTES:
** Please be patient while the chart is being deployed **
Resource name: nvidia.com/gpu
```

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/instance=hami
```

```plaintext
NAME                              READY   STATUS    RESTARTS   AGE
hami-device-plugin-rb2vz          2/2     Running   0          64s
hami-scheduler-6c74b6fb49-c7892   2/2     Running   0          64s
```

## Step 3: Look at What HAMi Registered

Each HAMi Pod has two containers:

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/instance=hami \
    -o custom-columns=POD:.metadata.name,CONTAINERS:.spec.containers[*].name
```

```plaintext
POD                               CONTAINERS
hami-device-plugin-rb2vz          device-plugin,vgpu-monitor
hami-scheduler-6c74b6fb49-c7892   kube-scheduler,vgpu-scheduler-extender
```

`hami-scheduler` runs a standard `kube-scheduler` together with HAMi's `vgpu-scheduler-extender`. `hami-device-plugin` runs the device plugin and `vgpu-monitor`, which watches GPU usage on the node. The webhook is registered with the API server:

```bash
kubectl get mutatingwebhookconfigurations
```

```plaintext
NAME           WEBHOOKS   AGE
hami-webhook   1          73s
```

Now the node capacity:

```bash
kubectl get node <gpu-node-name> -o jsonpath='{.status.capacity}' ; echo
```

```plaintext
{"cpu":"8","ephemeral-storage":"206296376Ki","hugepages-1Gi":"0","hugepages-2Mi":"0","memory":"32472900Ki","nvidia.com/gpu":"10","pods":"110"}
```

HAMi reports the T4 as 10 `nvidia.com/gpu` devices. Like time-slicing, this count only decides how many Pods can share the card. The memory and compute come from a node annotation:

```bash
kubectl get node <gpu-node-name> -o jsonpath='{.metadata.annotations.hami\.io/node-nvidia-register}' ; echo
```

```plaintext
[{"id":"GPU-caf9bd30-b03c-04d8-9d4f-8a02f984cc23","count":10,"devmem":16384,"devcore":100,"type":"NVIDIA-Tesla T4","mode":"hami-core","health":true}]
```

The annotation carries the GPU UUID, the 10 slots (`count`), 16384 MiB of memory (`devmem`), 100% of compute (`devcore`), and the model. This is what the HAMi scheduler reads when it places Pods.

## Step 4: Run Two Models with Memory Limits

Add `nvidia.com/gpumem: 4096` to `model-a.yaml` from Chapter 2, so the Pod asks for 4096 MiB of GPU memory:

```yaml title="model-a.yaml"
apiVersion: v1
kind: Pod
metadata:
  name: model-a
spec:
  restartPolicy: Never
  containers:
    - name: model
      image: pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime
      command:
        - python
        - -c
        - |
          import time, torch
          weights = torch.empty(2 * 1024**3, dtype=torch.uint8, device="cuda")
          print("model-a loaded 2 GiB of weights on", torch.cuda.get_device_name(0), flush=True)
          time.sleep(365 * 24 * 3600)
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 4096
```

Create `model-b.yaml`, `model-c.yaml`, and `model-d.yaml` from it, changing only the name:

```bash
for name in model-b model-c model-d; do
    sed "s/model-a/$name/g" model-a.yaml > $name.yaml
done
```

Start the first two:

```bash
kubectl apply -f model-a.yaml
kubectl apply -f model-b.yaml
```

```plaintext
pod/model-a created
pod/model-b created
```

```bash
kubectl get pods
```

```plaintext
NAME      READY   STATUS    RESTARTS   AGE
model-a   1/1     Running   0          30s
model-b   1/1     Running   0          30s
```

Follow `model-a` through the four components. The webhook changed its scheduler:

```bash
kubectl get pod model-a -o jsonpath='{.spec.schedulerName}' ; echo
```

```plaintext
hami-scheduler
```

The scheduler extender recorded which GPU it chose and how much memory and compute it assigned:

```bash
kubectl get pod model-a -o jsonpath='{.metadata.annotations.hami\.io/vgpu-devices-allocated}' ; echo
```

```plaintext
GPU-caf9bd30-b03c-04d8-9d4f-8a02f984cc23,NVIDIA,4096,0:;
```

The fields are the GPU UUID, the vendor, 4096 MiB of memory, and 0 for compute, since `model-a` set no `gpucores`. The device plugin turned that decision into environment variables:

```bash
kubectl exec model-a -- env | grep -E "NVIDIA_VISIBLE_DEVICES|CUDA_DEVICE_MEMORY_LIMIT|CUDA_DEVICE_SM_LIMIT"
```

```plaintext
NVIDIA_VISIBLE_DEVICES=GPU-caf9bd30-b03c-04d8-9d4f-8a02f984cc23
CUDA_DEVICE_MEMORY_LIMIT_0=4096m
CUDA_DEVICE_SM_LIMIT=0
```

And mounted HAMi-core so that every process in the container loads it:

```bash
kubectl exec model-a -- cat /etc/ld.so.preload
```

```plaintext
/usr/local/vgpu/libvgpu.so
```

Now check what `model-a` sees:

```bash
kubectl exec model-a -- nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv
```

```plaintext
name, memory.used [MiB], memory.total [MiB]
Tesla T4, 2150 MiB, 4096 MiB
[HAMI-core Msg(62:132856292957248:multiprocess_memory_limit.c:862)]: Cleanup on exit for PID 62
[HAMI-core Msg(62:132856292957248:multiprocess_memory_limit.c:898)]: Exit cleanup complete for PID 62
```

In Chapter 3, `model-b` saw 16384 MiB and the memory of both models. Here `model-a` sees a 4096 MiB card with only its own 2150 MiB in use. HAMi-core answered the NVML memory query with the Pod's limit, and its exit messages show it was loaded into `nvidia-smi` too. The host still sees the real card:

```bash
nvidia-smi
```

```plaintext
Wed Oct  7 00:53:37 2026
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 580.126.20             Driver Version: 580.126.20     CUDA Version: 13.0     |
+-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  Tesla T4                       On  |   00000000:00:08.0 Off |                  Off |
| N/A   35C    P0             27W /   70W |    4303MiB /  16384MiB |      0%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+

+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI              PID   Type   Process name                        GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|    0   N/A  N/A          118099      C   python                                 2150MiB |
|    0   N/A  N/A          118336      C   python                                 2150MiB |
+-----------------------------------------------------------------------------------------+
```

## Step 5: Repeat the Memory Experiment

Run the greedy Pod from Chapter 3 again, now with a 4096 MiB limit. Update `greedy.yaml`:

```yaml title="greedy.yaml"
apiVersion: v1
kind: Pod
metadata:
  name: greedy
spec:
  restartPolicy: Never
  containers:
    - name: model
      image: pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime
      command:
        - python
        - -c
        - |
          import time, torch
          chunks = []
          while True:
              try:
                  chunks.append(torch.empty(1024**3, dtype=torch.uint8, device="cuda"))
              except torch.cuda.OutOfMemoryError:
                  break
          print(f"greedy holds {len(chunks)} GiB of GPU memory", flush=True)
          time.sleep(365 * 24 * 3600)
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 4096
```

```bash
kubectl apply -f greedy.yaml
```

```plaintext
pod/greedy created
```

```bash
kubectl logs greedy
```

```plaintext
[HAMI-core ERROR (pid:1 thread=138593507800896 allocator.c:52)]: Device 0 OOM 4401922048 / 4294967296
[HAMI-core ERROR (pid:1 thread=138593507800896 allocator.c:52)]: Device 0 OOM 4401922048 / 4294967296
greedy holds 3 GiB of GPU memory
```

HAMi-core refused the allocation that would have gone past 4294967296 bytes (4096 MiB), and the CUDA call returned out of memory to PyTorch. `greedy` stopped at 3 GiB. The fourth 1 GiB chunk did not fit because the CUDA context also counts against the limit.

Now start `model-c`, which failed in Chapter 3:

```bash
kubectl apply -f model-c.yaml
```

```plaintext
pod/model-c created
```

```bash
kubectl get pods
```

```plaintext
NAME      READY   STATUS    RESTARTS   AGE
greedy    1/1     Running   0          61s
model-a   1/1     Running   0          107s
model-b   1/1     Running   0          107s
model-c   1/1     Running   0          30s
```

```bash
kubectl logs model-c
```

```plaintext
model-c loaded 2 GiB of weights on Tesla T4
```

`model-c` runs. Four Pods share the T4, and each one stays within its 4096 MiB. Check how much memory the host sees in use:

```bash
nvidia-smi --query-gpu=memory.used,memory.total --format=csv
```

```plaintext
memory.used [MiB], memory.total [MiB]
9627 MiB, 16384 MiB
```

The four Pods use 9627 MiB of the 16384 MiB card. Try a fifth:

```bash
kubectl apply -f model-d.yaml
```

```plaintext
pod/model-d created
```

```bash
kubectl get pods
```

```plaintext
NAME      READY   STATUS    RESTARTS   AGE
greedy    1/1     Running   0          77s
model-a   1/1     Running   0          2m3s
model-b   1/1     Running   0          2m3s
model-c   1/1     Running   0          46s
model-d   0/1     Pending   0          15s
```

```bash
kubectl get events --field-selector involvedObject.name=model-d
```

```plaintext
LAST SEEN   TYPE      REASON             OBJECT        MESSAGE
11s         Warning   FilteringFailed    pod/model-d   1 nodes CardInsufficientMemory(vm-0-4-ubuntu)
11s         Warning   FilteringFailed    pod/model-d   no available node, 1 nodes do not meet
15s         Warning   FailedScheduling   pod/model-d   0/1 nodes are available: 1 1/1 CardInsufficientMemory. no new claims to deallocate, preemption: 0/1 nodes are available: 1 No preemption victims found for incoming pod.
10s         Warning   FailedScheduling   pod/model-d   0/1 nodes are available: 1 1/1 CardInsufficientMemory. no new claims to deallocate, preemption: 0/1 nodes are available: 1 No preemption victims found for incoming pod.
```

The HAMi scheduler rejected the node with `CardInsufficientMemory`. Four Pods have been assigned 4 × 4096 = 16384 MiB, the whole card. The card still has free memory, but the scheduler accounts for what each Pod was assigned, and all 16384 MiB is assigned. In Chapter 3 the scheduler placed `model-c` onto a full card. Here it keeps `model-d` off a card whose memory is fully assigned.

Remove the three Pods before the next step:

```bash
kubectl delete pod greedy model-c model-d
```

```plaintext
pod "greedy" deleted from default namespace
pod "model-c" deleted from default namespace
pod "model-d" deleted from default namespace
```

## Step 6: Limit Compute with gpucores

`nvidia.com/gpucores` sets a Pod's share of the GPU's compute, as a percentage. Take the benchmark from Chapter 3, give it a 1024 MiB memory limit and a 30% compute limit, and save it as `bench.yaml`:

```yaml title="bench.yaml"
apiVersion: v1
kind: Pod
metadata:
  name: bench
spec:
  restartPolicy: Never
  containers:
    - name: bench
      image: pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime
      command:
        - python
        - -c
        - |
          import time, torch
          a = torch.randn(4096, 4096, device="cuda", dtype=torch.float16)
          b = torch.randn(4096, 4096, device="cuda", dtype=torch.float16)
          while True:
              start, n = time.time(), 0
              while time.time() - start < 10:
                  for _ in range(10):
                      torch.matmul(a, b)
                  torch.cuda.synchronize()
                  n += 10
              tflops = n * 2 * 4096**3 / (time.time() - start) / 1e12
              print(f"{time.strftime('%H:%M:%S')} {tflops:.1f} TFLOPS", flush=True)
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 1024
          nvidia.com/gpucores: 30
```

```bash
kubectl apply -f bench.yaml
```

```plaintext
pod/bench created
```

After about a minute:

```bash
kubectl logs bench
```

```plaintext
17:15:15 24.2 TFLOPS
17:15:25 24.0 TFLOPS
17:15:35 23.9 TFLOPS
17:15:45 23.7 TFLOPS
17:15:55 23.4 TFLOPS
17:16:05 23.1 TFLOPS
```

```bash
kubectl exec bench -- env | grep CUDA_DEVICE_SM_LIMIT
```

```plaintext
CUDA_DEVICE_SM_LIMIT=30
```

The limit reached the container as `CUDA_DEVICE_SM_LIMIT=30`, yet the benchmark runs at the same speed as in Chapter 3. Under the default policy, `vgpu-monitor` decides when HAMi-core throttles. By design, it turns throttling on only while other Pods on the same GPU that also set `gpucores` are busy. Here `bench` is the only one, so it may use the whole GPU.

Delete it:

```bash
kubectl delete pod bench
```

```plaintext
pod "bench" deleted from default namespace
```

Then try the `force` policy, which throttles at all times. The only change is the `GPU_CORE_UTILIZATION_POLICY` environment variable. Save it as `bench-force.yaml`:

```yaml title="bench-force.yaml"
apiVersion: v1
kind: Pod
metadata:
  name: bench-force
spec:
  restartPolicy: Never
  containers:
    - name: bench
      env:
        - name: GPU_CORE_UTILIZATION_POLICY
          value: force
      image: pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime
      command:
        - python
        - -c
        - |
          import time, torch
          a = torch.randn(4096, 4096, device="cuda", dtype=torch.float16)
          b = torch.randn(4096, 4096, device="cuda", dtype=torch.float16)
          while True:
              start, n = time.time(), 0
              while time.time() - start < 10:
                  for _ in range(10):
                      torch.matmul(a, b)
                  torch.cuda.synchronize()
                  n += 10
              tflops = n * 2 * 4096**3 / (time.time() - start) / 1e12
              print(f"{time.strftime('%H:%M:%S')} {tflops:.1f} TFLOPS", flush=True)
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 1024
          nvidia.com/gpucores: 30
```

```bash
kubectl apply -f bench-force.yaml
```

```plaintext
pod/bench-force created
```

```bash
kubectl logs bench-force
```

```plaintext
17:16:53 18.4 TFLOPS
17:17:03 16.4 TFLOPS
17:17:13 14.8 TFLOPS
17:17:23 16.3 TFLOPS
17:17:33 16.3 TFLOPS
17:17:43 16.5 TFLOPS
```

```bash
kubectl delete pod bench-force
```

```plaintext
pod "bench-force" deleted from default namespace
```

Throughput dropped from about 24 to about 16 TFLOPS. The throttling works, but 16 TFLOPS is about two thirds of the uncapped speed, well above 30%. See [Where the Limits Stop](#where-the-limits-stop) for why.

## Where the Limits Stop

HAMi's limits are enforced in software, inside the container. They behave differently from the hardware partitions of MIG:

- **Memory.** HAMi-core checks each allocation against `CUDA_DEVICE_MEMORY_LIMIT_0` and fails the ones that would go over. The limit applies to everything the container allocates through CUDA, including the CUDA context, which is why `greedy` stopped at 3 GiB. The GPU itself is not partitioned: the host still sees one 16384 MiB card.
- **Compute.** HAMi-core gives each container a budget for launching kernels. A background thread samples the container's GPU utilization and adds more budget when utilization is under `CUDA_DEVICE_SM_LIMIT` and less when utilization is over, down to none. When the budget runs out, the next kernel launch waits. The limit is reached on average over time. How close the result comes to the percentage depends on the workload: in Step 6, a 30% limit gave about two thirds of the uncapped throughput.
- **Policy.** Under the default policy, `vgpu-monitor` is designed to turn throttling on only while other Pods on the same GPU that set `gpucores` are busy, so an idle GPU is not wasted. This chapter verified only the single-Pod case, where no throttling happens. `force` throttles at all times. The policy is set per container with the `GPU_CORE_UTILIZATION_POLICY` environment variable.
- **Scheduling.** The scheduler counts assigned `gpumem` and `gpucores`. Measured usage plays no part. A Pod that asks for more than it uses still holds that share of the card, as `model-d` showed.

Compared with Chapter 3, memory is now isolated per Pod, the scheduler accounts for memory, and compute can be throttled. Memory isolation is strict, and the compute limit is approximate.

## Verify

| Claim | Evidence |
| --- | --- |
| The webhook sends GPU Pods to the HAMi scheduler | Step 4: `schedulerName` is `hami-scheduler` |
| The scheduler picks a GPU and assigns memory | Step 4: `hami.io/vgpu-devices-allocated` holds the UUID and 4096 MiB |
| The device plugin passes the limits and mounts HAMi-core | Step 4: `CUDA_DEVICE_MEMORY_LIMIT_0=4096m`, `/etc/ld.so.preload` lists `libvgpu.so` |
| A Pod sees only its own memory | Step 4: `model-a` sees 2150 MiB of 4096 MiB |
| A Pod cannot use more than its memory limit | Step 5: `greedy` stops at 3 GiB with a HAMi-core OOM |
| The scheduler accounts for GPU memory | Step 5: `model-c` runs, `model-d` is Pending with `CardInsufficientMemory` |
| Compute is throttled under the `force` policy | Step 6: `bench` at about 24 TFLOPS, `bench-force` at about 16 TFLOPS |

## Common Pitfalls

**`hami-device-plugin` has no Pod.** The GPU node is missing the `gpu=on` label from Step 2.

**HAMi's device plugin and the NVIDIA device plugin both run on the node.** Both register `nvidia.com/gpu`. Remove the NVIDIA device plugin as in Step 1.

**A Pod is `Pending` with `CardInsufficientMemory` while `nvidia-smi` shows free memory.** The scheduler counts assigned memory. Check the `gpumem` of the Pods already on the card.

**`gpucores` seems to have no effect.** Under the default policy, a Pod is throttled only while other Pods on the same GPU that set `gpucores` are busy. Set `GPU_CORE_UTILIZATION_POLICY=force` to throttle it at all times.

## Checkpoint

<details>
<summary>1. Which HAMi component changes the Pod's `schedulerName`, and why is that needed?</summary>

The mutating webhook. It sends the Pod to the HAMi scheduler, which is the scheduler that knows each GPU's memory and compute.

</details>

<details>
<summary>2. `model-a` sees a 4096 MiB GPU. Which component makes that happen, and how?</summary>

HAMi-core. The device plugin sets `CUDA_DEVICE_MEMORY_LIMIT_0` and mounts `libvgpu.so` through `/etc/ld.so.preload`. HAMi-core then answers NVML memory queries with the limit and fails allocations that would exceed it.

</details>

<details>
<summary>3. The host had more than 6 GiB of free GPU memory, but `model-d` stayed `Pending`. Why?</summary>

The HAMi scheduler accounts for assigned memory. Four Pods had been assigned 4096 MiB each, which is the whole 16384 MiB card.

</details>

<details>
<summary>4. Why did `bench` run at full speed with `gpucores: 30` under the default policy?</summary>

Under the default policy, `vgpu-monitor` turns throttling on only while other Pods on the same GPU that set `gpucores` are busy. `bench` was the only one, so it could use the whole GPU.

</details>

## Hand-off

Delete the two models:

```bash
kubectl delete pod model-a model-b
```

```plaintext
pod "model-a" deleted from default namespace
pod "model-b" deleted from default namespace
```

Chapter 5 continues on this node. It expects:

- HAMi v2.10.0 installed as the Helm release `hami` in `kube-system`
- The GPU node labeled `gpu=on`, with no NVIDIA device plugin
- No GPU Pods running

## Further Reading

- [GPU Virtualization Principles](/docs/core-concepts/gpu-virtualization): the full HAMi workflow and how HAMi-core intercepts CUDA and NVML calls
- [HAMi Cluster Architecture](/docs/core-concepts/hami-architecture): every component in a HAMi cluster
- [Global Config](/docs/userguide/configure): Pod annotations and container environment variables, including `GPU_CORE_UTILIZATION_POLICY`
- [Lab 3: GPU Partitioning with HAMi](/tutorials/labs/gpu-partitioning): the same memory and compute limits on a cluster built with the GPU Operator
- [Lab 7: GPU Isolation on k3s Without the GPU Operator](/tutorials/labs/hami-isolation-k3s): memory isolation on a larger card
- [HAMi-core](https://github.com/Project-HAMi/HAMi-core): the source of `libvgpu.so`
