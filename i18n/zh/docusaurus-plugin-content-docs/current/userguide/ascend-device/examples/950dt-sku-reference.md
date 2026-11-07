---
title: Ascend950DT SKU 参考
description: Ascend950DT 各 SKU 的参考，包括已验证的 9582 整卡配置，以及其他 SKU 的 AI 核数与 HBM 容量。
translated: true
---

HAMi chart 中启用的 Ascend950DT 配置以 9582 这一 SKU 为目标，按整卡设备使用：98,304 MiB（96 GiB）HBM 与 32 个 AI 核。该配置已在一台 Ascend950DT 9582 节点上验证过，但这一结果并不能保证下文列出的其他 SKU 的成功运行。

下表中的数值来自厂商提供的 SKU 对比表。950DT 的 SKU 档位（36/32/28 个 AI 核）在 [CANN Ascend950DT 参考](https://gitcode.com/cann/cannbot-knowledge/-/blob/main/knowledge/common/platforms/concepts/ascend950dt_vs_pr_overrides.md)中有说明。该表并不代表每个 SKU 在 DCMI 中上报的身份、可用 HBM、AI 核数或 device-plugin 兼容性。配置其他 SKU 前，请在目标硬件上逐项核实。

| AI 核数 |      HBM | 对比表中列出的 SKU         |
| ------: | -------: | -------------------------- |
|      36 |  144 GiB | DT_9591, DT_95A1           |
|      36 |   96 GiB | DT_9592, DT_9595, DT_95A2  |
|      36 |   64 GiB | DT_9596                    |
|      32 |  144 GiB | DT_9581                    |
|      32 | 126* GiB | DT_9583                    |
|      32 |   96 GiB | DT_9582, DT_9582x, DT_9585 |
|      32 |   84 GiB | DT_9584, DT_9587           |
|      32 |   64 GiB | DT_9586                    |
|      32 |   56 GiB | DT_9588                    |
|      28 |  144 GiB | DT_9571                    |
|      28 | 126* GiB | DT_9573                    |
|      28 |   96 GiB | DT_9572, DT_9575           |
|      28 |   84 GiB | DT_9574, DT_9577           |
|      28 |   64 GiB | DT_9576                    |
|      28 |   56 GiB | DT_9578                    |
|       8 |   24 GiB | DT_950x                    |
|       8 |   16 GiB | DT_950y                    |

来源表格未说明 126 GiB 条目上星号的含义。不要在 `devices.ascend.configs` 中为同一个 `chipName` 启用多个配置项：调度器无法通过该字段区分这些 SKU。`devices.ascend.configs` 中的一项会作用于所有上报该 `chipName` 的节点，因此替换 9582 条目前，必须验证目标 SKU 以及所有上报同一 `chipName` 的现有节点（包括 9582 节点）的实际身份与容量。
