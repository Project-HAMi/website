---
title: GPU 虚拟化原理
translated: true
---

在 AI 推理场景中，一个常见的困境是：GPU 很贵，但大多数时候都是闲的。

一个典型的推理服务往往只占用 GPU 20%~40% 的算力和少量显存，剩余资源就这样空转着。Kubernetes 的默认 GPU 调度模型偏偏是独占的：`nvidia.com/gpu: 1` 意味着整张卡归你，其他 Pod 一律等待。想让多个推理服务共享一张 GPU？标准 Device Plugin 做不到，因为它只能向调度器上报设备数量（整数），根本没有"显存配额"这个概念。

于是出现了各种 GPU 共享方案。NVIDIA 官方的时间切片（Time-Slicing）可以让多个 Pod 同时被调度，但没有显存隔离，一个 Pod OOM 会拖垮整张卡上的所有任务。MIG 硬件分区有真正的隔离，但只有 A100、H100 这类数据中心级卡才支持。

HAMi 走了另一条路：**不改驱动、不改应用**，通过 CUDA API 劫持在软件层实现 GPU 虚拟化，多个 Pod 共享同一张物理 GPU，每个 Pod 只能"看到"自己申请的那部分显存，超额分配直接返回 OOM。这是一个 CNCF Sandbox 项目，前身为 `k8s-vGPU-scheduler`。

本文先从 Kubernetes GPU 调度的原理讲起，理解默认模型的局限性，再深入 HAMi 的架构和实现，看它是如何绕过这些限制的。

## Kubernetes GPU 调度原理

### Device Plugin

Kubernetes 原生不直接管理 GPU 等异构硬件资源。为此，Kubernetes 提供了 **Device Plugin** 扩展机制，允许硬件厂商将自定义设备资源注册到 Kubelet，供调度器使用。

Device Plugin 本身以 **DaemonSet** 方式部署，运行在每个 GPU 节点上，负责向 Kubelet 注册设备、上报资源、响应分配请求。下图展示了从 Device Plugin 启动到 GPU Pod 运行的完整时序：

![Device Plugin 注册到 GPU Pod 运行的完整时序](/img/docs/common/core-concepts/device-plugin-flow.svg)

各步骤说明如下：

| 步骤 | 参与方 | 说明 |
| --- | --- | --- |
| ① | Kubelet | 启动时创建 Registration gRPC 服务，监听 `kubelet.sock`，等待 Device Plugin 注册 |
| ② | Device Plugin | DaemonSet Pod 启动，将宿主机 `kubelet.sock` 挂载到容器内，作为与 Kubelet 通信的入口 |
| ③ | Device Plugin → Kubelet | 通过 `kubelet.sock` 调用 `Register` 接口，上报自身的 Unix Socket 路径、API 版本、资源名称（如 `nvidia.com/gpu`） |
| ④ | Kubelet → Device Plugin | 注册成功后，Kubelet 反向通过 Device Plugin 的 Unix Socket 调用 `ListAndWatch`，获取当前节点的设备列表，并持续监听设备上下线事件 |
| ⑤ | Kubelet → API Server | 将发现的设备数量同步到 API Server，体现在 `Node.status.capacity` 中（如 `nvidia.com/gpu: 1`） |
| ⑥ | 用户 → API Server | 用户提交 Pod，声明 `nvidia.com/gpu: 1` 资源需求 |
| ⑦ | kube-scheduler | 从 API Server 读取 Node 资源信息，筛选满足条件的节点，将 Pod 绑定到目标节点（写入 `Pod.spec.nodeName`） |
| ⑧ | Kubelet → Device Plugin | 目标节点的 Kubelet 感知到有 Pod 待启动，调用 Device Plugin 的 `Allocate` 接口，传入需要分配的设备 ID |
| ⑨ | Device Plugin → Kubelet | 返回具体的设备文件路径（如 `/dev/nvidia0`）、环境变量（`NVIDIA_VISIBLE_DEVICES` 等），Kubelet 将其注入容器并启动 |

Device Plugin 有一个根本局限：`ListAndWatch` 接口只能上报设备数量（整数），调度器完全无法感知设备的具体属性：显存多大、什么型号、NUMA 拓扑如何。这也是 HAMi 不得不借道 Node Annotation 传递 GPU 规格的原因。

### DRA (Dynamic Resource Allocation)

DRA 是 Kubernetes 为此设计的下一代方案，v1.34 升级为 GA。它引入了一套新的 API：

- `ResourceClaim`：Pod 申领设备资源的声明，类似 PVC 之于 PV
- `DeviceClass`：描述一类设备的规格和筛选条件，支持 CEL 表达式细粒度匹配（如"显存 ≥ 16GB 且型号为 A100"）
- `ResourceSlice`：设备驱动向 API Server 上报的可用设备列表，携带完整属性

调度器可以直接读取 `ResourceSlice` 中的设备属性做调度决策。DRA 还原生支持多个 Pod 共享同一设备，以及跨容器的设备拓扑对齐。

HAMi 目前仍基于 Device Plugin，但官方已启动 [HAMi-DRA](https://github.com/Project-HAMi/HAMi-DRA) 子项目（v0.1.0，需要 Kubernetes 1.34+），通过 MutatingWebhook 将 HAMi 的 GPU 资源请求转换为 DRA 的 `ResourceClaim`，作为向 DRA 迁移的过渡方案。

## HAMi 虚拟 GPU 调度原理

HAMi 同时用了三种 Kubernetes 扩展机制（MutatingWebhook、Scheduler Extender 和 Device Plugin），让它们各司其职，做到了：

- **细粒度资源声明**：用户可以声明 `nvidia.com/gpumem`（显存 MiB）和 `nvidia.com/gpucores`（算力 %）
- **感知调度**：Scheduler-Extender 读取节点 Annotation 中的 GPU 规格，按显存/算力剩余量做 Filter 和 Bind
- **容器内隔离**：通过 `libvgpu.so` 在 CUDA API 层拦截，硬性限制容器实际使用的显存和算力

### 架构与核心组件

HAMi 由四个核心组件构成：

| 组件 | 类型 | 职责 |
| --- | --- | --- |
| `HAMi MutatingWebhook Server` | Deployment（内嵌于 hami-scheduler Pod） | 准入入口：扫描 Pod 资源字段，将需要 HAMi 调度的 Pod 的 `schedulerName` 改写为 `hami-scheduler`（可配置）；已显式指定其他 schedulerName 的 Pod 会被跳过 |
| `HAMi Scheduler-Extender` | Deployment（内嵌于 hami-scheduler Pod） | 调度核心：感知全局 GPU 视图，在 Filter/Bind 阶段实现细粒度显存/算力感知调度，支持 binpack/spread 策略 |
| `HAMi Device Plugin` | DaemonSet | 节点资源层：向 Kubelet 注册虚拟 GPU 资源；在 `Allocate` 中以 hostPath 方式将 `libvgpu.so` 和 `ld.so.preload` 挂载到容器，并注入 `CUDA_DEVICE_MEMORY_LIMIT_<index>`、`CUDA_DEVICE_SM_LIMIT` 等环境变量 |
| `HAMi-Core`（`libvgpu.so`） | 动态库（Device Plugin Allocate 时注入） | 容器内软隔离：重写 `dlsym` 劫持以 `cu` / `nvml` 开头的 NVIDIA 库函数，实现显存上限拦截与算力限速 |

实际部署后的 Pod 状态如下：

```bash
$ kubectl -n hami-system get pod
NAME                              READY   STATUS    RESTARTS   AGE
hami-device-plugin-5gn6j          2/2     Running   0          25h   ← GPU 节点 1（节点代理层）
hami-device-plugin-qzc78          2/2     Running   0          29h   ← GPU 节点 2（节点代理层）
hami-scheduler-8647f67d84-zr42b   2/2     Running   0          29h   ← 调度控制层（全局唯一）
```

下图展示三层架构的组件构成及其通信关系：

![HAMi 三层架构组件通信时序](/img/docs/common/core-concepts/hami-architecture.svg)

### 工作流程详解

#### 第一步：设备注册与资源上报

`hami-device-plugin` 启动后做两件事：

##### ① 向 Kubelet 虚报 GPU 数量

将 1 块物理 GPU 虚报为 N 个逻辑 GPU 资源（默认 10 个），使 kube-scheduler 认为节点有 10 个 GPU 可分配：

```yaml
# kubectl get node <gpu-node> -o yaml 中的可分配资源
nvidia.com/gpu: "10"   # 原本 1 块卡，虚报为 10
```

##### ② 将设备详细规格写入 Node Annotation

标准 Device Plugin 的 `ListAndWatch` 接口只能上报设备数量（整数），无法携带显存大小、UUID、算力等详细规格。HAMi 的解决方案是额外将这些信息写入 Node Annotation，供 `hami-scheduler` 读取：

| Annotation | 用途 |
| --- | --- |
| `hami.io/node-nvidia-register` | 设备规格列表（UUID、虚报数量、显存、算力、型号、NUMA 节点、健康状态） |

字段格式（JSON 数组，每块 GPU 一个对象）：

```yaml
# 2 块 32G V100 节点的示例
hami.io/node-nvidia-register: '[
  {"id":"GPU-00552014-...","count":10,"devmem":32768,"devcore":100,"type":"NVIDIA-Tesla V100-PCIE-32GB","numa":0,"health":true},
  {"id":"GPU-0fc3eda5-...","count":10,"devmem":32768,"devcore":100,"type":"NVIDIA-Tesla V100-PCIE-32GB","numa":0,"health":true}
]'
```

各字段说明：`id` 为 GPU UUID，`count` 为虚报逻辑数量，`devmem` 为显存（MiB），`devcore` 为算力（%），`numa` 为 NUMA 节点编号，`health` 为健康状态。

`hami-scheduler` 启动后持续 Watch 所有 GPU 节点的这个 Annotation，维护全局 GPU 资源视图。

#### 第二步：调度决策

用户提交 Pod 时声明细粒度资源需求：

```yaml
resources:
  limits:
    nvidia.com/gpu: 1          # 申请 1 个逻辑 GPU 槽位
    nvidia.com/gpumem: 1024    # 申请 1024 MiB 显存
    nvidia.com/gpucores: 30    # 申请 30% 算力（可选）
```

`hami-scheduler` 作为 kube-scheduler 的扩展器，在标准调度流程的 **Filter** 和 **Bind** 阶段介入：

- **Filter**：读取 Node Annotation，检查目标节点是否有足够剩余显存（`已分配显存之和 + 本次请求 ≤ 物理显存总量`）
- **Bind**：选定具体物理 GPU UUID，将分配结果写入 Pod Annotation

**调度结果通过 Pod Annotation 传递给 Device Plugin：**

标准 Kubernetes 调度流程中，kube-scheduler 在 Bind 阶段仅向 device-plugin 传递设备 UUID，不携带显存量、算力等信息。因此 HAMi 约定了以下 Pod Annotation 作为调度器与 device-plugin 之间的通信协议：

| Annotation | 内容 |
| --- | --- |
| `hami.io/bind-time` | 调度时间戳（Unix 时间），device-plugin 用于超时检测 |
| `hami.io/vgpu-devices-allocated` | 已分配的设备列表（UUID + 厂商 + 显存 MiB + 算力%），完成后保留作为记录 |
| `hami.io/vgpu-devices-to-allocate` | 待分配设备列表，初始与 allocated 相同；device-plugin 每挂载成功一个设备就移除对应条目，**全部移除后置空，表示分配完成** |

以申请 3000 MiB 显存的 Pod 为例，运行成功后的 Annotation：

```plaintext
hami.io/bind-time: 1716199325
hami.io/vgpu-devices-allocated: GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448,NVIDIA,3000,0:;
hami.io/vgpu-devices-to-allocate: ;    ← 已为空，说明设备分配完成
```

#### 第三步：设备注入与库劫持

Pod 调度到目标节点后，Kubelet 调用 Device Plugin 的 `Allocate` 接口，Device Plugin 在响应中完成四件事：

1. **挂载设备文件**：将 `/dev/nvidia*` 等设备文件注入容器
2. **hostPath 挂载 libvgpu.so**：将宿主机上的 `libvgpu.so`（默认路径 `/usr/local/vgpu/libvgpu.so`）以 hostPath 方式挂载到容器内同路径
3. **hostPath 挂载 ld.so.preload**：将宿主机上的 `/usr/local/vgpu/ld.so.preload` 挂载到容器内的 `/etc/ld.so.preload`。该文件内容只有一行：`/usr/local/vgpu/libvgpu.so`。Linux 动态链接器在容器内任何进程启动时都会读取 `/etc/ld.so.preload`，并将其中列出的库**最先**加载，效果等同于 `LD_PRELOAD`，但无需修改任何环境变量，对容器内所有进程透明生效。若容器设置了 `CUDA_DISABLE_CONTROL=true`，则跳过此挂载，禁用隔离
4. **注入环境变量**：
    - `CUDA_DEVICE_MEMORY_LIMIT_<index>=<数字>m`：per-device 显存配额，`index` 为容器内设备索引（0、1、2...），值带单位后缀 `m`（如 `1024m`），来自 Pod 申请的 `nvidia.com/gpumem`
    - `CUDA_DEVICE_SM_LIMIT=<百分比>`：算力配额上限（来自 Pod 申请的 `nvidia.com/gpucores`）

容器启动后，libvgpu.so 通过**重写 `dlsym` 函数**劫持 NVIDIA 动态库的符号解析，对所有以 `cu` 和 `nvml` 开头的函数调用进行拦截：

**显存限制（Memory Limit）：**

- 拦截 `nvmlDeviceGetMemoryInfo` / `nvmlDeviceGetMemoryInfo_v2`：使 `nvidia-smi` 只显示 `CUDA_DEVICE_MEMORY_LIMIT_<index>` 设定的配额值，而非物理总显存
- 拦截 `cuMemAlloc_v2` / `cuMemAllocManaged` / `cuMemAllocHost_v2` 等内存分配函数：分配前执行 OOM 检查：若当前 Pod 已用显存 + 本次申请量 > `CUDA_DEVICE_MEMORY_LIMIT_<index>`，直接返回 `CUDA_ERROR_OUT_OF_MEMORY`，阻止超额分配

**算力限制（Core Limit）：**

- 拦截 `cuLaunchKernel` / `cuLaunchKernelEx` 等 Kernel 提交函数：每次提交前调用 `rate_limiter`，以本次 kernel 的 grid 数量为单位消耗全局计数器 `g_cur_cuda_cores`；当计数器耗尽（`< 0`）时，当前调用进入自旋等待（`nanosleep`）
- 计数器的补充由后台 utilization watcher 线程负责：该线程定期采样实际 GPU 利用率，通过 `delta()` 函数动态计算补充量，利用率低于配额时快速补充，高于配额时减少补充，从而将容器的整体算力占用收敛到 `CUDA_DEVICE_SM_LIMIT` 设定的百分比以内

至此，一个 GPU Pod 的完整生命周期走完了：Webhook 负责入口，Scheduler Extender 负责选卡，Device Plugin 负责注入，HAMi-Core 负责在容器内守住边界。

### HAMi 调度策略详解

HAMi 的调度策略分两个独立维度：**节点选哪个**（`node-scheduler-policy`）和**节点内选哪张卡**（`gpu-scheduler-policy`），每个维度都可配置 `binpack`（集中）或 `spread`（分散）。全局默认在 values.yaml 中设置，也可通过 Pod Annotation 按需覆盖：

```yaml
# Helm 全局配置
scheduler:
  defaultSchedulerPolicy:
    nodeSchedulerPolicy: binpack
    gpuSchedulerPolicy: spread

# Pod 级别覆盖
metadata:
  annotations:
    hami.io/node-scheduler-policy: "spread"
    hami.io/gpu-scheduler-policy: "binpack"
```

#### 节点调度策略

调度器对每个节点计算综合得分（基于当前已用资源，不含本次申请量）：

```plaintext
节点得分 = (已用设备数/总设备数 + 已用算力/总算力 + 已用显存/总显存) × 10
```

假设集群有 2 个节点，各有 4 块 GPU，每块总算力 100%、总显存 8192 MiB（节点总计：算力 400%、显存 32768 MiB）。节点 1 已用 3 块、已用算力 240%、已用显存 20480 MiB；节点 2 已用 2 块、已用算力 120%、已用显存 8192 MiB：

```plaintext
节点 1 得分 = (3/4 + 240/400 + 20480/32768) × 10 = 19.75
节点 2 得分 = (2/4 + 120/400 + 8192/32768)  × 10 = 10.50
```

**Binpack** 取高分节点，优先填满负载更重的节点，为空节点留出完整资源，适合想腾出整机给训练任务的场景，两个 Pod 都会调度到节点 1。**Spread** 取低分节点，将任务分散开，适合在线推理横向扩展，pod1 调度到节点 2，pod2 调度到节点 1。

#### GPU 卡调度策略

同一节点内，调度器对每张卡计算得分（含本次申请量）：

```plaintext
GPU 得分 = ((申请数量 + 已用数量) / 总槽位 + (申请 core + 已用 core) / 总 core + (申请 mem + 已用 mem) / 总 mem) × 10
```

假设节点内 GPU1 已占用 2 个槽位、core 10%、mem 2000 MiB，GPU2 已占用 6 个槽位、core 70%、mem 6000 MiB，总槽位 10、总显存 8000 MiB，本次申请 1 个槽位、core 20%、mem 1000 MiB：

```plaintext
GPU1 得分 = ((1+2)/10 + (20+10)/100 + (1000+2000)/8000) × 10 = 9.75
GPU2 得分 = ((1+6)/10 + (20+70)/100 + (1000+6000)/8000) × 10 = 24.75
```

**Binpack** 取高分卡（GPU2），将多个 Pod 塞进同一张已有负载的卡，让 GPU1 空出来给独占型任务。**Spread** 取低分卡（GPU1），降低单卡竞争压力，适合延迟敏感的推理服务。

两个维度正交组合，常见搭配：

| 节点策略 | GPU 策略 | 典型场景 |
| --- | --- | --- |
| **Binpack** | **Binpack** | 资源整合，腾出整机给大型任务 |
| **Binpack** | **Spread** | 节点集中，卡间隔离 |
| **Spread** | **Binpack** | 跨节点高可用，节点内集中 |
| **Spread** | **Spread** | 全方位打散，最大容错 |

## 后续步骤

推荐继续了解：

- 学习 HAMi 的[架构设计](./architecture.md)
- 在你的 Kubernetes 集群中[安装 HAMi](../installation/prerequisites.md)
