---
title: "实验 14: 在 GKE 上验证可组合调度策略"
description: "在挂载四块 Tesla T4 的 GKE 节点上安装 HAMi v2.10.0，并通过分配注解与调度器日志观察 spread、binpack、mutex 以及组合的 mutex,binpack 策略链。"
sidebar_label: "实验 14: 组合调度策略"
lab:
  level: Intermediate
  duration: 约 60 分钟
  environment: GKE 1.35、COS、containerd，单节点四块 NVIDIA Tesla T4
  cost: 需要付费的 GKE GPU 节点（多数区域约每小时 2 美元）
  authors:
    - rootsongjc
tags:
  - 调度
  - gpu-sharing
  - gke
toc_max_heading_level: 2
---

本实验在单台挂载四块 Tesla T4 的 GKE 节点上部署 HAMi v2.10.0，然后端到端演练可组合的 `hami.io/gpu-scheduler-policy` 特性：默认 `spread` 行为、`binpack` 堆叠、`mutex` 过滤器的阻塞与释放，以及组合的 `mutex,binpack` 策略链。在这条链里，过滤器会明显改变纯 `binpack` 本会选择的结果。每个放置结果都通过 HAMi 调度器写在 Pod 上的分配注解验证，因此实验不要求工作负载容器内能执行 CUDA。

## 你将学到什么

- 在 GKE 上安装 HAMi v2.10.0，并将 device plugin 指向 GKE 托管驱动与其可写路径；
- 从 `hami.io/vgpu-devices-allocated` 注解读取调度器的放置决策；
- 在一台四卡节点上分别观察 `spread`、`binpack` 和 `mutex`；
- 证明 `mutex,binpack` 先过滤候选、再排序；以及
- 在调度器日志中查看每张卡的打分。

## 实验总览

```mermaid
%% title: 可组合调度策略实验流程
flowchart LR
    S1["步骤 1<br/>创建 GKE 集群"] --> S2["步骤 2<br/>接管 GPU"]
    S2 --> S3["步骤 3<br/>安装 HAMi v2.10.0"]
    S3 --> S4["步骤 4<br/>默认 spread"]
    S4 --> S5["步骤 5<br/>binpack 堆叠"]
    S5 --> S6["步骤 6<br/>mutex 阻塞与释放"]
    S6 --> S7["步骤 7<br/>组合 mutex,binpack"]
    S7 --> S8["步骤 8<br/>查看调度器打分"]
```

## 前提条件

- 一个启用了 GKE 和 Compute Engine API 并开通计费的 GCP 项目。
- `gcloud`、与 GKE API server 小版本相差不超过一个 minor 的 `kubectl`，以及 Helm 3 或 4。
- [`tutorials/labs/examples/14-composable-scheduler-policies-gke/`](https://github.com/Project-HAMi/website/tree/master/tutorials/labs/examples/14-composable-scheduler-policies-gke) 下的文件。

节点规格为一台 `n1-standard-8` 挂四块 T4。请先确认 GPU 配额：本实验在该区域需要 4 个 `NVIDIA_T4_GPUS`。由于 GKE 补丁版本会过期，请先选出你所在区域可用的 1.35 版本，再用它创建集群：

```bash
export GKE_VERSION=$(gcloud container get-server-config \
  --zone=asia-northeast1-a \
  --format='value(validMasterVersions)' | tr ';' '\n' | grep '^1\.35\.' | head -1)
test -n "$GKE_VERSION"

gcloud container clusters create hami-policy-lab --zone=asia-northeast1-a \
  --cluster-version="$GKE_VERSION" \
  --machine-type=n1-standard-8 --num-nodes=1 \
  --image-type=COS_CONTAINERD \
  --accelerator=type=nvidia-tesla-t4,count=4,gpu-driver-version=default
gcloud container clusters get-credentials hami-policy-lab \
  --zone=asia-northeast1-a
```

本次运行解析出的 `GKE_VERSION` 为 `1.35.7-gke.1150000`，集群约 5 分钟创建完成。GPU 节点按量计费，实验结束后请执行清理章节。

## 步骤 1: 验证 GKE GPU 环境

确认节点通过 GKE 默认 device plugin 上报了四块 GPU：

```bash
kubectl get nodes \
  -o custom-columns="NAME:.metadata.name,GPU:.status.capacity.nvidia\.com/gpu,ACCEL:.metadata.labels.cloud\.google\.com/gke-accelerator"
```

```plaintext
NAME                                             GPU   ACCEL
gke-hami-policy-lab-default-pool-0c191cbd-fnwq   4     nvidia-tesla-t4
```

GKE 1.35 的默认 device plugin 以 `nvidia-gpu-device-plugin-small-cos` 之名运行于 `kube-system`，而驱动本身安装在节点的 `/home/kubernetes/bin/nvidia` 下。这两个事实在后续步骤中都会用到。

## 步骤 2: 把 GPU 交给 HAMi

HAMi 的 device plugin 会自行注册 `nvidia.com/gpu`，因此 GKE 默认的 NVIDIA device plugin 不能在同一节点上争抢同一资源。用 GKE 专用标签保持其禁用状态，并打上 HAMi chart 所选择的 `gpu=on` 标签：

```bash
kubectl get pods -n kube-system -o wide | grep -E 'nvidia.*device-plugin'
kubectl label node -l cloud.google.com/gke-accelerator=nvidia-tesla-t4 \
  gke-no-default-nvidia-gpu-device-plugin=true --overwrite
kubectl label node -l cloud.google.com/gke-accelerator=nvidia-tesla-t4 \
  gpu=on --overwrite
sleep 20
kubectl get pods -n kube-system -o wide | grep -E 'nvidia.*device-plugin' || \
  echo "No GKE device-plugin Pods left on the GPU node"
```

第一条 `grep` 显示 GKE 插件仍在运行；打标后它就消失了：

```plaintext
NAME                                      READY   STATUS    RESTARTS   AGE     IP           NODE
nvidia-gpu-device-plugin-small-cos-h6g47  3/3     Running   0          2m34s   10.146.0.18  gke-hami-policy-lab-default-pool-0c191cbd-fnwq
...
No GKE device-plugin Pods left on the GPU node
```

GKE 的驱动安装器会保留驱动本身，退让的只是 device plugin。在 HAMi 注册自己的资源之前，节点暂时不再通告 `nvidia.com/gpu` 容量：

```bash
kubectl get node -o custom-columns='NAME:.metadata.name,VGPU:.status.allocatable.nvidia\.com/gpu'
```

```plaintext
NAME                                             VGPU
gke-hami-policy-lab-default-pool-0c191cbd-fnwq   0
```

## 步骤 3: 用 GKE 路径安装 HAMi v2.10.0

有三处 GKE 特殊性决定了 Helm 参数，均在本次运行中实际观察到：

- 托管驱动位于 `/home/kubernetes/bin/nvidia` 之下（`nvidiaDriverRoot`）；COS 的根文件系统只读，因此 vGPU hook 目录也要放到 GKE 可写的 NVIDIA 目录树下（`gpuHookPath`、`libPath`），monitor 的容器跟踪路径也要一并迁移（`monitor.ctrPath`），否则容器创建会以 `mkdir /usr/local/vgpu: read-only file system` 失败；
- 插件容器需要 `LD_LIBRARY_PATH=/driver-root/lib64` 才能从 GKE 驱动目录加载 NVML，否则以 `invalid device discovery strategy` 退出；
- `devicePlugin.extraEnvs` 必须是以 `{name, value}` 对象组成的列表并用 `--set-json` 传入；直接 `--set devicePlugin.extraEnvs.X=Y` 会渲染出非法 YAML，导致整个安装失败。

安装已发布的 chart：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
helm install hami hami-charts/hami -n kube-system --version 2.10.0 \
  --set devicePlugin.nvidiaDriverRoot=/home/kubernetes/bin/nvidia \
  --set global.gpuHookPath=/home/kubernetes/bin/nvidia \
  --set devicePlugin.libPath=/home/kubernetes/bin/nvidia/vgpu \
  --set devicePlugin.monitor.ctrPath=/home/kubernetes/bin/nvidia/vgpu/containers \
  --set-json 'devicePlugin.extraEnvs=[{"name":"LD_LIBRARY_PATH","value":"/driver-root/lib64"}]'

kubectl -n kube-system rollout status deploy/hami-scheduler --timeout=300s
kubectl -n kube-system get pods -l app.kubernetes.io/instance=hami
```

安装后，插件 Pod 可以运行，但它的第二个容器 `vgpu-monitor` 会一直 `CrashLoopBackOff`：

```plaintext
NAME                             READY   STATUS             RESTARTS        AGE
hami-admission-patch-g9lws       0/1     Completed          0               28m
hami-device-plugin-h4z6l         1/2     CrashLoopBackOff   10 (4m5s ago)   30m
hami-scheduler-87f65f795-84l6d   2/2     Running            0               46m
```

其日志以 `failed to initialize NVML` 结尾：monitor 容器非特权，在 COS 上看不到 `/dev/nvidia*` 与 `/proc/driver/nvidia`，即使修好库路径也无法与内核驱动通信。monitor 只负责导出 Prometheus 指标；本实验验证的是调度决策而非指标，因此直接移除这个容器，让 DaemonSet 稳定下来：

```bash
kubectl -n kube-system patch ds hami-device-plugin --type=json \
  -p '[{"op":"remove","path":"/spec/template/spec/containers/1"}]'
kubectl -n kube-system rollout status ds/hami-device-plugin --timeout=300s
kubectl -n kube-system get pods -l app.kubernetes.io/component=hami-device-plugin
```

```plaintext
NAME                       READY   STATUS    RESTARTS   AGE
hami-device-plugin-dccvh   1/1     Running   0          56s
```

在插件日志和节点上验证注册结果。四块 T4 在默认切分数量 10 下注册为 40 个可调度的 vGPU：

```bash
kubectl -n kube-system logs ds/hami-device-plugin -c device-plugin --tail=6 | grep Registered
kubectl get node -o custom-columns='NAME:.metadata.name,VGPU:.status.allocatable.nvidia\.com/gpu'
```

```plaintext
I0818 11:13:31.444220   12404 register.go:204] Registered device id=0, memory=15360MB, type=NVIDIA-Tesla T4, numa=0, health=true
I0818 11:13:31.444395   12404 register.go:204] Registered device id=1, memory=15360MB, type=NVIDIA-Tesla T4, numa=0, health=true
I0818 11:13:31.444568   12404 register.go:204] Registered device id=2, memory=15360MB, type=NVIDIA-Tesla T4, numa=0, health=true
I0818 11:13:31.444719   12404 register.go:204] Registered device id=3, memory=15360MB, type=NVIDIA-Tesla T4, numa=0, health=true
NAME                                             VGPU
gke-hami-policy-lab-default-pool-0c191cbd-fnwq   40
```

## 步骤 4: 基线，默认的 `spread` 策略

所有实验 Pod 都带 `hami.run/lab-14` 标签，申请 1 个 vGPU、1000 MiB 显存切片，并以只读方式挂载宿主机驱动的 `lib64`。最后一点是 GKE 上的必需项，而非 HAMi 的通用要求：HAMi 会通过 `/etc/ld.so.preload` 把 `libvgpu.so` 注入每个 vGPU Pod，`libvgpu.so` 依赖 `libcuda.so.1`，而 GKE 上没有其他组件会向容器内提供驱动库。不挂载的话，所有工作负载都会在启动时报 `bash: error while loading shared libraries: libcuda.so.1` 并退出。

先定义一个打印每个 Pod 所选卡片的辅助函数，后续每一步都会复用：

```bash
lab-card() {
  kubectl get pods -l hami.run/lab-14 --no-headers -o custom-columns=\
'POD:.metadata.name,CARD:.metadata.annotations.hami\.io/vgpu-devices-allocated'
}
```

部署两个**不带**策略注解的 Pod。卡级选择的 chart 默认值是 `spread`：

```bash
kubectl apply \
  -f tutorials/labs/examples/14-composable-scheduler-policies-gke/01-spread-pods.yaml
kubectl wait --for=condition=Ready pod/policy-spread-a pod/policy-spread-b \
  --timeout=5m
lab-card
```

```plaintext
policy-spread-a   GPU-3c5f3637-e911-b226-7a4c-52da87c38aff,NVIDIA,1000,0:;
policy-spread-b   GPU-66116373-061e-a66b-28a3-c60c4877e16e,NVIDIA,1000,0:;
```

注解格式为 `{UUID},{厂商},{显存 MiB},{算力 %}`。两个 UUID **不同**：在 `spread` 下，第二个 Pod 避开了已有租户的那张卡。

## 步骤 5: `binpack` 堆叠到最忙的卡

接着部署两个带 `hami.io/gpu-scheduler-policy: "binpack"` 注解的 Pod：

```bash
kubectl apply \
  -f tutorials/labs/examples/14-composable-scheduler-policies-gke/02-binpack-pods.yaml
kubectl wait --for=condition=Ready pod/policy-binpack-a pod/policy-binpack-b \
  --timeout=5m
lab-card
```

```plaintext
policy-binpack-a   GPU-3c5f3637-e911-b226-7a4c-52da87c38aff,NVIDIA,1000,0:;
policy-binpack-b   GPU-3c5f3637-e911-b226-7a4c-52da87c38aff,NVIDIA,1000,0:;
policy-spread-a    GPU-3c5f3637-e911-b226-7a4c-52da87c38aff,NVIDIA,1000,0:;
policy-spread-b    GPU-66116373-061e-a66b-28a3-c60c4877e16e,NVIDIA,1000,0:;
```

两个 `binpack` Pod 落在了**与 `policy-spread-a` 相同的 UUID** 上，也就是原本就有租户的那张卡。`binpack` 偏好使用率最高的合格卡，让租户集中、让其他卡保持整卡空闲。此时节点状态为：`GPU-3c5f…` 上三个 Pod，`GPU-6611…` 上一个 Pod，另有两张空闲卡。

## 步骤 6: `mutex` 的独占放置、阻塞与释放

部署两个带 `mutex` 注解的 Pod。只有**当前零用户**的卡才合格，因此它们必然落在两张空闲卡上：

```bash
kubectl apply \
  -f tutorials/labs/examples/14-composable-scheduler-policies-gke/03-mutex-pods.yaml
kubectl wait --for=condition=Ready pod/policy-mutex-a pod/policy-mutex-b \
  --timeout=5m
lab-card
```

```plaintext
policy-binpack-a   GPU-3c5f3637-e911-b226-7a4c-52da87c38aff,NVIDIA,1000,0:;
policy-binpack-b   GPU-3c5f3637-e911-b226-7a4c-52da87c38aff,NVIDIA,1000,0:;
policy-mutex-a     GPU-f147e096-f059-d618-77b4-890c70ef7468,NVIDIA,1000,0:;
policy-mutex-b     GPU-77b9c63c-e3cb-8207-c355-5f65d684d2d8,NVIDIA,1000,0:;
policy-spread-a    GPU-3c5f3637-e911-b226-7a4c-52da87c38aff,NVIDIA,1000,0:;
policy-spread-b    GPU-66116373-061e-a66b-28a3-c60c4877e16e,NVIDIA,1000,0:;
```

`policy-mutex-a` 和 `policy-mutex-b` 占据了两张此前空闲的卡。尽管 `GPU-3c5f…` 的剩余容量最大，它们也没有落在上面，因为已有用户的卡会被整个过滤掉。

现在四张卡都有用户了。部署第三个 `mutex` Pod，观察它保持 Pending：

```bash
kubectl apply \
  -f tutorials/labs/examples/14-composable-scheduler-policies-gke/04-mutex-blocked.yaml
sleep 20
kubectl get pod policy-mutex-c
kubectl describe pod policy-mutex-c | sed -n '/Events:/,$p' | head -8
```

```plaintext
NAME            READY   STATUS    RESTARTS   AGE
policy-mutex-c  0/1     Pending   0          26s

Events:
  Type     Reason             Age                From           Message
  ----     ------             ----               ----           -------
  Warning  FailedScheduling   32s                hami-scheduler  0/1 nodes are available: 1 4/4 ExclusiveDeviceAllocateConflict. no new claims to deallocate, preemption: 0/1 nodes are available: 1 No preemption victims found for incoming pod.
  Warning  FilteringFailed    31s (x3 over 32s)  hami-scheduler  1 nodes ExclusiveDeviceAllocateConflict(gke-hami-policy-lab-default-pool-0c191cbd-fnwq)
```

事件信息说得明明白白：**`4/4 ExclusiveDeviceAllocateConflict`**：`mutex` 过滤器拒绝了全部四张卡。现在删除 `policy-spread-b` 释放 `GPU-6611…`，观察被阻塞的 Pod 恰好接手这张卡：

```bash
kubectl delete pod policy-spread-b
kubectl wait --for=condition=Ready pod/policy-mutex-c --timeout=3m
lab-card
```

```plaintext
policy-binpack-a   GPU-3c5f3637-e911-b226-7a4c-52da87c38aff,NVIDIA,1000,0:;
policy-binpack-b   GPU-3c5f3637-e911-b226-7a4c-52da87c38aff,NVIDIA,1000,0:;
policy-mutex-a     GPU-f147e096-f059-d618-77b4-890c70ef7468,NVIDIA,1000,0:;
policy-mutex-b     GPU-77b9c63c-e3cb-8207-c355-5f65d684d2d8,NVIDIA,1000,0:;
policy-mutex-c     GPU-66116373-061e-a66b-28a3-c60c4877e16e,NVIDIA,1000,0:;
policy-spread-a    GPU-3c5f3637-e911-b226-7a4c-52da87c38aff,NVIDIA,1000,0:;
```

`policy-mutex-c` 落在了原先由 `policy-spread-b` 占用的 UUID 上，这是绑定时唯一零用户的卡。

## 步骤 7: 组合 `mutex,binpack`，过滤先于排序

先清场，让场景确定：

```bash
kubectl delete pods -l hami.run/lab-14
kubectl wait --for=delete pod -l hami.run/lab-14 --timeout=2m
```

在空节点上构建以下状态：

1. 一个普通租户 Pod（默认 `spread`）落在某张卡上，称之为卡 X。
2. 两个带 `mutex,binpack` 注解的 Pod。
3. 再来一个纯 `binpack` 注解的 Pod 作为对照。

```bash
kubectl apply \
  -f tutorials/labs/examples/14-composable-scheduler-policies-gke/05-composed-tenant.yaml
kubectl wait --for=condition=Ready pod/policy-tenant --timeout=5m

kubectl apply \
  -f tutorials/labs/examples/14-composable-scheduler-policies-gke/06-composed-pods.yaml
kubectl wait --for=condition=Ready pod/policy-combined-a pod/policy-combined-b \
  --timeout=5m

kubectl apply \
  -f tutorials/labs/examples/14-composable-scheduler-policies-gke/07-binpack-contrast.yaml
kubectl wait --for=condition=Ready pod/policy-binpack-solo --timeout=5m
lab-card
```

```plaintext
policy-binpack-solo   GPU-3c5f3637-e911-b226-7a4c-52da87c38aff,NVIDIA,1000,0:;
policy-combined-a     GPU-66116373-061e-a66b-28a3-c60c4877e16e,NVIDIA,1000,0:;
policy-combined-b     GPU-f147e096-f059-d618-77b4-890c70ef7468,NVIDIA,1000,0:;
policy-tenant         GPU-3c5f3637-e911-b226-7a4c-52da87c38aff,NVIDIA,1000,0:;
```

读 UUID 之间的关系：

- `policy-tenant` 与 `policy-binpack-solo` 共享卡 X（`GPU-3c5f…`）：纯 `binpack` 有意堆叠到已有用户的那张卡上，与步骤 5 的行为一致。
- `policy-combined-a` 和 `policy-combined-b` 落在**另外两张不同的卡**上：`mutex` 过滤器把卡 X 从它们的候选集中移除了，尽管纯 `binpack` 本来更偏好卡 X；`mutex` 还让第二个组合 Pod 避开了第一个组合 Pod 所在的卡。

这一个输出就是整个特性的缩影：**`mutex,binpack` 没有选择纯 `binpack` 会选择的卡，因为过滤器在排序键之前剪掉了候选。**

顺带一个值得记录的观察：放置结果可复现。步骤 4、6、7 中，进入相同初始状态的第一个 Pod 总是落在 `GPU-3c5f…`，下一个需要不同卡的 Pod 落在 `GPU-6611…`，这正是确定性的设备索引决胜在起作用。

## 步骤 8: 在调度器日志中查看打分

调度器 extender 在过滤时为每张候选卡输出一行打分日志。在步骤 7 的 Pod 运行期间，回放这些决策：

```bash
kubectl -n kube-system logs deploy/hami-scheduler -c vgpu-scheduler-extender \
  --tail=-1 | grep 'computer score' | tail -n 4
```

```plaintext
I0818 11:39:13.896863       1 gpu_policy.go:221] device GPU-77b9c63c-e3cb-8207-c355-5f65d684d2d8 computer score is 0.000000
I0818 11:39:13.896878       1 gpu_policy.go:221] device GPU-f147e096-f059-d618-77b4-890c70ef7468 computer score is 1.651042
I0818 11:39:13.896891       1 gpu_policy.go:221] device GPU-66116373-061e-a66b-28a3-c60c4877e16e computer score is 1.651042
I0818 11:39:13.896904       1 gpu_policy.go:221] device GPU-3c5f3637-e911-b226-7a4c-52da87c38aff computer score is 1.651042
```

这几行来自 `policy-binpack-solo` 的调度过程：已有一个 1000 MiB 租户的三张卡得分 `1.651042`，空闲卡得分 `0.000000`，`binpack` 选择得分最高的合格卡。对策略链而言，同样的得分会喂给链上的有序排序键；但链的顺序本身不会出现在日志里，所以步骤 7 的注解对比才是真正的证明。把打分日志与步骤 6 的 `ExclusiveDeviceAllocateConflict` 事件结合起来，你就完整观察到了过滤器、排序键以及它们的先后顺序。

## 故障排查

| 症状 | 本环境中的原因 | 处理 |
| :-- | :-- | :-- |
| Pod 创建报 `mkdir /usr/local/vgpu: read-only file system` | COS 上 monitor 的 `ctrPath` 仍是默认的 `/usr/local/vgpu/containers` | 设置 `devicePlugin.monitor.ctrPath=/home/kubernetes/bin/nvidia/vgpu/containers`，或应用步骤 3 的 monitor patch |
| 插件以 `Incompatible strategy detected auto` / `invalid device discovery strategy` 退出 | 插件容器内无法加载 NVML | 按步骤 3 用 `--set-json` 注入 `LD_LIBRARY_PATH=/driver-root/lib64` |
| `helm upgrade` 报 `daemonsetnvidia.yaml` 的 `did not find expected '-' indicator` | `extraEnvs` 被当成 map 传入；模板要求列表 | 改用 `--set-json 'devicePlugin.extraEnvs=[{"name":"…","value":"…"}]'` |
| `vgpu-monitor` 以 `failed to initialize NVML: ERROR_LIBRARY_NOT_FOUND`（随后 `Driver Not Loaded`）崩溃循环 | 非特权的 monitor 在 COS 上看不到 `/dev/nvidia*` 与 `/proc/driver/nvidia` | 若不需要其指标，用步骤 3 的 patch 移除 monitor 容器 |
| 工作负载 Pod 报 `bash: error while loading shared libraries: libcuda.so.1` 崩溃 | HAMi 的 `ld.so.preload` 注入需要驱动库，而 GKE 不会向容器挂载它们 | 示例清单已挂载 `/home/kubernetes/bin/nvidia/lib64` 并设置 `LD_LIBRARY_PATH`，两者都要保留 |
| 节点同时出现 GKE 与 HAMi 的 GPU 容量，或在 `4` 与 `40` 之间跳变 | GKE 默认 device plugin 与 HAMi 的注册互相竞争 | 保持节点上的 `gke-no-default-nvidia-gpu-device-plugin=true`，然后重启 `hami-device-plugin` |
| Pod 一直 Pending，报 `node(s) didn't match node selector` | GPU 节点缺少 `gpu=on` 标签 | 执行步骤 2 的打标命令 |
| `mutex` Pod Pending，但某张卡“看起来”空闲 | 那张卡仍有已分配的 Pod；`mutex` 要求零用户 | 用 `lab-card` 检查；删除目标卡上的一个租户 |
| `kubectl`/`gcloud`/`helm` 间歇性报 `Unable to connect to the server` | 客户端与 Google API 之间的瞬时 TLS 错误，本次运行中多次出现 | 重试命令即可，集群本身是健康的 |

## 清理

删除实验负载与 HAMi（卸载时会连同步骤 3 的 DaemonSet patch 一起删除）：

```bash
kubectl delete pods -l hami.run/lab-14 --ignore-not-found
helm uninstall hami -n kube-system
```

如果保留集群，请移除禁用标签以恢复 GKE 默认 device plugin：

```bash
kubectl label node -l cloud.google.com/gke-accelerator=nvidia-tesla-t4 \
  gke-no-default-nvidia-gpu-device-plugin- --overwrite
```

如果集群只为本次实验而建，直接删除：

```bash
gcloud container clusters delete hami-policy-lab \
  --zone=asia-northeast1-a
```

## 本实验证明了什么

| 结论 | 证据 |
| :-- | :-- |
| 默认卡策略 `spread` 会分散租户 | 步骤 4：两个 Pod，两个不同的设备 UUID |
| `binpack` 把租户集中到最忙的卡 | 步骤 5：两个 Pod 与已占用卡共享同一 UUID |
| `mutex` 只把 Pod 放到零用户的卡上 | 步骤 6：`mutex` Pod 占据两张空闲卡，从不落在部分占用的卡上 |
| 所有卡都有用户时 `mutex` 阻塞，随后释放 | 步骤 6：先以 `4/4 ExclusiveDeviceAllocateConflict` Pending，随后绑定到被释放的卡 |
| 策略链中过滤器先于排序键执行 | 步骤 7：`mutex,binpack` Pod 避开了纯 `binpack` 选择的卡 |
| 放置结果是确定性的 | 步骤 4、6、7 中相同状态产生了相同的 UUID；步骤 8 记录了逐卡打分 |

## 延伸阅读

- 阅读[《HAMi 可组合调度策略》](/zh/blog/composable-scheduler-policies)了解“先过滤、后排序”模型与更多策略配方。
- 查看[调度策略设计文档](/zh/docs/developers/scheduling)了解 `binpack` 与 `spread` 背后的打分逻辑。
- 在 [HAMi 配置参考](/zh/docs/userguide/configure)中浏览全部按 Pod 生效的注解。
- 继续学习[实验 3: GPU 切分](./gpu-partitioning.md)（运行时显存隔离）或[实验 12: GKE 上的 KAI + HAMi](./kai-scheduler-hami-gke.md)（显存硬隔离姊妹实验）。
