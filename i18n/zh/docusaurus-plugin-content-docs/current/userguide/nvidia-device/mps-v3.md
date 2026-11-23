---
title: 使用 MPS v3 共享 NVIDIA GPU
description: 介绍如何在 HAMi 中配置 MPS v3，并申请显存、算力上限、静态 SM 分区和加权时间片。
sidebar_label: MPS v3
---

`mps-v3` 后端通过 NVIDIA Container Toolkit 的 CDI hook 为每个容器的 cgroup 设置显存上限。CUDA 进程连接分配给容器的 MPS namespace，按节点配置的策略共享算力。GPU 数量、显存和算力继续使用现有的 HAMi 资源名。

HAMi 实现见 [HAMi PR #3443](https://github.com/Project-HAMi/HAMi/pull/3443)。

## 与 NVIDIA device plugin 的关系

HAMi 通过 `operatingmode: mps-v3` 启用 r620 MPS v3，用 CDI 设置容器显存上限，并提供 namespace 算力上限、可选借用的静态 SM 分区和 server 加权时间片。

NVIDIA 上游 device plugin 的实验性 `sharing.mps` 使用旧版 MPS，将 GPU 暴露为等额副本。HAMi 不支持该配置，启用 MPS 时使用节点模式 `mps-v3`。[NVIDIA device plugin MPS 文档](https://github.com/NVIDIA/k8s-device-plugin/blob/v0.20.1/README.md#with-cuda-mps)

## 准备节点

- 使用 cgroup v2、**NVIDIA r620 驱动**和 **NVIDIA Container Toolkit 1.20.1 或更新版本**。启用 `apply-cuda-memory-limits` hook。应用镜像应使用与节点驱动兼容的 CUDA 运行时。
- 使用支持 CDI 的容器运行时。
- 确认 device plugin 能访问与驱动配套的 `nvidia-cuda-mps-control` 和驱动库。将 `devicePlugin.mpsV3.binary` 设为 device plugin 容器内可访问的二进制路径。
- 静态 SM 分区的 CLI 输出以 **620.70.06** 为已验证基线。若日志报 SM 分区列表格式不符，请核对驱动和控制工具版本。

```bash
stat -fc %T /sys/fs/cgroup
nvidia-smi --query-gpu=uuid,driver_version,mig.mode.current,mig.mode.pending --format=csv
```

## 在宿主机运行 MPS daemon

在启用 MPS v3 的节点上先启动专用 daemon，再启用设备插件。下面是 systemd unit 示例。二进制使用宿主机路径。daemon 的 `CUDA_MPS_PIPE_DIRECTORY` 必须设为 `<root>/pipe`，其中 `<root>` 是 `devicePlugin.mpsV3.root` 的值。

将以下内容保存为 `/etc/nvidia-mps/hami-mps-v3.toml`。daemon 关闭主 socket 的 UID 自动建 server 功能。HAMi 通过各容器专属的 namespace socket 路由。 [NVIDIA v3 配置文件](https://docs.nvidia.com/deploy/mps/620/mpsv3-configuration-file.html)

```toml
schema_version = "1.0"

[features.context-share]
enabled = true
default_socket = "off"
```

```ini
[Unit]
Description=HAMi NVIDIA MPS v3 daemon

[Service]
Type=simple
Environment=CUDA_MPS_PIPE_DIRECTORY=/var/run/hami/mps-v3/pipe
Environment=CUDA_MPS_LOG_DIRECTORY=/var/run/hami/mps-v3/log
ExecStartPre=/usr/bin/test -f /sys/fs/cgroup/cgroup.controllers
ExecStartPre=/usr/bin/mkdir -p /var/run/hami/mps-v3/pipe /var/run/hami/mps-v3/log
ExecStart=/usr/bin/nvidia-cuda-mps-control -p 3 -f -m -a /etc/nvidia-mps/hami-mps-v3.toml

[Install]
WantedBy=multi-user.target
```

保存为 `/etc/systemd/system/hami-mps-v3.service` 后，在节点上执行：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now hami-mps-v3.service
sudo env CUDA_MPS_PIPE_DIRECTORY=/var/run/hami/mps-v3/pipe \
  nvidia-cuda-mps-control -p 3 compute-policy get timeslice
```

设备插件只连接已有 daemon。停止或重启节点服务前，先排空 MPS 工作负载。

## 配置节点

以下 Helm 配置在 `gpu-node-01` 上启用 `server-timeslice`。按实际节点名称和驱动路径修改。

```yaml
devicePlugin:
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

在 Pod 上设置 `nvidia.com/vgpu-mode: mps-v3`。Pod 的 `hami.io/mps-compute-mode` 必须匹配节点的 `mpsv3.computeMode`。省略该注解时，Pod 使用 `namespace-cap`。两种策略均按每卡 100 单位核算配额，解析得到的 `gpucores` 为 0 时按 100 记账。按[显存申请规则](./specify-device-memory-usage.md)使用 `nvidia.com/gpumem` 或 `nvidia.com/gpumem-percentage`。Toolkit 将最终分配的 MiB 数同时用于显存请求和硬上限。 [NVIDIA r620 显存分区](https://docs.nvidia.com/deploy/mps/620/mpsv3-memory-partitioning.html)

显式选择 MPS v3 的 GPU 容器应由 HAMi 设置 `CUDA_MPS_*` 和 `NVIDIA_GPU_MEMORY_*`。在 Pod 的 `env` 中声明这些变量会被拒绝。

| 策略 | `nvidia.com/gpucores: 25` 的含义 |
| --- | --- |
| `namespace-cap` | 已接入该 namespace 的 CUDA client context 受 25% 的活跃线程上限约束，这个值按 context 生效。 |
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

GPU compute mode 由节点管理员设置。`server-timeslice` 要求 `DEFAULT`。`namespace-cap` 建议使用 `EXCLUSIVE_PROCESS`。MPS server 持卡期间，`EXCLUSIVE_PROCESS` 可阻止其他进程直接创建独立 CUDA context 绕开 MPS 算力限制。 [NVIDIA GPU Compute Modes](https://docs.nvidia.com/deploy/mps/620/when-to-use-mps.html#gpu-compute-modes)

## 申请静态 SM 和可选借用

静态 SM 分区要求 NVIDIA Ampere 或更新架构的 GPU。在 `namespace-cap` Pod 上添加以下注解。仅通过 SM 数申请算力时，可省略 `gpucores`。

```yaml
metadata:
  annotations:
    nvidia.com/vgpu-mode: mps-v3
    hami.io/mps-sm-count: "16"
    hami.io/mps-sm-shareable: "true"
    hami.io/mps-sm-max-chunks: "16"
```

- `hami.io/mps-sm-count` 适用于 Pod 内每个 GPU 容器申请的每张卡。Ampere 独立 GPU 每个 chunk 为 2 SM，因此示例预留 8 个 chunk。Hopper 及更新的独立 GPU 每个 chunk 为 8 SM，集成 GPU 为 2 SM。固定分区也可以使用该设备的余数 SM，前提是能精确组成请求值。
- `hami.io/mps-sm-shareable` 允许驱动在分区没有客户端时借出空闲 SM。默认 `false`。
- `hami.io/mps-sm-max-chunks` 是分区能使用的**总** chunk 数上限，包含基础额度。默认 `0` 表示禁止借入。正整数上限必须在每卡的基础 chunk 数与该卡总 chunk 数之间。`unlimited` 允许驱动使用可借容量。
- 启用借出或借入时，基础额度必须是整 chunk。调度和配额按 `ceil(基础 SM 数 / GPU 总 SM 数 × 100)` 记账。显式设置的 `gpucores` 必须覆盖该值。运行时实际借用量由驱动决定。

HAMi 按 GPU UUID 将分区绑定到 namespace，并将 namespace 的活跃线程百分比设为 100。同一 GPU 同时只支持静态 SM 分区或 namespace 百分比。GPU 有活跃客户端时能否创建新分区取决于驱动与设备。若驱动拒绝，HAMi 会报告错误并回滚该次分配。[NVIDIA SM 借用](https://docs.nvidia.com/deploy/mps/620/mpsv3-interface.html#sm-partition-load-balancing)、[NVIDIA namespace 绑定](https://docs.nvidia.com/deploy/mps/620/mpsv3-namespaces.html#sm-partition-assignments)

## 升级、切换策略和排查

1. 阻止新任务进入节点，并排空其 MPS 工作负载。
2. 确认资源已回收，再变更驱动、插件或节点策略。修改 `computeMode`、基础时间片、yield 或状态目录也需要排空。
3. 确认插件上报健康，运行符合新策略的验证任务，再恢复节点调度。

| 现象 | 检查项 |
| --- | --- |
| MPS v3 节点启动失败 | 检查 r620 驱动、cgroup v2、非 MIG GPU、UUID 设备 ID、缩放系数、MPS 工具和已发布的 CDI hook。 |
| 设备插件无法连接宿主机 MPS daemon | 确认宿主机服务正在以 v3 协议运行，且 pipe 目录为 `<root>/pipe`。在宿主机运行上文的 `compute-policy get timeslice` 命令验证连通性。 |
| Pod 无法匹配 GPU（例如 `CardMPSV3Incompatible`） | 检查 Pod 与节点策略、算力和显存余量、SM chunk 和现有 GPU 集合。 |
| 时间片设置或回读失败 | 检查目标 GPU、驱动和基础时间片。`server-timeslice` 要求 GPU 使用 `DEFAULT` compute mode。 |
| 创建 server 时 compute policy 不匹配 | daemon 没有 server 时，HAMi 会重新设置并回读。已有 server 时，先排空。将已设置的 yield 恢复到 `unset` 还需重启 daemon，并省略启动配置中的 yield。 |
| 资源回收等待客户端 | 等待 CUDA 客户端退出。HAMi 依次删除 namespace、分区和最后一个无引用的 server。 |
| daemon 重启时仍有存活分配 | 若某项分配的 server、namespace 或分区缺失，HAMi 会将该分配的 GPU 标记为不健康。排查 daemon 后通过 Kubernetes 重建受影响的工作负载。在 Pod 存活期间保留分配状态。 |

容器仅在 `/run/hami-mps` 看到自己的 namespace socket 目录。算力设置对通过该 socket 接入的 CUDA 进程生效。MPS 不提供显存带宽或 MIG 级别的故障隔离。普通容器重启保留原分配。若仍有存活工作负载，管理器恢复依赖原 daemon 及其资源。

分配流程和恢复条件见 [MPS v3 后端设计](../../developers/mps-v3-design.md)。
