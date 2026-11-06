---
title: GPU 共享性能与故障隔离
sidebar_label: 共享性能测试
description: 基于 A100 实测，对比原生双实例、HAMi 与基于 MPS 的 GPU 共享方案。
translated: true
---

本文对比原生 vLLM、HAMi 2.10.0 与 Run:ai 的开源路径 KAI Scheduler + GPU Fractioning。[NVIDIA Dynamo 报告](https://docs.nvidia.com/dynamo/dev/many-model-serving/interpreting-gpu-sharing-results)比较原生单实例与共享双实例；本文增加原生双实例基线，展示不引入共享层时，两个进程运行在同一张卡上的性能。

**核心发现：**固定 KV 的 Graph 测试中，原生从单实例变为双实例，吞吐由 628.57 降至 335.51 输出 tokens/s/GPU；HAMi 50% 算力双实例为 335.87，相对原生双实例差异为 +0.11%。因此，相对单实例下降约 50%，不能直接归因于 HAMi。

## 测试环境

测试环境为 2× NVIDIA A100-SXM4-40GB、Ubuntu 24.04.5、驱动 615.71.10、Dynamo 1.6.1、vLLM 0.31.0、AIPerf 0.13.0。模型为 Qwen3-4B，BF16、TP=1，输入 2,048 tokens，输出目标为 256 tokens。

| 部署方式 | 每卡实例数 | 显存配置 | 执行配置 |
| --- | --: | --- | --- |
| 原生单实例 | 1 | 可见整卡显存 | 独立 CUDA 进程 |
| 原生双实例 | 2 | 每实例引擎显存利用率 0.45 | 独立 CUDA 进程；不使用 HAMi 或 MPS |
| HAMi 2.10.0 双实例 | 2 | 每实例 20 GiB 配额 | HAMi 自身调度器与设备插件；每实例 50% 算力配额 |
| KAI 0.18.6 + GPU Fractioning 0.1.8 双实例 | 2 | 每实例 20 GiB 配额 | MPS sm-sharing；未启用静态 SM 分区 |

原生实例的显存利用率是引擎规划预算，不构成硬隔离边界。这里采用发布版 GPU Fractioning 的共享 MPS 服务，与 NVIDIA 报告中的定制 KAI/GPU Fractioning 分支不同。

## 性能结果

### 全栈部署对比

负载由未修改的 Dynamo [run-sweep.sh](https://github.com/ai-dynamo/dynamo/blob/v1.6.1/examples/gpu-sharing/common/run-sweep.sh) 产生。每卡总并发为 2、4、8、16、32：单实例承担全部并发，双实例各承担一半。Graph 使用引擎默认配置，Eager 仅增加 `--enforce-eager`。各配置使用自动 KV 分配、默认前缀缓存，各测一轮。

下表为**每卡总并发 8**，吞吐单位为输出 tokens/s/GPU；百分比均以原生双实例为分母。

| 模式 | 原生单实例 | 原生双实例 | HAMi 双实例（50%） | HAMi / 原生双实例 | GPU Fractioning 双实例 | GPU Fractioning / 原生双实例 |
| --- | --: | --: | --: | --: | --: | --: |
| Graph | 693.67 | 335.67 | 336.52 | 100.25% | 438.59 | 130.66% |
| Eager | 200.28 | 194.53 | 180.49 | 92.79% | 189.54 | 97.43% |

[完整并发与延迟数据（CSV）](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fullstack.csv) · [未启用算力限制的参考数据（CSV）](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fullstack-unlimited.csv)。

### 同参数对照

每卡总并发固定为 8：单实例并发 8，双实例各并发 4。每实例固定 6 GiB KV，设置 `--max-model-len 4096`、`--max-num-seqs 32`、`--no-enable-prefix-caching`。HAMi 使用 50% 算力配额，MPS 对照采用 legacy v2 MPS。每次部署重复采集三轮客户端压测。

吞吐为每卡实例吞吐之和的均值 ± 样本标准差。TTFT 单位为 ms，TPOT 单位为 ms/输出 token。延迟列对各实例分位数及各轮结果取均值，**并非将集群全部请求合并后的 p99**。TPOT 表示每请求的平均输出 token 间隔。

| 模式  | 配置               | 输出 tokens/s/GPU | TTFT p50 | TTFT p99 | TPOT p50 | TPOT p99 |
| ----- | ------------------ | ----------------: | -------: | -------: | -------: | -------: |
| Graph | 原生单实例         |     628.57 ± 0.30 |   335.46 |   678.19 |    11.42 |    12.02 |
| Graph | 原生双实例         |     335.51 ± 0.02 |   563.53 |   738.61 |    21.71 |    22.40 |
| Graph | HAMi 双实例（50%） |     335.87 ± 0.06 |   558.37 |   729.45 |    21.71 |    22.39 |
| Graph | Legacy MPS 双实例  |    449.36 ± 13.92 |   413.50 |   538.98 |    16.82 |    17.40 |
| Eager | 原生单实例         |     193.95 ± 1.17 |   331.43 |   722.70 |    40.03 |    40.82 |
| Eager | 原生双实例         |     185.80 ± 0.73 |   440.87 |   659.38 |    41.52 |    42.73 |
| Eager | HAMi 双实例（50%） |     181.67 ± 1.32 |   426.37 |   671.97 |    42.54 |    43.68 |
| Eager | Legacy MPS 双实例  |     188.51 ± 0.73 |   311.23 |   500.70 |    41.37 |    42.55 |

Legacy MPS 各实例的测量窗口未完全重叠：各窗口吞吐求和为 449.36，使用统一墙钟窗口则为 399.28 tokens/s/GPU。同一口径下，Graph 模式的原生双实例为 334.50，HAMi 双实例（50%）为 334.97。

[同参数对照汇总](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled.csv) · [未启用算力限制的参考数据](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled-unlimited.csv) · [50% 算力逐轮结果](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/hami-50pct-trials.csv)。

## 故障隔离结果

直接 CUDA 探针在 GPU 0 上放置故障注入进程与健康进程，在 GPU 1 上放置健康对照。健康探针持续重放 CUDA Graph 并校验输出。每场景测两次，观察注入前 3 秒及注入后至少 6 秒。MPS v3 共享服务启用 memacct、context-share，参照 GPU Fractioning 0.1.8 的执行机制。

**主表的 HAMi 配置：**性能测试启用 50% 算力配额，故障测试关闭算力限制；两者均为每实例 20 GiB 显存配额。额外的静态 API 配置显示，同卡客户端各可见 54 SM，且分区 ID 不同。表内计数为**同卡健康进程持续产生正确结果的次数 / 试验总次数**。

| 注入事件             | 原生多进程 | HAMi 多进程 | MPS v3 共享 | MPS v3 所测静态配置 |
| -------------------- | ---------: | ----------: | ----------: | ------------------: |
| 超额显存申请         |        2/2 |         2/2 |         2/2 |                 2/2 |
| GPU 非法写入         |        2/2 |         2/2 |         0/2 |                 0/2 |
| GPU trap             |        2/2 |         2/2 |         0/2 |                 0/2 |
| GPU 工作中 SIGKILL   |        2/2 |         2/2 |         0/2 |                 0/2 |
| MPS client terminate |     不适用 |      不适用 |         2/2 |                 2/2 |

36 次试验的异卡对照均保持正常。MPS 同卡健康进程在非法写入和未同步 SIGKILL 场景报错 700，在 trap 场景报错 719；安全终止 MPS 客户端未影响同卡进程。正式超额显存用例申请可见容量的两倍；独立的 HAMi 配额预检则验证 20 GiB 配额下的 21 GiB 申请被拒绝。两者验证的都是申请被拒绝，不是持续显存压力。[故障计数、错误码与最大采样间隔（CSV）](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fault-isolation.csv)。

这些探针只测 GPU 故障传播，未测服务恢复、延迟隔离、租户安全、GPU reset 或硬件故障。静态组核验了 API 可见分配，未独立证明物理 SM 不重叠。机制说明见 NVIDIA 的 [MPS 错误隔离与安全终止文档](https://docs.nvidia.com/deploy/mps/latest/when-to-use-mps.html)和[静态 SM 分区文档](https://docs.nvidia.com/deploy/mps/latest/common-tasks.html#using-static-sm-partitioning)。

## 实测结论

- **性能：**GPU Fractioning 和 legacy MPS 在各自的 Graph 性能测试中高于原生双实例。HAMi 的 Eager 吞吐在全栈对比中低于原生双实例 7.21%，固定 KV 对照中低 2.22%。
- **故障传播：**在非法写入、trap、GPU 工作中未同步 SIGKILL 场景中，原生与 HAMi 的同卡健康进程持续正确运行，MPS v3 的同卡进程受到影响。Legacy v2 MPS 性能测试与 MPS v3 故障探针使用不同配置。

:::note MPS 支持计划

HAMi 计划在 v2.12 提供可选 MPS 支持，具体以实现与验证为准。本文结果不代表未来集成的测试结论。

:::

## 测试范围

各组使用前述 GPU 型号和驱动。A、B、C 表示三组不同的物理 GPU，已按 UUID 区分。

| 采集日期（UTC，2026 年） | 测试组 | GPU 组 |
| --- | --- | --- |
| 11 月 2 日 | 全栈：原生单实例、GPU Fractioning、未启用算力限制的 HAMi | A |
| 11 月 3 日 | 固定 KV：原生单实例、原生双实例、legacy MPS、未启用算力限制的 HAMi | A |
| 11 月 4 日 | 原生双实例全栈、全部故障探针 | B |
| 11 月 5 日 | HAMi 50% 性能：全栈与固定 KV 对照 | C |

结果适用于本次模型和并发。跨 GPU 组的比值可能包含硬件差异，不能单独衡量共享组件的额外开销。NVIDIA 的八卡定制分支测试应单独解读。

## 复现脚本

环境准备、平台选择、性能与故障测试命令、指标汇总步骤统一维护在[复现指南](./gpu-sharing-reproduction.md)。实际采集器和模板见 [benchmark 代码快照](https://github.com/Project-HAMi/gpu-sharing-benchmarks/tree/e9b205bb121c50649bb97d7ed5dc4f796a9e523f)。

CSV 汇总结果统一存放在该仓库的 [results/2026-11-a100-sharing/](https://github.com/Project-HAMi/gpu-sharing-benchmarks/tree/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing) 目录。
