---
title: GPU sharing performance and fault isolation
sidebar_label: Sharing benchmarks
description: A100 measurements comparing native two-instance serving, HAMi, and MPS-based GPU sharing.
---

**Main findings**:

- **Fixed-cache Graph test**: at concurrency 8 per GPU, native single reached 628.57, native pair 335.51, and HAMi 50% 335.87 tokens/s/GPU. HAMi was 0.11% above the native pair.
- **HAMi 50% had lower throughput in Eager mode**: 4.46% to 7.94% below the native pair across all five loads in the standard test, and 2.22% below it with fixed cache. GPU Fractioning and legacy MPS exceeded the native pair in their respective default-mode tests.
- **Same-GPU results for three faults**: illegal writes, traps, and process kills during GPU work were each tested twice. Native and HAMi peers stayed correct in 2/2 trials per event; both MPS v3 configurations recorded 0/2. HAMi compute limiting was disabled.

![Fixed-cache Graph and Eager throughput for native single, native pair, HAMi pair with a 50% compute quota, and legacy MPS pair](/img/docs/en/userguide/nvidia-device/gpu-sharing-benchmarks.svg)

Concurrency is 8 per GPU, with 6 GiB cache per instance. Bars show three-trial throughput means; error bars show sample standard deviations. Diamonds use a common measurement period. A and C are different physical GPU pairs. [Figure data (CSV)](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled.csv).

## Inference performance

### Standard test: automatic cache allocation

Dynamo ran vLLM, with load from the official [run-sweep.sh](https://github.com/ai-dynamo/dynamo/blob/v1.6.1/examples/gpu-sharing/common/run-sweep.sh). Graph is the default mode; Eager adds `--enforce-eager`. Automatic cache allocation and default prefix caching were used, with one trial per configuration.

Total concurrency is 2, 4, 8, 16, or 32 per GPU, split equally between paired instances. All configurations use two instances except native single; both HAMi configurations have 20 GiB memory per instance. Throughput is output tokens/s/GPU. **Bold marks the highest value at each load**; parentheses show the difference from the native pair.

#### Graph (default)

| Concurrency/GPU | Native single | Native pair | HAMi 50% | HAMi unlimited | GPU Fractioning |
| --- | --: | --: | --: | --: | --: |
| 2 | **225.50** | 97.66 | 99.80 (+2.19%) | 97.61 (−0.05%) | 134.37 (+37.60%) |
| 4 | **426.82** | 186.77 | 186.92 (+0.08%) | 186.76 (0.00%) | 255.64 (+36.88%) |
| 8 | **693.67** | 335.67 | 336.52 (+0.25%) | 335.62 (−0.02%) | 438.59 (+30.66%) |
| 16 | **1038.10** | 565.45 | 561.73 (−0.66%) | 564.90 (−0.10%) | 718.28 (+27.03%) |
| 32 | **1117.88** | 817.12 | 817.89 (+0.10%) | 818.71 (+0.20%) | 1022.54 (+25.14%) |

#### Eager

| Concurrency/GPU | Native single | Native pair | HAMi 50% | HAMi unlimited | GPU Fractioning |
| --- | --: | --: | --: | --: | --: |
| 2 | 51.26 | **51.84** | 47.76 (−7.88%) | 48.11 (−7.20%) | 50.34 (−2.91%) |
| 4 | **103.10** | 101.99 | 93.89 (−7.94%) | 94.42 (−7.42%) | 99.66 (−2.29%) |
| 8 | **200.28** | 194.53 | 180.49 (−7.21%) | 182.01 (−6.44%) | 189.54 (−2.57%) |
| 16 | **377.41** | 361.61 | 341.28 (−5.62%) | 343.67 (−4.96%) | 361.11 (−0.14%) |
| 32 | **653.43** | 630.84 | 602.68 (−4.46%) | 606.86 (−3.80%) | 636.66 (+0.92%) |

**Findings across all five loads**:

- **HAMi 50% in Graph**: the throughput difference from the native pair was −0.66% to +2.19%.
- **GPU Fractioning**: Graph throughput was 25.14% to 37.60% above the native pair, versus −2.91% to +0.92% in Eager.
- **HAMi in Eager**: 4.46% to 7.94% below the native pair with 50% compute, and 3.80% to 7.42% below it with no compute limit.

#### Response latency: concurrency 8 per GPU

Values are p99 first-token wait times and per-request average times per subsequent token, in milliseconds. Each value averages instance percentiles.

| Configuration | Graph first token | Graph subsequent token | Eager first token | Eager subsequent token |
| --- | --: | --: | --: | --: |
| Native single | 665.76 | 11.95 | 730.71 | 40.39 |
| Native pair | 730.35 | 22.44 | 669.55 | 40.83 |
| HAMi 50% | 714.99 | 22.41 | 588.04 | 44.52 |
| HAMi unlimited | 739.09 | 22.43 | 599.89 | 43.90 |
| GPU Fractioning | 427.74 | 17.48 | 595.79 | 42.67 |

Compared with the native pair, HAMi 50% had lower first-token p99 and higher subsequent-token p99 in Eager.

### Fixed-cache comparison: 6 GiB per instance

Concurrency remained 8 per GPU, with 6 GiB cache (KV cache) per instance and prefix caching disabled. Maximum model length was 4096 and maximum sequences 32. HAMi used a 50% compute quota; MPS used legacy v2. Each deployment received three client trials.

**Throughput** sums instance rates per GPU and shows the three-trial mean ± sample standard deviation. **TTFT** is the wait for the first token; **TPOT** is the average time per subsequent token, both in milliseconds. p50/p99 values average instance percentiles and trials; **they are not pooled request percentiles**.

| Mode  | Configuration   | Output tokens/s/GPU | TTFT p50 | TTFT p99 | TPOT p50 | TPOT p99 |
| ----- | --------------- | ------------------: | -------: | -------: | -------: | -------: |
| Graph | Native single   |       628.57 ± 0.30 |   335.46 |   678.19 |    11.42 |    12.02 |
| Graph | Native pair     |       335.51 ± 0.02 |   563.53 |   738.61 |    21.71 |    22.40 |
| Graph | HAMi pair (50%) |       335.87 ± 0.06 |   558.37 |   729.45 |    21.71 |    22.39 |
| Graph | Legacy MPS pair |      449.36 ± 13.92 |   413.50 |   538.98 |    16.82 |    17.40 |
| Eager | Native single   |       193.95 ± 1.17 |   331.43 |   722.70 |    40.03 |    40.82 |
| Eager | Native pair     |       185.80 ± 0.73 |   440.87 |   659.38 |    41.52 |    42.73 |
| Eager | HAMi pair (50%) |       181.67 ± 1.32 |   426.37 |   671.97 |    42.54 |    43.68 |
| Eager | Legacy MPS pair |       188.51 ± 0.73 |   311.23 |   500.70 |    41.37 |    42.55 |

Legacy MPS measurement periods did not fully overlap. Over a common period, default-mode throughput was **399.28** for MPS, **334.50** for the native pair, and **334.97** for HAMi, in tokens/s/GPU.

[Fixed-cache data](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled.csv) · [Compute-limiting-disabled reference](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled-unlimited.csv) · [50% client trials](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/hami-50pct-trials.csv).

## Fault isolation results

A faulting process and a healthy process shared one GPU; another GPU served as a control. CUDA test programs replayed Graphs and verified outputs. Each event was tested twice, observing 3 seconds before and at least 6 seconds after the fault.

**HAMi compute limiting was disabled here**, with 20 GiB memory per instance; MPS used v3. **2/2 means the same-GPU peer stayed healthy in both trials; 0/2 means it was affected in both.**

| Injected event | Native processes | HAMi processes | MPS v3 shared | MPS v3 tested static configuration |
| --- | --: | --: | --: | --: |
| Oversized allocation | 2/2 | 2/2 | 2/2 | 2/2 |
| Illegal GPU write | 2/2 | 2/2 | 0/2 | 0/2 |
| GPU trap | 2/2 | 2/2 | 0/2 | 0/2 |
| SIGKILL during GPU work | 2/2 | 2/2 | 0/2 | 0/2 |
| MPS client terminate | N/A | N/A | 2/2 | 2/2 |

All 36 other-GPU controls stayed healthy. Allocation requests for twice the visible capacity were rejected. [Fault counts, errors, and maximum sample gaps (CSV)](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fault-isolation.csv).

The static configuration reported 54 SMs per client and distinct partition IDs. See [MPS fault handling](https://docs.nvidia.com/deploy/mps/latest/when-to-use-mps.html) and [static partitioning](https://docs.nvidia.com/deploy/mps/latest/common-tasks.html#using-static-sm-partitioning).

## Test conditions

Hardware: 2× A100-SXM4-40GB, Ubuntu 24.04.5, driver 615.71.10. Software: Dynamo 1.6.1, vLLM 0.31.0, AIPerf 0.13.0. Model: Qwen3-4B, BF16, one GPU per instance, 2,048 input tokens and a 256-token output target.

| Deployment | Instances per GPU | Memory configuration | Execution configuration |
| --- | --: | --- | --- |
| Native single | 1 | Full-device visibility | Independent CUDA process |
| Native pair | 2 | Engine memory utilization 0.45 each | Independent CUDA processes; no HAMi or MPS |
| HAMi 2.10.0 pair | 2 | 20 GiB quota each | 50% compute quota per instance |
| KAI 0.18.6 + GPU Fractioning 0.1.8 pair | 2 | 20 GiB quota each | MPS sm-sharing; no static SM partitioning |

GPU Fractioning uses the released shared-MPS configuration; the [NVIDIA report](https://docs.nvidia.com/dynamo/dev/many-model-serving/interpreting-gpu-sharing-results) uses custom forks. This study adds a native two-instance baseline.

## Reproduction scripts

[Run the tests](./gpu-sharing-reproduction.md) · [Source code](https://github.com/Project-HAMi/gpu-sharing-benchmarks/tree/e9b205bb121c50649bb97d7ed5dc4f796a9e523f) · [All results](https://github.com/Project-HAMi/gpu-sharing-benchmarks/tree/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing)

Raw data: [Standard tests CSV](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fullstack.csv) · [No compute limit CSV](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fullstack-unlimited.csv).
