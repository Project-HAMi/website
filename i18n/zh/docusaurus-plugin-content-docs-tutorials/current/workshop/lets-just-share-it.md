---
title: "第 3 章：那就共享吧"
description: "开启 time-slicing 让多个 Pod 共享一张 GPU，再观察显存和算力如何在它们之间互相影响，并比较 time-slicing、MPS 和 MIG。"
sidebar_label: "3. 那就共享吧"
lab:
  level: Beginner
  duration: about 30 minutes
  environment: 第 2 章中挂载一张 NVIDIA T4 的节点
  authors:
    - togettoyou
  verified: "2026-10-07"
tags:
  - nvidia
  - gpu-sharing
toc_max_heading_level: 2
---

## 场景

第 2 章里，一个只用 2 GiB 显存的模型占了整张 T4，第二个模型只能等待。团队不想为了一个只用八分之一显存的模型再买一张卡。NVIDIA Device Plugin 自带一种叫 time-slicing 的共享模式，改一项配置就能开启，团队决定试一试。

本章在第 2 章的节点上继续，实验环境与第 2 章相同。

## 你将理解

- time-slicing 如何让多个 Pod 调度到同一张 GPU 上
- 为什么通过 time-slicing 共享 GPU 的 Pod 之间仍会互相占用显存和算力
- time-slicing、MPS 和 MIG 分别共享了什么、隔离了什么
- 为什么 Kubernetes 调度成功的 Pod 仍然可能在 GPU 上运行失败

## 步骤 1：开启 time-slicing

time-slicing 是 NVIDIA Device Plugin 的一项配置，它让插件把每张 GPU 重复上报多次。将下面的 Helm values 保存为 `time-slicing-values.yaml`：

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

`replicas: 4` 让插件把这张 T4 上报为 4 个设备。把这份 values 应用到第 2 章安装的 Device Plugin：

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

Device Plugin 的 Pod 会重启，并多出一个负责加载配置的容器：

```bash
kubectl get pods -n nvidia-device-plugin
```

```plaintext
NAME                              READY   STATUS    RESTARTS   AGE
nvdp-nvidia-device-plugin-qdp7r   2/2     Running   0          40s
```

确认插件读取到了共享配置：

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

再看节点容量：

```bash
kubectl get node <gpu-node-name> -o jsonpath='{.status.capacity}' ; echo
```

```plaintext
{"cpu":"8","ephemeral-storage":"206296376Ki","hugepages-1Gi":"0","hugepages-2Mi":"0","memory":"32472900Ki","nvidia.com/gpu":"4","pods":"110"}
```

节点现在上报 `"nvidia.com/gpu":"4"`，而机器里仍然只有一张 T4。

## 步骤 2：同时运行两个模型

用第 2 章的 `model-a.yaml` 和 `model-b.yaml` 重新启动这两个模型：

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

两个 Pod 都是 `Running`。查看它们各自拿到的是哪张 GPU：

```bash
kubectl exec model-a -- env | grep NVIDIA_VISIBLE_DEVICES
kubectl exec model-b -- env | grep NVIDIA_VISIBLE_DEVICES
```

```plaintext
NVIDIA_VISIBLE_DEVICES=GPU-caf9bd30-b03c-04d8-9d4f-8a02f984cc23
NVIDIA_VISIBLE_DEVICES=GPU-caf9bd30-b03c-04d8-9d4f-8a02f984cc23
```

两次都是同一个 UUID。这 4 个 `nvidia.com/gpu` 设备是 4 个条目，都指向同一张 T4。在宿主机上，两个进程都运行在这张卡上：

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

第 2 章的调度问题解决了。接下来两步检查这两个 Pod 还共享了什么。

## 步骤 3：观察显存在 Pod 之间互相影响

从 `model-b` 内部看 GPU：

```bash
kubectl exec model-b -- nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv
```

```plaintext
name, memory.used [MiB], memory.total [MiB]
Tesla T4, 4303 MiB, 16384 MiB
```

`model-b` 看到的是整张卡的 16384 MiB，已用的 4303 MiB 里包括了 `model-a` 的显存。没有任何配置告诉 `model-b` 哪部分显存属于它，也没有任何限制阻止它使用更多。

为了看清这意味着什么，启动一个 Pod，它以 1 GiB 为单位不断申请显存，直到卡被占满，然后一直占着。将它保存为 `greedy.yaml`：

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

`greedy` 和其他 Pod 一样只向 Kubernetes 申请了一份，却占用了 11 GiB，卡几乎满了。这时第三个同样需要 2 GiB 的模型到来。将它保存为 `model-c.yaml`：

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

Kubernetes 顺利调度了 `model-c`，因为节点上还有一份空闲的 `nvidia.com/gpu`。但 GPU 上已经没有显存了，模型报 `CUDA out of memory` 失败。调度器按份数计数，而 GPU 本身并没有“份”的概念。

进入下一步之前，删除这两个 Pod：

```bash
kubectl delete pod greedy model-c
```

```plaintext
pod "greedy" deleted from default namespace
pod "model-c" deleted from default namespace
```

## 步骤 4：观察算力在 Pod 之间互相影响

接下来检查算力。下面的 Pod 测量它在 GPU 上做矩阵乘法的速度，每 10 秒输出一次结果。将它保存为 `bench.yaml`：

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

让它运行一分钟左右。这时一位同事在同一张卡上启动了一个训练任务，这个任务不停地做矩阵乘法。将它保存为 `training.yaml`：

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

再等一分钟，查看测速日志：

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

测速程序单独运行时约为 24 TFLOPS。`training` 启动后，降到了约 11 TFLOPS。`bench` Pod 本身没有任何变化，只是 GPU 现在要在两个繁忙的进程之间切换，每个进程大约分到一半时间。

## 背后的原理：time-slicing、MPS 和 MIG 共享与隔离了什么

time-slicing 只改变了 Device Plugin 上报的内容。插件把每张 GPU 重复列出 `replicas` 次，调度器于是看到 4 个设备，可以放下 4 个 Pod。这 4 个 Pod 拿到的是同一个 GPU UUID。在 GPU 上，它们的进程轮流运行，GPU 按时间片在它们之间切换。每个 Pod 既没有显存上限，也没有被保证的算力份额，步骤 3 和步骤 4 已经展示了这两点。

NVIDIA 还提供另外两种共享 GPU 的方式：

- **MPS（Multi-Process Service）。** 一个服务进程让多个进程的 kernel 同时在 GPU 上运行。MPS 可以限制每个客户端的显存以及可用的 GPU 线程比例，NVIDIA Device Plugin 也有 MPS 共享模式，会把这些限制平均分配。所有客户端都经过同一个 MPS 服务，一个客户端出现故障可能影响其他客户端。
- **MIG（Multi-Instance GPU）。** 在硬件层面把 GPU 切分成多个实例，每个实例有独立的显存和计算单元。隔离性强，但只有部分数据中心 GPU 支持 MIG，而且每个实例只能使用固定的几种规格。T4 不在支持之列：

```bash
nvidia-smi --query-gpu=name,mig.mode.current --format=csv
```

```plaintext
name, mig.mode.current
Tesla T4, [N/A]
```

|  | time-slicing | MPS | MIG |
| --- | --- | --- | --- |
| 多个 Pod 共用一张 GPU | 支持 | 支持 | 支持，每个实例一个 |
| 单个 Pod 的显存上限 | 无 | 有 | 有，由硬件保证 |
| 单个 Pod 的算力上限 | 无 | 有 | 有，由硬件保证 |
| 每份的大小 | 未定义 | Device Plugin 中平均分配 | 固定的 MIG 规格 |
| GPU 支持 | 大多数 NVIDIA GPU | Volta 及更新架构（支持显存和算力限制） | 支持 MIG 的数据中心 GPU，如 A100、H100 |

time-slicing 让调度器能在一张 GPU 上放下更多 Pod，但不限制每个 Pod 使用多少显存和算力。第 4 章会展示 HAMi 如何在同一张 T4 上加上这些限制。

## 验证

| 结论 | 证据 |
| --- | --- |
| time-slicing 让多个 Pod 共用一张 GPU | 步骤 1 和步骤 2：容量 `nvidia.com/gpu: 4`，两个模型在同一个 UUID 上 `Running` |
| 每个 Pod 都能看到并使用整张卡的显存 | 步骤 3：`model-b` 看到 16384 MiB，`greedy` 占用了 11 GiB |
| Pod 调度成功后仍可能在 GPU 上失败 | 步骤 3：`model-c` 被调度到节点上，报 `CUDA out of memory` 失败 |
| 算力靠争抢分配 | 步骤 4：`training` 启动后，`bench` 从约 24 TFLOPS 降到约 11 TFLOPS |
| T4 不支持 MIG | 背后的原理：`mig.mode.current` 为 `[N/A]` |

## 常见问题

**升级后节点容量仍然是 `nvidia.com/gpu: 1`。** Device Plugin 没有加载新配置。检查步骤 1 中插件日志的 `"sharing"` 部分，确认 `replicas` 为 4。

**Kubernetes 显示还有空闲 GPU，模型却报 `CUDA out of memory`。** 开启 time-slicing 后，有空闲的份数不代表有空闲的显存。在宿主机上用 `nvidia-smi` 查看实际用量。

## 自测

<details>
<summary>1. 节点上报 `nvidia.com/gpu: 4`，但只有一张 T4。这 4 个设备代表什么？</summary>

同一张 GPU 的 4 个副本，由 Device Plugin 的 time-slicing 配置生成。4 个副本都对应同一个 GPU UUID。

</details>

<details>
<summary>2. `model-c` 被调度成功却运行失败。调度器为什么会选中这个节点？</summary>

调度器只检查是否还有空闲的 `nvidia.com/gpu` 副本，当时还有一份。显存不在检查范围内，而显存已经被 `greedy` 占满了。

</details>

<details>
<summary>3. 训练任务启动后，测速程序为什么变慢了？</summary>

time-slicing 在进程之间分配 GPU 时间，但不为任何进程保证份额。两个进程都很繁忙时，各自大约分到一半。

</details>

<details>
<summary>4. 在这张 T4 上，time-slicing、MPS 和 MIG 中哪一种能限制 Pod 的显存？</summary>

MPS。time-slicing 没有显存上限，T4 也不支持 MIG。

</details>

## 交接

删除剩下的 Pod：

```bash
kubectl delete pod model-a model-b bench training
```

```plaintext
pod "model-a" deleted from default namespace
pod "model-b" deleted from default namespace
pod "bench" deleted from default namespace
pod "training" deleted from default namespace
```

第 4 章会在这个节点上继续。它需要：

- NVIDIA Device Plugin 以 Helm release `nvdp` 安装，并开启了 time-slicing。第 4 章会在安装 HAMi 之前删除它。
- 没有运行中的 GPU Pod

## 延伸阅读

- [Time-slicing GPUs in Kubernetes](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html)：NVIDIA 对 time-slicing 及其限制的说明
- [NVIDIA device plugin for Kubernetes](https://github.com/NVIDIA/k8s-device-plugin)：time-slicing 和 MPS 共享的配置选项
- [Multi-Process Service](https://docs.nvidia.com/deploy/mps/)：MPS 的工作方式及支持的限制
- [MIG User Guide](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/)：支持 MIG 的 GPU 及其规格
- [GPU 虚拟化原理](/zh/docs/core-concepts/gpu-virtualization)：HAMi 如何实现 GPU 共享
- [实验 16：RTX PRO 6000 动态 MIG 生命周期](/zh/tutorials/labs/dynamic-mig-rtx-pro)：在支持 MIG 的 GPU 上使用 MIG
