---
id: scheduler-metrics
title: 调度器指标
translated: true
sidebar_label: 调度器指标
---

HAMi 在已配置的调度器指标端点上暴露调度器指标。本页的所有指标还带有 `zone="vGPU"` 标签。

## 调度器状态

| 指标 | 含义 |
| --- | --- |
| `hami_scheduler_is_leader` | 当前调度器实例是否为 leader。 |
| `hami_scheduler_cache_synced` | 调度器 leader 实例是否至少同步过一次其节点/设备缓存。之后的同步失败时，该值仍为 `1`。 |
| `hami_scheduler_last_sync_success_timestamp_seconds` | 调度器 leader 实例最近一次成功同步节点/设备缓存的时间。 |

## 分配结果

分配结果类指标只使用有限范围的标签值：

| 指标                                       | 含义                                    |
| ------------------------------------------ | --------------------------------------- |
| `hami_scheduler_allocations_total`         | 成功的设备分配步骤次数。                |
| `hami_scheduler_allocation_failures_total` | 失败的设备分配步骤次数。                |
| `hami_scheduler_bind_rollbacks_total`      | 释放为 Pod 获取的节点锁的绑定失败次数。 |

以 `lookup` 失败的绑定会释放 Pod 的预留，但不计入回滚。

标签为 `phase`、`device_type` 和 `failure_reason`，不会包含 Pod、命名空间、节点、UUID 或请求标识。`phase` 使用以下取值：

| 取值       | 含义                                                                  |
| ---------- | --------------------------------------------------------------------- |
| `filter`   | 调度器在节点上为 Pod 预留设备。                                       |
| `bind`     | 调度器将 Pod 绑定到节点。                                             |
| `allocate` | 设备插件分配设备。                                                    |
| `refit`    | NVIDIA 设备插件请求调度器将分配调整到 Topology Manager 允许的设备上。 |

`failure_reason` 使用以下完整且固定的取值：

| 取值 | 含义 |
| --- | --- |
| `none` | 操作成功。 |
| `no_fit` | 没有候选节点能满足设备请求。 |
| `lookup` | 无法从调度器缓存中读取所需的 Pod 或节点。 |
| `identity` | 绑定请求与当前 Pod 身份或目标不匹配。 |
| `lock` | 设备预留加锁失败。 |
| `annotation_patch` | 必需的 Pod 注解更新失败。 |
| `bind` | 其他绑定操作失败。 |
| `internal` | 内部用量或打分失败，或者 refit 无法解码或重写设备分配注解。 |
| `conflict` | 调度器读取 Pod 后 Pod 发生了变化，refit 注解更新被拒绝。 |
| `device_plugin` | 设备插件报告分配失败。 |
| `timeout` | 设备插件未在节点锁超时时间（默认 5 分钟）内响应。之后的成功不计入成功次数和分配耗时，之后的失败不计入失败次数。 |

在 `refit` 阶段，`lookup`、`identity` 和 `no_fit` 涵盖更多情况：找不到 Pod 或其分配、请求与 Pod 不匹配，或者允许的设备或配额无法满足 refit。

## 分配耗时

| 指标 | 含义 |
| --- | --- |
| `hami_scheduler_allocation_duration_seconds` | 从绑定到设备分配成功的时间，仅由调度器 leader 记录。唯一的标签是 `device_type`。 |
