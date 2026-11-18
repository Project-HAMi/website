---
id: scheduler-metrics
title: 调度器指标
translated: true
sidebar_label: 调度器指标
---

HAMi 在已配置的调度器指标端点上暴露调度器指标。

## 分配结果

分配结果类指标只使用有限范围的标签值：

| 指标 | 含义 |
| --- | --- |
| `hami_scheduler_allocations_total` | 成功的分配步骤次数。 |
| `hami_scheduler_allocation_failures_total` | 失败的分配步骤次数。 |
| `hami_scheduler_bind_rollbacks_total` | 释放预留的绑定失败次数。 |
| `hami_scheduler_allocation_duration_seconds` | 从绑定到设备插件报告分配成功所用的秒数。仅主副本（leader）记录。 |

计数器的标签为 `phase`、`device_type` 和 `failure_reason`。直方图的标签为 `device_type`，桶的范围为 1 到 300 秒（默认的节点锁超时）。标签不会包含 Pod、命名空间、节点、UUID 或请求标识。本页所有指标还带有 `zone="vGPU"` 标签。

`phase` 表示结果所属的步骤：

| 取值 | 含义 |
| --- | --- |
| `filter` | 调度器选择节点并预留设备。 |
| `bind` | 调度器将 Pod 绑定到节点。 |
| `allocate` | 设备插件分配已预留的设备。当 Pod 的 `hami.io/bind-phase` 注解离开 `allocating` 时，由主副本（leader）记录结果。 |
| `refit` | 调度器将容器的分配移到 kubelet 允许的 GPU 上。参见 [NUMA 对齐](../userguide/nvidia-device/numa-alignment.md)。 |

`failure_reason` 使用以下完整且固定的取值：

| 取值               | 含义                                                |
| ------------------ | --------------------------------------------------- |
| `none`             | 操作成功。                                          |
| `no_fit`           | 没有候选节点或设备能满足请求。                      |
| `lookup`           | 找不到所需的 Pod、节点或分配。                      |
| `identity`         | 请求与当前 Pod、容器或节点不匹配。                  |
| `lock`             | 设备预留加锁失败。                                  |
| `annotation_patch` | 必需的 Pod 注解更新失败。                           |
| `conflict`         | refit 期间 Pod 发生了变化，refit 的注解更新被拒绝。 |
| `bind`             | 其他绑定操作失败。                                  |
| `device_plugin`    | 设备插件报告分配失败。                              |
| `internal`         | 内部解码、用量、打分、发现或清理失败。              |

成功使用 `failure_reason="none"`。释放预留的绑定失败会同时增加失败计数器和回滚计数器。

## 调度器状态

| 指标 | 含义 |
| --- | --- |
| `hami_scheduler_is_leader` | 当前副本是主副本（leader）时为 `1`，否则为 `0`。 |
| `hami_scheduler_cache_synced` | 当前副本的节点和设备缓存完成同步后为 `1`，从副本（follower）上为 `0`。之后同步失败时仍保持 `1`，因此请用下一个指标检查同步是否仍能完成。 |
| `hami_scheduler_last_sync_success_timestamp_seconds` | 最近一次缓存同步成功的 Unix 时间。仅主副本在首次同步成功后导出该指标。`time() - hami_scheduler_last_sync_success_timestamp_seconds` 表示距那次同步已过去的时间。如果同步时读不到某个健康节点的设备，调度器会保留该节点原来的设备，这次同步仍算成功。 |
