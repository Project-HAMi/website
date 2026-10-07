---
title: "Chapter 3: Let's Just Share It"
description: "Turn on time-slicing so several Pods share one GPU, then watch the Pods compete for memory and compute, and compare time-slicing, MPS, and MIG."
sidebar_label: "3. Let's Just Share It"
lab:
  level: Beginner
  duration: about 30 minutes
  environment: the Chapter 2 node with one NVIDIA T4
  authors:
    - togettoyou
  verified: "2026-10-07"
tags:
  - nvidia
  - gpu-sharing
toc_max_heading_level: 2
---

## Scenario

In Chapter 2, one 2 GiB model took the whole T4 and the second model had to wait. The team does not want to buy a second card for a model that uses an eighth of the first one. NVIDIA's device plugin has a built-in sharing mode called time-slicing, and turning it on takes one configuration change. The team tries it.

This chapter continues on the node from Chapter 2 and uses the same environment.

## What You'll Understand

- How time-slicing lets several Pods be scheduled onto one GPU
- Why Pods sharing a GPU through time-slicing can still take memory and compute from each other
- What time-slicing, MPS, and MIG each share and each isolate
- Why a Pod that Kubernetes schedules successfully can still fail on the GPU

## Step 1: Turn On Time-Slicing

Time-slicing is a setting of the NVIDIA device plugin. It tells the plugin to report each GPU several times. Save the following Helm values as `time-slicing-values.yaml`:

```yaml title="time-slicing-values.yaml"
config:
  map:
    default: |-
      version: v1
      sharing:
        timeSlicing:
          resources:
            - name: nvidia.com/gpu
              replicas: 4
```

`replicas: 4` makes the plugin report the T4 as four devices. Apply the values to the device plugin installed in Chapter 2:

```bash
helm upgrade nvdp nvdp/nvidia-device-plugin \
    --namespace nvidia-device-plugin \
    --version 0.20.1 \
    -f time-slicing-values.yaml
```

```plaintext
Release "nvdp" has been upgraded. Happy Helming!
NAME: nvdp
LAST DEPLOYED: Wed Oct  7 00:39:40 2026
NAMESPACE: nvidia-device-plugin
STATUS: deployed
REVISION: 2
DESCRIPTION: Upgrade complete
TEST SUITE: None
```

The device plugin Pod restarts with a second container that loads the configuration:

```bash
kubectl get pods -n nvidia-device-plugin
```

```plaintext
NAME                              READY   STATUS    RESTARTS   AGE
nvdp-nvidia-device-plugin-qdp7r   2/2     Running   0          40s
```

Check that the plugin picked up the sharing settings:

```bash
kubectl logs -n nvidia-device-plugin ds/nvdp-nvidia-device-plugin -c nvidia-device-plugin-ctr | grep -A 12 '"sharing"'
```

```plaintext
  "sharing": {
    "timeSlicing": {
      "resources": [
        {
          "name": "nvidia.com/gpu",
          "devices": "all",
          "replicas": 4
        }
      ]
    }
  },
  "imex": {}
}
```

And the node capacity:

```bash
kubectl get node <gpu-node-name> -o jsonpath='{.status.capacity}' ; echo
```

```plaintext
{"cpu":"8","ephemeral-storage":"206296376Ki","hugepages-1Gi":"0","hugepages-2Mi":"0","memory":"32472900Ki","nvidia.com/gpu":"4","pods":"110"}
```

The node now reports `"nvidia.com/gpu":"4"`. There is still one T4 in the machine.

## Step 2: Run Both Models

Start the two models from Chapter 2 again, using the same `model-a.yaml` and `model-b.yaml`:

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
model-a   1/1     Running   0          26s
model-b   1/1     Running   0          26s
```

Both are `Running`. Check which GPU each one received:

```bash
kubectl exec model-a -- env | grep NVIDIA_VISIBLE_DEVICES
kubectl exec model-b -- env | grep NVIDIA_VISIBLE_DEVICES
```

```plaintext
NVIDIA_VISIBLE_DEVICES=GPU-caf9bd30-b03c-04d8-9d4f-8a02f984cc23
NVIDIA_VISIBLE_DEVICES=GPU-caf9bd30-b03c-04d8-9d4f-8a02f984cc23
```

The same UUID twice. The four `nvidia.com/gpu` devices are four entries that all point to the same T4. On the host, both processes run on that card:

```bash
nvidia-smi
```

```plaintext
Wed Oct  7 00:41:01 2026
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 580.126.20             Driver Version: 580.126.20     CUDA Version: 13.0     |
+-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  Tesla T4                       On  |   00000000:00:08.0 Off |                  Off |
| N/A   34C    P0             27W /   70W |    4303MiB /  16384MiB |      0%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+

+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI              PID   Type   Process name                        GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|    0   N/A  N/A          108169      C   python                                 2150MiB |
|    0   N/A  N/A          108256      C   python                                 2150MiB |
+-----------------------------------------------------------------------------------------+
```

The scheduling problem from Chapter 2 is solved. The next two steps check what else the two Pods share.

## Step 3: Watch Pods Compete for Memory

Look at the GPU from inside `model-b`:

```bash
kubectl exec model-b -- nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv
```

```plaintext
name, memory.used [MiB], memory.total [MiB]
Tesla T4, 4303 MiB, 16384 MiB
```

`model-b` sees the whole 16384 MiB card, and the 4303 MiB in use includes the memory of `model-a`. No setting tells `model-b` how much of the card belongs to it, and no limit stops it from using more.

To see what that means, start a Pod that allocates GPU memory in 1 GiB chunks until the card is full and then holds it. Save it as `greedy.yaml`:

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
greedy holds 11 GiB of GPU memory
```

```bash
nvidia-smi --query-gpu=memory.used,memory.total --format=csv
```

```plaintext
memory.used [MiB], memory.total [MiB]
15669 MiB, 16384 MiB
```

`greedy` asked Kubernetes for one share, like the others, and then took 11 GiB. The card is nearly full. Now a third model of the same 2 GiB size arrives. Save it as `model-c.yaml`:

```yaml title="model-c.yaml"
apiVersion: v1
kind: Pod
metadata:
  name: model-c
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
          print("model-c loaded 2 GiB of weights on", torch.cuda.get_device_name(0), flush=True)
          time.sleep(365 * 24 * 3600)
      resources:
        limits:
          nvidia.com/gpu: 1
```

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
greedy    1/1     Running   0          52s
model-a   1/1     Running   0          92s
model-b   1/1     Running   0          92s
model-c   0/1     Error     0          25s
```

```bash
kubectl logs model-c | tail -1
```

```plaintext
torch.OutOfMemoryError: CUDA out of memory. Tried to allocate 2.00 GiB. GPU 0 has a total capacity of 15.56 GiB of which 158.62 MiB is free. Including non-PyTorch memory, this process has 102.00 MiB memory in use. Of the allocated memory 0 bytes is allocated by PyTorch, and 0 bytes is reserved by PyTorch but unallocated. If reserved but unallocated memory is large try setting PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True to avoid fragmentation.  See documentation for Memory Management  (https://pytorch.org/docs/stable/notes/cuda.html#environment-variables)
```

Kubernetes scheduled `model-c` without complaint, because the node still had a free `nvidia.com/gpu` replica. On the GPU there was no memory left, and the model failed with `CUDA out of memory`. The scheduler counts replicas, and the GPU has no notion of replicas.

Remove the two Pods before the next step:

```bash
kubectl delete pod greedy model-c
```

```plaintext
pod "greedy" deleted from default namespace
pod "model-c" deleted from default namespace
```

## Step 4: Watch Pods Compete for Compute

Next, check compute. The following Pod measures how fast it can multiply two matrices on the GPU and prints the result every 10 seconds. Save it as `bench.yaml`:

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
```

```bash
kubectl apply -f bench.yaml
```

```plaintext
pod/bench created
```

Let it run for about a minute. Then a teammate starts a training job on the same card. The job does nothing but multiply matrices as fast as it can. Save it as `training.yaml`:

```yaml title="training.yaml"
apiVersion: v1
kind: Pod
metadata:
  name: training
spec:
  restartPolicy: Never
  containers:
    - name: training
      image: pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime
      command:
        - python
        - -c
        - |
          import torch
          a = torch.randn(4096, 4096, device="cuda", dtype=torch.float16)
          b = torch.randn(4096, 4096, device="cuda", dtype=torch.float16)
          print("training started", flush=True)
          while True:
              torch.matmul(a, b)
      resources:
        limits:
          nvidia.com/gpu: 1
```

```bash
kubectl apply -f training.yaml
```

```plaintext
pod/training created
```

Wait another minute and read the benchmark log:

```bash
kubectl logs bench
```

```plaintext
16:42:53 24.5 TFLOPS
16:43:03 24.5 TFLOPS
16:43:13 24.2 TFLOPS
16:43:23 23.9 TFLOPS
16:43:33 23.9 TFLOPS
16:43:43 11.4 TFLOPS
16:43:53 10.8 TFLOPS
16:44:03 10.8 TFLOPS
16:44:13 10.7 TFLOPS
16:44:23 10.6 TFLOPS
```

The benchmark ran at about 24 TFLOPS on its own. From the moment `training` started, it dropped to about 11 TFLOPS. Nothing in the `bench` Pod changed. The GPU now switches between two busy processes, and each gets roughly half of the time.

## The Principle: What Time-Slicing, MPS, and MIG Share and Isolate

Time-slicing changes only what the device plugin reports. The plugin lists each GPU `replicas` times, so the scheduler sees four devices and places four Pods. All four get the same GPU UUID. On the GPU, their processes run in turns: the GPU switches between them in time slices. No per-Pod memory limit exists, and no per-Pod compute share is enforced. Steps 3 and 4 showed both.

NVIDIA offers two other ways to share a GPU:

- **MPS (Multi-Process Service).** A server process lets kernels from several processes run on the GPU at the same time. MPS can cap each client's GPU memory and the share of GPU threads it may use, and the NVIDIA device plugin has an MPS sharing mode that sets these caps evenly. All clients go through the same MPS server, so a fault in one client can affect the others.
- **MIG (Multi-Instance GPU).** The GPU is split in hardware into instances, each with its own memory and compute units. Isolation is strong, but only some data center GPUs support MIG, and each instance must use one of a fixed set of sizes. The T4 is not one of them:

```bash
nvidia-smi --query-gpu=name,mig.mode.current --format=csv
```

```plaintext
name, mig.mode.current
Tesla T4, [N/A]
```

|  | Time-slicing | MPS | MIG |
| --- | --- | --- | --- |
| Several Pods on one GPU | Yes | Yes | Yes, one per instance |
| Per-Pod memory limit | No | Yes | Yes, in hardware |
| Per-Pod compute limit | No | Yes | Yes, in hardware |
| Size of each share | Not defined | Equal shares in the device plugin | Fixed MIG profiles |
| GPU support | NVIDIA GPUs in general | Volta and newer (for memory and compute limits) | MIG-capable data center GPUs, such as A100 and H100 |

Time-slicing lets the scheduler place more Pods on a GPU. It does not limit how much memory or compute each Pod uses. Chapter 4 shows how HAMi adds these limits on the same T4.

## Verify

| Claim | Evidence |
| --- | --- |
| Time-slicing lets several Pods use one GPU | Step 1 and Step 2: capacity `nvidia.com/gpu: 4`, both models `Running` on the same UUID |
| Each Pod sees and can use the whole card's memory | Step 3: `model-b` sees 16384 MiB, `greedy` takes 11 GiB |
| A Pod can be scheduled and still fail on the GPU | Step 3: `model-c` is placed on the node and fails with `CUDA out of memory` |
| Compute is shared by contention | Step 4: `bench` drops from about 24 to about 11 TFLOPS when `training` starts |
| The T4 cannot use MIG | The Principle: `mig.mode.current` is `[N/A]` |

## Common Pitfalls

**The node capacity stays at `nvidia.com/gpu: 1` after the upgrade.** The device plugin did not load the new configuration. Check the `"sharing"` section in the plugin log from Step 1 and confirm that `replicas` is 4.

**A model fails with `CUDA out of memory` although Kubernetes shows free GPUs.** With time-slicing, free replicas do not mean free memory. Check the real usage with `nvidia-smi` on the host.

## Checkpoint

<details>
<summary>1. The node reports `nvidia.com/gpu: 4`, but there is one T4. What do the four devices stand for?</summary>

Four replicas of the same GPU, created by the device plugin's time-slicing setting. All four map to the same GPU UUID.

</details>

<details>
<summary>2. `model-c` was scheduled but failed. Why did the scheduler place it?</summary>

The scheduler only checks whether a replica of `nvidia.com/gpu` is free, and one was. GPU memory is not part of that check, and `greedy` had already taken it.

</details>

<details>
<summary>3. Why did the benchmark slow down when the training job started?</summary>

Time-slicing shares GPU time between processes without enforcing a share for any of them. With two busy processes, each gets roughly half.

</details>

<details>
<summary>4. Which of time-slicing, MPS, and MIG can limit a Pod's GPU memory on this T4?</summary>

MPS. Time-slicing has no memory limit, and the T4 does not support MIG.

</details>

## Hand-off

Delete the remaining Pods:

```bash
kubectl delete pod model-a model-b bench training
```

```plaintext
pod "model-a" deleted from default namespace
pod "model-b" deleted from default namespace
pod "bench" deleted from default namespace
pod "training" deleted from default namespace
```

Chapter 4 continues on this node. It expects:

- The NVIDIA device plugin installed as the Helm release `nvdp`, with time-slicing enabled. Chapter 4 removes it before installing HAMi.
- No GPU Pods running

## Further Reading

- [Time-slicing GPUs in Kubernetes](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html): NVIDIA's description of time-slicing and its limits
- [NVIDIA device plugin for Kubernetes](https://github.com/NVIDIA/k8s-device-plugin): the time-slicing and MPS sharing options
- [Multi-Process Service](https://docs.nvidia.com/deploy/mps/): how MPS works and which limits it supports
- [MIG User Guide](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/): supported GPUs and MIG profiles
- [GPU Virtualization Principles](/docs/core-concepts/gpu-virtualization): how HAMi approaches GPU sharing
- [Lab 16: Dynamic MIG Lifecycle on RTX PRO 6000](/tutorials/labs/dynamic-mig-rtx-pro): MIG on a GPU that supports it
