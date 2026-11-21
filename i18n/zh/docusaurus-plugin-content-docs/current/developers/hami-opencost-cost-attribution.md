---
id: hami-opencost-cost-attribution
title: 基于 HAMi 的 OpenCost GPU 成本按份额分摊
sidebar_label: OpenCost 成本分摊
translated: true
---

## 当前状态与第一个里程碑

本方案对应 [HAMi #3073](https://github.com/Project-HAMi/HAMi/issues/3073) 和 [OpenCost #3828](https://github.com/opencost/opencost/issues/3828)。OpenCost 原生 GPU 请求核算读取 `nvidia.com/gpu`，因此申请一个虚拟设备和 25% 算力的 HAMi Pod 仍可能按完整设备记录请求量。维护者报告的 T4 基线已展示这种过度计费，以及另一个物理设备数量错误。

第一个里程碑将未经修改的 OpenCost 分配 API 结果与离线的**算力预留参考模型**比较。[实验工具](https://github.com/Eshiv-Pandey/HAMi/tree/2739e1ddaa71c333685d0c99463e5553bd47e632/opencost-repro) 单独发布在 HAMi 的个人 fork 中。此版本将采集窗口与 OpenCost 查询分辨率对齐，并保持导出的 GPU 小时价格按物理 GPU 计价。该工具没有实现 OpenCost 原生 HAMi 分配源。

使用一张独占物理 NVIDIA GPU 顺序执行实验：四个持续运行的四分之一预留 Pod 运行一小时，然后一个整卡预留 Pod 运行一小时。在所选算力策略下，两组实验都应预留一个 GPU 小时。此里程碑要求显式正值算力和显存限制、每个 Pod 只有一个容器、Pod UID 保持稳定、没有初始化容器且没有容器重启。

### 已报告的 T4 基线

[spencercjh 报告了 GCP 实验](https://github.com/Project-HAMi/HAMi/issues/3073#issuecomment-6936317656)，于 2026 年 11 月 16 日在一张 Tesla T4 上运行，使用 K3s `v1.35.8+k3s1`、HAMi `v2.11.0` 和 OpenCost `1.121.3`。共享与整卡测试顺序执行，各运行一小时。所有 Pod 均执行 CUDA 操作且没有重启。物理 GPU 的配置价格为每小时 $0.44：

| 测试                            | 按算力预留策略预期的 Pod 总成本 | OpenCost 报告的 Pod 总成本 |
| ------------------------------- | ------------------------------- | -------------------------- |
| 四个 Pod，各预留 25% 算力和显存 | $0.44                           | $1.76                      |
| 一个整卡 Pod                    | $0.44                           | $0.44                      |

共享 Pod 的总费用为预期值的四倍。OpenCost 在节点成本中还将 10 个虚拟 GPU 单位计为 10 张物理 GPU。这些是维护者报告的基线结果，不能证明原生分配源已修正。报告提到采集窗口对齐修复；原始采集数据和操作人员的具体补丁仍需单独交接。

## 分配与运行时证据

四分之一份额工作负载请求：

```yaml
resources:
  requests:
    nvidia.com/gpu: "1"
    nvidia.com/gpucores: "25"
    nvidia.com/gpumem-percentage: "25"
  limits:
    nvidia.com/gpu: "1"
    nvidia.com/gpucores: "25"
    nvidia.com/gpumem-percentage: "25"
```

| 指标 | 含义与身份信息 |
| --- | --- |
| `hami_vgpu_core_allocated_ratio` | Pod 与设备的已分配算力。NVIDIA 数值表示百分比（25 表示 25%）。标签包含命名空间、节点、Pod 名称和设备 UUID。 |
| `hami_vgpu_memory_allocated_bytes` | Pod 与设备的预留显存，身份标签与算力预留相同。 |
| `hami_gpu_memory_limit_bytes` | HAMi 报告的设备显存容量，空闲时也可使用。对于非 MIG NVIDIA 设备，`devicememoryscaling` 会缩放此值。 |
| `hami_container_device_utilization_ratio` | 运行时利用率，标签包含命名空间、Pod 名称、容器、虚拟设备索引和 UUID，不包含节点或 Pod UID。 |
| `hami_vgpu_memory_used_bytes` | 运行时显存使用量，身份标签与运行时利用率相同。 |

应使用报告的容量，不要通过分配比例反推：用已分配字节数除以分配份额，在空闲 GPU 上会产生 `0/0`。记录 `devicememoryscaling`，与物理显存比较时使用值 1；经过缩放的值不能独立证明物理显存容量。当前预留序列按 Pod 与设备聚合，没有容器索引或 Pod UID。v2.10.0 中恒定的 `container_index` 标签已在 [HAMi #2898](https://github.com/Project-HAMi/HAMi/pull/2898) 中移除。

调度过滤成功后 Pod 仍可能无法启动。采集要求 `hami.io/bind-phase` 成功、`hami.io/vgpu-devices-allocated` 包含实际物理 UUID，并独立观察 Kubernetes 运行区间和新鲜运行时源时间戳。工具通过稳定的实时 Kubernetes UID 与 `kube_pod_info` 佐证身份。观测缺失、过期、存在歧义或 Pod 重建时，实验失败。仅有序列存在不能证明可计费生命周期。

这种受限实时实验不能证明历史 KSM 关联足以支持生产计费。是否需要 HAMi UID 指标仍属于集成决策。多容器聚合、初始化容器资源释放和重启需要独立语义。

### 无限制算力与运行时设置

未设置或值为零的 `gpucores` 表示没有算力限制，不能默认转换为零成本。由于其预留份额未定义，第一个里程碑拒绝此类分配。

HAMi v2.11.0 将 HAMi-core 固定为 `17212525d27ac156955ab940c5d51df33d9e0d09`。在这一发布版本对应的修订中，[`do_init_device_sm_limits`](https://github.com/Project-HAMi/HAMi-core/blob/17212525d27ac156955ab940c5d51df33d9e0d09/src/multiprocess/multiprocess_memory_limit.c#L275-L291) 将缺失或为零的基础 `CUDA_DEVICE_SM_LIMIT` 转换为 100。[`init_utilization_watcher`](https://github.com/Project-HAMi/HAMi-core/blob/17212525d27ac156955ab940c5d51df33d9e0d09/src/multiprocess/multiprocess_utilization_watcher.c#L334-L357) 在决定是否启动时包含有效限制为 100 的设备。因此，在此发布版本中，请求算力为零不代表缺少利用率采集。其他 HAMi-core 修订需要单独检查源码。

后续利用率实验应保留实际部署的 HAMi-core 版本、`CUDA_DEVICE_SM_LIMIT` 和 `GPU_CORE_UTILIZATION_POLICY` 设置，并通过新鲜运行时证据确认采集。利用率为零可能表示工作负载空闲，不能据此判断采集缺失。按利用率计费和争用策略需要独立验证。

## 参考成本策略

对于已确认且有采样证据的运行区间：

```text
reserved_gpu_hours = core_percent / 100 * running_seconds / 3600
reserved_cost = reserved_gpu_hours * physical_gpu_hourly_price
```

参考模型先累积 GPU 秒，再除以 3600，避免重复累加小数小时产生舍入误差。利用率为零仍产生预留成本。显存份额仅用于诊断，参考模型不会将物理价格平均拆分为算力和显存价格。

```text
reserved_gpu_hours + idle_gpu_hours + unattributed_gpu_hours
  = physical_gpu_hours

reserved_cost + idle_cost + unattributed_cost
  = physical_gpu_hours * physical_gpu_hourly_price
```

采样缺失时，对应运行预留保持未归属状态，不转为空闲或免费。区间不完整、算力预留总量超过整卡或显存预留总量超过直接容量时，实验失败。允许显存超卖的 HAMi 配置不在此里程碑范围内：实际使用量受物理容量约束，并不意味着预留总量也受该约束。

各维度独立定价仍是一种可选策略，使用 `core_gpu_hours * core_hourly_price + memory_gpu_hours * memory_hourly_price`。它需要先约定费率、超卖处理和对账语义。仅算力参考测试不能验证该策略或按实际使用量归属成本。

### 定价与 OpenCost 原生核算

[`node_gpu_hourly_cost`](https://github.com/opencost/opencost/blob/2f1af7f0c26368b50bf981a25e9e5f38b800979f/pkg/costmodel/metrics.go#L168-L173) 表示每张物理 GPU 的小时价格。参考模型直接使用该报价；乘以虚拟容量、副本数量或虚拟与物理数量的比率会放大物理设备的成本预算。保留价格来源、币种、节点容量、GFD 物理数量和副本标签。操作人员必须确认费率表示预期的物理 GPU 价格。应保留 [OpenCost #2862](https://github.com/opencost/opencost/pull/2862) 中原生副本处理，而不是在参考模型中再次调整价格。

还应检查原生设备清单。已报告的 T4 测试将 10 个虚拟 GPU 单位计为物理 GPU。缺少副本元数据时，OpenCost 可能将 HAMi 的虚拟 `nvidia.com/gpu` 容量解释为物理 GPU 数量。仅修正 Pod 份额不能证明资产和空闲成本正确。最终分配源接入位置需要 OpenCost 维护者确认，并在计算原生小时数与成本之前同时处理请求量和已分配量。[自定义成本插件 PR #69](https://github.com/opencost/opencost-plugins/pull/69) 涉及相邻 GenAI/MIG 记录，自定义成本不会自动替换原生 GPU 费用。

## 执行基线实验

使用 Linux/amd64 GPU Kubernetes 环境，提供兼容 CUDA 12.1 的驱动、NVIDIA 容器运行时、Python 3.11 或更新版本，以及足够运行四个 PyTorch Pod 的内存和磁盘。集群组件由操作人员安装，实验工具负责准备工作负载并采集证据。

| 组件               | 固定版本                  |
| ------------------ | ------------------------- |
| HAMi               | v2.11.0                   |
| OpenCost           | 1.121.3                   |
| Prometheus         | 3.2.1                     |
| kube-state-metrics | 2.15.0                    |
| PyTorch 工作负载   | 2.5.1、CUDA 12.1、cuDNN 9 |

使用工具 `versions.json` 中不可变的 linux/amd64 镜像清单。采集工具将运行镜像 ID 与清单或配置摘要比较。HAMi v2.11.0 默认导出新指标，OpenCost 标准 Kubernetes 指标输入必须可用。所有被查询的 Prometheus 目标必须健康，并以 15 秒间隔抓取。

在运行中的 OpenCost 容器中设置以下字面值：

```yaml
- name: PROMETHEUS_QUERY_RESOLUTION_SECONDS
  value: "60"
- name: KUBECOST_SCRAPE_INTERVAL
  value: "15s"
```

OpenCost 1.121.3 的 `/allocation/compute` 不读取 URL 中的 `resolution` 覆盖参数。源查询分辨率来自进程配置，未设置时默认为 300 秒。工具分别检查 60 秒进程查询分辨率和 15 秒抓取间隔，并在就绪及预热后向前等待到查询分辨率边界。窗口两端均对齐，持续时间必须为查询分辨率和抓取间隔的整数倍。OpenCost 必须查询与采集工具相同的 Prometheus 服务，保留 Service 选择器或端口转发命令作为连接证据。

检出链接中的工具版本，并从其仓库根目录执行命令。将 `NODE` 和 `GPU_UUID` 设置为真实节点名称与完整物理 GPU UUID，将示例币种 `USD` 替换为实际定价币种。循环顺序执行共享和整卡实验，任何一步失败都会停止。重复实验时使用新的命名空间和输出目录。

```bash
set -euo pipefail
: "${NODE:?Set the GPU node name}"
: "${GPU_UUID:?Set the full physical GPU UUID}"
python3 -m unittest discover -s opencost-repro -p 'test_*.py' -v
for profile in shared whole; do
  output="opencost-repro/runs/${profile}"
  python3 opencost-repro/runner.py prepare \
    --namespace "hami-finops-${profile}" --node "${NODE}" --uuid "${GPU_UUID}" \
    --profile "${profile}" --out "${output}" --apply
  python3 opencost-repro/runner.py capture \
    --out "${output}" \
    --prom-url http://127.0.0.1:9090 --opencost-url http://127.0.0.1:9003 \
    --duration 3600 --currency USD --cleanup
  python3 opencost-repro/runner.py report --dataset "${output}/dataset.json"
done
```

放置使用必需节点亲和性与物理 UUID 注解。生成清单不设置 `spec.nodeName`，工具检查调度器分配的节点。所选节点通过 HAMi 容量指标只能暴露目标物理 GPU，且该卡不能被其他工作负载占用。CUDA 就绪状态在成功执行 GPU 运算后才建立。

`--cleanup` 使用 API 服务端 UID 前置条件删除已验证 Deployment，并等待其 Pod 消失，同时保留命名空间和 ConfigMap。清理失败时检查 `cleanup-failure.json`。保留失败输出，重试时使用新目录。源码或版本锁变化后，也需要重新准备实验。

## 结果与实现验收

工具保留 Kubernetes 快照、原始 Prometheus 结果与源时间戳、硬件及驱动证据、代码摘要、定价输入、工作负载日志，以及精确 RFC3339 窗口内的实际分配 API 响应。原生分配区间必须覆盖每个已确认运行窗口。报告分别保留 `gpuHours`、原始 `gpuCost`、`gpuCostAdjustment` 和调整后成本。固定版本的线上 JSON 格式使用小写 `gpuAllocation.gpuRequestAverage`。

CPU 测试包含 72 个用例，覆盖核算、身份、缺失观测、重复采样、物理定价、对齐查询窗口、API 格式和模拟采集失败。它们在没有 GPU 或 OpenCost 服务的情况下验证参考模型与采集行为。上面的 T4 表格记录维护者的原生基线。此修订版采集工具尚未在该 GPU 上重新运行，也没有证明已修正 OpenCost 原生集成。

返回两组采集目录与脱敏的定价及连接证据。得出计费结论之前，必须调查缺失采样、无效原生区间、GPU 工作负载失败或不完整 API 结果。下一步工作：

1. 获取两组原始 T4 采集数据和操作人员的补丁；需要新的完整采集数据时运行修订版工具。
2. 与 OpenCost 维护者约定可选分配源接入位置、物理设备清单和 UID 及生命周期语义。
3. 实现并测试绑定及运行窗口、绑定失败、重启、缺失数据、重复抓取、重建、物理价格、副本归一化和原生资产及空闲成本对账。
4. 对同一组工作负载分别禁用和启用约定的分配源。只有这些运行才能建立实测的集成前后对比结果。

集成已实现并验证后，才对报告使用 `--require-corrected`。它将原生小时数、原始成本和调整后成本与参考模型比较。基线差异是待调查证据，不能证明修正已经实现。
