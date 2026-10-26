---
id: scheduler-metrics
title: 调度器指标
translated: true
sidebar_label: 调度器指标
---

HAMi 在已配置的调度器指标端点上暴露调度器指标。分配结果类指标只使用有限范围的标签值：

| 指标                                       | 含义                             |
| ------------------------------------------ | -------------------------------- |
| `hami_scheduler_allocations_total`         | 过滤阶段记录的成功设备预留次数。 |
| `hami_scheduler_allocation_failures_total` | 过滤和绑定阶段的分配失败次数。   |
| `hami_scheduler_bind_rollbacks_total`      | 释放预留的绑定失败次数。         |

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
| `internal`         | 内部用量、打分、发现或清理失败。          |

成功的过滤预留使用 `failure_reason="none"`；绑定失败由失败计数器和回滚计数器报告。
