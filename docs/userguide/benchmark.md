---
id: benchmark
title: Performance Benchmarks
sidebar_label: Benchmarks
---

# Performance Benchmarks

Three instances from the vLLM benchmark were used to evaluate vGPU-device-plugin performance.

## Test Environment

| Parameter | Value |
| --------- | :---: |
| Kubernetes version | v1.35.4 |
| Docker version | 29.4.0 |
| GPU Type | A100-SXM4-40GB |
| GPU Count | 2 |

## Test Instances

| Instance | Description |
| -------- | :---------: |
| Native | k8s + nvidia k8s-device-plugin |
| Opensource_v280 | k8s + vGPU k8s-device-plugin, opensource version v280 |
| Opensource_v290 | k8s + vGPU k8s-device-plugin, opensource version v290 |

## Test Cases

| Test ID | Case | Type | Parameters |
| ------- | :--: | :--: | :--------: |
| 6.1 | Qwen3-8B (vLLM) | inference | batch=1, stream=True, max_model_len=8192 |

## Results

| Metric | Native | Opensource_v280 | Opensource_v290 |
| ------ | :----: | :-------------: | :-------------: |
| TTFT p50 (s) | 0.0621 | 0.0670 | 0.0629 |
| TTFT p95 (s) | 0.0642 | 0.0713 | 0.0650 |
| TTFT p99 (s) | 0.0652 | 0.0735 | 0.0674 |
| Per-token latency (clean mean, s) | 0.0285 | 0.0310 | 0.0291 |

## Reproducing the Benchmark

1. Install k8s-vGPU-scheduler and configure it properly.

2. Build the benchmark images:

```bash
cd benchmarks/ai-benchmark
sh build.sh
```

3. Run the benchmark job:

```bash
kubectl apply -f benchmarks/deployments/job-on-nvidia-device-plugin.yml
kubectl apply -f benchmarks/deployments/job-on-hami.yml
```

4. View the results:

```bash
kubectl cp <pod-name>:/results ./results
python3 benchmarks/ai-benchmark/gen_report.py \
    --dataset native ./results/bench_native.jsonl \
    --dataset hami ./results/bench_hami.jsonl
```
