---
title: "第 4 章：HAMi 登场"
description: "用 HAMi 替换 NVIDIA Device Plugin，跟踪 Pod 依次经过 Webhook、调度器扩展、Device Plugin 和 HAMi-core 的过程，并在显存和算力限制下重做第 3 章的实验。"
sidebar_label: "4. HAMi 登场"
lab:
  level: Intermediate
  duration: about 45 minutes
  environment: 第 3 章中挂载一张 NVIDIA T4 的节点
  authors:
    - togettoyou
  verified: "2026-10-07"
tags:
  - hami-core
  - gpu-sharing
  - 隔离
toc_max_heading_level: 2
---

## 场景

第 3 章的 time-slicing 让多个模型共用了一张 T4，但每个 Pod 看到的都是整张卡。一个贪心的 Pod 占走了 11 GiB，下一个模型被调度到节点上后报 `CUDA out of memory` 失败。一个训练任务让测速程序的吞吐减半。团队仍然想共享这张卡，但现在每个 Pod 都需要一个上限：用多少显存，用多少算力。

本章在同一个节点上用 HAMi 替换 NVIDIA Device Plugin，并重做第 3 章的实验。

## 你将理解

- Pod 的生命周期中，Webhook、调度器扩展、Device Plugin 和 HAMi-core 分别在哪一步介入
- `nvidia.com/gpumem` 如何限制 Pod 的显存，并改变 Pod 看到的内容
- HAMi 调度器在调度时如何计算显存
- `nvidia.com/gpucores` 如何限制算力，以及为什么它是软限制

## 实验环境

本章在第 3 章环境的基础上新增：

| 组件 | 版本    |
| ---- | ------- |
| HAMi | v2.10.0 |

## 背后的原理：Pod 路径上的四个组件

第 2 章中，只有 Device Plugin 一个组件把 GPU 接入 Kubernetes，调度器也只按设备计数。HAMi 改动了这条路径上的三个环节，并在容器里加入了一个库：

![HAMi 三层架构组件通信时序](/img/docs/common/core-concepts/hami-architecture.svg)

- **Mutating Webhook。** 申请了 `nvidia.com/gpu` 的 Pod 创建时，Webhook 把它的 `schedulerName` 改为 `hami-scheduler`，交给 HAMi 调度器处理。
- **调度器扩展（Scheduler Extender）。** HAMi 调度器从节点注解中读取每张 GPU 的显存和算力。过滤节点时，它把 Pod 的 `gpumem` 和 `gpucores` 与每张卡的剩余量比较，选定一张具体的 GPU，并把结果写入 Pod 注解。
- **Device Plugin。** HAMi 的 Device Plugin 把每张 GPU 注册为多个 `nvidia.com/gpu` 设备，默认 10 个，并把 GPU 的详细信息写入节点注解。在 Allocate 时，它读取调度器的结果，设置 `NVIDIA_VISIBLE_DEVICES`，通过环境变量传入 Pod 的限制，并把 HAMi-core 挂载进容器。
- **HAMi-core（`libvgpu.so`）。** 容器里的每个进程都会通过 `/etc/ld.so.preload` 最先加载这个库。它拦截 CUDA 和 NVML 调用：超出上限的显存分配会失败，显存查询返回的是上限值，kernel 启动会按算力份额限速。

完整的工作流程见 [GPU 虚拟化原理](/zh/docs/core-concepts/gpu-virtualization#工作流程详解)。下面的步骤 3 到步骤 5 会在节点上逐一观察这些组件。

## 步骤 1：删除 NVIDIA Device Plugin

一个节点上只能有一个 Device Plugin 注册 `nvidia.com/gpu`。卸载第 2 章和第 3 章使用的 NVIDIA Device Plugin：

```bash
helm uninstall nvdp --namespace nvidia-device-plugin
```

```plaintext
release "nvdp" uninstalled
```

查看节点的可分配资源：

```bash
kubectl get node <gpu-node-name> -o jsonpath='{.status.allocatable}' ; echo
```

```plaintext
{"cpu":"8","ephemeral-storage":"190122739807","hugepages-1Gi":"0","hugepages-2Mi":"0","memory":"32370500Ki","nvidia.com/gpu":"0","pods":"110"}
```

`nvidia.com/gpu` 已经变为 0。在 HAMi 注册之前，节点上没有组件能分配 GPU。删除空的命名空间：

```bash
kubectl delete namespace nvidia-device-plugin
```

```plaintext
namespace "nvidia-device-plugin" deleted
```

## 步骤 2：安装 HAMi

HAMi 的 Device Plugin 运行在带有 `gpu=on` 标签的节点上：

```bash
kubectl label node <gpu-node-name> gpu=on
```

```plaintext
node/vm-0-4-ubuntu labeled
```

添加 HAMi 的 chart 仓库：

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

安装 HAMi。chart 的默认值与这个节点相符：驱动和 Toolkit 在宿主机上，`nvidia` 是 containerd 的默认运行时。

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

## 步骤 3：查看 HAMi 注册了什么

每个 HAMi Pod 都有两个容器：

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/instance=hami \
    -o custom-columns=POD:.metadata.name,CONTAINERS:.spec.containers[*].name
```

```plaintext
POD                               CONTAINERS
hami-device-plugin-rb2vz          device-plugin,vgpu-monitor
hami-scheduler-6c74b6fb49-c7892   kube-scheduler,vgpu-scheduler-extender
```

`hami-scheduler` 同时运行标准的 `kube-scheduler` 和 HAMi 的 `vgpu-scheduler-extender`。`hami-device-plugin` 运行 Device Plugin 和 `vgpu-monitor`，后者负责监控节点上的 GPU 使用情况。Webhook 已经注册到 API Server：

```bash
kubectl get mutatingwebhookconfigurations
```

```plaintext
NAME           WEBHOOKS   AGE
hami-webhook   1          73s
```

再看节点容量：

```bash
kubectl get node <gpu-node-name> -o jsonpath='{.status.capacity}' ; echo
```

```plaintext
{"cpu":"8","ephemeral-storage":"206296376Ki","hugepages-1Gi":"0","hugepages-2Mi":"0","memory":"32472900Ki","nvidia.com/gpu":"10","pods":"110"}
```

HAMi 把这张 T4 上报为 10 个 `nvidia.com/gpu` 设备。和 time-slicing 一样，这个数量只决定最多能有多少个 Pod 共用这张卡。显存和算力信息来自节点注解：

```bash
kubectl get node <gpu-node-name> -o jsonpath='{.metadata.annotations.hami\.io/node-nvidia-register}' ; echo
```

```plaintext
[{"id":"GPU-caf9bd30-b03c-04d8-9d4f-8a02f984cc23","count":10,"devmem":16384,"devcore":100,"type":"NVIDIA-Tesla T4","mode":"hami-core","health":true}]
```

注解里有 GPU UUID、10 个槽位（`count`）、16384 MiB 显存（`devmem`）、100% 算力（`devcore`）和型号。HAMi 调度器调度 Pod 时会读取这些信息。

## 步骤 4：运行两个带显存限制的模型

在第 2 章的 `model-a.yaml` 中加上 `nvidia.com/gpumem: 4096`，让 Pod 申请 4096 MiB 显存：

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

以它为模板生成 `model-b.yaml`、`model-c.yaml` 和 `model-d.yaml`，只修改名字：

```bash
for name in model-b model-c model-d; do
    sed "s/model-a/$name/g" model-a.yaml > $name.yaml
done
```

先启动前两个：

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

跟着 `model-a` 依次查看四个组件。Webhook 修改了它的调度器：

```bash
kubectl get pod model-a -o jsonpath='{.spec.schedulerName}' ; echo
```

```plaintext
hami-scheduler
```

调度器扩展记录了它选中的 GPU，以及分配的显存和算力：

```bash
kubectl get pod model-a -o jsonpath='{.metadata.annotations.hami\.io/vgpu-devices-allocated}' ; echo
```

```plaintext
GPU-caf9bd30-b03c-04d8-9d4f-8a02f984cc23,NVIDIA,4096,0:;
```

各字段依次是 GPU UUID、厂商、4096 MiB 显存和算力 0，因为 `model-a` 没有设置 `gpucores`。Device Plugin 把这个结果转换成了环境变量：

```bash
kubectl exec model-a -- env | grep -E "NVIDIA_VISIBLE_DEVICES|CUDA_DEVICE_MEMORY_LIMIT|CUDA_DEVICE_SM_LIMIT"
```

```plaintext
NVIDIA_VISIBLE_DEVICES=GPU-caf9bd30-b03c-04d8-9d4f-8a02f984cc23
CUDA_DEVICE_MEMORY_LIMIT_0=4096m
CUDA_DEVICE_SM_LIMIT=0
```

并挂载了 HAMi-core，让容器里的每个进程都会加载它：

```bash
kubectl exec model-a -- cat /etc/ld.so.preload
```

```plaintext
/usr/local/vgpu/libvgpu.so
```

现在看看 `model-a` 看到的 GPU：

```bash
kubectl exec model-a -- nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv
```

```plaintext
name, memory.used [MiB], memory.total [MiB]
Tesla T4, 2150 MiB, 4096 MiB
[HAMI-core Msg(62:132856292957248:multiprocess_memory_limit.c:862)]: Cleanup on exit for PID 62
[HAMI-core Msg(62:132856292957248:multiprocess_memory_limit.c:898)]: Exit cleanup complete for PID 62
```

第 3 章中，`model-b` 看到的是 16384 MiB，以及两个模型的显存用量。这里 `model-a` 看到的是一张 4096 MiB 的卡，已用的 2150 MiB 只有它自己的部分。HAMi-core 用 Pod 的上限回答了 NVML 的显存查询，输出中的退出日志也说明 `nvidia-smi` 加载了它。宿主机看到的仍然是真实的卡：

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

## 步骤 5：重做显存实验

再次运行第 3 章的 greedy Pod，这次加上 4096 MiB 的上限。更新 `greedy.yaml`：

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

HAMi-core 拒绝了会超过 4294967296 字节（4096 MiB）的那次分配，CUDA 调用向 PyTorch 返回显存不足。`greedy` 停在了 3 GiB。第 4 个 1 GiB 放不下，是因为 CUDA 上下文也计入了上限。

接着启动第 3 章中失败的 `model-c`：

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

`model-c` 正常运行。四个 Pod 共用这张 T4，每个都在自己的 4096 MiB 以内。查看宿主机上的实际显存用量：

```bash
nvidia-smi --query-gpu=memory.used,memory.total --format=csv
```

```plaintext
memory.used [MiB], memory.total [MiB]
9627 MiB, 16384 MiB
```

四个 Pod 一共用了 16384 MiB 中的 9627 MiB。再试第五个：

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

HAMi 调度器以 `CardInsufficientMemory` 拒绝了这个节点。四个 Pod 已经分配了 4 × 4096 = 16384 MiB，也就是整张卡。卡上实际还有空闲显存，但调度器按每个 Pod 分配到的量计算，16384 MiB 已经全部分配出去。第 3 章中，调度器把 `model-c` 放到了一张已满的卡上。这里，它没有把 `model-d` 放到显存已经分配完的卡上。

进入下一步之前，删除这三个 Pod：

```bash
kubectl delete pod greedy model-c model-d
```

```plaintext
pod "greedy" deleted from default namespace
pod "model-c" deleted from default namespace
pod "model-d" deleted from default namespace
```

## 步骤 6：用 gpucores 限制算力

`nvidia.com/gpucores` 以百分比设置 Pod 的算力份额。在第 3 章的测速程序上加 1024 MiB 显存上限和 30% 算力上限，保存为 `bench.yaml`：

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

大约一分钟后：

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

上限已经以 `CUDA_DEVICE_SM_LIMIT=30` 传入容器，但测速结果和第 3 章一样快。默认策略下，由 `vgpu-monitor` 决定 HAMi-core 是否限速。按设计，只有同一张 GPU 上还有其他设置了 `gpucores` 的 Pod 同时繁忙时，它才打开限速。这里只有 `bench` 一个，所以它可以用满整张卡。

删除它：

```bash
kubectl delete pod bench
```

```plaintext
pod "bench" deleted from default namespace
```

再试试 `force` 策略，它会始终限速。唯一的改动是 `GPU_CORE_UTILIZATION_POLICY` 环境变量。保存为 `bench-force.yaml`：

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

吞吐从约 24 TFLOPS 降到了约 16 TFLOPS。限速生效了，但 16 TFLOPS 约为不限速时的三分之二，明显高于 30%，原因见[限制的边界](#限制的边界)。

## 限制的边界

HAMi 的限制在容器内由软件实现，和 MIG 的硬件切分表现不同：

- **显存。** HAMi-core 用 `CUDA_DEVICE_MEMORY_LIMIT_0` 检查每次分配，拒绝会超出上限的分配。上限覆盖容器通过 CUDA 分配的所有显存，包括 CUDA 上下文，所以 `greedy` 停在了 3 GiB。GPU 本身并没有被切分，宿主机看到的仍然是一张 16384 MiB 的卡。
- **算力。** HAMi-core 为每个容器维护一个启动 kernel 的额度。后台线程定期采样容器的 GPU 利用率，利用率低于 `CUDA_DEVICE_SM_LIMIT` 时多补充额度，高于时减少补充，最少减到不补充。额度用完后，下一次 kernel 启动会等待。上限是按时间平均达到的，结果离设定的百分比有多近取决于负载：步骤 6 中，30% 的上限得到的是约三分之二的吞吐。
- **策略。** 默认策略下，`vgpu-monitor` 按设计只在同一张 GPU 上还有其他设置了 `gpucores` 的 Pod 同时繁忙时才打开限速，空闲的 GPU 不会被浪费。本章只验证了单个 Pod 的情况，此时不会限速。`force` 始终限速。策略通过容器的 `GPU_CORE_UTILIZATION_POLICY` 环境变量设置。
- **调度。** 调度器按分配的 `gpumem` 和 `gpucores` 计算，不看实际用量。申请多、用得少的 Pod 仍然占着申请的那一份，`model-d` 就说明了这一点。

和第 3 章相比，显存现在按 Pod 隔离，调度器会计算显存，算力也可以限速。显存隔离是严格的，算力限制是近似的。

## 验证

| 结论 | 证据 |
| --- | --- |
| Webhook 把 GPU Pod 交给 HAMi 调度器 | 步骤 4：`schedulerName` 为 `hami-scheduler` |
| 调度器选定 GPU 并分配显存 | 步骤 4：`hami.io/vgpu-devices-allocated` 包含 UUID 和 4096 MiB |
| Device Plugin 传入限制并挂载 HAMi-core | 步骤 4：`CUDA_DEVICE_MEMORY_LIMIT_0=4096m`，`/etc/ld.so.preload` 中是 `libvgpu.so` |
| Pod 只看到自己的显存 | 步骤 4：`model-a` 看到 4096 MiB 中的 2150 MiB |
| Pod 不能超出显存上限 | 步骤 5：`greedy` 停在 3 GiB，HAMi-core 报 OOM |
| 调度器会计算 GPU 显存 | 步骤 5：`model-c` 正常运行，`model-d` 因 `CardInsufficientMemory` 处于 Pending |
| `force` 策略下算力被限速 | 步骤 6：`bench` 约 24 TFLOPS，`bench-force` 约 16 TFLOPS |

## 常见问题

**`hami-device-plugin` 没有 Pod。** GPU 节点缺少步骤 2 中的 `gpu=on` 标签。

**HAMi 的 Device Plugin 和 NVIDIA Device Plugin 同时运行在节点上。** 两者都会注册 `nvidia.com/gpu`。按步骤 1 删除 NVIDIA Device Plugin。

**Pod 因 `CardInsufficientMemory` 处于 `Pending`，`nvidia-smi` 却显示还有空闲显存。** 调度器按分配量计算显存。检查卡上已有 Pod 的 `gpumem`。

**`gpucores` 看起来没有效果。** 默认策略下，只有同一张 GPU 上还有其他设置了 `gpucores` 的 Pod 同时繁忙时才会限速。设置 `GPU_CORE_UTILIZATION_POLICY=force` 可以始终限速。

## 自测

<details>
<summary>1. 哪个 HAMi 组件修改了 Pod 的 `schedulerName`？为什么需要这样做？</summary>

Mutating Webhook。它把 Pod 交给 HAMi 调度器，只有这个调度器知道每张 GPU 的显存和算力。

</details>

<details>
<summary>2. `model-a` 看到的是一张 4096 MiB 的 GPU。这是哪个组件做到的？怎么做到的？</summary>

HAMi-core。Device Plugin 设置了 `CUDA_DEVICE_MEMORY_LIMIT_0`，并通过 `/etc/ld.so.preload` 挂载了 `libvgpu.so`。HAMi-core 用上限值回答 NVML 的显存查询，并拒绝会超出上限的分配。

</details>

<details>
<summary>3. 宿主机上还有 6 GiB 以上的空闲显存，`model-d` 为什么仍然 `Pending`？</summary>

HAMi 调度器按分配量计算显存。四个 Pod 各分配了 4096 MiB，正好是整张 16384 MiB 的卡。

</details>

<details>
<summary>4. 默认策略下，`bench` 设置了 `gpucores: 30`，为什么还能全速运行？</summary>

默认策略下，只有同一张 GPU 上还有其他设置了 `gpucores` 的 Pod 同时繁忙时，`vgpu-monitor` 才会打开限速。当时只有 `bench` 一个，所以它可以使用整张 GPU。

</details>

## 交接

删除两个模型：

```bash
kubectl delete pod model-a model-b
```

```plaintext
pod "model-a" deleted from default namespace
pod "model-b" deleted from default namespace
```

第 5 章会在这个节点上继续。它需要：

- HAMi v2.10.0 已安装，Helm release 名为 `hami`，位于 `kube-system`
- GPU 节点带有 `gpu=on` 标签，没有 NVIDIA Device Plugin
- 没有运行中的 GPU Pod

## 延伸阅读

- [GPU 虚拟化原理](/zh/docs/core-concepts/gpu-virtualization)：HAMi 的完整工作流程，以及 HAMi-core 如何拦截 CUDA 和 NVML 调用
- [HAMi 安装后的集群架构](/zh/docs/core-concepts/hami-architecture)：HAMi 集群中的每个组件
- [全局配置](/zh/docs/userguide/configure)：Pod 注解和容器环境变量，包括 `GPU_CORE_UTILIZATION_POLICY`
- [实验 3：使用 HAMi 进行 GPU 分区](/zh/tutorials/labs/gpu-partitioning)：在 GPU Operator 搭建的集群上使用同样的显存和算力限制
- [实验 7：在 k3s 上不使用 GPU Operator 实现 GPU 隔离](/zh/tutorials/labs/hami-isolation-k3s)：在更大的卡上验证显存隔离
- [HAMi-core](https://github.com/Project-HAMi/HAMi-core)：`libvgpu.so` 的源码
