---
title: GPU 共享性能与故障隔离
sidebar_label: 共享性能测试
description: 基于 A100 实测，对比原生双实例、HAMi 与基于 MPS 的 GPU 共享方案。
translated: true
---

**核心结论**：

- **HAMi 50% 与原生双实例吞吐接近**：固定缓存、默认模式下，分别为 335.87 和 335.51 tokens/s/GPU，差异 +0.11%。原生单实例为 628.57，双实例的吞吐下降不能直接归因于 HAMi。
- **Eager 下 HAMi 50% 吞吐较低**：常规测试五档并发下低于原生双实例 4.46%～7.94%，固定缓存对照低 2.22%。GPU Fractioning 和 legacy MPS 在各自的默认模式测试中均高于原生双实例。
- **故障影响不同**：非法写入、trap、计算中强制结束进程，各测两次。原生和 HAMi 的同卡健康进程均正常；两种所测 MPS v3 配置均受影响。HAMi 故障测试关闭算力限制。

![固定缓存的 Graph 与 Eager 吞吐对比，包含原生单实例、原生双实例、HAMi 50% 算力双实例和 legacy MPS 双实例](/img/docs/zh/userguide/nvidia-device/gpu-sharing-benchmarks.svg)

每卡并发 8，每实例缓存 6 GiB。柱为三轮吞吐均值，误差线为样本标准差；菱形按统一时间段计算。A、C 为不同物理 GPU 组，差异不能直接视为共享组件的额外开销。[图表数据（CSV）](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled.csv)。

## 推理性能

### 常规测试：自动分配缓存

通过 Dynamo 运行 vLLM，用官方 [run-sweep.sh](https://github.com/ai-dynamo/dynamo/blob/v1.6.1/examples/gpu-sharing/common/run-sweep.sh) 压测。Graph 为默认模式，Eager 增加 `--enforce-eager`。使用自动缓存和默认前缀缓存，各配置测一轮。

每卡总并发为 2、4、8、16、32，双实例各承担一半。除原生单实例外均为双实例；HAMi 两种配置均为每实例 20 GiB 显存配额。吞吐单位为输出 tokens/s/GPU，越高越好；**粗体为该档最高值**，括号为相对原生双实例的差异。

#### Graph（默认）

| 每卡并发 |  原生单实例 | 原生双实例 |         HAMi 50% |    HAMi 不限算力 |    GPU Fractioning |
| -------- | ----------: | ---------: | ---------------: | ---------------: | -----------------: |
| 2        |  **225.50** |      97.66 |  99.80（+2.19%） |  97.61（−0.05%） |  134.37（+37.60%） |
| 4        |  **426.82** |     186.77 | 186.92（+0.08%） |  186.76（0.00%） |  255.64（+36.88%） |
| 8        |  **693.67** |     335.67 | 336.52（+0.25%） | 335.62（−0.02%） |  438.59（+30.66%） |
| 16       | **1038.10** |     565.45 | 561.73（−0.66%） | 564.90（−0.10%） |  718.28（+27.03%） |
| 32       | **1117.88** |     817.12 | 817.89（+0.10%） | 818.71（+0.20%） | 1022.54（+25.14%） |

#### Eager

| 每卡并发 | 原生单实例 | 原生双实例 |         HAMi 50% |    HAMi 不限算力 |  GPU Fractioning |
| -------- | ---------: | ---------: | ---------------: | ---------------: | ---------------: |
| 2        |      51.26 |  **51.84** |  47.76（−7.88%） |  48.11（−7.20%） |  50.34（−2.91%） |
| 4        | **103.10** |     101.99 |  93.89（−7.94%） |  94.42（−7.42%） |  99.66（−2.29%） |
| 8        | **200.28** |     194.53 | 180.49（−7.21%） | 182.01（−6.44%） | 189.54（−2.57%） |
| 16       | **377.41** |     361.61 | 341.28（−5.62%） | 343.67（−4.96%） | 361.11（−0.14%） |
| 32       | **653.43** |     630.84 | 602.68（−4.46%） | 606.86（−3.80%） | 636.66（+0.92%） |

**五档并发的对比结论**：

- **Graph 下 HAMi 接近原生双实例**：50% 算力配置的吞吐差异为 −0.66%～+2.19%。
- **GPU Fractioning 的优势主要出现在 Graph**：高于原生双实例 25.14%～37.60%；Eager 差异为 −2.91%～+0.92%。
- **Eager 下 HAMi 吞吐较低**：50% 配置低 4.46%～7.94%，不限算力配置低 3.80%～7.42%。

各方案来自不同物理 GPU 组，以上是本次观测差异，不能单独衡量组件开销。

#### 响应延迟：每卡并发 8

下表为首 token 等待时间、后续每 token 平均耗时的 p99，单位 ms，**越低越好**；数值为各实例分位数的均值。

| 配置            | Graph 首 token | Graph 后续 token | Eager 首 token | Eager 后续 token |
| --------------- | -------------: | ---------------: | -------------: | ---------------: |
| 原生单实例      |         665.76 |            11.95 |         730.71 |            40.39 |
| 原生双实例      |         730.35 |            22.44 |         669.55 |            40.83 |
| HAMi 50%        |         714.99 |            22.41 |         588.04 |            44.52 |
| HAMi 不限算力   |         739.09 |            22.43 |         599.89 |            43.90 |
| GPU Fractioning |         427.74 |            17.48 |         595.79 |            42.67 |

相对原生双实例，HAMi 50% 在 Eager 下的首 token p99 较低，后续每 token 耗时的 p99 较高。

### 固定缓存对照：每实例 6 GiB

每卡并发仍为 8，每实例固定 6 GiB 缓存（KV cache），关闭前缀缓存。最大模型长度 4096、最大序列数 32；HAMi 配额为 50%，MPS 为 legacy v2。同一次部署测三轮。

吞吐按每卡实例之和计算，展示三轮均值 ± 样本标准差。**TTFT** 是首 token 等待时间，**TPOT** 是后续每 token 的平均耗时，单位均为 ms。p50/p99 为各实例分位数、各轮结果的均值，**不是合并全部请求后的分位数**。

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

Legacy MPS 各实例测量时段未完全重叠。按统一时段计算，默认模式吞吐为：MPS **399.28**、原生双实例 **334.50**、HAMi **334.97** tokens/s/GPU。

[固定缓存数据](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled.csv) · [未启用算力限制的参考数据](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled-unlimited.csv) · [50% 算力逐轮结果](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/hami-50pct-trials.csv)。

## 故障隔离结果

同一 GPU 运行故障进程和健康进程，另一 GPU 作对照。测试用 CUDA 小程序持续计算并检查结果。每项测两次，观察故障前 3 秒、后至少 6 秒。

HAMi 此处关闭算力限制，显存仍为每实例 20 GiB；MPS 使用 v3。**2/2 表示同卡健康进程两次均正常，0/2 表示两次均受影响。**

| 注入事件                      | 原生多进程 | HAMi 多进程 | MPS v3 共享 | MPS v3 所测静态配置 |
| ----------------------------- | ---------: | ----------: | ----------: | ------------------: |
| 超额显存申请                  |        2/2 |         2/2 |         2/2 |                 2/2 |
| GPU 非法写入                  |        2/2 |         2/2 |         0/2 |                 0/2 |
| GPU 异常指令（trap）          |        2/2 |         2/2 |         0/2 |                 0/2 |
| 计算中强制结束进程（SIGKILL） |        2/2 |         2/2 |         0/2 |                 0/2 |
| 安全终止 MPS 客户端           |     不适用 |      不适用 |         2/2 |                 2/2 |

36 次异卡对照均正常。显存项仅验证超额申请被拒绝，正式用例申请可见容量的两倍。[故障计数、错误码与最大采样间隔（CSV）](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fault-isolation.csv)。

测试范围是进程间 GPU 故障传播，未覆盖服务恢复、延迟隔离、租户安全及硬件故障。静态组报告每客户端可用一半计算单元（54 SM），未证明物理单元互不重叠。机制说明：[MPS 故障处理](https://docs.nvidia.com/deploy/mps/latest/when-to-use-mps.html)、[静态分区](https://docs.nvidia.com/deploy/mps/latest/common-tasks.html#using-static-sm-partitioning)。

## 测试条件

硬件为 2× A100-SXM4-40GB，Ubuntu 24.04.5、驱动 615.71.10；软件为 Dynamo 1.6.1、vLLM 0.31.0、AIPerf 0.13.0。模型 Qwen3-4B，BF16，每实例使用一张 GPU；输入 2,048 tokens，输出目标 256 tokens。

| 部署方式 | 每卡实例数 | 显存配置 | 执行配置 |
| --- | --: | --- | --- |
| 原生单实例 | 1 | 可见整卡显存 | 独立 CUDA 进程 |
| 原生双实例 | 2 | 每实例引擎显存利用率 0.45 | 独立 CUDA 进程；不使用 HAMi 或 MPS |
| HAMi 2.10.0 双实例 | 2 | 每实例 20 GiB 配额 | 每实例 50% 算力配额 |
| KAI 0.18.6 + GPU Fractioning 0.1.8 双实例 | 2 | 每实例 20 GiB 配额 | MPS sm-sharing；未启用静态 SM 分区 |

原生实例的显存利用率仅控制引擎预算。GPU Fractioning 使用发布版共享 MPS；[NVIDIA 报告](https://docs.nvidia.com/dynamo/dev/many-model-serving/interpreting-gpu-sharing-results)使用定制分支。本文增加原生双实例作为比较基线。

## 测试范围

A、B、C 是三组不同的物理 GPU，型号和驱动相同。

| 采集日期（UTC，2026 年） | 测试组 | GPU 组 |
| --- | --- | --- |
| 11 月 2 日 | 常规测试：原生单实例、GPU Fractioning、不限算力的 HAMi | A |
| 11 月 3 日 | 固定缓存：原生单实例、原生双实例、legacy MPS、不限算力的 HAMi | A |
| 11 月 4 日 | 原生双实例常规测试、全部故障测试 | B |
| 11 月 5 日 | HAMi 50% 性能：常规测试与固定缓存对照 | C |

跨 GPU 组的差异可能包含硬件影响，结果仅适用于本次模型与负载。

## 复现脚本

[运行步骤](./gpu-sharing-reproduction.md) · [测试代码](https://github.com/Project-HAMi/gpu-sharing-benchmarks/tree/e9b205bb121c50649bb97d7ed5dc4f796a9e523f) · [全部数据](https://github.com/Project-HAMi/gpu-sharing-benchmarks/tree/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing)

原始数据：[常规测试 CSV](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fullstack.csv) · [不限算力参考 CSV](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fullstack-unlimited.csv)。
