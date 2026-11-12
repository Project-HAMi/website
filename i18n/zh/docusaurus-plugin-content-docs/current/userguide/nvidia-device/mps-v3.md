---
title: 使用 MPS v3 共享 NVIDIA GPU
sidebar_label: MPS v3
---

`mps-v3` 后端通过 NVIDIA Container Toolkit 的 CDI hook 为每个容器的 cgroup 设置显存上限。CUDA 进程连接分配给容器的 MPS namespace，按节点配置的策略共享算力。GPU 数量、显存和算力继续使用现有的 HAMi 资源名。

## 准备节点

- 使用 cgroup v2、**r620 或更新的 NVIDIA 驱动**和 **NVIDIA Container Toolkit 1.20.1 或更新版本**。启用 `apply-cuda-memory-limits` hook。应用镜像应使用与节点驱动兼容的 CUDA 运行时。
- 启用后端前先关闭 MIG。使用支持 CDI 的容器运行时，以 UUID 标识 GPU，并将节点的显存和算力缩放系数设为 `1`。
- 确认特权 device plugin 使用主机 PID 命名空间，并能访问与驱动配套的 `nvidia-cuda-mps-control` 和驱动库。Chart 将主机的 `/usr/bin` 挂到插件容器内的 `/usrbin`。使用 GPU Operator 时，请按驱动的实际安装位置配置二进制路径。
- 检查已经发布的物理 GPU CDI 设备包含显存 hook，且 hook 路径在主机上可执行。HAMi 在注册设备前会检查该配置。显存控制器由 Toolkit 和驱动管理。[NVIDIA 显存分区文档](https://docs.nvidia.com/deploy/mps/mpsv3-memory-partitioning.html)

```bash
stat -fc %T /sys/fs/cgroup
nvidia-smi --query-gpu=uuid,driver_version,mig.mode.current,mig.mode.pending --format=csv
```

## 配置节点

以下 Helm 配置在 `gpu-node-01` 上启用 `server-timeslice`。按实际节点名称和驱动路径修改。

```yaml
devicePlugin:
  hostPID: true
  deviceListStrategy: cdi-cri
  mpsV3:
    enabled: true
    binary: /usrbin/nvidia-cuda-mps-control
  nodeConfiguration:
    config: |
      {
        "nodeconfig": [
          {
            "name": "gpu-node-01",
            "operatingmode": "mps-v3",
            "devicememoryscaling": 1,
            "devicecorescaling": 1,
            "mpsv3": {
              "computeMode": "server-timeslice",
              "timeslice": "long",
              "timesliceYieldLevel": 1
            }
          }
        ]
      }
```

使用默认的 `namespace-cap` 时，省略 `mpsv3` 对象或写为 `{"computeMode":"namespace-cap"}`。多条匹配的节点配置按顺序应用，后面的 `mpsv3` 对象整体替换前一个。启用 `mpsV3.enabled` 后，Chart 会挂载节点状态和 socket 目录。按 kubelet 和运行时的 CDI 接入方式选择 `cdi-cri` 或 `cdi-annotations`。MPS v3 节点只接受 CDI 设备列表策略。

## 申请算力和显存

在 Pod 上设置 `nvidia.com/vgpu-mode: mps-v3`。用 `hami.io/mps-compute-mode` 选择节点的算力策略，缺省值为 `namespace-cap`。两种策略均按每卡 100 单位核算配额，解析得到的 `gpucores` 为 0 时按 100 记账。按[显存申请规则](./specify-device-memory-usage.md)使用 `nvidia.com/gpumem` 或 `nvidia.com/gpumem-percentage`。Toolkit 将最终分配的 MiB 数同时用于显存请求和硬上限。

| 策略 | `nvidia.com/gpucores: 25` 的含义 |
| --- | --- |
| `namespace-cap` | namespace 的活跃线程百分比上限为 25，硬件可以对可用算力取整。 |
| `server-timeslice` | 容器专属 server 的时间片长度为 daemon 基础时间片的 25%。实际 GPU 时间和吞吐取决于各 server 有多少任务就绪。 |

以下 Pod 申请 4 GiB 显存和基础时间片长度的 25%。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mps-training
  annotations:
    nvidia.com/vgpu-mode: mps-v3
    hami.io/mps-compute-mode: server-timeslice
spec:
  restartPolicy: Never
  containers:
    - name: training
      image: your-cuda-application:tag
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 4096
          nvidia.com/gpucores: 25
```

申请两张卡时使用 `nvidia.com/gpu: 2`。同一容器在每张卡上的最终显存和算力额度必须相同。不同容器可以使用完全相同或互不相交的 GPU 集合。若 GPU A 已被单卡分配使用，A+B 的请求会与现有分配冲突。

`server-timeslice` 的 `mpsv3.timeslice` 支持 `default`（设备默认值）、`short`（10 ms）、`medium`（20 ms）和 `long`（50 ms）。可选的 `mpsv3.timesliceYieldLevel` 接受 `1` 或 `2`。当计算后的时间片低于设备支持的最小值时，驱动会拒绝设置。[NVIDIA 加权时间片接口](https://docs.nvidia.com/deploy/mps/620/mpsv3-interface.html#weighted-timeslicing)

## 申请静态 SM 和可选借用

在 `namespace-cap` Pod 上添加以下注解。仅通过 SM 数申请算力时，可省略 `gpucores`。

```yaml
metadata:
  annotations:
    nvidia.com/vgpu-mode: mps-v3
    nvidia.com/mps-sm-count: "16"
    hami.io/mps-sm-shareable: "true"
    hami.io/mps-sm-max-chunks: "16"
```

- `nvidia.com/mps-sm-count` 适用于 Pod 内每个 GPU 容器申请的每张卡。Ampere 独立 GPU 每个 chunk 为 2 SM，因此示例预留 8 个 chunk。Hopper 及更新的独立 GPU 每个 chunk 为 8 SM，集成 GPU 为 2 SM。固定分区也可以使用该设备的余数 SM，前提是能精确组成请求值。
- `hami.io/mps-sm-shareable` 允许驱动在分区没有客户端时借出空闲 SM。默认 `false`。
- `hami.io/mps-sm-max-chunks` 是分区能使用的**总** chunk 数上限，包含基础额度。默认 `0` 表示禁止借入。正整数上限必须在每卡的基础 chunk 数与该卡总 chunk 数之间。`unlimited` 允许驱动使用可借容量。
- 启用借出或借入时，基础额度必须是整 chunk。调度和配额按 `ceil(基础 SM 数 / GPU 总 SM 数 × 100)` 记账。显式设置的 `gpucores` 必须覆盖该值。运行时实际借用量由驱动决定。

HAMi 按 GPU UUID 将分区绑定到 namespace，并将 namespace 的活跃线程百分比设为 100。同一 GPU 同时只支持静态 SM 分区或 namespace 百分比。GPU 有活跃客户端时能否创建新分区取决于驱动与设备。若驱动拒绝，HAMi 会报告错误并回滚该次分配。[NVIDIA SM 借用](https://docs.nvidia.com/deploy/mps/620/mpsv3-interface.html#sm-partition-load-balancing)、[NVIDIA namespace 绑定](https://docs.nvidia.com/deploy/mps/620/mpsv3-namespaces.html#sm-partition-assignments)

## 升级、切换策略和排查

1. 阻止新任务进入节点，并排空其 MPS v3 工作负载。从旧版升级时，先由旧管理器回收已有分配。
2. 确认资源已回收，再变更驱动、插件或节点策略。修改 `computeMode`、基础时间片、yield 或状态目录也需要排空。
3. 确认插件上报健康，运行符合新策略的验证任务，再恢复节点调度。

| 现象 | 检查项 |
| --- | --- |
| MPS v3 节点启动失败 | 检查 r620 驱动、cgroup v2、非 MIG GPU、UUID 设备 ID、缩放系数、MPS 工具和已发布的 CDI hook。 |
| Pod 无法匹配 GPU | 检查 Pod 与节点策略、算力和显存余量、SM chunk 和现有 GPU 集合。 |
| 时间片设置或回读失败 | 检查目标 GPU、驱动和基础时间片。插件会在排空后尝试启动两个同卡 server，再上报该策略。 |
| 资源回收等待客户端 | 等待 CUDA 客户端退出。HAMi 依次删除 namespace、分区和最后一个无引用的 server。 |
| daemon 丢失且仍有存活分配 | 排查 daemon 后通过 Kubernetes 重建受影响的工作负载。在 Pod 存活期间保留分配状态。 |

容器仅在 `/run/hami-mps` 看到自己的 namespace socket 目录。算力设置对通过该 socket 接入的 CUDA 进程生效。MPS 不提供显存带宽或 MIG 级别的故障隔离。普通容器重启保留原分配。若仍有存活工作负载，管理器恢复依赖原 daemon 及其资源。

分配流程、恢复条件和真机数据见 [MPS v3 后端设计](../../developers/mps-v3-design.md)。
