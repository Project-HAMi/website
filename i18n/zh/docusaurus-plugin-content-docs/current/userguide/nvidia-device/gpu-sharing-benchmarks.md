---
title: GPU 共享性能与故障隔离
sidebar_label: 共享性能测试
description: 基于 A100 实测，对比原生双实例、HAMi 与基于 MPS 的 GPU 共享方案。
translated: true
---

本文对比 HAMi 与 Run:ai 的开源 GPU 共享路径（KAI Scheduler + GPU Fractioning），展示部署吞吐、原生双实例基线和 GPU 执行故障的传播范围。结论仅适用于本次测试配置。

## 测试环境

数据采集于 2026 年 11 月 2—5 日。环境为 2× NVIDIA A100-SXM4-40GB、Ubuntu 24.04.5、驱动 615.71.10、Dynamo 1.6.1、vLLM 0.31.0、AIPerf 0.13.0。模型为 Qwen3-4B，BF16、TP=1，输入 2,048 tokens，输出目标为 256 tokens。

| 部署方式 | 每卡实例数 | 显存配置 | 执行配置 |
| --- | --: | --- | --- |
| 原生单实例 | 1 | 可见整卡显存 | 独立 CUDA 进程 |
| 原生双实例 | 2 | 每实例引擎显存利用率 0.45 | 独立 CUDA 进程；不使用 HAMi 或 MPS |
| HAMi 2.10.0 双实例 | 2 | 每实例 20 GiB 配额 | HAMi 自身调度器与设备插件；每实例 50% 算力配额 |
| KAI 0.18.6 + GPU Fractioning 0.1.8 双实例 | 2 | 每实例 20 GiB 配额 | MPS sm-sharing；未启用静态 SM 分区 |

原生实例的显存利用率是引擎规划预算，不构成硬隔离边界。这里采用发布版 GPU Fractioning 的共享 MPS 服务，与 NVIDIA 报告中的定制 KAI/GPU Fractioning 分支不同。下文另有固定 KV 容量的同参数对照。

## 性能结果

### 全栈部署对比

负载由未修改的 Dynamo [run-sweep.sh](https://github.com/ai-dynamo/dynamo/blob/v1.6.1/examples/gpu-sharing/common/run-sweep.sh) 产生。每卡总并发为 2、4、8、16、32：单实例承担全部并发，双实例各承担一半。Graph 使用引擎默认配置，Eager 仅增加 `--enforce-eager`。各配置使用自动 KV 分配、默认前缀缓存，各测一轮。

下表为**每卡总并发 8**，吞吐单位为输出 tokens/s/GPU；百分比均以原生双实例为分母。

| 模式 | 原生单实例 | 原生双实例 | HAMi 双实例（50%） | HAMi / 原生双实例 | GPU Fractioning 双实例 | GPU Fractioning / 原生双实例 |
| --- | --: | --: | --: | --: | --: | --: |
| Graph | 693.67 | 335.67 | 336.52 | 100.25% | 438.59 | 130.66% |
| Eager | 200.28 | 194.53 | 180.49 | 92.79% | 189.54 | 97.43% |

原生单实例与 GPU Fractioning 采集于 11 月 2 日，原生双实例采集于 11 月 4 日，HAMi 50% 算力配置采集于 11 月 5 日。其他方案沿用原始数据。GPU 型号与驱动相同，物理 GPU 和采集批次不同，因此这些比值用于部署配置参照，不能直接视为组件额外开销。前缀缓存行为与 KV 容量也随配置变化。[完整并发与延迟数据（CSV）](/benchmarks/2026-11-a100-sharing/fullstack.csv)。

### 同参数对照

每卡总并发固定为 8：单实例并发 8，双实例各并发 4。每实例固定 6 GiB KV，设置 `--max-model-len 4096`、`--max-num-seqs 32`、`--no-enable-prefix-caching`。HAMi 使用 11 月 5 日的 50% 算力补测数据；原生与 legacy v2 MPS 沿用 11 月 3 日记录。每次部署重复采集三轮客户端压测。该对照跨采集批次，也不能替代完整的 GPU Fractioning 部署测试。

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

相对原有原生双实例基线，HAMi 50% 算力补测的 Graph 吞吐差异为 +0.11%，Eager 为 -2.22%。原同批次测试中，原生 Graph 从单实例的 628.57 降至双实例的 335.51，这部分变化在引入 HAMi 前就已出现，不能仅凭单实例基线将其归因于 HAMi。

Legacy MPS 各实例的测量窗口未完全重叠：各窗口吞吐求和为 449.36，使用统一墙钟窗口则为 399.28 tokens/s/GPU。11 月 3 日原生双实例与未限算力 HAMi 的统一墙钟结果分别为 334.50、334.78；这些历史记录与新的 50% 算力数据分开保留。[当前对照汇总](/benchmarks/2026-11-a100-sharing/controlled.csv)、[原未限算力对照](/benchmarks/2026-11-a100-sharing/controlled-unlimited.csv)、[50% 算力逐轮结果](/benchmarks/2026-11-a100-sharing/hami-50pct-trials.csv)。

## 故障隔离结果

直接 CUDA 探针在 GPU 0 上放置故障注入进程与健康进程，在 GPU 1 上放置健康对照。健康探针持续重放 CUDA Graph 并校验输出。每场景测两次，观察注入前 3 秒及注入后至少 6 秒。MPS v3 共享服务启用 memacct、context-share，参照 GPU Fractioning 0.1.8 的执行机制；这里测试 GPU 执行故障传播，不代表 KAI、GPU Fractioning 或 vLLM 的服务恢复能力。

HAMi 故障组沿用每实例 20 GiB、未限算力的原始配置。额外的静态 API 配置显示，同卡客户端各可见 54 SM，且分区 ID 不同。表内计数为**同卡健康进程持续产生正确结果的次数 / 试验总次数**。

| 注入事件             | 原生多进程 | HAMi 多进程 | MPS v3 共享 | MPS v3 所测静态配置 |
| -------------------- | ---------: | ----------: | ----------: | ------------------: |
| 超额显存申请         |        2/2 |         2/2 |         2/2 |                 2/2 |
| GPU 非法写入         |        2/2 |         2/2 |         0/2 |                 0/2 |
| GPU trap             |        2/2 |         2/2 |         0/2 |                 0/2 |
| GPU 工作中 SIGKILL   |        2/2 |         2/2 |         0/2 |                 0/2 |
| MPS client terminate |     不适用 |      不适用 |         2/2 |                 2/2 |

36 次试验的异卡对照均保持正常。MPS 同卡健康进程在非法写入和未同步 SIGKILL 场景报错 700，在 trap 场景报错 719；安全终止 MPS 客户端未影响同卡进程。超额显存申请为可见容量的两倍，验证的是申请被拒绝，不是持续显存压力。持续正确运行也不意味着没有延迟抖动。[故障计数、错误码与最大采样间隔（CSV）](/benchmarks/2026-11-a100-sharing/fault-isolation.csv)。

结果限于本次 A100、驱动、服务配置和注入事件，不构成对 HAMi、原生上下文或 MPS 的通用安全边界保证，也未测试 GPU reset 或硬件故障。静态组核验了 API 可见分配，未独立证明物理 SM 不重叠。NVIDIA 文档说明了 [MPS 的有限错误隔离与安全终止机制](https://docs.nvidia.com/deploy/mps/latest/when-to-use-mps.html)，以及[静态 SM 分区的部分错误隔离能力](https://docs.nvidia.com/deploy/mps/latest/common-tasks.html#using-static-sm-partitioning)；隔离效果取决于驱动、故障类型和配置。

## 如何理解基线

[NVIDIA Dynamo 报告](https://docs.nvidia.com/dynamo/dev/many-model-serving/interpreting-gpu-sharing-results)在每卡总并发相同的条件下，比较原生单实例与共享双实例，衡量提高部署密度后的整体吞吐变化。增加原生双实例基线，则可以进一步观察：同样部署两个实例时，引入共享层后结果如何变化。

两种比较各有用途。“相对单实例下降约 50%”本身不能直接解释为 HAMi 的额外损耗。HAMi 与原生双实例接近，也不意味着拆分实例没有代价，或其他模型、并发下结果相同。本文的两卡发布版数据与 NVIDIA 的八卡定制分支数据应分别解读。

## 方案选择与 MPS 支持计划

选择方案时，应同时考虑吞吐、TTFT/TPOT 目标、租户信任程度、可接受的同卡故障影响范围和恢复方式。本次共享负载下，MPS 的 Graph 吞吐更高；原生与 HAMi 的独立进程配置在所测事件中保住了同卡健康进程。显存配额、SM 分配、执行故障隔离与安全隔离是不同属性。

:::note 支持计划

HAMi 计划在 v2.12 提供可选 MPS 支持，具体以实现与验证为准，让用户按负载和隔离要求选择共享模式。本文结果不代表未来 HAMi MPS 集成的测试结论。

:::

## 复现脚本

使用 [Dynamo v1.6.1 GPU 共享示例](https://github.com/ai-dynamo/dynamo/tree/v1.6.1/examples/gpu-sharing)、[HAMi v2.10.0](https://github.com/Project-HAMi/HAMi/releases/tag/v2.10.0)、[GPU Fractioning v0.1.8](https://github.com/kai-scheduler/gpu-fractioning/tree/v0.1.8)，并按对应实验对齐负载、实例布局、并发映射、引擎参数、缓存、配额和 MPS 模式。采集前检查实际 GPU 映射、已加载的拦截库及 MPS 客户端归属。原始负载脚本 SHA-256 为 `d8fde51c9841b7898eb12a27489e5601b7fab535736db74da8fd3d6713450d19`。

[复现脚本与中文指南](https://github.com/Project-HAMi/website/blob/master/benchmarks/gpu-sharing-a100/README.zh-CN.md)包含实际使用的负载采集器、部署模板、CUDA Graph 健康探针、故障注入器和指标汇总工具。主机路径与 GPU UUID 可配置，上游负载客户端保持原样。11 月 5 日的 HAMi 性能补测使用 `--hami-core-limit 50` 与 `platform/hami-50pct-values.yaml`；原未限算力性能数据及故障配置分别保留。
