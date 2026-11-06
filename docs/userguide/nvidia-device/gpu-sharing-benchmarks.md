---
title: GPU sharing performance and fault isolation
sidebar_label: Sharing benchmarks
description: A100 measurements comparing native two-instance serving, HAMi, and MPS-based GPU sharing.
---

**Main findings**:

- **HAMi and the native pair had similar throughput**: with fixed cache in default mode, they reached 335.87 and 335.51 tokens/s/GPU, a +0.11% difference. Native single reached 628.57; the drop with two instances cannot be attributed directly to HAMi.
- **HAMi had lower throughput in Eager mode**: 7.21% below the native pair in the standard test and 2.22% below it with fixed cache. GPU Fractioning and legacy MPS exceeded the native pair in their respective default-mode tests.
- **Fault propagation differed**: illegal writes, traps, and process kills during GPU work were each tested twice. Native and HAMi peers stayed healthy; both tested MPS v3 configurations affected their peers. HAMi compute limiting was disabled for these tests.

![Fixed-cache Graph and Eager throughput for native single, native pair, HAMi pair with a 50% compute quota, and legacy MPS pair](/img/docs/en/userguide/nvidia-device/gpu-sharing-benchmarks.svg)

Concurrency is 8 per GPU, with 6 GiB cache per instance. Bars show three-trial throughput means; error bars show sample standard deviations. Diamonds use a common measurement period. A and C are different physical GPU pairs, so the difference does not isolate sharing-layer overhead. [Figure data (CSV)](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled.csv).

## Inference performance

### Standard test: automatic cache allocation

Dynamo ran vLLM, with load from the official [run-sweep.sh](https://github.com/ai-dynamo/dynamo/blob/v1.6.1/examples/gpu-sharing/common/run-sweep.sh). Graph is the default mode; Eager adds `--enforce-eager`. These tests used automatic cache allocation and default prefix caching, with one trial per configuration.

Total concurrency is 8 per GPU, split equally between paired instances. Throughput is output tokens/s/GPU; **higher is better**. Parentheses show the difference from the native pair. The full dataset covers concurrency 2, 4, 8, 16, and 32.

| Mode  | Native single | Native pair | HAMi pair (50%) | GPU Fractioning pair |
| ----- | ------------: | ----------: | --------------: | -------------------: |
| Graph |        693.67 |      335.67 | 336.52 (+0.25%) |     438.59 (+30.66%) |
| Eager |        200.28 |      194.53 | 180.49 (−7.21%) |      189.54 (−2.57%) |

[All measured loads and latency summaries (CSV)](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fullstack.csv) · [Compute-limiting-disabled reference (CSV)](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fullstack-unlimited.csv).

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

A faulting process and a healthy process shared one GPU; another GPU served as a control. CUDA test programs kept computing and checking results. Each event was tested twice, observing 3 seconds before and at least 6 seconds after the fault.

**HAMi compute limiting was disabled here**, with 20 GiB memory per instance; MPS used v3. **2/2 means the same-GPU peer stayed healthy in both trials; 0/2 means it was affected in both.**

| Injected event | Native processes | HAMi processes | MPS v3 shared | MPS v3 tested static configuration |
| --- | --: | --: | --: | --: |
| Oversized allocation | 2/2 | 2/2 | 2/2 | 2/2 |
| Illegal GPU write | 2/2 | 2/2 | 0/2 | 0/2 |
| GPU trap | 2/2 | 2/2 | 0/2 | 0/2 |
| SIGKILL during GPU work | 2/2 | 2/2 | 0/2 | 0/2 |
| MPS client terminate | N/A | N/A | 2/2 | 2/2 |

All 36 other-GPU controls stayed healthy. The memory test only checked rejection of oversized allocations, requesting twice the visible capacity. [Fault counts, errors, and maximum sample gaps (CSV)](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fault-isolation.csv).

These tests cover GPU fault propagation between processes, excluding service recovery, latency isolation, tenant security, and hardware faults. The static configuration reported half the compute units per client (54 SMs), without proving physical separation. See [MPS fault handling](https://docs.nvidia.com/deploy/mps/latest/when-to-use-mps.html) and [static partitioning](https://docs.nvidia.com/deploy/mps/latest/common-tasks.html#using-static-sm-partitioning).

## Test conditions

Hardware: 2× A100-SXM4-40GB, Ubuntu 24.04.5, driver 615.71.10. Software: Dynamo 1.6.1, vLLM 0.31.0, AIPerf 0.13.0. Model: Qwen3-4B, BF16, one GPU per instance, 2,048 input tokens and a 256-token output target.

| Deployment | Instances per GPU | Memory configuration | Execution configuration |
| --- | --: | --- | --- |
| Native single | 1 | Full-device visibility | Independent CUDA process |
| Native pair | 2 | Engine memory utilization 0.45 each | Independent CUDA processes; no HAMi or MPS |
| HAMi 2.10.0 pair | 2 | 20 GiB quota each | 50% compute quota per instance |
| KAI 0.18.6 + GPU Fractioning 0.1.8 pair | 2 | 20 GiB quota each | MPS sm-sharing; no static SM partitioning |

Native memory utilization controls the engine budget. GPU Fractioning uses the released shared-MPS configuration; the [NVIDIA report](https://docs.nvidia.com/dynamo/dev/many-model-serving/interpreting-gpu-sharing-results) uses custom forks. This study adds a native two-instance baseline.

## Test scope

A, B, and C are different physical GPU pairs with the same model and driver.

| Collection date (UTC, 2026) | Test groups | GPU set |
| --- | --- | --- |
| November 2 | Standard test: native single, GPU Fractioning, and unlimited-compute HAMi | A |
| November 3 | Fixed cache: native single, native pair, legacy MPS, and unlimited-compute HAMi | A |
| November 4 | Native-pair standard test and all fault tests | B |
| November 5 | HAMi 50% performance: standard and fixed-cache tests | C |

Cross-set differences may include hardware effects. Results apply to the tested model and loads.

## Reproduction scripts

[Run the tests](./gpu-sharing-reproduction.md) · [Source code](https://github.com/Project-HAMi/gpu-sharing-benchmarks/tree/e9b205bb121c50649bb97d7ed5dc4f796a9e523f) · [All results](https://github.com/Project-HAMi/gpu-sharing-benchmarks/tree/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing)
