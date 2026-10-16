---
sidebar_label: Mthreads MTT S5000
title: 在 Mthreads MTT S5000 上使用 HAMi
translated: true
---

## 简介

HAMi 通过摩尔线程的 sGPU 技术支持 MTT S5000 上的 GPU 共享。在该方案中，各组件分工如下：

- 摩尔线程 GPU Operator（Full 模式）负责安装内核驱动、配置容器运行时，并向 kubelet 上报设备资源，包括整卡（`mthreads.com/gpu`）和 sGPU 切片（`mthreads.com/sgpu-core`、`mthreads.com/sgpu-memory`）。
- HAMi 接管 sGPU 切片的调度与准入，决定哪些任务共享哪张卡，以及每个任务可用的显存和算力核组数量。

HAMi 本身不提供底层隔离。显存和算力限制由摩尔线程的内核模块与容器运行时强制执行。

**适用场景**：

- 需要 sGPU 切片并限制设备显存与算力的 MTT S5000 集群
- 单集群混合交付：sGPU 切片走 HAMi，整卡走默认调度器

## 快速开始

### 前置条件

- 一个包含 MTT S5000 GPU 节点的 Kubernetes 集群。厂商在 MTT S4000 与 MTT S5000 上支持 sGPU（S4000 要求固件 >= 2.1.1）。
- 以 Full 模式安装并启用 sGPU 的[摩尔线程 GPU Operator](https://docs.mthreads.com/cloud-native/cloud-native-doc-online/)（见下文）。厂商要求 sGPU 使用 MT Container Toolkit >= 2.1.0 且 MTML >= 2.1.0。
- Helm 3

### 以 Full 模式安装摩尔线程 GPU Operator

Full 模式将整个软件栈（驱动、容器工具链、设备插件、监控）容器化，宿主机无需预装驱动。从摩尔线程或设备供应商处获取 operator 安装包后，按厂商文档安装。与 HAMi 集成相关的关键步骤如下：

1. 为 GPU 节点打标签，使 operator 组件调度到这些节点上：

   ```bash
   kubectl label node <gpu-node> mthreads.com/gpu-node="true"
   ```

2. 启用 sGPU 并选择需要切片的卡。sGPU 能力来自厂商的 `sgpu_km` 内核模块：绑定到该模块的卡进入切片资源池，其余卡保持整卡资源池。该模块接受以下两个互斥的绑定参数之一：

   - `total_gpu_num=<N>` 从 GPU 0 开始绑定 N 张卡。
   - `gpu_ids=0,2,3` 精确绑定列出的卡，适用于精确规划卡布局的场景。`gpu_ids` 与 `total_gpu_num` 二选一，不可同时设置。

   使用 Full 模式的 GPU Operator 时，operator 会安装该模块并代为管理绑定。若需要在宿主机层面持久化配置，请把参数保存在 `/etc/modprobe.d/sgpu-km.conf` 中，例如 `options sgpu_km total_gpu_num=1` 表示每台节点只对 GPU 0 切片。未使用 operator 的集群，请按 [MT sGPU 安装指南](https://docs.mthreads.com/cloud-native/cloud-native-doc-online/install_guide/sgpu_install)手动加载模块。

   通过 ClusterConfig CR 中的 `sgpuSpec` 调整每张卡的切片行为：

   ```yaml
   apiVersion: mthreads.com/v1alpha4
   kind: ClusterConfig
   metadata:
     name: gpu-cluster-config
   spec:
     nodes:
       - nodePoolName: mthreads-gpu-pool
         sgpuSpec:
           "max_inst": "16" # 每张卡的最大切片实例数
           "policy": "0" # 0：性能模式，1：弱隔离，2：强隔离
           # 此处是比率而非百分比：1.0 = 100%（不超卖），取值范围 1.0-2.0。
           # 每卡节点标签以百分比形式上报同一设置，
           # 因此这里的 1.0 对应 mthreads.com/sgpu0.overcommit_ratio=100。
           "overcommit_ratio": "1.0"
           "time_slice": "1"
         selector:
           matchLabels:
             mthreads.com/gpu-node: "true"
   ```

3. 确认节点上报了两个资源池：

   ```bash
   kubectl get node <gpu-node> -o json | grep mthreads.com
   ```

   以下是在一张 8 卡 S5000 节点上的实测输出，其中 0、2、3 号卡绑定到 `sgpu_km`：

   ```text
   # kubectl get node <gpu-node> -o json | grep mthreads.com
           "mthreads.com/gpu": "5",
           "mthreads.com/sgpu-core": "48",
           "mthreads.com/sgpu-memory": "480"
   # kubectl get node <gpu-node> -o jsonpath='{.metadata.labels}' | tr ',' '\n' | grep -E 'gpu.count|sgpu.cores'
           mthreads.com/gpu.count=8
           mthreads.com/sgpu.cores=0-2-3
   ```

   两个资源池对物理卡做的是划分，而非重叠。在该示例中 8 张卡里有 3 张绑定到 `sgpu_km`（`mthreads.com/sgpu.cores=0-2-3`），这 3 张共贡献 3×16 = 48 个 `sgpu-core` 单位与 3×160 = 480 个 `sgpu-memory` 单位；其余 8 − 3 = 5 张卡保持整卡，上报为 `mthreads.com/gpu=5`。

   预期看到 `mthreads.com/gpu`（整卡）、`mthreads.com/sgpu-core`（每张被切片的卡 16 个单位）和 `mthreads.com/sgpu-memory`（S5000 每张被切片的卡 160 个单位，每单位等于 512 MiB）。可通过 `mthreads.com/sgpu.cores` 确认模块实际占用了哪些卡，并与 `mthreads.com/gpu.count` 对账。每张卡的标签还会上报型号与显存大小，例如 `mthreads.com/gpu0.product=MTT-S5000` 与 `mthreads.com/gpu0.memory=85899345920`（80 GiB），逐卡核对这些标签是配置 160 单位切片前确认节点全部为 S5000 的最快方式。

   HAMi 从节点容量推导每卡显存，而非直接使用 `devices.mthreads.memoryPerCard`，因此节点上报的 `sgpu-memory / sgpu-core × 16` 应为每张被切片卡 160 个单位（80 GiB）。在调度大规格切片前，建议按节点型号核对该比值：

   ```bash
   kubectl get node <gpu-node> -o jsonpath='{.status.capacity.mthreads\.com/sgpu-memory}{"\n"}{.status.capacity.mthreads\.com/sgpu-core}{"\n"}'
   ```

:::note

摩尔线程设备插件通过节点**标签**（例如 `mthreads.com/gpu-node` 和 `mthreads.com/gpu.count`）上报卡信息。HAMi 的摩尔线程支持从节点容量推导每卡信息（`mthreads.com/sgpu-core` / 16 = 被切片的卡数），而不是解析注解中的设备列表。这些节点上不会出现 `hami.io/node-mthreads-register` 注解。

:::

### 关闭厂商 sGPU 调度器与 webhook

HAMi 的调度器和 webhook 会取代厂商的 `mt-gpu-scheduler` 与 `mt-gpu-webhook`。两者同时运行会冲突，因为都会拦截 GPU pod。修改 ClusterPolicy 将其关闭：

```bash
kubectl patch clusterpolicy gpu-cluster-policy --type=merge \
  -p '{"spec":{"gpuScheduler":{"enabled":false},"gpuWebhook":{"enabled":false}}}'
kubectl -n mt-gpu-operator rollout restart deploy/mt-controller-manager
```

operator 只在启动时同步组件状态，因此必须重启 rollout。重启后，`mt-gpu-scheduler`、`mt-gpu-scheduler-controller` 和 `mt-gpu-webhook` 这些 Deployment 会被移除。

请保持 `mt-universal-gpu-device-controller` 运行。整卡与 sGPU 切片的 kubelet 设备分配仍依赖它。

### 安装 HAMi

创建 `values.yaml` 文件：

```yaml
devices:
  mthreads:
    enabled: true
    # MTT S5000 每卡 80 GiB 显存 = 160 x 512 MiB 单位。
    # chart 默认值（96）对应 MTT S4000，S5000 必须覆盖该值。
    memoryPerCard:
      - 160
```

HAMi 按每卡显存容量来建模摩尔线程显卡。默认值 96 个单位对应 MTT S4000（48 GiB）。MTT S5000 显存为 80 GiB，因此需将 `devices.mthreads.memoryPerCard` 设置为 `[160]`。若不设置，准入阶段会拒绝大于 96 单位的显式 `sgpu-memory` 请求（例如 128）。该参数为集群级列表，按卡型号一项一值；混合 S4000/S5000 的集群可填写 `[96, 160]`，无需划分独立节点池。列表为空时回退为 `[96]`；旧版标量写法会被转换为单元素列表。

该值仅用于限定准入阶段接受的显式 `sgpu-memory` 请求范围。准入发生在选节点之前，请求只要对任一已配置卡型号合法即被接受，随后由调度器按所选节点的真实单卡容量兜底。省略 `sgpu-memory` 的 Pod 始终按所选节点的真实单卡确定大小，因此只要列表中包含集群内所有卡型号，同一部署即可同时覆盖两种卡。

:::note

`devices.mthreads.memoryPerCard` 需要包含 mthreads 单卡显存特性的 HAMi 版本（[Project-HAMi/HAMi#2988](https://github.com/Project-HAMi/HAMi/pull/2988)，于 2026-09-20 合入 master，晚于 v2.10.0 发布）。在 v2.10.0 及更早的 chart 上，该值不会被渲染进 `hami-scheduler-device` ConfigMap，会被静默忽略：可接受的显式切片取值停留在 S4000 列表（2、4、8、16、32、64、96），S5000 上超过 48 GiB 的切片请求会被拒绝。节点上报的容量不受影响。

:::

安装 HAMi：

```bash
helm repo add hami-charts https://project-hami.github.io/HAMi/
helm repo update
helm install hami hami-charts/hami -n kube-system -f values.yaml
```

验证安装：

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/instance=hami
```

应出现 HAMi 调度器与摩尔线程设备控制器（`mt-universal-gpu-device-controller`）Pod。后缀由 ReplicaSet 生成，在每个集群上都不相同：

```text
NAME                                             READY   STATUS    RESTARTS   AGE
hami-scheduler-<hash>                            2/2     Running   0          3m
mt-universal-gpu-device-controller-<hash>        1/1     Running   0          3m
```

`hami-scheduler` 显示 `2/2` 个容器：`kube-scheduler` 加 HAMi 调度器扩展。若需确认调度器扩展确实存在于 Pod 中（而不只是依赖容器数量），可执行：

```bash
kubectl -n kube-system get pod -l app.kubernetes.io/component=hami-scheduler \
  -o jsonpath='{.items[0].spec.containers[*].name}{"\n"}'
```

## sGPU 宿主机配置

在每台 GPU 节点上，运行中的 sGPU 服务会在 `/proc/sgpu_km` 下暴露配置节点。每张被切片的卡对应一个以其卡 ID 命名的目录，包含以下配置项：

| 配置项 | 取值范围 | 说明 |
| --- | --- | --- |
| `max_inst` | 1-16 | 每张卡的最大切片实例数。 |
| `policy` | 0, 1, 2 | 算力隔离模式。`0`：性能模式（默认），无算力隔离，切片行为类似裸卡上的进程。`1`：弱隔离，空闲卡可被运行中的容器完全使用。`2`：强隔离，即使其他容器空闲也强制按时间片分配（仅均分）。 |
| `time_slice` | 整数，毫秒 | 调度器时间片长度，默认 1 ms，最小 1 ms。值越大越公平，值越小效率越高。仅影响弱隔离和强隔离模式。 |
| `overcommit_ratio` | 100-200 | 显存超卖比例，在该 `/proc/sgpu_km` 视图中以**百分比**表示（100 表示不超卖）。ClusterConfig 的 `sgpuSpec.overcommit_ratio` 则使用等效**比率**，因此此处的 100 写作 `1.0`、110 写作 `1.1`。节点标签采用百分比形式，例如 `mthreads.com/sgpu0.overcommit_ratio=100`。 |

调优这些值时的要点：

- 当有容器持有该卡的分配时，`max_inst`、`policy` 和 `time_slice` 无法修改。请在分配切片之前设置，或先清空该卡上的分配。
- 通过 ClusterConfig `sgpuSpec` 下发的修改由 operator 应用，需要重启 `mt-controller-manager` 才能生效。直接写 `/proc/sgpu_km` 立即生效，但模块重载后会丢失。
- 任何 `policy` 模式下显存都保持硬隔离，各模式之间只有算力行为不同。
- 容器级配置项（例如 `weight`，即时间片数量）由容器运行时根据 pod 的 `sgpu-core` 请求设置，HAMi 通过调度间接控制它们。

运行中的取值同时以节点标签形式发布，每张被切片的卡一组。以下为 S5000 节点（卡 0、2、3 绑定到 `sgpu_km`）的实测输出：

```text
# kubectl describe node cicpoc-gpu1 | grep 'mthreads.com/sgpu[0-9]'
mthreads.com/sgpu0.max_inst=16
mthreads.com/sgpu0.overcommit_ratio=100
mthreads.com/sgpu0.policy=0
mthreads.com/sgpu0.time_slice=1
mthreads.com/sgpu2.max_inst=16
mthreads.com/sgpu2.overcommit_ratio=100
mthreads.com/sgpu2.policy=0
mthreads.com/sgpu2.time_slice=1
mthreads.com/sgpu3.max_inst=16
mthreads.com/sgpu3.overcommit_ratio=100
mthreads.com/sgpu3.policy=0
mthreads.com/sgpu3.time_slice=1
```

注意此处的 `overcommit_ratio` 为 `100`，即与 `/proc/sgpu_km` 视图一致的百分比形式；ClusterConfig 的 `sgpuSpec` 则使用等效比率（`1.0`）。标签名中的卡 ID 与 `mthreads.com/sgpu.cores` 一致。

各配置项的完整语义请参阅厂商的 [MT sGPU 用户指南](https://docs.mthreads.com/cloud-native/cloud-native-doc-online/user_guide/sgpu_guide)。

## 使用方法

通过 `mthreads.com/vgpu` 搭配 `mthreads.com/sgpu-memory` 与 `mthreads.com/sgpu-core` 请求 sGPU 切片：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sgpu-pod
spec:
  restartPolicy: OnFailure
  containers:
    - name: task
      image: core.harbor.zlidc.mthreads.com:30003/mt-ai/lm-qy2:v17-mpc # MUSA 用户态驱动栈（也可用任意 MUSA 运行时镜像）
      command: ["sleep", "infinity"]
      resources:
        limits:
          mthreads.com/vgpu: 1 # 请求 1 个切片 GPU
          mthreads.com/sgpu-memory: 32 # 32 x 512 MiB = 16 GiB
          mthreads.com/sgpu-core: 8 # 16 个核组中的 8 个（卡的 50%）
```

HAMi 的 webhook 会改写 pod 使其使用 `hami-scheduler`，因此无需设置 `schedulerName` 字段。容器内部，摩尔线程运行时会把获得的配额注入为环境变量：

| 环境变量 | 说明 |
| --- | --- |
| `MTHREADS_VISIBLE_DEVICES` | 容器内可见的卡索引。 |
| `MTHREADS_QOS_MEMORY_LIMIT` | 显存限制（字节）。运行时会向上取整到下一档：512 MiB，然后是 1/2/4/8/16/32/48/64/80 GiB。 |
| `MTHREADS_QOS_COMPUTING_POWER_WEIGHT` | 算力权重（时间片数），范围 1-99999，默认 1。 |
| `MTHREADS_ALLOCATED_SGPU_MEMORY_DEVICES` | 获得的显存单位数。 |
| `MTHREADS_ALLOCATED_SGPU_CORE_DEVICES` | 获得的算力核组单位数。 |

容器内的 `mthreads-gmi` 会显示强制执行的显存限制，例如 16 GiB 切片对应 `0MiB(16384MiB)`。超出限制的分配会失败，因为显存是硬隔离的。

### 用 mthreads-gmi 验证切片

容器视角下的限制值，是确认切片已按请求生效的权威依据：

```bash
kubectl exec -it <pod> -- mthreads-gmi
```

括号中的数值即为容器内可见的显存总量。在 S5000 节点上的实测结果：Pod 请求 `mthreads.com/sgpu-memory: 64`（64 × 512 MiB = 32 GiB）：

```text
ID   Name                 |PCIe                |%GPU  Mem
0    MTT S5000            |00000000:03:00.0    |0%    0MiB(32768MiB)
     Physical      P0     |16x(16x)            |40C   YES
```

32 GiB 与 `64 × 512 MiB` 完全一致。同一节点上请求 `mthreads.com/gpu: 1` 的 Pod 则显示整卡容量 `0MiB(81920MiB)`，即 S5000 的 80 GiB。

:::note

整卡容量是节点级预算，由厂商设备插件保证，而非由 HAMi 保证。请对照节点的 `mthreads.com/gpu` 可分配值（即物理卡数减去绑定到 `sgpu_km` 的卡数）来规划整卡负载。默认调度器会在绑定完成前就计入 Pod 的扩展资源请求，因此超出可分配容量的并发请求会保持 Pending，直到有容量释放。

:::

S5000 上可用的资源类型与切片规则：

| 资源 | 单位 | 说明 |
| --- | --- | --- |
| `mthreads.com/vgpu` | 切片卡 | 切片 GPU 的数量。支持多卡请求：HAMi 将 `sgpu-core` 固定为每卡 16 个核组，显式 `sgpu-memory` 在各卡间均分，省略显存时每卡授予整卡容量。 |
| `mthreads.com/sgpu-memory` | 512 MiB | 每个切片的显存。`devices.mthreads.memoryPerCard: [160]` 时的有效取值：2、4、8、16、32、64、128、160。 |
| `mthreads.com/sgpu-core` | 1/16 卡算力核组 | 每个切片的算力核组数，1 到 16。映射为容器的算力权重；实际 GPU 时间取决于厂商调度策略与竞争负载。 |

若要独占一张被切片的卡，只需请求 `mthreads.com/vgpu`。webhook 会授予整张被切片的卡：它将 `sgpu-core` 设为 16，并**不设置** `sgpu-memory`，由调度器按所选节点的真实单卡容量推导（S5000 上为 160 单位 = 80 GiB）：

```yaml
resources:
  limits:
    mthreads.com/vgpu: 1
```

同样地，`mthreads.com/vgpu: 2` 会独占两张被切片的卡：webhook 将 `sgpu-core` 设为 32（每卡 16），同样不设置 `sgpu-memory`。

整卡不经过 HAMi。请求 `mthreads.com/gpu` 的 pod 保持默认调度器，可与切片 pod 在同一集群共存：

```yaml
resources:
  limits:
    mthreads.com/gpu: 1
```

同一容器不能同时请求 `mthreads.com/gpu` 与任何 `vgpu`/`sgpu-*` 资源。准入 webhook 会拒绝此类 pod，因为整卡由 HAMi 记账体系之外的厂商设备插件分配，两者混用会掩盖超卖。

在 8 卡 S5000 节点（每节点 3 张卡绑定到 `sgpu_km`）集群中的实测：一个切片 pod（`mthreads.com/vgpu: 1`、`sgpu-memory: 64`、`sgpu-core: 9`）与分别请求 `mthreads.com/gpu: 1`、`2`、`3` 的整卡 pod 同时运行；切片看到 `0MiB(32768MiB)`，每张整卡看到完整的 `0MiB(81920MiB)`，多卡整卡 pod 分别列出 2 个和 3 个设备。
