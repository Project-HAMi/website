---
title: GPU sharing performance and fault isolation
sidebar_label: Sharing benchmarks
description: A100 measurements comparing native two-instance serving, HAMi, and MPS-based GPU sharing.
---

**Main findings**:

- **Compare against a native pair**: in the fixed-KV Graph test, native throughput fell from 628.57 to 335.51 output tokens/s/GPU when moving from one instance to two. HAMi with a 50% compute quota reached 335.87, a +0.11% difference from the native pair. A roughly 50% drop against a single-instance baseline therefore cannot, by itself, be attributed to HAMi.
- **Execution mode matters**: GPU Fractioning and legacy MPS delivered higher Graph throughput than the native pair in their respective tests. HAMi's Eager throughput was 7.21% below the native pair in the deployment comparison and 2.22% below it with fixed KV.
- **Fault results depend on the configuration**: for illegal writes, traps, and unsynchronized SIGKILL during GPU work, native and HAMi peers remained correct in 2/2 trials per event; HAMi compute limiting was disabled. Same-GPU peers failed in 2/2 trials per event with both tested MPS v3 configurations. The legacy v2 MPS performance test is separate from these fault probes.

![Fixed-KV Graph and Eager throughput for native single, native pair, HAMi pair with a 50% compute quota, and legacy MPS pair](/img/docs/en/userguide/nvidia-device/gpu-sharing-benchmarks.svg)

The figure uses total concurrency 8 per GPU and 6 GiB KV per instance. Bars show mean summed instance throughput with sample-standard-deviation error bars; diamonds show legacy MPS common-window throughput. GPU sets A and C are different physical pairs, so cross-set ratios do not isolate sharing-layer overhead. [Figure data (CSV)](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled.csv).

This page compares native vLLM serving, HAMi 2.10.0, and the open-source Run:ai path, KAI Scheduler + GPU Fractioning. The [NVIDIA Dynamo report](https://docs.nvidia.com/dynamo/dev/many-model-serving/interpreting-gpu-sharing-results) compares one native instance with two shared instances. Here, a native two-instance baseline also shows how two processes perform without a sharing layer.

## Setup

The environment used 2× NVIDIA A100-SXM4-40GB, Ubuntu 24.04.5, driver 615.71.10, Dynamo 1.6.1, vLLM 0.31.0, and AIPerf 0.13.0. The workload was Qwen3-4B, BF16, tensor parallelism 1, with 2,048 input tokens and 256 output tokens.

| Deployment | Instances per GPU | Memory configuration | Execution configuration |
| --- | --: | --- | --- |
| Native single | 1 | Full-device visibility | Independent CUDA process |
| Native pair | 2 | Engine memory utilization 0.45 each | Independent CUDA processes; no HAMi or MPS |
| HAMi 2.10.0 pair | 2 | 20 GiB quota each | HAMi scheduler and device plugin; 50% compute quota per instance |
| KAI 0.18.6 + GPU Fractioning 0.1.8 pair | 2 | 20 GiB quota each | MPS sm-sharing; no static SM partitioning |

The native memory utilization setting is an engine planning budget, not a hard isolation boundary. The released GPU Fractioning configuration uses a shared MPS server; it is distinct from the custom KAI/GPU Fractioning forks used in the linked NVIDIA report.

## Performance results

### Deployment comparison

The unchanged Dynamo [run-sweep.sh](https://github.com/ai-dynamo/dynamo/blob/v1.6.1/examples/gpu-sharing/common/run-sweep.sh) was used to generate load. Total concurrency per GPU was 2, 4, 8, 16, and 32. A single instance received all requests; two instances each received half. Graph used the engine defaults; Eager added `--enforce-eager`. These runs used automatic KV allocation and default prefix caching, with one trial per configuration.

The table shows **total concurrency 8 per GPU**. Throughput is output tokens/s/GPU. Percentage columns use the native pair as the denominator.

| Mode | Native single | Native pair | HAMi pair (50%) | HAMi / native pair | GPU Fractioning pair | GPU Fractioning / native pair |
| --- | --: | --: | --: | --: | --: | --: |
| Graph | 693.67 | 335.67 | 336.52 | 100.25% | 438.59 | 130.66% |
| Eager | 200.28 | 194.53 | 180.49 | 92.79% | 189.54 | 97.43% |

[All measured loads and latency summaries (CSV)](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fullstack.csv) · [Compute-limiting-disabled reference (CSV)](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fullstack-unlimited.csv).

### Same-parameter comparison

This experiment held total concurrency at 8 per GPU: one instance at concurrency 8, or two at concurrency 4 each. Every instance used a fixed 6 GiB KV allocation, `--max-model-len 4096`, `--max-num-seqs 32`, and `--no-enable-prefix-caching`. HAMi used a 50% compute quota; the MPS comparison used legacy v2 MPS. Each deployment received three client trials.

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

Legacy MPS windows did not fully overlap: summed instance throughput was 449.36 tokens/s/GPU, versus 399.28 over a common elapsed-time window. Using the common window, Graph throughput was 334.50 for the native pair and 334.97 for the HAMi pair (50%).

[Controlled summaries](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled.csv) · [Compute-limiting-disabled reference](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled-unlimited.csv) · [50% client trials](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/hami-50pct-trials.csv).

## Fault isolation results

Direct CUDA probes placed a fault injector and a healthy process on GPU 0, with another healthy process on GPU 1. The healthy probes replayed a CUDA Graph and verified output values. Each scenario ran twice, observing 3 seconds before and at least 6 seconds after injection. The MPS v3 shared-server configuration enabled memacct and context-share, following GPU Fractioning 0.1.8's execution mechanism.

**HAMi in the result tables**: performance tests used a 50% compute quota; fault tests disabled compute limiting. Both used a 20 GiB memory quota per instance. The additional static API configuration reported 54 SMs per same-GPU client and distinct partition IDs. The table counts trials in which the **same-GPU healthy process continued producing correct results**.

| Injected event | Native processes | HAMi processes | MPS v3 shared | MPS v3 tested static configuration |
| --- | --: | --: | --: | --: |
| Oversized allocation | 2/2 | 2/2 | 2/2 | 2/2 |
| Illegal GPU write | 2/2 | 2/2 | 0/2 | 0/2 |
| GPU trap | 2/2 | 2/2 | 0/2 | 0/2 |
| SIGKILL during GPU work | 2/2 | 2/2 | 0/2 | 0/2 |
| MPS client terminate | N/A | N/A | 2/2 | 2/2 |

All other-GPU controls remained healthy, across 36 trials. In the MPS cases, the same-GPU peer reported error 700 for illegal writes and unsynchronized SIGKILL, or 719 for traps. Safe MPS client termination did not affect the peer. The formal oversized-allocation case requested twice the visible capacity. A separate HAMi preflight checked that a 21 GiB request was rejected against the 20 GiB quota. These checks test allocation rejection, not sustained memory pressure. [Fault counts, errors, and maximum sample gaps (CSV)](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fault-isolation.csv).

These probes measure GPU fault propagation; they do not test service recovery, latency isolation, tenant security, GPU reset, or hardware failures. The static experiment verified API-visible allocation; it did not independently prove physical SM disjointness. See NVIDIA’s descriptions of [MPS error containment and safe termination](https://docs.nvidia.com/deploy/mps/latest/when-to-use-mps.html) and [static SM partitioning](https://docs.nvidia.com/deploy/mps/latest/common-tasks.html#using-static-sm-partitioning).

:::note Planned MPS support

HAMi plans optional MPS support for v2.12, subject to implementation and validation. The results above do not characterize that future integration.

:::

## Test scope

All runs used the GPU model and driver listed above. Sets A, B, and C denote different physical GPU pairs, identified by UUID.

| Collection date (UTC, 2026) | Test groups | GPU set |
| --- | --- | --- |
| November 2 | Deployment comparison: native single, GPU Fractioning, and HAMi with compute limiting disabled | A |
| November 3 | Fixed-KV comparison: native single, native pair, legacy MPS, and HAMi with compute limiting disabled | A |
| November 4 | Native-pair deployment comparison and all fault probes | B |
| November 5 | HAMi 50% performance tests: deployment and fixed-KV comparisons | C |

The results cover this model and the stated loads. Cross-set ratios can include GPU variation and do not isolate sharing-layer overhead. NVIDIA's eight-GPU measurements using custom branches are a separate experiment.

## Reproduction scripts

Environment setup, platform selection, performance and fault-test commands, and metric summarization are maintained in the [reproduction guide](./gpu-sharing-reproduction.md). The actual collectors and templates are available in the [benchmark source snapshot](https://github.com/Project-HAMi/gpu-sharing-benchmarks/tree/e9b205bb121c50649bb97d7ed5dc4f796a9e523f).

Aggregated CSVs are maintained under [results/2026-11-a100-sharing/](https://github.com/Project-HAMi/gpu-sharing-benchmarks/tree/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing) in that repository.
