---
title: GPU sharing benchmark reproduction
sidebar_label: Benchmark reproduction
description: Reproduce A100 GPU sharing performance and fault probes with native serving, HAMi, and GPU Fractioning.
---

## Core environment

| Item                | Configuration                                                  |
| ------------------- | -------------------------------------------------------------- |
| GPU and OS          | 2× A100-SXM4-40GB; Ubuntu 24.04.5; driver 615.71.10; CUDA 13.4 |
| Kubernetes          | Single-node K3s 1.37.1                                         |
| Inference and model | Dynamo 1.6.1, vLLM 0.31.0; Qwen3-4B BF16                       |
| Sharing software    | HAMi 2.10.0; KAI 0.18.6 + GPU Fractioning 0.1.8                |
| Load generator      | AIPerf 0.13.0; Python 3.11–3.13                                |

Prepare the platform and model cache using the [Dynamo setup guide](https://github.com/ai-dynamo/dynamo/tree/v1.6.1/examples/gpu-sharing). Install the sharing software with the [HAMi chart](https://github.com/Project-HAMi/HAMi/tree/v2.10.0/charts/hami) or [GPU Fractioning](https://github.com/kai-scheduler/gpu-fractioning/tree/v0.1.8).

## Test flow

```mermaid
flowchart LR
    A[Get code] --> B[Generate config] --> C[Compare performance] --> D[Test faults] --> E[Summarize results]
```

### 1. Get the code

```bash
git clone https://github.com/Project-HAMi/gpu-sharing-benchmarks.git
cd gpu-sharing-benchmarks
python3 -m venv .venv
source .venv/bin/activate
pip install aiperf==0.13.0
```

### 2. Generate configurations

Copy `config.example.json` to `config.json` and set the node name, two GPU UUIDs, and model-cache path. The default configuration has no compute limit; prepare a separate HAMi 50% configuration:

```bash
cp config.example.json config.json
# Fill in config.json before continuing:
python3 prepare.py --config config.json --out /var/tmp/hami-sharing-run
jq '.namespace_prefix = "sharing-bench-50pct"' config.json > config.50pct.json
python3 prepare.py --config config.50pct.json --out /var/tmp/hami-sharing-50pct --hami-core-limit 50
```

### 3. Compare performance

Enable each platform before its commands. Label HAMi nodes `gpu=on` and enable one device plugin at a time. Standalone MPS and fault tests need passwordless `sudo`. Each command covers Graph and Eager:

```bash
# Stock NVIDIA plugin: single and paired instances
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fullstack --case native-default --case native-eager
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile native-pair-fullstack

# HAMi, no compute limit: install platform/hami-fullstack-values.yaml
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fullstack --case hami-default --case hami-eager
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile controlled

# HAMi 50%: install platform/hami-50pct-values.yaml
python3 reproduce.py --root /var/tmp/hami-sharing-50pct --profile fullstack --case hami-default --case hami-eager
python3 reproduce.py --root /var/tmp/hami-sharing-50pct --profile controlled --case hami-pair-graph --case hami-pair-eager

# KAI + GPU Fractioning: default-queue, sm-sharing mode
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fullstack --case fractions-default --case fractions-eager

# Stop GPU Fractioning, then run the standalone MPS comparison
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile mps-controlled
```

### 4. Test faults

Stop inference workloads and sharing services, run the native/MPS tests, then switch to HAMi:

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fault
# Install platform/hami-fullstack-values.yaml to switch to HAMi without a compute limit
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile hami-fault
```

### 5. Summarize results

```bash
for profile in fullstack controlled mps-controlled native-pair-fullstack; do
  python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/$profile --out /var/tmp/hami-sharing-run/$profile.csv
done
for profile in fullstack controlled; do
  python3 summarize_metrics.py --root /var/tmp/hami-sharing-50pct/$profile --out /var/tmp/hami-sharing-50pct/$profile.csv --allow-partial
done
```

Performance summaries are CSVs. Fault results are in each fault directory's `aggregate.json` and `conditions.csv`. See the [benchmark report](./gpu-sharing-benchmarks.md) for comparisons and findings.
