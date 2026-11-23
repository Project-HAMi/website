---
title: SLI 与 SLO
sidebar_label: SLI 与 SLO
translated: true
---

HAMi 为服务等级指标（SLI）提供 Prometheus 记录规则参考示例，这些 SLI 只覆盖 HAMi 能控制的部分，并且只使用 HAMi 指标。HAMi 不会安装这些规则，也不会设定服务等级目标（SLO）。请先观察 SLI，再为集群选择 SLO。

:::info 记录规则

- 使用 Prometheus Operator 时：[下载 hami-slis.yaml](pathname:///prometheus/hami-slis.yaml)
- 不使用 Prometheus Operator 时：[下载 hami-slis.rules.yaml](pathname:///prometheus/hami-slis.rules.yaml)

:::

## 兼容性

| 组件 | 要求 |
| --- | --- |
| HAMi | v2.12.0 及以上版本 |
| Prometheus | 采集 scheduler 和 vGPU monitor 指标端点；使用远程 GPU 时，还需采集 remote GPU monitor 指标端点（参见[监控远程 GPU 工作负载](../nvidia-device/remote-gpu.md#monitor-remote-gpu-workloads)） |

## SLI 列表

每个 SLI 都是良好事件占全部事件的比例。这些 SLI 覆盖 HAMi 的三个部分：调度器状态、设备分配和设备。

| SLI | 定义 | 序列 |
| --- | --- | --- |
| [可用性](#availability) | 调度器 leader 已同步其节点/设备缓存的时间所占的比例 | `hami_scheduler_state:availability7d` |
| [新鲜度](#freshness) | 调度器 leader 的节点/设备缓存保持新鲜（默认为最近一次同步距今不到 60 秒）的时间所占的比例 | `hami_scheduler_state:freshness7d` |
| [可靠性](#reliability) | 成功的设备分配尝试所占的比例 | `hami_scheduler_allocation:reliability7d` |
| [延迟](#latency) | 默认在 10 秒内完成的成功设备分配所占的比例 | `hami_scheduler_allocation:latency7d` |
| [正确性](#correctness)（仅 NVIDIA） | 所在 Pod 的 GPU 显存上限不超过该 Pod 分配到的 GPU 显存的 vGPU 容器所占的比例 | `hami_vgpu_memory_limit:correctness7d` |
| [完整性](#completeness)（仅 NVIDIA） | 调度器和对应 GPU monitor（vGPU monitor 或 remote GPU monitor）都能看到的 GPU 所占的比例 | `hami_gpu:completeness7d` |

## 添加规则

### Prometheus Operator

集群已安装 Prometheus Operator 时，启用 HAMi Helm Chart 自带的 ServiceMonitor：

```bash
helm upgrade --install hami hami-charts/hami \
  --namespace kube-system \
  --values my-values.yaml \
  --set prometheus.enabled=true
```

`my-values.yaml` 保存当前安装自定义的 Helm Chart values，以便后续升级时保留这些设置。

使用 Prometheus Operator 格式的 `hami-slis.yaml`。先[调整规则](#tune-the-rules)，然后应用：

```bash
kubectl apply -n monitoring -f hami-slis.yaml
```

确认 Prometheus 的 `ruleSelector` 和规则 namespace selector 能够匹配该 PrometheusRule。

### 不使用 Prometheus Operator

使用 `hami-slis.rules.yaml`，该文件采用 Prometheus 可读取的规则文件格式。先[调整规则](#tune-the-rules)，然后将其添加到 Prometheus 配置的 `rule_files` 中：

```yaml
rule_files:
  - /etc/prometheus/rules/hami-slis.rules.yaml
```

如果 scheduler、vGPU monitor 和 remote GPU monitor 的采集配置会添加自己的 `namespace`、`pod` 或 `node` 标签，请像 HAMi Helm Chart 中的 ServiceMonitor 一样设置 `honor_labels: true`。否则 Prometheus 会重命名指标中的这些标签，例如把 `pod` 重命名为 `exported_pod`，[正确性](#correctness)和[完整性](#completeness)会匹配到错误的 Pod 和节点。

[完整性](#completeness)需要在 device plugin Pod 未就绪时仍能获取 vGPU monitor 指标，因此请按 Pod IP 采集，不要通过 Service 采集。

## 调整规则 {#tune-the-rules}

阈值都只是初始值。HAMi 支持多种后端、调度策略和工作负载模式，一组取值无法适用于所有集群。

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
- 完整性：要排除不应计入的 GPU（例如 `filterdevices` 中的设备），请在 `:hami_gpus_seen_by_both:count` 和 `:hami_gpus_seen_by_either:count` 的每个指标上添加 `{device_uuid!~"(.+/)?(<uuid-1>|<uuid-2>)"}`。`(.+/)?` 部分也能匹配远程 GPU，调度器以 `<server>/<uuid>` 的形式上报远程 GPU。
- 时间窗口：如需使用 7 天以外的时间窗口，请修改 `hami-slis-7d` 规则组中的 `[7d]`，并让 Prometheus 至少保留同样长的数据。

## SLI 详情

### 可用性 {#availability}

#### 定义

HAMi 有一个已同步节点/设备缓存、可以调度申请设备的 Pod 的调度器 leader 的时间所占的比例，由 `hami_scheduler_cache_synced` 衡量。

#### 用户故事

- 作为 HAMi 用户，我希望申请设备的 Pod 随时都能被调度。
- 作为集群管理员，我希望知道 HAMi 有多长时间无法调度申请设备的 Pod，例如在 leader 切换或升级期间。

#### 说明

- 备用的调度器 Pod 不计入，因为只有 leader 调度 Pod。
- 新 leader 完成第一次节点/设备缓存同步后才计为可用。在此之前，它无法判断哪些节点能满足 Pod 的设备请求。
- Prometheus 无法采集 leader 的时间计为不可用，因为 Prometheus 无法确认是否存在就绪的 leader。

### 新鲜度 {#freshness}

#### 定义

调度器 leader 的节点/设备缓存保持新鲜的时间所占的比例。默认情况下，最近一次成功同步距今不到 60 秒时，缓存即为新鲜（参见[调整规则](#tune-the-rules)）。由 `hami_scheduler_last_sync_success_timestamp_seconds` 衡量。

#### 用户故事

- 作为 HAMi 用户，我希望调度器根据当前的设备及其健康状态放置我的 Pod，而不是根据旧的设备信息。
- 作为集群管理员，我希望知道调度器何时停止同步其节点/设备缓存。

#### 说明

- 没有调度器 leader、新 leader 尚未完成第一次同步，或 Prometheus 无法采集 leader 的时间计为不良，因为无法看到新鲜的缓存。

### 可靠性 {#reliability}

#### 定义

成功的设备分配尝试所占的比例。device plugin 分配设备后，尝试即为成功；尝试可能在 `filter`、`bind` 或 `allocate` 阶段失败。部分失败原因不计入（参见[说明](#reliability-notes)）。由 `hami_scheduler_allocations_total` 和 `hami_scheduler_allocation_failures_total` 衡量。

#### 用户故事

- 作为 HAMi 用户，我希望申请设备的 Pod 能够获得设备，不会因为 HAMi 而一直处于 `Pending` 状态或失败。
- 作为集群管理员，我希望知道 HAMi 为每种设备类型分配设备失败的频率。

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

#### 用户故事

- 作为 HAMi 用户，我希望我的 Pod 在绑定到节点后很快获得设备。
- 作为集群管理员，我希望知道在 HAMi 开始绑定 Pod 之后，设备分配耗时过长的频率。

#### 说明

- 只统计在超时之前成功的分配。
- 该 SLI 按设备类型分别计算，因为每种设备类型都有自己的 device plugin。

### 正确性（仅 NVIDIA） {#correctness}

#### 定义

所在 Pod 在每个 GPU 上的 GPU 显存上限之和不超过 HAMi 在该 GPU 上分配给该 Pod 的 GPU 显存的 vGPU 容器所占的比例。由 `hami_vgpu_memory_limit_bytes` 和 `hami_vgpu_memory_allocated_bytes` 衡量。

#### 用户故事

- 作为 HAMi 用户，我希望共享 GPU 上的其他 Pod 只使用分配给它们的显存，不会占用分配给我的 Pod 的显存。
- 作为集群管理员，我希望知道容器中的显存上限是否超过了 HAMi 的分配量。

#### 说明

- 远程 GPU 不计入，因为 remote GPU monitor 根据 `hami.io/remote-gpu-devices-allocated` annotation 中的 HAMi 分配结果上报其显存上限，而不是根据 Lupine 服务端实际应用的上限，因此这些上限永远不会超过分配量。
- Prometheus 无法采集调度器 leader 的时间不计入，因为无法得知分配给每个 Pod 的 GPU 显存。

### 完整性（仅 NVIDIA） {#completeness}

#### 定义

HAMi 调度器和对应 GPU monitor（vGPU monitor 或 remote GPU monitor）都能看到的 GPU 所占的比例。在每次规则评估时，总数包括 Prometheus 采集到 vGPU monitor 或 remote GPU monitor 的节点上任一方能看到的所有 GPU。调度器一侧由 `hami_gpu_memory_limit_bytes` 和 `hami_remote_gpu_memory_limit_bytes` 衡量，monitor 一侧由 `hami_host_gpu_memory_used_bytes` 衡量。

#### 用户故事

- 作为 HAMi 用户，我希望节点上的每个 GPU 都能供我的 Pod 使用，除非它被有意排除。
- 作为集群管理员，我希望知道调度器和 GPU monitor 何时对存在哪些 GPU 的看法不一致，例如在 device plugin 故障之后。

#### 说明

- `filterdevices` 中的设备不会注册到 HAMi（参见[配置](../configure.md#node-configuration)），因此调度器看不到它们。在从规则中排除之前，这些设备都计为不良。参见[调整规则](#tune-the-rules)。
- Prometheus 无法采集调度器 leader 的时间，以及 Prometheus 无法采集 GPU monitor 的节点上的 GPU，都不计入，因为无法得知调度器或 monitor 看到了什么。
