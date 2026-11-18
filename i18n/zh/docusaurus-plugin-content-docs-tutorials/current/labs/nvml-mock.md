---
title: "实验 5: 使用 nvml-mock 进行 Fake-GPU 调度"
description: "用 nvml-mock 模拟 4 张 GB300 GPU 验证 HAMi 调度能力，无需真实 GPU。"
sidebar_label: "实验 5: nvml-mock"
lab:
  level: Intermediate
  duration: 约 20 分钟
  environment: Linux/macOS 配合 kind · 无需真实 GPU
  cost: 免费
  authors:
    - maishivamhoo123
  verified: "2026-11-17"
tags:
  - 模拟
  - nvml-mock
  - hami
  - 调度
  - 资源共享
toc_max_heading_level: 2
---

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem';

本实验使用 NVIDIA 的 **nvml-mock** 库在本地 **kind** 集群中模拟一个高端 GPU 节点，4 张虚拟 GB300 GPU。你将通过公开的 Helm Chart 安装 HAMi，然后验证 GPU 调度功能：共享、显存/算力限制、百分比显存申请以及多 GPU 分配，全部无需物理硬件。

## 你将得到什么

完成本实验后，你将得到一个本地 Kubernetes 集群：

- **nvml-mock** 让节点上报 4 张虚拟 GB300 GPU（HAMi 将每张物理 GPU 切成 10 个虚拟槽位后，节点显示 `nvidia.com/gpu: 40`）
- **HAMi** v2.11.0 device-plugin 和调度器通过公开的 Helm Chart 安装
- 验证的 Pod 包括：单 GPU、GPU 共享、显存/算力限制、百分比显存以及多 GPU 分配

:::note

此环境中不存在真实的 CUDA 运行时。Pod 使用 `busybox` 并设置 `CUDA_DISABLE_CONTROL=true`，以阻止 HAMi 的控制库尝试真实设备访问。显存和算力限制的运行时强制执行仍需要物理 GPU。

:::

## 安装全景图

整个安装过程共 9 步：

```mermaid
%% title: Fake-GPU 调度安装全景图
flowchart LR
    Step1["步骤 1<br/>创建 kind 集群"] --> Step2["步骤 2<br/>部署 nvml-mock"]
    Step2 --> Step3["步骤 3<br/>部署 HAMi"]
    Step3 --> Step4["步骤 4<br/>验证 GPU 资源"]
    Step4 --> Step5["步骤 5<br/>基础 GPU 调度"]
    Step5 --> Step6["步骤 6<br/>GPU 共享"]
    Step6 --> Step7["步骤 7<br/>显存与算力限制"]
    Step7 --> Step8["步骤 8<br/>百分比显存"]
    Step8 --> Step9["步骤 9<br/>多 GPU 分配"]
```

| 步骤           | 目的                                             | 解决什么问题            |
| -------------- | ------------------------------------------------ | ----------------------- |
| 创建 kind 集群 | 引导本地 Kubernetes                              | 提供测试环境            |
| 部署 nvml-mock | 模拟 4 张虚拟 GB300 GPU                          | 无需硬件即可发现 GPU    |
| 部署 HAMi      | 通过公开的 Helm Chart 安装调度器和 device-plugin | 启用 GPU 切分和调度     |
| 验证 GPU 资源  | 检查 `nvidia.com/gpu: 40`                        | 确认虚拟 GPU 槽位已注册 |
| 基础 GPU 调度  | 单 GPU Pod 分配                                  | 验证调度器基本功能      |
| GPU 共享       | 将 3 个 Pod 集中到同一张 GPU                     | 测试并发 GPU 访问       |
| 显存与算力限制 | 强制执行 `gpumem` 和 `gpucores`                  | 验证资源约束            |
| 百分比显存     | 申请 30% GPU 显存                                | 测试百分比分配          |
| 多 GPU 分配    | 单 Pod 绑定 2 张 GPU                             | 验证多 GPU 绑定         |

## 前提条件

<Tabs groupId="os">
<TabItem value="macos" label="macOS" default>

- macOS，Intel 或 Apple Silicon 均可
- 已安装并运行 [Docker Desktop](https://www.docker.com/products/docker-desktop/) 或 [OrbStack](https://orbstack.dev/)
- 可使用 [Homebrew](https://brew.sh/)

安装前提工具：

```bash
brew install kind kubectl helm
```

验证版本：

```bash
kind version                     # 0.20+
kubectl version --client --short # 1.31+
helm version                     # 3.x
```

</TabItem>
<TabItem value="linux" label="Linux (Ubuntu)">

- Ubuntu 20.04 LTS 或更高版本，x86_64
- 已安装并运行 [Docker Engine](https://docs.docker.com/engine/install/ubuntu/)

安装前提工具：

```bash
# kind
KIND_VERSION=v0.33.0
curl -Lo ./kind "https://kind.sigs.k8s.io/dl/${KIND_VERSION}/kind-linux-amd64"
chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl && rm kubectl

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

验证版本：

```bash
kind version                     # 0.20+
kubectl version --client --short # 1.31+
helm version                     # 3.x
```

</TabItem>
</Tabs>

:::tip

Windows 用户请使用 [WSL2](https://learn.microsoft.com/zh-cn/windows/wsl/install) 配合 Ubuntu，并按照上面的 Linux 选项卡操作。

:::

## 步骤 1：创建 kind 集群

```bash
kind create cluster --name nvml-mock-test
```

## 步骤 2：部署 nvml-mock

nvml-mock 提供一个虚假的 `libnvidia-ml.so`、虚拟的 `/dev/nvidia*` 设备节点以及 PCI 拓扑条目，让 HAMi 的 device-plugin 在节点上看到 4 张 GB300 GPU。

容器镜像（`ghcr.io/nvidia/nvml-mock`）和 Helm Chart 均由 [NVIDIA/k8s-test-infra](https://github.com/NVIDIA/k8s-test-infra) 项目发布到 GitHub Container Registry，因此无需克隆仓库或自行构建。

### 2.1 通过 Helm 安装

```bash
helm install nvml-mock oci://ghcr.io/nvidia/k8s-test-infra/chart/nvml-mock \
  --version 0.7.0 \
  --namespace nvml-mock --create-namespace \
  --wait
```

该 Chart 的默认配置文件是 `gb300`：每节点 4 张 GB300 GPU，每张 284672 MiB（278 GiB）显存，驱动版本 `580.65.06`，虚假驱动根目录位于 `/var/lib/nvml-mock/driver`。这个驱动根路径会在步骤 3 中传给 HAMi。

:::tip

如需模拟其他 GPU 型号，可添加 `--set gpu.profile=<name>`（`a100`、`h100`、`b200`、`gb200`、`l40s`、`t4`、`vrnvl72`）。本实验的预期输出均基于默认的 `gb300` 配置文件。

:::

### 2.2 验证 GPU 发现

运行 nvml-mock Pod 中自带的模拟 `nvidia-smi`。如果提示 `container not found`，说明 Pod 仍在启动，请稍等几秒后重试：

```bash
kubectl -n nvml-mock exec daemonset/nvml-mock -- nvidia-smi -L
```

预期输出：

```plaintext
GPU 0: NVIDIA GB300 NVL (UUID: GPU-b300b300-0000-0000-0000-000000000000)
GPU 1: NVIDIA GB300 NVL (UUID: GPU-b300b300-0000-0000-0000-000000000001)
GPU 2: NVIDIA GB300 NVL (UUID: GPU-b300b300-0000-0000-0000-000000000002)
GPU 3: NVIDIA GB300 NVL (UUID: GPU-b300b300-0000-0000-0000-000000000003)
```

## 步骤 3：部署 HAMi

HAMi 通过其公开的 Helm Chart 仓库安装，因此无需自行构建。

### 3.1 通过 Helm 安装

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update

helm install hami hami-charts/hami \
  --namespace hami-system \
  --create-namespace \
  --version 2.11.0 \
  --set devicePlugin.nvidiaDriverRoot=/var/lib/nvml-mock/driver \
  --set devicePlugin.nvidiaNodeSelector.gpu=null
```

- `devicePlugin.nvidiaDriverRoot` 让 HAMi 指向由 nvml-mock 安装的虚假驱动库。
- `devicePlugin.nvidiaNodeSelector.gpu=null` 清除 Chart 默认的 `gpu=on` 节点选择器，因此无需先给节点打标签，device-plugin 就能在节点上运行。

### 3.2 验证部署

```bash
kubectl -n hami-system rollout status daemonset/hami-device-plugin --timeout=120s
kubectl -n hami-system get pods -l app.kubernetes.io/name=hami
```

预期输出：

```plaintext
NAME                              READY   STATUS    RESTARTS   AGE
hami-device-plugin-7ln9b          2/2     Running   0          75s
hami-scheduler-7cc7557795-l7mh8   2/2     Running   0          78s
```

## 步骤 4：验证 GPU 资源

HAMi 将每张物理 GPU 切分成 10 个虚拟槽位。节点有 4 张物理 GPU，因此应该对外提供 **40** 个可分配的虚拟 GPU。

```bash
kubectl get nodes \
  -o custom-columns='NODE:.metadata.name,GPU_CAPACITY:.status.capacity.nvidia\.com/gpu,GPU_ALLOCATABLE:.status.allocatable.nvidia\.com/gpu'
```

预期输出：

```plaintext
NODE                           GPU_CAPACITY   GPU_ALLOCATABLE
nvml-mock-test-control-plane   40             40
```

`GPU_CAPACITY` 和 `GPU_ALLOCATABLE` 都显示 `40`，确认 device-plugin 已在该节点上注册全部虚拟 GPU 槽位。

## 步骤 5：测试基础 GPU 调度

部署一个最小化的 Pod，申请一张 GPU。`CUDA_DISABLE_CONTROL=true` 阻止 HAMi 注入的 CUDA shim 尝试真实设备访问：

```bash
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test-1
spec:
  containers:
  - name: sleep
    image: busybox
    command: ["sleep", "3600"]
    env:
    - name: CUDA_DISABLE_CONTROL
      value: "true"
    resources:
      limits:
        nvidia.com/gpu: 1
EOF
```

等待 Pod 运行：

```bash
kubectl get pod gpu-test-1 -w
```

预期输出：

```plaintext
NAME         READY   STATUS    RESTARTS   AGE
gpu-test-1   1/1     Running   0          4s
```

验证分配注解：

```bash
kubectl describe pod gpu-test-1 | grep vgpu-devices-allocated
```

预期输出：

```plaintext
hami.io/vgpu-devices-allocated: GPU-b300b300-0000-0000-0000-000000000003,NVIDIA,284672,100:;
```

> 注解格式为 `<UUID>,<厂商>,<显存MiB>,<算力>`。GB300 GPU 有 284672 MiB 显存，由于该 Pod 没有设置显存限制，它获得了整张卡。看到这个注解即确认调度器分配并记录了一张 GPU。你实际运行时选中的 GPU（UUID 的最后一位）可能不同。

## 步骤 6：测试 GPU 共享（时间片）

再部署三个 Pod，每个申请 1 张 GPU 和 20000 MiB 显存。`hami.io/gpu-scheduler-policy: "binpack"` 注解让调度器把它们集中放到同一张物理 GPU 上，而不是分散到不同的卡：

```bash
for i in 2 3 4; do
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test-$i
  annotations:
    hami.io/gpu-scheduler-policy: "binpack"
spec:
  containers:
  - name: sleep
    image: busybox
    command: ["sleep", "3600"]
    env:
    - name: CUDA_DISABLE_CONTROL
      value: "true"
    resources:
      limits:
        nvidia.com/gpu: 1
        nvidia.com/gpumem: "20000"
EOF
done
```

:::warning

循环内请使用 `<<EOF`，而不是 `<<'EOF'` 单引号分隔符会抑制 shell 展开。`$i` 不会被替换，三个 Pod 都会得到相同的名字。

:::

验证所有 Pod 都在运行：

```bash
kubectl get pods | grep gpu-test
```

预期输出：

```plaintext
gpu-test-1   1/1     Running   0          8m27s
gpu-test-2   1/1     Running   0          18s
gpu-test-3   1/1     Running   0          17s
gpu-test-4   1/1     Running   0          17s
```

查看每个 Pod 被分配到哪张物理 GPU：

```bash
kubectl get pods \
  -o custom-columns='POD:.metadata.name,ALLOCATED:.metadata.annotations.hami\.io/vgpu-devices-allocated'
```

预期输出：

```plaintext
POD          ALLOCATED
gpu-test-1   GPU-b300b300-0000-0000-0000-000000000003,NVIDIA,284672,100:;
gpu-test-2   GPU-b300b300-0000-0000-0000-000000000002,NVIDIA,20000,0:;
gpu-test-3   GPU-b300b300-0000-0000-0000-000000000002,NVIDIA,20000,0:;
gpu-test-4   GPU-b300b300-0000-0000-0000-000000000002,NVIDIA,20000,0:;
```

`gpu-test-2`、`gpu-test-3` 和 `gpu-test-4` 的 GPU UUID 相同，各占 20000 MiB，说明三个 Pod 共享同一张物理 GPU，而 `gpu-test-1` 独占自己的那张卡。最后一个字段的 `0` 表示没有申请算力限制。

## 步骤 7：测试显存和算力限制

```bash
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: gpu-limits
spec:
  containers:
  - name: sleep
    image: busybox
    command: ["sleep", "3600"]
    env:
    - name: CUDA_DISABLE_CONTROL
      value: "true"
    resources:
      limits:
        nvidia.com/gpu: 1
        nvidia.com/gpumem: "10"
        nvidia.com/gpucores: "30"
EOF
```

:::info

资源限制格式 `nvidia.com/gpumem` 接受**以 MiB 为单位的绝对值**：`"10"` 表示 10 MiB。`nvidia.com/gpucores: "30"` 表示在所选 GPU 上申请 30% 的计算算力。

:::

验证分配：

```bash
kubectl describe pod gpu-limits | grep vgpu-devices-allocated
```

预期输出：

```plaintext
hami.io/vgpu-devices-allocated: GPU-b300b300-0000-0000-0000-000000000001,NVIDIA,10,30:;
```

注解记录了 `10` MiB 和 `30`（即 30% 的计算算力），正是所申请的值。

## 步骤 8：测试百分比显存申请

除了固定的 MiB 值，`nvidia.com/gpumem-percentage` 让你申请 GPU 总显存的一个比例。在 GB300（284672 MiB）上，申请 30% 会分配 85401 MiB。

:::tip

为什么要用百分比分配？当你想让工作负载在不同 GPU 型号上按比例扩展，而不必硬编码绝对大小时，这非常有用。

:::

创建 Pod：

```bash
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: gpu-mem-30pct
spec:
  containers:
  - name: sleep
    image: busybox
    command: ["sleep", "3600"]
    env:
    - name: CUDA_DISABLE_CONTROL
      value: "true"
    resources:
      limits:
        nvidia.com/gpu: 1
        nvidia.com/gpumem-percentage: "30"
EOF
```

等待 Pod 进入 `Running` 状态：

```bash
kubectl get pod gpu-mem-30pct -w
```

预期输出：

```plaintext
NAME            READY   STATUS    RESTARTS   AGE
gpu-mem-30pct   1/1     Running   0          2s
```

查看分配注解：

```bash
kubectl get pod gpu-mem-30pct \
  -o jsonpath='{.metadata.annotations.hami\.io/vgpu-devices-allocated}'
```

预期输出：

```plaintext
GPU-b300b300-0000-0000-0000-000000000000,NVIDIA,85401,0:;
```

> 第三个字段显示 `85401` MiB（即 284672 MiB 的 30%，向下取整），确认调度器正确地将百分比转换为本次分配的绝对显存预算。

## 步骤 9：测试多 GPU 分配

申请 2 张 GPU，每张 20000 MiB 显存。这里的显存限制很重要：如果不设置，该 Pod 需要两张完全空闲的卡，而经过前面的步骤，4 张 GPU 上都已经有分配了。

```bash
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: gpu-multi
spec:
  containers:
  - name: sleep
    image: busybox
    command: ["sleep", "3600"]
    env:
    - name: CUDA_DISABLE_CONTROL
      value: "true"
    resources:
      limits:
        nvidia.com/gpu: "2"
        nvidia.com/gpumem: "20000"
EOF
```

验证 Pod 正在运行：

```bash
kubectl get pod gpu-multi
```

预期输出：

```plaintext
NAME        READY   STATUS    RESTARTS   AGE
gpu-multi   1/1     Running   0          2s
```

查看调度器事件：

```bash
kubectl describe pod gpu-multi | tail -10
```

预期输出：

```plaintext
Events:
  Type    Reason            Age   From            Message
  ----    ------            ----  ----            -------
  Normal  Scheduled         2s    hami-scheduler  Successfully assigned default/gpu-multi to nvml-mock-test-control-plane
  Normal  FilteringSucceed  2s    hami-scheduler  find fit node(nvml-mock-test-control-plane), 0 nodes not fit, 1 nodes fit(nvml-mock-test-control-plane:8.53)
  Normal  BindingSucceed    2s    hami-scheduler  Successfully binding node [nvml-mock-test-control-plane] to default/gpu-multi
  Normal  Pulling           1s    kubelet         Pulling image "busybox"
  Normal  Pulled            0s    kubelet         Successfully pulled image "busybox" in 723ms (723ms including waiting). Image size: 1926012 bytes.
  Normal  Created           0s    kubelet         Container created
  Normal  Started           0s    kubelet         Container started
```

`hami-scheduler` 事件：`FilteringSucceed`、`Scheduled` 和 `BindingSucceed`，确认 HAMi 的调度器处理了这个 Pod，并成功将其绑定到节点。

查看分配注解：

```bash
kubectl get pod gpu-multi \
  -o jsonpath='{.metadata.annotations.hami\.io/vgpu-devices-allocated}'
```

预期输出：

```plaintext
GPU-b300b300-0000-0000-0000-000000000000,NVIDIA,20000,0:GPU-b300b300-0000-0000-0000-000000000001,NVIDIA,20000,0:;
```

注解中包含两个以冒号分隔、UUID 不同的设备条目，每个对应一张已分配的 GPU，各占 20000 MiB。

## 已验证功能总结

| 功能 | 测试 Pod | 如何验证 |
| --- | --- | --- |
| 基础 GPU 调度 | `gpu-test-1` | 注解显示 1 个 GPU UUID + 284672 MiB |
| GPU 共享（时间片） | `gpu-test-2` 到 `gpu-test-4` | 3 个注解显示相同的 GPU UUID |
| 显存限制（`gpumem`） | `gpu-limits` | 注解显示 `10` MiB |
| 算力限制（`gpucores`） | `gpu-limits` | 注解显示 `30`（30% 的计算算力） |
| 百分比显存（`gpumem-percentage`） | `gpu-mem-30pct` | 注解显示 `85401` MiB（GB300 的 30%） |
| 多 GPU 分配 | `gpu-multi` | 注解列出 2 个 GPU UUID；hami-scheduler 事件显示 `BindingSucceed` |

:::warning 以下功能仍需要真实 GPU

- 实际 CUDA 程序执行
- `gpumem` 和 `gpucores` 限制的运行时强制执行
- 真实的 DCGM GPU 指标（温度、利用率）
- 显存超卖和显存覆盖功能

:::

## 清理

删除所有测试 Pod：

```bash
kubectl delete pod gpu-test-1 gpu-test-2 gpu-test-3 gpu-test-4 \
  gpu-limits gpu-mem-30pct gpu-multi
```

卸载 HAMi：

```bash
helm uninstall hami -n hami-system
```

卸载 nvml-mock：

```bash
helm uninstall nvml-mock -n nvml-mock
```

删除 kind 集群：

```bash
kind delete cluster --name nvml-mock-test
```

:::tip

如果你想保留环境以便继续实验，可以跳过删除集群这一步。

:::

## 下一步

- 切换到真实 GPU 集群（参见 [实验 1：在线安装 HAMi](/tutorials/labs/online-install)），用真实 CUDA 工作负载测试显存和算力隔离。
- 在模拟环境中直接添加 GPU 指标：NVIDIA GPU Operator 的 `dcgm-exporter` 可以读取 nvml-mock 驱动，并将指标送入 Prometheus 和 Grafana（参见 [nvml-mock 可观测性配置](https://github.com/NVIDIA/k8s-test-infra/tree/main/local/observability)）。
- 安装 Prometheus 和 HAMi WebUI 进行可视化资源跟踪（参见 [实验 2：本地 Fake GPU 安装](/tutorials/labs/local-fake-gpu)）。
