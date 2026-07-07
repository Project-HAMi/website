---
title: "实验 7: 在 k3s 上不使用 GPU Operator 实现 GPU 隔离"
description: "在单节点 k3s 上让多个 Pod 共享一张非 MIG GPU，并证明 HAMi-core 强制执行显存上限。"
sidebar_label: "实验 7: k3s 隔离"
lab:
  level: Intermediate
  duration: 约 45 分钟
  environment: 云 GPU 虚拟机上的单节点 k3s（任意非 MIG NVIDIA 显卡）
  cost: GPU 费用不到 2 美元
  authors:
    - saiyam1814
  verified: "2026-07-07"
tags:
  - 隔离
  - k3s
toc_max_heading_level: 2
---

本实验在租用的 GPU 虚拟机上搭建单节点 k3s 集群，**不安装** NVIDIA GPU Operator 直接安装 HAMi，并证明 HAMi 的显存隔离是真实生效的：两个 Pod 共享一张物理显卡，每个 Pod 内的 `nvidia-smi` 只报告自己的切片大小，超出切片的 CUDA 分配会被 HAMi-core 拒绝（此时显卡上仍有几十 GB 空闲显存），而一个会导致超额分配的第三个 Pod 则保持 `Pending` 状态。

本实验中的每条命令和输出均采集自 GCP `g4-standard-48` Spot 虚拟机上的真实运行（一张 96 GB NVIDIA RTX PRO 6000 Blackwell，单节点 k3s v1.36.2+k3s1、HAMi v2.9.0、NVIDIA 驱动 610.43.02、Ubuntu 22.04）。任何非 MIG 显卡的行为相同；只需调整切片大小（随显存容量缩放）。RTX PRO 6000 Blackwell 支持 MIG，但出厂默认禁用——本实验验证的正是 HAMi 的软件共享。

## 与实验 3 的区别

[实验 3](./gpu-partitioning.md) 在由 **GPU Operator** 提供驱动和容器工具包、HAMi 设备插件叠加其上的集群中证明了相同的隔离特性。本实验走另一条受支持的路径：**完全不使用 GPU Operator**。HAMi 自带设备插件，NVIDIA Container Toolkit 直接安装在主机上，并将 `nvidia` 设为 containerd 的**默认**运行时，使 HAMi-core 被注入到每个 GPU Pod 中。这是在边缘节点、裸金属机器或廉价租用 GPU 虚拟机上会采用的更精简的部署方式——并且它能直接展示 Operator 路径所隐藏的底层机制（步骤 7）。

## 你将学到什么

- 搭建带 NVIDIA Container Toolkit 且以 `nvidia` 为默认运行时的单节点 k3s
- 不使用 GPU Operator 安装 HAMi，并让调度器镜像标签与服务端版本匹配
- HAMi 在哪里记录可共享的 GPU 显存（`hami.io/node-nvidia-register` 注解，而非节点 allocatable）
- 证明显存上限真实生效：虚拟化的 `nvidia-smi` 与在切片处被拒绝的 CUDA 分配
- 证明按设备核算：超额分配的 Pod 保持 `Pending`，事件为 `CardInsufficientMemory`
- 上限如何被强制执行：HAMi-core（`libvgpu.so`）注册在 Pod 的 `/etc/ld.so.preload` 中（软件隔离，非 MIG）

## 实验概览

```mermaid
%% title: k3s 隔离实验步骤
flowchart LR
    Step1["步骤 1<br/>主机准备"] --> Step2["步骤 2<br/>k3s + 工具包"]
    Step2 --> Step3["步骤 3<br/>nvidia 默认运行时"]
    Step3 --> Step4["步骤 4<br/>安装 HAMi"]
    Step4 --> Step5["步骤 5<br/>两个 Pod 共享一张 GPU"]
    Step5 --> Step6["步骤 6<br/>上限 + 预算测试"]
    Step6 --> Step7["步骤 7<br/>底层机制"]
```

## 前提条件

- 一台全新的云虚拟机（Ubuntu 22.04 或更高版本），配备**一张 NVIDIA GPU** 并具有 root 权限。目标是任意未启用 MIG 的显卡：RTX PRO 6000、RTX A6000、L4、L40/L40S、RTX 4090/3090。对无法（或没有）通过 MIG 分区的显卡进行切分正是 HAMi 的核心使用场景。
- 主机上的 NVIDIA 驱动可正常工作（`nvidia-smi` 执行成功）。大多数 GPU 虚拟机镜像已内置驱动。
- 你能控制容器运行时：无法重新配置的受限市场容器不可用，因为 HAMi-core 是通过 NVIDIA 容器运行时注入的。
- 所有操作**通过 SSH 在虚拟机上**执行——helm 和 kubectl 通过 localhost 与 k3s 通信，避免不稳定的远程链路。
- 来自 [`tutorials/labs/examples/07-hami-isolation-k3s/`](https://github.com/Project-HAMi/website/tree/master/tutorials/labs/examples/07-hami-isolation-k3s) 的清单文件

:::note[费用]

一次完整的实验会话远低于一小时 GPU 时间。非 MIG 显卡的按需租用价格通常低于每小时 1 美元。GPU 资源紧张——你想要的那张卡经常缺货；选用任何可用的非 MIG 显卡并调整切片大小即可（清单文件中只需改一行）。

:::

:::warning[不要安装 GPU Operator]

HAMi 自带设备插件，[不能与 NVIDIA 官方设备插件共存](https://project-hami.io/docs/installation/prerequisites)。GPU Operator + HAMi 的集成没有官方文档支持（[HAMi #1708](https://github.com/Project-HAMi/HAMi/issues/1708)）。如果你的集群已经运行了 Operator，请改用实验 3 的路径——或为本实验使用一台全新的虚拟机。

:::

## 步骤 1: 验证主机驱动

没有健康的主机驱动，后续步骤都无法进行。以 root 身份（或全程使用 `sudo`）SSH 登录虚拟机并检查：

```bash
nvidia-smi -L
```

```plaintext
GPU 0: NVIDIA RTX PRO 6000 Blackwell Server Edition (UUID: GPU-3c4a3856-fbb4-1425-9679-aed25f4d2977)
```

> 一张显卡，主机可见。如果 `nvidia-smi` 失败，请按照 [NVIDIA 驱动安装指南](https://docs.nvidia.com/datacenter/tesla/driver-installation-guide/)安装驱动后重试。在全新的 Ubuntu 虚拟机上，这意味着添加 NVIDIA CUDA apt 仓库并执行 `apt-get install nvidia-open`——Blackwell 一代显卡需要**开源**内核模块（驱动 ≥ 570）；使用闭源模块时 `nvidia-smi` 会报 `No devices found`。

## 步骤 2: 先安装 Container Toolkit，再安装 k3s

顺序很重要：在安装 k3s **之前**先安装 [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)，这样 k3s 在安装时会自动检测到 `nvidia` 容器运行时。

```bash
install -m 0755 -d /usr/share/keyrings
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
  | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -fsSL https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
  | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
  > /etc/apt/sources.list.d/nvidia-container-toolkit.list
apt-get update -y
apt-get install -y nvidia-container-toolkit
```

现在安装 k3s：

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644" sh -
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl get nodes -o wide
```

```plaintext
NAME               STATUS   ROLES           AGE   VERSION        INTERNAL-IP   EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION           CONTAINER-RUNTIME
hami-lab-rtx6000   Ready    control-plane   65s   v1.36.2+k3s1   10.128.0.2    <none>        Ubuntu 22.04.5 LTS   6.8.0-1063-gcp (amd64)   containerd://2.3.2-k3s2
```

确认 k3s 识别到了 nvidia 运行时，并为 HAMi 打上节点标签：

```bash
kubectl get runtimeclass nvidia
kubectl label node hami-lab-rtx6000 gpu=on
```

```plaintext
NAME     HANDLER   AGE
nvidia   nvidia    55s
node/hami-lab-rtx6000 labeled
```

> 当工具包在 k3s 安装时已存在，k3s 会在其 containerd 配置中写入 `nvidia` RuntimeClass。如果缺失，重启 k3s（`systemctl restart k3s`）——参见 [k3s NVIDIA 运行时支持](https://docs.k3s.io/advanced#nvidia-container-runtime-support)。HAMi 的设备插件会调度到带有 `gpu=on` 标签的节点上。

## 步骤 3: 将 nvidia 设为 containerd 的默认运行时

HAMi 的 Pod 不设置 `runtimeClassName`，因此只有当**默认**运行时是 `nvidia` 时，HAMi-core 才会被注入。使用 k3s 自带的 `default-runtime` 选项——这是与 containerd 配置模式无关的干净做法。**不要**手动编辑 `config.toml`：v2 和 v3 的模式不同，重复声明已有的表会直接破坏 k3s。

```bash
echo 'default-runtime: nvidia' >> /etc/rancher/k3s/config.yaml
systemctl restart k3s
```

验证配置已生效（此文件由 k3s 重新生成；你从不直接编辑它）：

```bash
grep default_runtime_name /var/lib/rancher/k3s/agent/etc/containerd/config.toml
```

```plaintext
default_runtime_name = "nvidia"
```

> 这一行就是 HAMi 强制执行限制与静默不执行之间的区别。如果之后在步骤 7 中 GPU Pod 里看不到 `libvgpu.so`，请先回到这里排查。

## 步骤 4: 安装 HAMi

HAMi 调度器运行一个 kube-scheduler sidecar，其镜像标签必须与集群 Kubernetes **服务端**版本匹配——版本不匹配是最常见的 HAMi 安装失败原因。先检测版本：

```bash
kubectl version | grep Server
```

```plaintext
Server Version: v1.36.2+k3s1
```

去掉 `+k3s1` 后缀，将其作为调度器镜像标签传入：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi
helm repo update hami-charts
helm upgrade --install hami hami-charts/hami \
  --version 2.9.0 \
  -n kube-system \
  --set scheduler.kubeScheduler.imageTag=v1.36.2 \
  --wait --timeout 5m
kubectl -n kube-system get pods | grep hami
```

```plaintext
hami-device-plugin-62ck6                  2/2     Running   0          38s
hami-scheduler-5f5b5589c9-zhgsc           2/2     Running   0          38s
```

> 与实验 2（禁用设备插件）不同，此处 **HAMi 设备插件正常运行**——它是集群上唯一的设备插件，独占这张 GPU。

验证 HAMi 已注册显卡：

```bash
kubectl get node hami-lab-rtx6000 -o jsonpath='{.status.allocatable.nvidia\.com/gpu}'; echo
kubectl get node hami-lab-rtx6000 -o jsonpath='{.metadata.annotations.hami\.io/node-nvidia-register}'; echo
```

```plaintext
10
[{"id":"GPU-3c4a3856-fbb4-1425-9679-aed25f4d2977","count":10,"devmem":97887,"devcore":100,"type":"NVIDIA RTX PRO 6000 Blackwell Server Edition","mode":"hami-core","health":true,"devicepairscore":{}}]
```

> 有两点值得牢记：
>
> - `nvidia.com/gpu` 的 allocatable 值是 `10`——一张物理 GPU × `deviceSplitCount`（默认 10），即可以共享这张卡的 Pod 数量上限。
> - 可共享的显存（`devmem: 97887` MiB）记录在 `hami.io/node-nvidia-register` 注解中，**而非**节点 allocatable。`kubectl describe node` 中不会出现 `nvidia.com/gpumem`；HAMi 调度器和 webhook 依据该注解核算 `gpumem`/`gpucores`，由 HAMi-core 按 Pod 强制执行。

## 步骤 5: 两个 Pod 共享一张物理 GPU

`share-two-pods.yaml` 运行两个 Pod，每个请求一张 GPU 和 8000 MiB 的切片——原生 Kubernetes 做不到这一点（它会把整张卡分配给一个 Pod）：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hami-share-a
spec:
  restartPolicy: Never
  containers:
    - name: cuda
      image: nvidia/cuda:12.4.1-devel-ubuntu22.04
      command: ["bash", "-c", "nvidia-smi; sleep infinity"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 8000
```

> `hami-share-b` 除名称外完全相同。使用 `devel` 镜像是因为步骤 6 需要在 Pod 内用 `nvcc` 编译一个小型 CUDA 分配器；镜像较大、拉取较慢是正常的。在 24 GB 显卡上请改用约 4000 MiB 的切片。

```bash
kubectl apply -f share-two-pods.yaml
kubectl wait --for=condition=Ready pod/hami-share-a pod/hami-share-b --timeout=300s
kubectl get pods -o wide
```

```plaintext
NAME           READY   STATUS    RESTARTS   AGE   IP           NODE               NOMINATED NODE   READINESS GATES
hami-share-a   1/1     Running   0          37s   10.42.0.13   hami-lab-rtx6000   <none>           <none>
hami-share-b   1/1     Running   0          37s   10.42.0.14   hami-lab-rtx6000   <none>           <none>
```

> 两个 Pod 都在同一台单 GPU 节点上 `Running`：共驻。它们由 hami-scheduler 放置；每个 Pod 的调度决策在事件中可见：

```bash
kubectl describe pod hami-share-a | grep -A5 Events:
```

```plaintext
Events:
  Type    Reason            Age   From            Message
  ----    ------            ----  ----            -------
  Normal  Scheduled         52s   hami-scheduler  Successfully assigned default/hami-share-a to hami-lab-rtx6000
  Normal  FilteringSucceed  53s   hami-scheduler  find fit node(hami-lab-rtx6000), 0 nodes not fit, 1 nodes fit(hami-lab-rtx6000:0.00)
  Normal  BindingSucceed    52s   hami-scheduler  Successfully binding node [hami-lab-rtx6000] to default/hami-share-a
```

## 步骤 6: 证明上限真实生效

在 `hami-share-a` 中连续做两项检查。首先，容器*认为*这张 GPU 是什么样的？

```bash
kubectl exec hami-share-a -- nvidia-smi
```

```plaintext
Tue Jul  7 10:25:15 2026
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 610.43.02              KMD Version: 610.43.02     CUDA UMD Version: 13.3     |
+-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  NVIDIA RTX PRO 6000 Blac...    Off |   00000000:05:00.0 Off |                    0 |
| N/A   34C    P0             48W /  600W |       0MiB /   8000MiB |      0%      Default |
|                                         |                        |             Disabled |
+-----------------------------------------+------------------------+----------------------+
```

> Memory 列显示 **8000MiB**，而不是显卡真实的 97887MiB。HAMi-core 重写了容器看到的显卡容量。注意 `MIG M.: Disabled`——这里的共享是 HAMi 的软件切片，而非硬件分区。

其次，上限真的守得住吗？编译并运行一个每次 `cudaMalloc` 256 MiB、直到被拒绝为止的小型分配器：

```bash
kubectl exec hami-share-a -- bash -c '
cat > /tmp/probe.cu <<EOF
#include <cuda_runtime.h>
#include <cstdio>
int main() {
  const size_t chunk = (size_t)256 * 1024 * 1024; // 256 MiB
  size_t total = 0;
  void *p = nullptr;
  for (;;) {
    cudaError_t e = cudaMalloc(&p, chunk);
    if (e != cudaSuccess) {
      printf("cudaMalloc refused after %zu MiB allocated: %s\n",
             total / (1024 * 1024), cudaGetErrorString(e));
      return 0;
    }
    total += chunk;
  }
}
EOF
nvcc -o /tmp/probe /tmp/probe.cu && /tmp/probe'
```

```plaintext
cudaMalloc refused after 7424 MiB allocated: out of memory
[HAMI-core ERROR (pid:54 thread=133390658244608 allocator.c:52)]: Device 0 OOM 8629780480 / 8388608000
```

> 这就是证明，而且是一个矛盾：Pod 在约 7.4 GB 处触发 "out of memory"，而物理显卡上还有约 82 GB 空闲。拒绝来自 **HAMI-core**（见错误行：它试图使用 8629780480 字节，超过了 8388608000 字节的限制——8388608000 字节恰好是 8000 MiB），而非硬件。只有拦截 CUDA 调用的软件上限才能做到这一点。表述时应说"超出切片的分配会被拒绝"——精确边界取决于分配器和 CUDA 上下文开销，不要断言确切的字节数。可以对 `hami-share-b` 重复此操作；行为完全一致。

现在证明显卡的显存是一个共享的、有限的预算。`oversubscribe-pending.yaml` 请求一个 90000 MiB 的切片——空的 96 GB 卡放得下，但在已有两个 8000 MiB 切片的情况下放不下（97887 − 16000 ≈ 82000 MiB 空闲）：

```bash
kubectl apply -f oversubscribe-pending.yaml
sleep 15
kubectl get pod hami-oversubscribe
kubectl describe pod hami-oversubscribe | grep -A5 Events:
```

```plaintext
NAME                 READY   STATUS    RESTARTS   AGE
hami-oversubscribe   0/1     Pending   0          15s
Events:
  Type     Reason            Age                From            Message
  ----     ------            ----               ----            -------
  Warning  FailedScheduling  15s                hami-scheduler  0/1 nodes are available: 1 NodeUnfitPod. no new claims to deallocate, preemption: 0/1 nodes are available: 1 No preemption victims found for incoming pod.
  Warning  FilteringFailed   16s (x2 over 16s)  hami-scheduler  1 nodes CardInsufficientMemory(hami-lab-rtx6000)
```

> `Pending` 且事件为 `CardInsufficientMemory`——与步骤 5 形成对比，同一个调度器在那里记录的是 `FilteringSucceed`。有两点必须正确，否则这个测试会"失败"（被调度而不是保持 Pending）：请求大小必须适配**你的**显卡（大于切片旁的剩余空间、小于整张卡——见清单注释），并且两个共享 Pod 必须仍处于 `Running` 状态（它们持有切片；清单使用 `sleep infinity`，避免它们在实验中途悄然完成）。

## 步骤 7: 揭示底层机制

上限是如何被强制执行的？在被限制的 Pod 内查看运行时注入了什么：

```bash
kubectl exec hami-share-a -- bash -c 'env | grep -iE "CUDA_DEVICE|NVIDIA_VISIBLE|LD_PRELOAD" | sort; cat /etc/ld.so.preload; ls -l /usr/local/vgpu/ 2>/dev/null'
```

```plaintext
CUDA_DEVICE_MEMORY_LIMIT_0=8000m
CUDA_DEVICE_MEMORY_SHARED_CACHE=/usr/local/vgpu/5af6befa-5ff5-4bd5-9086-c79554723b6f.cache
CUDA_DEVICE_SM_LIMIT=0
NVIDIA_VISIBLE_DEVICES=GPU-3c4a3856-fbb4-1425-9679-aed25f4d2977
/usr/local/vgpu/libvgpu.so
total 684
-rw-rw-rw- 1 root root 2008953 Jul  7 10:25 5af6befa-5ff5-4bd5-9086-c79554723b6f.cache
-rwxr-xr-x 1 root root  684264 Jul  7 10:23 libvgpu.so
```

> 整个机制就浓缩在这几行里：`libvgpu.so`（HAMi-core）被挂载进 Pod 并注册在 `/etc/ld.so.preload` 中，因此容器内的**每个**进程都会加载它；HAMi-core 从 `CUDA_DEVICE_MEMORY_LIMIT_0` 读取上限。应用发出的每个 CUDA 驱动调用都会经过这个库，步骤 6 中的拒绝正是来自这里。（`CUDA_DEVICE_SM_LIMIT=0` 表示未请求算力限制——这些 Pod 没有设置 `gpucores`；共享缓存文件是各 HAMi-core 实例跨进程核算用量的方式。）这与 NVIDIA 的 KAI Scheduler 于 [2026 年 6 月采用](https://github.com/NVIDIA/KAI-Scheduler/pull/60)的用于分数 GPU 显存隔离的 `CUDA_DEVICE_MEMORY_LIMIT` 机制完全相同。具体的变量名和路径随 HAMi 版本而异——请记录你实际看到的内容。

:::note[这是什么，不是什么]

这是**软件隔离**：用户态 CUDA 拦截。它不是 MIG 的硬件故障隔离——行为异常的 kernel 受到的是拦截约束，而非硬件分区。应将其视为带运行时强制执行的调度与核算保证，而不是等同于 MIG 的安全边界。本实验也不测量算力限制精度或持续负载下的邻居干扰；`gpucores` 的行为参见实验 3 的步骤 5。

:::

## 清理

```bash
kubectl delete pod hami-share-a hami-share-b hami-oversubscribe
helm -n kube-system uninstall hami
```

如果你为本实验租用了虚拟机，请保存输出后销毁实例——计费仍在进行。

```bash
/usr/local/bin/k3s-uninstall.sh   # 可选：完全移除 k3s
```

## 本实验证明了什么

| 结论 | 证据 |
| --- | --- |
| HAMi 无需 GPU Operator 即可运行 | 集群上只有 HAMi 自己的设备插件；`nvidia.com/gpu` allocatable 正常出现 |
| 两个 Pod 共享一张物理 GPU | `hami-share-a` 和 `hami-share-b` 都在单 GPU 节点上 `Running` |
| 容器只看到自己的切片 | Pod 内 `nvidia-smi` 报告总量 8000 MiB，而非 97887 MiB |
| 显存上限是强制的，不是装饰 | `cudaMalloc` 在约 7424 MiB 处被 HAMI-core 拒绝，此时显卡还有约 82 GB 空闲 |
| 显卡显存是统一核算的预算 | 90000 MiB 的 Pod 保持 `Pending`，事件为 `CardInsufficientMemory` |
| 机制是用户态拦截 | Pod 中注入了 `/etc/ld.so.preload` 里的 `libvgpu.so` 和 `CUDA_DEVICE_MEMORY_LIMIT_0=8000m` |

## 下一步

- 运行 [实验 2: 本地模拟 GPU](./local-fake-gpu.md)，免费、无需 GPU 地学习这个故事的调度部分——模拟证明放置决策，本实验证明强制执行。
- 与 [实验 3: GPU 分区](./gpu-partitioning.md) 对比，它通过 GPU Operator 路径得出相同的隔离证明，并额外覆盖 `gpucores` 算力限制。
- 阅读 [HAMi 集群架构](/zh/docs/core-concepts/hami-architecture)，端到端梳理你刚刚验证过的 webhook → 调度器 → 设备插件 → HAMi-core 链路。

:::info[致谢]

本实验改编自 [Lovedeep Singh](https://github.com/ld-singh) 的 [AI Factory Operations Lab](https://ld-singh.github.io/ai-factory-ops-lab/) 中的 HAMi 课程，经其友好授权。该课程将无需 GPU 的调度模拟（本站由 [实验 2](./local-fake-gpu.md) 覆盖）与真实 GPU 隔离证明配对。他最早在一张 48 GB RTX A6000 上验证了这套练习序列（[验证报告](https://github.com/ld-singh/ai-factory-ops-lab/blob/main/portfolio-lab/06-validation-reports/hami-isolation-validation.md)）。

:::
