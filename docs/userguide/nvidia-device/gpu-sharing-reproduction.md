---
title: GPU sharing benchmark reproduction
sidebar_label: Benchmark reproduction
description: Reproduce A100 GPU sharing performance and fault probes with native serving, HAMi, and GPU Fractioning.
---

See the [benchmark report](./gpu-sharing-benchmarks.md) for results.

## Get the benchmark code

```bash
git clone https://github.com/Project-HAMi/gpu-sharing-benchmarks.git
cd gpu-sharing-benchmarks
```

## Environment

Use a dedicated Linux GPU node with:

- Two A100-SXM4-40GB GPUs, 108 SMs each, driver 615.71.10, and CUDA 13.4 MPS tools.
- Ubuntu 24.04.5, single-node K3s 1.37.1+k3s1, NVIDIA Container Toolkit 1.20.1, NVIDIA RuntimeClass `nvidia`, and CDI device selection.
- Dynamo platform 1.6.1 with etcd and NATS.
- HAMi 2.10.0, or KAI 0.18.6 with GPU Fractioning 0.1.8, depending on the selected arm.
- Python 3.11 or later, AIPerf 0.13.0, `kubectl`, `helm`, `jq`, `curl`, `vmstat`, and passwordless `sudo` for the fault/MPS profiles.
- A non-root GPU client UID/GID of 1000. The legacy MPS server runs under this UID; v3 fault servers run as root with multiuser mode.

Follow the [Dynamo GPU-sharing setup guide](https://github.com/ai-dynamo/dynamo/tree/v1.6.1/examples/gpu-sharing) using Dynamo 1.6.1 and AIPerf 0.13.0. Cache `Qwen/Qwen3-4B` revision `1cfa9a7208912126459214e8b04321603b3df60c` under `/opt/hf-cache/hub`. Run the load generator on the GPU node, connecting to ClusterIP services.

```bash
python3 -m venv /var/tmp/aiperf-013
/var/tmp/aiperf-013/bin/python -m pip install aiperf==0.13.0
```

Set `aiperf_executable` in the local configuration to `/var/tmp/aiperf-013/bin/aiperf`. Install the sharing stacks from [HAMi 2.10.0](https://github.com/Project-HAMi/HAMi/tree/v2.10.0/charts/hami) and [GPU Fractioning 0.1.8](https://github.com/kai-scheduler/gpu-fractioning/tree/v0.1.8), using KAI 0.18.6 for the latter.

## Generate the test configuration

Copy `config.example.json` to `config.json` and set the node name, two GPU UUIDs, AIPerf executable, and model-cache path. Query GPU UUIDs with `nvidia-smi --query-gpu=uuid --format=csv,noheader`.

```bash
python3 prepare.py --config config.json --out /var/tmp/hami-sharing-run
```

Fullstack tests use total concurrency 2, 4, 8, 16, and 32 per GPU; paired instances each receive half. The controlled comparison uses total concurrency 8. HAMi compute limiting is disabled by default; the 50% performance configuration is shown below.

## Select the platform for each arm

Stock NVIDIA and HAMi device plugins must not advertise the same physical devices simultaneously.

| Cases | Required platform |
| --- | --- |
| Fullstack `native-*` | Stock NVIDIA device plugin; no HAMi injection or MPS |
| Fullstack `hami-*`; controlled cases | HAMi scheduler/device plugin 2.10.0; no MPS |
| Native-pair fullstack | Explicit CDI GPU attachment; no HAMi injection or MPS |
| Fullstack `fractions-*` | Stock NVIDIA plugin, KAI 0.18.6, GPU Fractioning 0.1.8 with shared-server `sm-sharing` |
| Legacy MPS controlled | GPU Fractioning stopped; no HAMi injection; collector manages its own legacy MPS server |
| Native/MPS fault matrix | GPU Fractioning stopped; collector manages its own v3 MPS servers |
| HAMi fault tests | HAMi scheduler/device plugin 2.10.0; no MPS |

Use `platform/hami-50pct-values.yaml` for a 50% compute quota and 20 GiB memory per instance. `platform/hami-fullstack-values.yaml` and `platform/hami-controlled-values.yaml` configure the same memory quota with compute limiting disabled. Apply the selected values with the official HAMi 2.10.0 chart and label the node `gpu=on`. For GPU Fractioning, configure the KAI `default-queue` and `gpu-compute.mode: sm-sharing` as in the released operator guide.

## Run performance cases

Run the fullstack cases:

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fullstack --case native-default --case native-eager
# Switch the device plugin to HAMi before these cases.
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fullstack --case hami-default --case hami-eager
# Switch to KAI + GPU Fractioning before these cases.
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fullstack --case fractions-default --case fractions-eager
```

Fullstack tests use automatic KV allocation and default prefix caching. Eager adds only `--enforce-eager`. Run the native-pair fullstack cases with:

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile native-pair-fullstack
```

The controlled comparison fixes each instance's KV cache at 6 GiB, sets maximum model length 4096 and maximum sequences 32, and disables prefix caching. Each fresh deployment receives three client trials. Native single runs concurrency 8; paired instances run concurrency 4 each:

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile controlled
# Stop the installed sharing services before the legacy MPS tests.
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile mps-controlled
```

Use `--case` to select a controlled case, such as `hami-pair-graph`.

## 50% compute-quota configuration

Create a separate configuration with a new `namespace_prefix` of at most 19 lowercase DNS-label characters.

```bash
jq '.namespace_prefix = "sharing-bench-50pct"' config.json > config.50pct.json
python3 prepare.py --config config.50pct.json --out /var/tmp/hami-sharing-50pct --hami-core-limit 50
```

Install HAMi with `platform/hami-50pct-values.yaml` to enable the 50% compute quota, then run:

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-50pct --profile controlled --case hami-pair-graph --case hami-pair-eager
python3 reproduce.py --root /var/tmp/hami-sharing-50pct --profile fullstack --case hami-default --case hami-eager
python3 summarize_metrics.py --root /var/tmp/hami-sharing-50pct/controlled --out /var/tmp/hami-50pct-controlled.csv --allow-partial
python3 summarize_metrics.py --root /var/tmp/hami-sharing-50pct/fullstack --out /var/tmp/hami-50pct-fullstack.csv --allow-partial
```

## Run the fault matrix

Stop other model workloads and sharing services first. The native/MPS matrix runs two trials per event, placing an injector and healthy process on GPU 0 and a healthy control on GPU 1. Healthy processes replay a CUDA Graph and check output values. Observation is 3 seconds before and at least 6 seconds after injection. The events are oversized allocation, illegal GPU write, trap, unsynchronized SIGKILL during bounded GPU work, and safe MPS client termination.

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fault
# Install HAMi with compute limiting disabled before the fault tests.
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile hami-fault
```

The HAMi quota preflight requests 21 GiB against a 20 GiB limit. It is followed by eight fault trials; the oversized-allocation cases request twice the visible capacity. Results are in each fault directory's `aggregate.json` and `conditions.csv`.

## Recompute performance summaries

```bash
python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/fullstack --out /var/tmp/fullstack-points.csv
python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/controlled --total-concurrency 8 --out /var/tmp/controlled-points.csv
python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/mps-controlled --total-concurrency 8 --out /var/tmp/mps-points.csv
python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/native-pair-fullstack --out /var/tmp/native-pair-points.csv
```

Use `--allow-partial` while other cases are still pending. The CSV reports summed instance throughput per GPU and common-window throughput separately. TTFT, TPOT, and end-to-end p50/p99 are means of per-instance percentiles, not pooled cluster percentiles. The controlled comparison's three-trial means and sample standard deviations are in `aggregate.json`.

## Published results

Results directory: [results/2026-11-a100-sharing/](https://github.com/Project-HAMi/gpu-sharing-benchmarks/tree/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing).

| File | Contents |
| --- | --- |
| [fullstack.csv](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fullstack.csv) | Deployment throughput and latency at all five loads; HAMi uses 50% compute |
| [controlled.csv](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled.csv) | Fixed-KV comparison at total concurrency 8; HAMi uses 50% compute |
| [hami-50pct-trials.csv](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/hami-50pct-trials.csv) | Individual HAMi 50% fixed-KV client trials |
| [fullstack-unlimited.csv](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fullstack-unlimited.csv) | Deployment comparison with HAMi compute limiting disabled |
| [controlled-unlimited.csv](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled-unlimited.csv) | Fixed-KV comparison with HAMi compute limiting disabled |
| [fault-isolation.csv](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fault-isolation.csv) | CUDA fault counts and error codes; HAMi compute limiting disabled |

## Source

The workload client `vendor/dynamo/run-sweep.sh` comes from Dynamo v1.6.1. See `vendor/dynamo/LICENSE` for its Apache-2.0 license and `NOTICE.md` for template attribution.
