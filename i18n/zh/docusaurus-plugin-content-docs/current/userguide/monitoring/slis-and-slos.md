---
title: SLI 与 SLO
sidebar_label: SLI 与 SLO
translated: true
---

HAMi 为服务等级指标（SLI）提供 Prometheus 记录规则参考示例，这些 SLI 只覆盖 HAMi 能控制的部分，并且只使用 HAMi 指标。HAMi 不会安装这些规则。如需设置服务等级目标（SLO），请参见[设置 SLO](#set-slos)。

:::info 记录规则

- 使用 Prometheus Operator 时：[下载 hami-slis.yaml](pathname:///prometheus/hami-slis.yaml)
- 不使用 Prometheus Operator 时：[下载 hami-slis.rules.yaml](pathname:///prometheus/hami-slis.rules.yaml)

:::

## 兼容性

| 组件 | 要求 |
| --- | --- |
| HAMi | v2.12.0 及以上版本 |
| Prometheus | 采集 scheduler 和 vGPU monitor 指标端点；使用远程 GPU 时，还需采集 remote GPU monitor 指标端点（参见[监控远程 GPU 工作负载](../nvidia-device/remote-gpu.md#monitor-remote-gpu-workloads)） |

规则假设 Prometheus 只存储一个集群的指标。

## SLI 列表

每个 SLI 都是良好事件占全部事件的比例。这些 SLI 覆盖 HAMi 的三个部分：调度器状态、设备分配和设备。

| SLI                                  | 序列                                      |
| ------------------------------------ | ----------------------------------------- |
| [可用性](#availability)              | `hami_scheduler_state:availability7d`     |
| [新鲜度](#freshness)                 | `hami_scheduler_state:freshness7d`        |
| [可靠性](#reliability)               | `hami_scheduler_allocation:reliability7d` |
| [延迟](#latency)                     | `hami_scheduler_allocation:latency7d`     |
| [正确性](#correctness)（仅 NVIDIA）  | `hami_vgpu_memory_limit:correctness7d`    |
| [完整性](#completeness)（仅 NVIDIA） | `hami_gpu:completeness7d`                 |

## 添加规则 {#add-the-rules}

按照与告警规则相同的步骤添加 `hami-slis.yaml`（Prometheus Operator）或 `hami-slis.rules.yaml`，参见[添加规则](alerting-and-runbooks.md#add-the-rules)。

[完整性](#completeness)需要在 device plugin Pod 未就绪时仍能获取 vGPU monitor 指标，因此请按 Pod IP 采集，不要通过 Service 采集。

## 调整规则 {#tune-the-rules}

`hami-slis.yaml` 和 `hami-slis.rules.yaml` 都包含两个规则组：

- `hami-slis` 在每次规则评估时记录调度器状态、分配次数等数值。
- `hami-slis-7d` 使用这些记录的数值计算最近 7 天的 SLI，每 3 分钟运行一次。

例如，延迟的 10 秒阈值定义在 `hami-slis-7d` 的这条规则中：

```yaml
- record: hami_scheduler_allocation:latency7d
  # threshold: allocations that succeed within 10 seconds
  expr: |
    sum by (device_type) (sum_over_time(device_type_le:hami_scheduler_allocation_duration_seconds_bucket:increase1h{le=~"10(\\.0)?"}[7d]))
    /
    sum by (device_type) (sum_over_time(device_type_le:hami_scheduler_allocation_duration_seconds_bucket:increase1h{le="+Inf"}[7d]))
```

部分场景需要调整特定 SLI：

- 延迟：在 `hami_scheduler_allocation:latency7d` 中设置阈值。
  - 阈值必须是某个 bucket 的取值：1、2、3、4、5、6、8、10、20、30、45、60、120、180、240 或 300 秒。其他取值匹配不到任何序列，SLI 将没有数据。
  - 只修改 `le=~"10(\\.0)?"` 中的数字。Prometheus 2 将该 bucket 存储为 `le="10"`，Prometheus 3 将其存储为 `le="10.0"`。`(\\.0)?` 部分可以同时匹配这两种形式。
  - `hami.io/bind-time` 只保留整秒，因此测得的时间最多会比实际长 1 秒。这对 1 秒和 2 秒的阈值影响最大。
- 新鲜度：在 `:hami_scheduler_sync_fresh:bool` 中设置阈值。调度器每 15 秒同步一次节点/设备缓存，请让阈值明显大于该间隔。
- 完整性：要排除不应计入的 GPU（例如 `filterdevices` 中的设备），请在 `:hami_gpus_seen_by_both:count` 和 `:hami_gpus_seen_by_either:count` 的每个指标的花括号内添加匹配条件 `device_uuid!~"(.+/)?(<uuid-1>|<uuid-2>)"`，例如 `hami_gpu_memory_limit_bytes{device_type=~"NVIDIA.*", device_uuid!~"…"}`。`(.+/)?` 部分也能匹配远程 GPU，调度器以 `<server>/<uuid>` 的形式上报远程 GPU。
- 时间窗口：如需使用 7 天以外的时间窗口，请修改 `hami-slis-7d` 规则组中的 `[7d]`，并让 Prometheus 至少保留同样长的数据。

## 设置 SLO {#set-slos}

SLO 是 SLI 在其时间窗口内的目标，例如“7 天内可用性至少为 99.5%”。HAMi 不提供目标值，因为合适的取值取决于集群。

设置 SLO 之前，请先配置采集（参见[添加规则](#add-the-rules)），并按照[调整规则](#tune-the-rules)排除完整性中不应计入的设备。否则，采集中断和被过滤的设备都会影响 SLI。

选择 SLO 目标：

- 至少观察四个 7 天窗口的 SLI。请让 Prometheus 至少保留 28 天的数据。将正常运行期间出现的最低值向下取整，作为初始目标。不要使用 100%。
- 为每种设备类型分别设置可靠性和延迟的目标。如果某种设备类型的分配次数很少，一次失败的分配就可能明显影响可靠性，一次缓慢的分配就可能明显影响延迟。可以考虑使用更长的时间窗口（参见[调整规则](#tune-the-rules)中的**时间窗口**），或降低目标。
- 起初每月复查一次目标，之后每季度复查一次。

SLO 目标同时也定义了错误预算。例如：

- **7 天内 99.5% 的可用性**：允许大约 50 分钟没有已同步的调度器 leader。
- **每周 1,000 次分配尝试、99% 的可靠性**：允许 10 次计入的失败。

查看可用性错误预算还剩多少：

```promql
# 1: budget unused, 0: budget used up, below 0: SLO missed
1 - (1 - hami_scheduler_state:availability7d) / (1 - 0.995)
```

## SLI 详情

### 可用性 {#availability}

#### 定义

HAMi 有一个已同步节点/设备缓存、可以调度申请设备的 Pod 的调度器 leader 的时间所占的比例，由 `hami_scheduler_cache_synced` 衡量。

#### 说明

- 备用的调度器 Pod 不计入，因为只有 leader 调度 Pod。
- 新 leader 完成第一次节点/设备缓存同步后才计为可用。在此之前，它无法判断哪些节点能满足 Pod 的设备请求。
- Prometheus 无法采集 leader 的时间计为不可用，因为 Prometheus 无法确认是否存在就绪的 leader。

### 新鲜度 {#freshness}

#### 定义

调度器 leader 的节点/设备缓存保持新鲜的时间所占的比例。默认情况下，最近一次成功同步距今不到 60 秒时，缓存即为新鲜（参见[调整规则](#tune-the-rules)）。由 `hami_scheduler_last_sync_success_timestamp_seconds` 衡量。

#### 说明

- 没有调度器 leader、新 leader 尚未完成第一次同步，或 Prometheus 无法采集 leader 的时间计为不良，因为无法看到新鲜的缓存。

### 可靠性 {#reliability}

#### 定义

成功的设备分配尝试所占的比例。device plugin 分配设备后，尝试即为成功；尝试可能在 `filter`、`bind` 或 `allocate` 阶段失败。部分失败原因不计入（参见[说明](#reliability-notes)）。由 `hami_scheduler_allocations_total` 和 `hami_scheduler_allocation_failures_total` 衡量。

#### 说明 {#reliability-notes}

- 以下失败不计入：
  - `no_fit`：没有节点能满足设备请求，例如空闲设备不足、设备不健康或已被 cordon，或者达到了配额。这取决于集群中的设备和配额，而不是 HAMi。
  - `lock`：同一节点上的另一个设备分配仍在进行中，因此 HAMi 暂时无法将 Pod 绑定到该节点。kube-scheduler 会再次尝试调度该 Pod。
  - `lookup` 和 `identity`：Pod 或节点在调度期间发生变化或被删除，因此 HAMi 找不到它，或者绑定请求已不再与其匹配。
- `refit` 阶段的失败不单独计入。如果 NUMA refit 失败导致分配停止，则计为一次 `allocate` 失败；否则，分配会继续使用 kubelet 选择的设备。
- 超时的分配计为一次失败，即使 device plugin 之后完成了该分配。
- 该 SLI 按设备类型分别计算，因为每种设备类型都有自己的 device plugin。

### 延迟 {#latency}

#### 定义

默认在 10 秒内完成的成功设备分配所占的比例（参见[调整规则](#tune-the-rules)）。计时从 HAMi 开始将 Pod 绑定到节点时开始，到调度器看到 device plugin 已分配设备时结束。由 `hami_scheduler_allocation_duration_seconds` 衡量。

#### 说明

- 只统计在超时之前成功的分配。

### 正确性（仅 NVIDIA） {#correctness}

#### 定义

在容器 GPU 显存上限（每个容器在每个 GPU 上计为一条）中，所在 Pod 在该 GPU 上的上限之和不超过 HAMi 在该 GPU 上分配给该 Pod 的 GPU 显存的上限所占的比例。由 `hami_vgpu_memory_limit_bytes` 和 `hami_vgpu_memory_allocated_bytes` 衡量。

#### 说明

- 远程 GPU 不计入。remote GPU monitor 根据 `hami.io/remote-gpu-devices-allocated` annotation 中的 HAMi 分配结果上报其显存上限，而不是根据 Lupine 服务端实际应用的上限，因此这些上限永远不会超过分配量。
- MIG 容器不计入，因为 vGPU monitor 使用 MIG UUID 上报这些容器，而 MIG UUID 永远不会与分配结果中的 GPU UUID 匹配。
- Pod 的 init 容器结束后，这些 init 容器使用过的 GPU 上的显存上限计为不良，因为 vGPU monitor 仍会上报 init 容器的显存上限，而 HAMi 会调低该 Pod 的分配量。
- Prometheus 无法采集调度器 leader 的时间不计入，因为无法得知分配给每个 Pod 的 GPU 显存。

### 完整性（仅 NVIDIA） {#completeness}

#### 定义

HAMi 调度器和对应 GPU monitor（vGPU monitor 或 remote GPU monitor）都能看到的 GPU 所占的比例。在每次规则评估时，总数包括 Prometheus 采集到 vGPU monitor 或 remote GPU monitor 的节点上任一方能看到的所有 GPU。调度器一侧由 `hami_gpu_memory_limit_bytes` 和 `hami_remote_gpu_memory_limit_bytes` 衡量，monitor 一侧由 `hami_host_gpu_memory_used_bytes` 衡量。

#### 说明

- `filterdevices` 中的设备不会注册到 HAMi（参见[配置](../configure.md#node-configuration)），因此调度器看不到它们。在从规则中排除之前，这些设备都计为不良。参见[调整规则](#tune-the-rules)。
- 没有已同步的调度器 leader 或 Prometheus 无法采集 leader 的时间，以及 Prometheus 无法采集 GPU monitor 的节点上的 GPU，都不计入，因为无法得知调度器或 monitor 看到了什么。
