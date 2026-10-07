---
title: "第 2 章：一张卡，一个 Pod"
description: "安装原生 NVIDIA Device Plugin，跟踪一张 GPU 从节点进入 Pod 的过程，并看到只需要 2 GiB 显存的模型为什么仍然会占用整张卡。"
sidebar_label: "2. 一张卡，一个 Pod"
lab:
  level: Beginner
  duration: about 30 minutes
  environment: 第 1 章中挂载一张 NVIDIA T4 的节点
  authors:
    - togettoyou
  verified: "2026-10-07"
tags:
  - nvidia
  - 调度
toc_max_heading_level: 2
---

## 场景

团队的 GPU 节点通过了第 1 章的全部检查，现在要在上面运行第一个模型。这个模型大约需要 2 GiB 显存，而 T4 有 16 GiB。紧接着还要部署第二个同样大小的模型，按显存算，两个模型放在一张卡上绰绰有余。

本章在第 1 章的节点上继续。

## 你将理解

- Device Plugin 如何告诉 Kubernetes 节点上有 GPU
- 申请了 `nvidia.com/gpu` 的 Pod，容器里最终如何拿到一张具体的 GPU
- 为什么调度器按整个设备计数，不考虑显存
- 为什么 `nvidia.com/gpu` 只接受整数

## 实验环境

本章在第 1 章环境的基础上新增：

| 组件                 | 版本                                            |
| -------------------- | ----------------------------------------------- |
| Helm                 | v4.3.0                                          |
| NVIDIA Device Plugin | v0.20.1                                         |
| 测试镜像             | `pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime` |

## 先看问题

部署第一个模型。下面的 Pod 模拟一个推理服务：它用 PyTorch 在 GPU 上加载 2 GiB 的“权重”，然后保持运行。它通过 `nvidia.com/gpu: 1` 向 Kubernetes 申请一张 GPU。将它保存为 `model-a.yaml`：

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
```

```bash
kubectl apply -f model-a.yaml
```

```plaintext
pod/model-a created
```

```bash
kubectl get pod model-a
```

```plaintext
NAME      READY   STATUS    RESTARTS   AGE
model-a   0/1     Pending   0          5s
```

Pod 一直处于 `Pending`。查看调度器给出的原因：

```bash
kubectl get events --field-selector involvedObject.name=model-a
```

```plaintext
LAST SEEN   TYPE      REASON             OBJECT        MESSAGE
12s         Warning   FailedScheduling   pod/model-a   0/1 nodes are available: 1 Insufficient nvidia.com/gpu. no new claims to deallocate, preemption: 0/1 nodes are available: 1 Preemption is not helpful for scheduling.
```

`Insufficient nvidia.com/gpu`。第 1 章结束时也看到了同样的情况：节点的资源容量里没有 `nvidia.com/gpu`。GPU 在宿主机上和容器里都能用，但 Kubernetes 没有它的记录，调度器看到这个节点上的 GPU 数量是 0。

先不要删除 `model-a`。等节点上报 GPU 之后，它会自动启动。

## 背后的原理：GPU 如何成为 Kubernetes 资源

Kubernetes 本身不认识 GPU。硬件厂商通过 [Device Plugin](https://kubernetes.io/zh-cn/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/) 框架把 GPU 接入进来。Device Plugin 是一个程序，通常以 DaemonSet 的形式运行，在节点上通过 gRPC 与 kubelet 通信。下图是从 Device Plugin 启动到 GPU Pod 运行的完整时序：

![Device Plugin 注册到 GPU Pod 运行的完整时序](/img/docs/common/core-concepts/device-plugin-flow.svg)

每一步的说明见 [GPU 虚拟化原理](/zh/docs/core-concepts/gpu-virtualization#device-plugin)。本章后面的步骤会在节点上观察到其中几步：

- **③ 到 ⑤，注册与上报。** NVIDIA Device Plugin 通过 NVML（第 1 章的第 3 层）发现 GPU，向 kubelet 注册 `nvidia.com/gpu`，每张 GPU 上报为一个设备，用 UUID 标识。kubelet 把设备数量作为节点容量上报。步骤 3 会从插件日志、socket 和节点容量看到这一过程。
- **⑧ 和 ⑨，分配。** Pod 启动时，kubelet 请求插件分配设备。NVIDIA 插件返回 `NVIDIA_VISIBLE_DEVICES=<GPU UUID>`，第 1 章的 NVIDIA 运行时据此把这张 GPU 注入容器。步骤 4 会在 Pod 里看到这个变量。
- **⑦，调度。** 调度器比较 Pod 申请的 GPU 数量和每个节点剩余的数量。步骤 5 会看到没有剩余时的情况。

调度器看到的只有设备数量。每个设备要么空闲，要么已被占用，而且 Kubernetes 对 `nvidia.com/gpu` 这类资源只接受整数。显存、算力以及进程实际用了多少，都不在这个模型里。

## 步骤 1：安装 Helm

Device Plugin 通过 Kubernetes 的包管理工具 Helm 安装，后续章节也会用到 Helm。

```bash
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-4 | bash -s -- --version v4.3.0
helm version
```

```plaintext
Downloading https://get.helm.sh/helm-v4.3.0-linux-amd64.tar.gz
Verifying checksum... Done.
Preparing to install helm into /usr/local/bin
helm installed into /usr/local/bin/helm
version.BuildInfo{Version:"v4.3.0", GitCommit:"bec5b06ed841fe5269972d864d5177944fd5970f", GitTreeState:"clean", GoVersion:"go1.27.1", KubeClientVersion:"v1.37"}
```

## 步骤 2：安装 NVIDIA Device Plugin

Device Plugin 的 chart 只会把 DaemonSet 调度到标记为 NVIDIA GPU 节点的机器上。运行了 Node Feature Discovery 的集群会自动打上这个标签，这里手动添加：

```bash
kubectl label node <gpu-node-name> nvidia.com/gpu.present=true
```

```plaintext
node/vm-0-4-ubuntu labeled
```

添加 chart 仓库并安装 Device Plugin：

```bash
helm repo add nvdp https://nvidia.github.io/k8s-device-plugin
helm repo update
```

```plaintext
"nvdp" has been added to your repositories
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "nvdp" chart repository
Update Complete. ⎈Happy Helming!⎈
```

```bash
helm install nvdp nvdp/nvidia-device-plugin \
    --namespace nvidia-device-plugin --create-namespace \
    --version 0.20.1
```

```plaintext
NAME: nvdp
LAST DEPLOYED: Wed Oct  7 00:12:46 2026
NAMESPACE: nvidia-device-plugin
STATUS: deployed
REVISION: 1
DESCRIPTION: Install complete
TEST SUITE: None
```

```bash
kubectl get pods -n nvidia-device-plugin
```

```plaintext
NAME                              READY   STATUS    RESTARTS   AGE
nvdp-nvidia-device-plugin-x2sfp   1/1     Running   0          31s
```

## 步骤 3：观察 Device Plugin 注册

Device Plugin 的日志记录了原理部分的每个注册环节：

```bash
kubectl logs -n nvidia-device-plugin ds/nvdp-nvidia-device-plugin | grep -E "Detected platform|Starting to serve|Registered device plugin"
```

```plaintext
I1006 16:12:54.190011       1 plugin-manager.go:101] Detected platform: nvml
I1006 16:12:54.202621       1 server.go:142] Starting to serve 'nvidia.com/gpu' on /var/lib/kubelet/device-plugins/nvidia-gpu.sock
I1006 16:12:54.204726       1 server.go:149] Registered device plugin for 'nvidia.com/gpu' with Kubelet
```

插件通过 NVML 发现了 GPU，打开了自己的 socket，并向 kubelet 注册了 `nvidia.com/gpu`。两个 socket 都在节点上：

```bash
ls -l /var/lib/kubelet/device-plugins/
```

```plaintext
total 4
-rw------- 1 root root 414 Oct  7 00:13 kubelet_internal_checkpoint
srwxr-xr-x 1 root root   0 Oct  6 23:50 kubelet.sock
srwxr-xr-x 1 root root   0 Oct  7 00:12 nvidia-gpu.sock
```

`kubelet.sock` 供 Device Plugin 注册，`nvidia-gpu.sock` 供 kubelet 回调 NVIDIA 插件，`kubelet_internal_checkpoint` 记录哪个设备分配给了哪个容器。

用第 1 章的命令再看一次节点容量：

```bash
kubectl get node <gpu-node-name> -o jsonpath='{.status.capacity}' ; echo
```

```plaintext
{"cpu":"8","ephemeral-storage":"206296376Ki","hugepages-1Gi":"0","hugepages-2Mi":"0","memory":"32472900Ki","nvidia.com/gpu":"1","pods":"110"}
```

出现了 `"nvidia.com/gpu":"1"`，节点现在上报了一张 GPU。

## 步骤 4：跟踪 GPU 进入 Pod

节点上有了 GPU，调度器就会调度 `model-a`。首次启动需要拉取 PyTorch 镜像，镜像有好几个 GB，可能需要几分钟。

```bash
kubectl get pod model-a
```

```plaintext
NAME      READY   STATUS    RESTARTS   AGE
model-a   1/1     Running   0          6m19s
```

```bash
kubectl logs model-a
```

```plaintext
model-a loaded 2 GiB of weights on Tesla T4
```

查看 Device Plugin 分配的是哪张 GPU：

```bash
kubectl exec model-a -- env | grep NVIDIA_VISIBLE_DEVICES
```

```plaintext
NVIDIA_VISIBLE_DEVICES=GPU-caf9bd30-b03c-04d8-9d4f-8a02f984cc23
```

这就是第 1 章在宿主机上用 `nvidia-smi -L` 看到的 UUID。Device Plugin 在 Allocate 时返回了它，NVIDIA 运行时据此把这张 GPU 注入容器。

再从宿主机看一看 GPU：

```bash
nvidia-smi
```

```plaintext
Wed Oct  7 00:17:55 2026
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 580.126.20             Driver Version: 580.126.20     CUDA Version: 13.0     |
+-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  Tesla T4                       On  |   00000000:00:08.0 Off |                  Off |
| N/A   35C    P0             27W /   70W |    2153MiB /  16384MiB |      0%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+

+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI              PID   Type   Process name                        GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|    0   N/A  N/A           96586      C   python                                 2150MiB |
+-----------------------------------------------------------------------------------------+
```

`model-a` 用了 16384 MiB 中的 2153 MiB，还有 14 GiB 以上的显存空闲。

## 步骤 5：部署第二个模型

部署 `model-b`，除了名字以外与 `model-a` 完全相同。将它保存为 `model-b.yaml`：

```yaml title="model-b.yaml"
apiVersion: v1
kind: Pod
metadata:
  name: model-b
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
          print("model-b loaded 2 GiB of weights on", torch.cuda.get_device_name(0), flush=True)
          time.sleep(365 * 24 * 3600)
      resources:
        limits:
          nvidia.com/gpu: 1
```

```bash
kubectl apply -f model-b.yaml
```

```plaintext
pod/model-b created
```

```bash
kubectl get pods
```

```plaintext
NAME      READY   STATUS    RESTARTS   AGE
model-a   1/1     Running   0          6m39s
model-b   0/1     Pending   0          8s
```

```bash
kubectl get events --field-selector involvedObject.name=model-b
```

```plaintext
LAST SEEN   TYPE      REASON             OBJECT        MESSAGE
9s          Warning   FailedScheduling   pod/model-b   0/1 nodes are available: 1 Insufficient nvidia.com/gpu. no new claims to deallocate, preemption: 0/1 nodes are available: 1 No preemption victims found for incoming pod.
```

又是 `Insufficient nvidia.com/gpu`，尽管卡上还有 14 GiB 以上的空闲显存。节点的分配情况说明了原因：

```bash
kubectl describe node <gpu-node-name> | grep -A 9 "Allocated resources"
```

```plaintext
Allocated resources:
  (Total limits may be over 100 percent, i.e., overcommitted.)
  Resource           Requests    Limits
  --------           --------    ------
  cpu                850m (10%)  0 (0%)
  memory             240Mi (0%)  340Mi (1%)
  ephemeral-storage  0 (0%)      0 (0%)
  hugepages-1Gi      0 (0%)      0 (0%)
  hugepages-2Mi      0 (0%)      0 (0%)
  nvidia.com/gpu     1           1
```

节点只有一个 `nvidia.com/gpu`，已经被 `model-a` 占用。在调度器看来，这张 GPU 已经分配出去了，至于 `model-a` 没用到的 14 GiB，它并不知道。

## 步骤 6：尝试申请半张 GPU

2 GiB 的模型用不了一整张 T4，试试只申请半张。将清单保存为 `model-half.yaml`：

```yaml title="model-half.yaml"
apiVersion: v1
kind: Pod
metadata:
  name: model-half
spec:
  containers:
    - name: model
      image: pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime
      command: ["sleep", "infinity"]
      resources:
        limits:
          nvidia.com/gpu: 0.5
```

```bash
kubectl apply -f model-half.yaml
```

```plaintext
The Pod "model-half" is invalid:
* spec.containers[0].resources.limits[nvidia.com/gpu]: Invalid value: "500m": must be an integer
* spec.containers[0].resources.requests[nvidia.com/gpu]: Invalid value: "500m": must be an integer
```

Pod 还没到调度器就被 API Server 拒绝了。`nvidia.com/gpu` 这类扩展资源必须是整数。每个单位对应插件设备列表中的一个设备，小数没有意义。

## 验证

| 结论 | 证据 |
| --- | --- |
| 没有 Device Plugin，Kubernetes 无法调度 GPU Pod | 先看问题：`model-a` 因 `Insufficient nvidia.com/gpu` 处于 Pending |
| Device Plugin 向 kubelet 注册了 GPU | 步骤 3：注册日志、`nvidia-gpu.sock`、容量 `nvidia.com/gpu: 1` |
| Pod 通过环境变量拿到 GPU | 步骤 4：`NVIDIA_VISIBLE_DEVICES` 是第 1 章看到的 GPU UUID |
| 一个 Pod 占用整张卡，与显存用量无关 | 步骤 4 和步骤 5：`model-a` 用了 16384 MiB 中的 2153 MiB，`model-b` 处于 Pending |
| GPU 不能按小数申请 | 步骤 6：`nvidia.com/gpu: 0.5` 被拒绝，报 `must be an integer` |

## 常见问题

**Device Plugin 的 DaemonSet 显示 `DESIRED 0`，没有 Pod。** 节点缺少 chart 选择的标签。用 `kubectl get ds -n nvidia-device-plugin` 确认，并按步骤 2 添加 `nvidia.com/gpu.present=true` 标签。

**Device Plugin 的 Pod 启动失败，日志提示无法加载 NVML。** 容器没有拿到驱动库。回到第 1 章步骤 4.1，确认 `nvidia` 是 containerd 的默认运行时。

**GPU Pod 一直 `Pending`，提示 `Insufficient nvidia.com/gpu`。** 可能是节点没有上报 GPU（检查步骤 3 中的节点容量），也可能是 GPU 已经全部分配出去（检查步骤 5 中的 `Allocated resources`）。

## 自测

<details>
<summary>1. `model-a` 只用了 16 GiB 卡上大约 2 GiB 显存，为什么 `model-b` 仍然 `Pending`？</summary>

调度器按设备计数。节点只有一个 `nvidia.com/gpu`，已经被 `model-a` 占用。显存用量不参与调度决策。

</details>

<details>
<summary>2. 哪个组件告诉 Kubernetes 节点上有 GPU？怎么告诉的？</summary>

Device Plugin。它通过 `kubelet.sock` 向 kubelet 注册 `nvidia.com/gpu`，并通过 ListAndWatch 为每张 GPU 上报一个设备。kubelet 把设备数量作为节点容量上报。

</details>

<details>
<summary>3. 容器是怎么拿到正确的那张 GPU 的？</summary>

Allocate 时，Device Plugin 返回 `NVIDIA_VISIBLE_DEVICES`，值为这张 GPU 的 UUID。NVIDIA 容器运行时读取这个变量，把这张 GPU 的设备节点和库注入容器。

</details>

<details>
<summary>4. 为什么 `nvidia.com/gpu: 0.5` 会被拒绝？</summary>

扩展资源必须是整数。`nvidia.com/gpu` 的每个单位对应插件上报的一个设备，半个单位没有意义。

</details>

## 交接

删除两个模型 Pod：

```bash
kubectl delete pod model-a model-b
```

```plaintext
pod "model-a" deleted from default namespace
pod "model-b" deleted from default namespace
```

第 3 章会在这个节点上继续。它需要：

- NVIDIA Device Plugin v0.20.1 已安装，Helm release 名为 `nvdp`，位于 `nvidia-device-plugin` 命名空间
- GPU 节点带有 `nvidia.com/gpu.present=true` 标签，容量为 `nvidia.com/gpu: 1`
- 没有运行中的 GPU Pod

## 延伸阅读

- [设备插件](https://kubernetes.io/zh-cn/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/)：Kubernetes 的 Device Plugin 框架
- [NVIDIA device plugin for Kubernetes](https://github.com/NVIDIA/k8s-device-plugin)：本章所用插件的配置选项
- [GPU 虚拟化原理](/zh/docs/core-concepts/gpu-virtualization)：Device Plugin 完整的注册与分配流程，以及 HAMi 如何突破整数限制
- [GPU 软件栈全景](/zh/docs/core-concepts/gpu-stack)：Kubernetes GPU 调度链路
