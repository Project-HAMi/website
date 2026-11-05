---
title: GPU sharing performance and fault isolation
sidebar_label: Sharing benchmarks
description: A100 measurements comparing native two-instance serving, HAMi, and MPS-based GPU sharing.
---

This page compares HAMi with the open-source Run:ai GPU sharing path, KAI Scheduler + GPU Fractioning. It reports deployment throughput, an additional native two-instance baseline, and GPU execution fault probes. These measurements describe the tested configurations; they are not a general ranking of sharing backends.

## Setup

Measurements were collected on November 2-5, 2026, using 2× NVIDIA A100-SXM4-40GB, Ubuntu 24.04.5, driver 615.71.10, Dynamo 1.6.1, vLLM 0.31.0, and AIPerf 0.13.0. The workload was Qwen3-4B, BF16, tensor parallelism 1, with 2,048 input tokens and 256 output tokens.

| Deployment | Instances per GPU | Memory configuration | Execution configuration |
| --- | --: | --- | --- |
| Native single | 1 | Full-device visibility | Independent CUDA process |
| Native pair | 2 | Engine memory utilization 0.45 each | Independent CUDA processes; no HAMi or MPS |
| HAMi 2.10.0 pair | 2 | 20 GiB quota each | HAMi scheduler and device plugin; 50% compute quota per instance |
| KAI 0.18.6 + GPU Fractioning 0.1.8 pair | 2 | 20 GiB quota each | MPS sm-sharing; no static SM partitioning |

The native memory utilization setting is an engine planning budget, not a hard isolation boundary. The released GPU Fractioning configuration uses a shared MPS server; it is distinct from the custom KAI/GPU Fractioning forks used in the linked NVIDIA report. The separate controlled comparison below fixes the KV allocation.

## Performance results

### Deployment comparison

The unchanged Dynamo [run-sweep.sh](https://github.com/ai-dynamo/dynamo/blob/v1.6.1/examples/gpu-sharing/common/run-sweep.sh) was used to generate load. Total concurrency per GPU was 2, 4, 8, 16, and 32. A single instance received all requests; two instances each received half. Graph used the engine defaults; Eager added `--enforce-eager`. These runs used automatic KV allocation and default prefix caching, with one trial per configuration.

The table shows **total concurrency 8 per GPU**. Throughput is output tokens/s/GPU. Percentage columns use the native pair as the denominator.

| Mode | Native single | Native pair | HAMi pair (50%) | HAMi / native pair | GPU Fractioning pair | GPU Fractioning / native pair |
| --- | --: | --: | --: | --: | --: | --: |
| Graph | 693.67 | 335.67 | 336.52 | 100.25% | 438.59 | 130.66% |
| Eager | 200.28 | 194.53 | 180.49 | 92.79% | 189.54 | 97.43% |

Native single and GPU Fractioning were collected on November 2, native pair on November 4, and HAMi with a 50% compute quota on November 5. Other backends retain their original measurements. The GPU model and driver match, but the physical GPUs and collection rounds differ; these ratios are deployment references, not a controlled estimate of component overhead. Prefix-cache behavior and KV capacity also vary with deployment settings. [All measured loads and latency summaries (CSV)](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fullstack.csv).

### Same-parameter comparison

This experiment held total concurrency at 8 per GPU: one instance at concurrency 8, or two at concurrency 4 each. Every instance used a fixed 6 GiB KV allocation, `--max-model-len 4096`, `--max-num-seqs 32`, and `--no-enable-prefix-caching`. HAMi used a 50% compute quota in the November 5 supplement; native and legacy v2 MPS retain their November 3 measurements. Each deployment received three client trials. This comparison spans collection rounds and does not substitute for a complete GPU Fractioning deployment test.

Throughput is the mean ± sample standard deviation of the sum of instance throughput per GPU. TTFT is milliseconds; TPOT is milliseconds/output token. Latency columns average instance percentiles and trials; **they are not pooled cluster p99 values**. TPOT measures each request's average output-token interval, not the distribution of individual token gaps.

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

Relative to the original native pair, the 50% HAMi supplement differed by +0.11% with Graph and -2.22% with Eager. Native Graph throughput in the original same-round comparison changed from 628.57 for a single instance to 335.51 for a pair, before HAMi was introduced. A single-instance baseline alone cannot attribute that deployment effect to HAMi.

Legacy MPS windows did not fully overlap: summed instance throughput was 449.36 tokens/s/GPU, versus 399.28 over a common elapsed-time window. The original November 3 common-window references were 334.50 for native pair and 334.78 for unlimited HAMi. These historical values are kept separate from the new quota-limited cohort. [Current controlled summaries](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled.csv), [original unlimited comparison](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled-unlimited.csv), and [50% client trials](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/hami-50pct-trials.csv).

## Fault isolation results

Direct CUDA probes placed a fault injector and a healthy process on GPU 0, with another healthy process on GPU 1. The healthy probes replayed a CUDA Graph and verified output values. Each scenario ran twice, observing 3 seconds before and at least 6 seconds after injection. The MPS v3 shared-server configuration enabled memacct and context-share, following GPU Fractioning 0.1.8's execution mechanism. This tested GPU fault propagation, not KAI, GPU Fractioning, or vLLM service recovery.

The HAMi fault configuration used a 20 GiB quota with compute limiting disabled. The additional static API configuration reported 54 SMs per same-GPU client and distinct partition IDs. The table counts trials in which the **same-GPU healthy process continued producing correct results**.

| Injected event | Native processes | HAMi processes | MPS v3 shared | MPS v3 tested static configuration |
| --- | --: | --: | --: | --: |
| Oversized allocation | 2/2 | 2/2 | 2/2 | 2/2 |
| Illegal GPU write | 2/2 | 2/2 | 0/2 | 0/2 |
| GPU trap | 2/2 | 2/2 | 0/2 | 0/2 |
| SIGKILL during GPU work | 2/2 | 2/2 | 0/2 | 0/2 |
| MPS client terminate | N/A | N/A | 2/2 | 2/2 |

All other-GPU controls remained healthy, across 36 trials. In the MPS cases, the same-GPU peer reported error 700 for illegal writes and unsynchronized SIGKILL, or 719 for traps. Safe MPS client termination did not affect the peer. Oversized allocation requested twice the visible capacity; this was allocation rejection, not a sustained memory-pressure test. Continued correctness does not imply absence of latency interference. [Fault counts, errors, and maximum sample gaps (CSV)](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fault-isolation.csv).

These observations apply to this A100/driver/server configuration and these injected events. They do not establish a general security boundary for HAMi, native contexts, or MPS, and do not test GPU reset or hardware failures. The static experiment verified API-visible allocation, not independent physical SM disjointness. NVIDIA documents [limited MPS error containment and safe client termination](https://docs.nvidia.com/deploy/mps/latest/when-to-use-mps.html), and [partial error isolation with static SM partitions](https://docs.nvidia.com/deploy/mps/latest/common-tasks.html#using-static-sm-partitioning); isolation depends on the driver, fault type, and configuration.

## Reading the baselines

The [NVIDIA Dynamo report](https://docs.nvidia.com/dynamo/dev/many-model-serving/interpreting-gpu-sharing-results) compares one native instance with two shared instances at equal total requests per GPU. That baseline measures the throughput retained when deployment density increases. A native pair answers an additional question: how much throughput changes when a sharing layer is added to the same two-instance placement.

Both comparisons are useful. A roughly 50% difference from a single-instance baseline is not, by itself, a measurement of HAMi's additional overhead. Conversely, a small HAMi-to-native-pair difference does not remove the cost of splitting a workload into two instances or imply equivalence across models and loads. The two-GPU release measurements here should not be pooled numerically with NVIDIA's eight-GPU fork measurements.

## Backend choice and planned MPS support

Select a backend against measured throughput, TTFT/TPOT targets, tenant trust, acceptable same-GPU fault impact, and recovery behavior. MPS improved Graph throughput for the tested shared workload; independent native and HAMi processes contained the injected process faults in the tested cases. Memory quotas, SM allocation, execution fault containment, and security isolation are separate properties.

:::note Planned support

Optional MPS support is planned for HAMi v2.12, subject to implementation and validation. The intent is to let users select a sharing mode for their workload and isolation requirements. These results characterize the configurations above, not the future HAMi MPS integration.

:::

## Reproduction scripts

Environment setup, platform selection, performance and fault-test commands, and metric summarization are maintained in the [reproduction guide](./gpu-sharing-reproduction.md). The actual collectors and templates are available in the [benchmark source snapshot](https://github.com/Project-HAMi/gpu-sharing-benchmarks/tree/e9b205bb121c50649bb97d7ed5dc4f796a9e523f).

Aggregated CSVs are maintained under [results/2026-11-a100-sharing/](https://github.com/Project-HAMi/gpu-sharing-benchmarks/tree/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing) in that repository.
