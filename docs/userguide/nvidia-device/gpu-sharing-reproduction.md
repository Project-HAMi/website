---
title: GPU sharing benchmark reproduction
sidebar_label: Benchmark reproduction
---

This guide is the canonical setup and execution reference for the [A100 benchmark report](./gpu-sharing-benchmarks.md). Run commands from the benchmark repository root. Host paths, GPU UUIDs, and case selection are configurable; `provenance.json` records the collector source hashes.

## Get the benchmark code

```bash
git clone https://github.com/Project-HAMi/gpu-sharing-benchmarks.git
cd gpu-sharing-benchmarks
git checkout e9b205bb121c50649bb97d7ed5dc4f796a9e523f
```

## Environment

Run collectors on a dedicated Linux GPU node. They deploy and remove benchmark namespaces, start and stop scoped MPS servers, and inject GPU execution faults. The published setup used:

- Two A100-SXM4-40GB GPUs, 108 SMs each, driver 615.71.10, and CUDA 13.4 MPS tools.
- Ubuntu 24.04.5, single-node K3s 1.37.1+k3s1, NVIDIA Container Toolkit 1.20.1, NVIDIA RuntimeClass `nvidia`, and CDI device selection.
- Dynamo platform 1.6.1 with etcd and NATS. Workload containers are pinned by digest in the templates.
- HAMi 2.10.0, or KAI 0.18.6 with GPU Fractioning 0.1.8, depending on the selected arm.
- Python 3.11 or later, AIPerf 0.13.0, `kubectl`, `helm`, `jq`, `curl`, `vmstat`, and passwordless `sudo` for the fault/MPS profiles.
- A non-root GPU client UID/GID of 1000. The legacy MPS server runs under this UID; v3 fault servers run as root with multiuser mode, matching the recorded configuration.

Use the [Dynamo GPU-sharing setup guide](https://github.com/ai-dynamo/dynamo/tree/v1.6.1/examples/gpu-sharing) to provision the platform and model cache, selecting platform 1.6.1 and AIPerf 0.13.0 rather than its older example defaults. Cache `Qwen/Qwen3-4B` revision `1cfa9a7208912126459214e8b04321603b3df60c` under `/opt/hf-cache/hub`. Workers use the pinned snapshot path and offline mode. The load generator runs on the GPU node and connects to ClusterIP services.

```bash
python3 -m venv /var/tmp/aiperf-013
/var/tmp/aiperf-013/bin/python -m pip install aiperf==0.13.0
```

Set `aiperf_executable` in the local configuration to `/var/tmp/aiperf-013/bin/aiperf`. Install the sharing stacks from [HAMi 2.10.0](https://github.com/Project-HAMi/HAMi/tree/v2.10.0/charts/hami) and [GPU Fractioning 0.1.8](https://github.com/kai-scheduler/gpu-fractioning/tree/v0.1.8), using KAI 0.18.6 for the latter.

## Prepare without a GPU

Copy `config.example.json` to a separate local configuration. Set the actual node name, two GPU UUIDs from `nvidia-smi --query-gpu=uuid --format=csv,noheader`, AIPerf executable, and model-cache path. `KUBECONFIG` and the current kubectl context are inherited.

```bash
python3 prepare.py --config config.json --out /var/tmp/hami-sharing-run
```

Preparation writes manifests and plans without contacting Kubernetes or accessing a GPU. It refuses to overwrite an existing directory. Total concurrency per GPU is 2, 4, 8, 16, and 32; paired deployments receive half that concurrency per instance. The controlled comparison uses total concurrency 8 only.

## Select the platform for each arm

Only run a case after installing the corresponding sharing stack. Stock NVIDIA and HAMi device plugins must not advertise the same physical devices simultaneously.

| Cases | Required platform |
| --- | --- |
| Fullstack `native-*` | Stock NVIDIA device plugin; no HAMi injection or MPS |
| Fullstack `hami-*`; controlled cases | HAMi scheduler/device plugin 2.10.0; no MPS |
| Native-pair fullstack | Explicit CDI GPU attachment; no HAMi injection or MPS |
| Fullstack `fractions-*` | Stock NVIDIA plugin, KAI 0.18.6, GPU Fractioning 0.1.8 with shared-server `sm-sharing` |
| Legacy MPS controlled | GPU Fractioning stopped; no HAMi injection; collector manages its own legacy MPS server |
| Native/MPS fault matrix | GPU Fractioning stopped; collector manages its own v3 MPS servers |
| HAMi fault supplement | HAMi scheduler/device plugin 2.10.0; no MPS |

The original November 2-4 HAMi runs used `platform/hami-fullstack-values.yaml` and `platform/hami-controlled-values.yaml`, both with compute limiting disabled and a 20 GiB memory quota per instance. The November 5 performance supplement used `platform/hami-50pct-values.yaml`, with a 50% compute quota and the same memory quota. Other backends retain their original measurements. Install these values with the official HAMi 2.10.0 chart. Label the node `gpu=on`; the webhook is scoped to benchmark-managed namespaces. For GPU Fractioning, configure the KAI `default-queue` and `gpu-compute.mode: sm-sharing` as in the released operator guide.

## Run performance cases

After selecting the required platform, run individual fullstack cases:

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fullstack --case native-default --case native-eager
# Switch the device plugin to HAMi before these cases.
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fullstack --case hami-default --case hami-eager
# Switch to KAI + GPU Fractioning before these cases.
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fullstack --case fractions-default --case fractions-eager
```

The fullstack cases preserve automatic KV allocation and default prefix caching. Eager adds only `--enforce-eager`. The native-pair supplement initializes one instance per GPU before the second instance to avoid concurrent memory-profiling races:

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile native-pair-fullstack
```

The controlled comparison fixes each instance's KV cache at 6 GiB, sets maximum model length 4096 and maximum sequences 32, and disables prefix caching. Each fresh deployment receives three client trials. Native single runs concurrency 8; paired instances run concurrency 4 each:

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile controlled
# Stop the installed sharing services before the legacy MPS supplement.
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile mps-controlled
```

`--case` can select a prepared controlled case such as `hami-pair-graph`. Collectors verify GPU placement, actual loaded libraries, engine flags, restart counts, and MPS client membership. They retain logs, AIPerf exports, and before/after runtime checks. A failed attempt is preserved rather than silently overwritten.

## 50% compute-quota supplement

Create a separate preparation:

```bash
python3 prepare.py --config config.json --out /var/tmp/hami-sharing-50pct --hami-core-limit 50
```

Install HAMi using `platform/hami-50pct-values.yaml` before running its performance cases. This enables core limiting; generated HAMi workers request `nvidia.com/gpucores: 50`. Keep these outputs separate from the original unlimited-compute cohort. Runtime checks confirm the selected quota before accepting results. The published November 5 supplement reran only HAMi; the fault supplement retains its original unlimited-compute protocol.

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
# Install HAMi with compute limiting disabled before the supplement.
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile hami-fault
```

The second command first checks the released HAMi library hash, hook locations, 20 GiB memory reporting, and rejection of a 21 GiB allocation. It then runs eight fresh-Pod cases and joins them with the new native/MPS reference. Machine-readable results are in each fault directory's `aggregate.json` and `conditions.csv`.

## Recompute performance summaries

```bash
python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/fullstack --out /var/tmp/fullstack-points.csv
python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/controlled --total-concurrency 8 --out /var/tmp/controlled-points.csv
python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/mps-controlled --total-concurrency 8 --out /var/tmp/mps-points.csv
python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/native-pair-fullstack --out /var/tmp/native-pair-points.csv
```

Use `--allow-partial` while other cases are still pending. The summary rejects incomplete runs, request errors, missing workers, and a HAMi compute limit that differs from the declared profile. It reports summed instance throughput per GPU and common-window throughput separately. TTFT, TPOT, and end-to-end p50/p99 are arithmetic means of per-instance percentiles, not pooled cluster percentiles. Three-trial means and sample standard deviations can be calculated from the point rows; the controlled collector also writes them to `aggregate.json`.

## Published results

Aggregated CSVs are stored in the benchmark repository at [results/2026-11-a100-sharing/](https://github.com/Project-HAMi/gpu-sharing-benchmarks/tree/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing). The report links the same snapshot.

## Source and validation

`vendor/dynamo/run-sweep.sh` is the unmodified Dynamo v1.6.1 workload client, SHA-256 `d8fde51c9841b7898eb12a27489e5601b7fab535736db74da8fd3d6713450d19`. See `vendor/dynamo/LICENSE` for its Apache-2.0 license and `NOTICE.md` for template attribution. Other files follow the benchmark repository's license.

The original collectors ran on the environment listed above. Validation includes manifest generation, source compilation, shell checks, and recomputation against archived AIPerf exports and CUDA fault results. The portable performance path also collected the November 5 HAMi 50% supplement: 64 canonical worker exports and 3,840 successful measured requests. Native, MPS, GPU Fractioning, and fault results retain their original collection dates.
