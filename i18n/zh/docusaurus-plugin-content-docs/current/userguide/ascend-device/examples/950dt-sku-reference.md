---
title: Ascend950DT SKU 参考
translated: true
---

HAMi chart 中启用的 Ascend950DT 配置以 9582 这一 SKU 为目标，按整卡设备使用：
98,304 MiB（96 GiB）HBM 与 32 个 AI 核。该配置已在一台 Ascend950DT 9582 节点上验证过，
但这一结果并不能保证下文列出的其他 SKU 的成功运行。

下表中的数值来自一份提供的 SKU 对比图，仅作参考。它们并不代表每个 SKU 在 DCMI
中上报的身份、可用 HBM、AI 核数或 device-plugin 兼容性。配置其他 SKU 前，请在
目标硬件上逐项核实。

| AI 核数 | HBM | 对比图中列出的 SKU |
|---:|---:|---|
| 36 | 144 GiB | DT_9591, DT_95A1 |
| 36 | 96 GiB | DT_9592, DT_9595, DT_95A2 |
| 36 | 64 GiB | DT_9596 |
| 32 | 144 GiB | DT_9581 |
| 32 | 126* GiB | DT_9583 |
| 32 | 96 GiB | DT_9582, DT_9582x, DT_9585 |
| 32 | 84 GiB | DT_9584, DT_9587 |
| 32 | 64 GiB | DT_9586 |
| 32 | 56 GiB | DT_9588 |
| 28 | 144 GiB | DT_9571 |
| 28 | 126* GiB | DT_9573 |
| 28 | 96 GiB | DT_9572, DT_9575 |
| 28 | 84 GiB | DT_9574, DT_9577 |
| 28 | 64 GiB | DT_9576 |
| 28 | 56 GiB | DT_9578 |
| 8 | 24 GiB | DT_950x |
| 8 | 16 GiB | DT_950y |

不要在 `devices.ascend.configs` 中为同一个 `chipName` 启用多个配置项：调度器
无法通过该字段区分这些 SKU。只有在验证目标 SKU 的实际身份与容量后，才能替换
9582 条目。
