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

## 分配结果

分配结果类指标只使用有限范围的标签值：

| 指标                                       | 含义                                    |
| ------------------------------------------ | --------------------------------------- |
| `hami_scheduler_allocations_total`         | 过滤阶段记录的成功设备预留次数。        |
| `hami_scheduler_allocation_failures_total` | 过滤和绑定阶段的分配失败次数。          |
| `hami_scheduler_bind_rollbacks_total`      | 释放为 Pod 获取的节点锁的绑定失败次数。 |

以 `lookup` 失败的绑定会释放 Pod 的预留，但不计入回滚。

标签为 `phase`、`device_type` 和 `failure_reason`，不会包含 Pod、命名空间、节点、UUID 或请求标识。`failure_reason` 使用以下完整且固定的取值：

| 取值               | 含义                                      |
| ------------------ | ----------------------------------------- |
| `none`             | 操作成功。                                |
| `no_fit`           | 没有候选节点能满足设备请求。              |
| `lookup`           | 无法从调度器缓存中读取所需的 Pod 或节点。 |
| `identity`         | 绑定请求与当前 Pod 身份或目标不匹配。     |
| `lock`             | 设备预留加锁失败。                        |
| `annotation_patch` | 必需的 Pod 注解更新失败。                 |
| `bind`             | 其他绑定操作失败。                        |
| `internal`         | 内部用量或打分失败。                      |

成功的过滤预留使用 `failure_reason="none"`。绑定失败由失败计数器报告；如果绑定释放了节点锁，还会由回滚计数器报告。
