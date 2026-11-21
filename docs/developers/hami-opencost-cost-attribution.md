---
id: hami-opencost-cost-attribution
title: HAMi-aware Fractional GPU Cost Attribution with OpenCost
sidebar_label: OpenCost Cost Attribution
---

## Status and first milestone

This proposal tracks [HAMi #3073](https://github.com/Project-HAMi/HAMi/issues/3073) and [OpenCost #3828](https://github.com/opencost/opencost/issues/3828). OpenCost's native GPU request accounting reads `nvidia.com/gpu`. A HAMi Pod requesting one virtual device and 25% cores can therefore retain whole-device request accounting. A maintainer-reported T4 baseline demonstrates this overbilling and a separate physical-inventory error.

The first milestone compares unmodified OpenCost allocation API results with an offline **core-reservation reference**. The [experimental harness](https://github.com/Eshiv-Pandey/HAMi/tree/2739e1ddaa71c333685d0c99463e5553bd47e632/opencost-repro) is published separately in a HAMi fork. This revision aligns the capture window with OpenCost's query resolution and keeps the exported GPU hourly price on its physical basis. The harness does not implement a native HAMi allocation source in OpenCost.

Use one dedicated physical NVIDIA GPU sequentially: four continuously running quarter reservations for one hour, followed by one whole-GPU reservation for one hour. Both should reserve one GPU-hour under the chosen core policy. The milestone requires explicit positive core and memory limits, one container per Pod, stable Pod UIDs, no init containers, and no container restarts.

### Reported T4 baseline

[spencercjh reported a GCP experiment](https://github.com/Project-HAMi/HAMi/issues/3073#issuecomment-6936317656) run on 16 November 2026 using one Tesla T4, K3s `v1.35.8+k3s1`, HAMi `v2.11.0`, and OpenCost `1.121.3`. The shared and whole-GPU tests ran sequentially for one hour each. All Pods ran CUDA operations without restarts. At a configured physical GPU price of $0.44 per hour:

| Test | Expected total Pod cost under the core-reservation policy | OpenCost reported total Pod cost |
| --- | --- | --- |
| Four Pods, each reserving 25% of cores and memory | $0.44 | $1.76 |
| One whole-GPU Pod | $0.44 | $0.44 |

Shared Pods were charged four times the expected total. OpenCost also counted 10 virtual GPU units as 10 physical GPUs for node costs. These are maintainer-reported baseline results, not evidence of a corrected native allocation source. The report mentions a capture-window alignment fix; raw captures and the operator's exact patch remain a separate evidence handoff.

## Allocation and runtime evidence

A quarter workload requests:

```yaml
resources:
  requests:
    nvidia.com/gpu: "1"
    nvidia.com/gpucores: "25"
    nvidia.com/gpumem-percentage: "25"
  limits:
    nvidia.com/gpu: "1"
    nvidia.com/gpucores: "25"
    nvidia.com/gpumem-percentage: "25"
```

| Metric | Meaning and identity |
| --- | --- |
| `hami_vgpu_core_allocated_ratio` | Pod/device allocated cores. NVIDIA values are percentage points (25 means 25%). Labels include namespace, node, Pod name, and device UUID. |
| `hami_vgpu_memory_allocated_bytes` | Pod/device reserved memory, with the same identity. |
| `hami_gpu_memory_limit_bytes` | HAMi-reported device memory capacity, including when idle. For non-MIG NVIDIA devices, `devicememoryscaling` scales this value. |
| `hami_container_device_utilization_ratio` | Runtime utilization, labelled by namespace, Pod name, container, virtual-device index, and UUID. Node and Pod UID are absent. |
| `hami_vgpu_memory_used_bytes` | Runtime memory usage, with the same runtime identity. |

Use the reported capacity rather than reconstructing it from allocation ratios: dividing allocated bytes by an allocated fraction yields `0/0` on an idle GPU. Record `devicememoryscaling` and use a value of 1 when comparing this capacity with physical VRAM; a scaled value is not an independent physical-memory measurement. Current reservation series are Pod/device aggregates without a container index or Pod UID. The constant `container_index` label present in v2.10.0 was removed in [HAMi #2898](https://github.com/Project-HAMi/HAMi/pull/2898).

Scheduler filtering can succeed even when a Pod never starts. The capture requires successful `hami.io/bind-phase`, the actual physical UUID in `hami.io/vgpu-devices-allocated`, independently observed Kubernetes running episodes, and fresh runtime source timestamps. It corroborates identity through stable live Kubernetes UIDs and `kube_pod_info`. Missing, stale, ambiguous observations or Pod recreation fail the experiment. Series presence alone does not prove a billable lifetime.

This restricted live experiment does not establish a safe historical KSM join for production billing. Whether HAMi needs a UID metric remains an integration decision. Multi-container aggregation, init-container release, and restarts need separate semantics.

### Unlimited compute and runtime settings

Unset or zero `gpucores` means no compute limit and must never default to zero cost. The first milestone rejects it because its reservation fraction is unspecified.

HAMi v2.11.0 pins HAMi-core at `17212525d27ac156955ab940c5d51df33d9e0d09`. At this release-specific revision, [`do_init_device_sm_limits`](https://github.com/Project-HAMi/HAMi-core/blob/17212525d27ac156955ab940c5d51df33d9e0d09/src/multiprocess/multiprocess_memory_limit.c#L275-L291) maps a missing or zero base `CUDA_DEVICE_SM_LIMIT` to 100. [`init_utilization_watcher`](https://github.com/Project-HAMi/HAMi-core/blob/17212525d27ac156955ab940c5d51df33d9e0d09/src/multiprocess/multiprocess_utilization_watcher.c#L334-L357) includes an effective limit of 100 when deciding whether to start. Zero requested cores therefore do not imply absent utilization collection in this release. Other HAMi-core revisions require their own source check.

Preserve the deployed HAMi-core revision, `CUDA_DEVICE_SM_LIMIT`, and `GPU_CORE_UTILIZATION_POLICY` settings for later utilization experiments. Confirm collection with fresh runtime evidence. Zero utilization can indicate an idle workload and does not establish missing collection. Utilization billing and contention policies require independent validation.

## Reference cost policy

For a confirmed, sampled running interval:

```text
reserved_gpu_hours = core_percent / 100 * running_seconds / 3600
reserved_cost = reserved_gpu_hours * physical_gpu_hourly_price
```

The reference accumulates GPU-seconds before dividing by 3600 to avoid repeated fractional-hour rounding. Zero utilization still incurs a reservation cost. Memory fractions are diagnostics; the reference does not split the physical price equally between cores and memory.

```text
reserved_gpu_hours + idle_gpu_hours + unattributed_gpu_hours
  = physical_gpu_hours

reserved_cost + idle_cost + unattributed_cost
  = physical_gpu_hours * physical_gpu_hourly_price
```

A missing sample leaves its running reservation unattributed. It does not become idle or free. Incomplete intervals, excessive core reservations, and memory reservations exceeding direct capacity fail the experiment. HAMi configurations allowing memory overcommit are outside this milestone: physically bounded usage does not imply physically bounded reservations.

Independent component prices remain a possible policy, using `core_gpu_hours * core_hourly_price + memory_gpu_hours * memory_hourly_price`. It requires agreed rates, overcommit handling, and reconciliation semantics. The core-only fixture does not validate that policy or measured-usage attribution.

### Pricing and native OpenCost accounting

[`node_gpu_hourly_cost`](https://github.com/opencost/opencost/blob/2f1af7f0c26368b50bf981a25e9e5f38b800979f/pkg/costmodel/metrics.go#L168-L173) is the hourly price per physical GPU. The reference uses that quote directly; multiplying it by virtual capacity, a replica count, or a virtual-to-physical ratio would inflate the physical budget. Preserve the pricing source, currency, node capacity, GFD physical count, and replica labels. The operator must confirm that the rate represents the intended physical GPU price. Preserve OpenCost's native replica handling from [OpenCost #2862](https://github.com/opencost/opencost/pull/2862) rather than applying another price adjustment in the reference.

Inspect native inventory too. The reported T4 run counted 10 virtual GPU units as physical GPUs. Without replica metadata, OpenCost can interpret HAMi's virtual `nvidia.com/gpu` capacity as physical GPU count. Corrected Pod fractions alone would not establish correct asset and idle costs. The eventual allocation-source hook requires OpenCost maintainer agreement and must cover both requested and allocated GPU quantities before native hours/cost are computed. [Custom-cost plugin PR #69](https://github.com/opencost/opencost-plugins/pull/69) addresses adjacent GenAI/MIG records; custom costs do not automatically replace native GPU charges.

## Run the baseline reproduction

Use a Linux/amd64 GPU Kubernetes runner with a CUDA 12.1-compatible driver, NVIDIA container runtime support, Python 3.11 or newer, and enough RAM and disk for four PyTorch Pods. The operator installs the cluster components; the harness prepares workloads and collects evidence.

| Component          | Locked release            |
| ------------------ | ------------------------- |
| HAMi               | v2.11.0                   |
| OpenCost           | 1.121.3                   |
| Prometheus         | 3.2.1                     |
| kube-state-metrics | 2.15.0                    |
| PyTorch workload   | 2.5.1, CUDA 12.1, cuDNN 9 |

Use the immutable linux/amd64 manifests in the harness's `versions.json`. The capture checks running image IDs against the manifest or configuration digest. HAMi v2.11.0 exports the new metrics by default. OpenCost's standard Kubernetes metric inputs must be available. All queried Prometheus targets must be healthy and scraped every 15 seconds.

Set these literal values in the running OpenCost container:

```yaml
- name: PROMETHEUS_QUERY_RESOLUTION_SECONDS
  value: "60"
- name: KUBECOST_SCRAPE_INTERVAL
  value: "15s"
```

OpenCost 1.121.3 does not read a `resolution` URL override on `/allocation/compute`. Source resolution comes from process configuration and defaults to 300 seconds when unset. The capture checks 60-second process resolution separately from 15-second scrapes and waits forward to a resolution boundary after readiness and warm-up. Both window endpoints are aligned, and the duration must be a multiple of the query resolution and scrape interval. OpenCost must query the same Prometheus server used by the capture. Retain Service selectors or port-forward commands as connection evidence.

Check out the linked harness revision and run from its repository root. Set `NODE` and `GPU_UUID` to the real node and full physical GPU UUID. Replace the example `USD` with the actual pricing currency. The loop runs shared and whole profiles sequentially, stopping on any failure. Use fresh namespaces and output directories when repeating it.

```bash
set -euo pipefail
: "${NODE:?Set the GPU node name}"
: "${GPU_UUID:?Set the full physical GPU UUID}"
python3 -m unittest discover -s opencost-repro -p 'test_*.py' -v
for profile in shared whole; do
  output="opencost-repro/runs/${profile}"
  python3 opencost-repro/runner.py prepare \
    --namespace "hami-finops-${profile}" --node "${NODE}" --uuid "${GPU_UUID}" \
    --profile "${profile}" --out "${output}" --apply
  python3 opencost-repro/runner.py capture \
    --out "${output}" \
    --prom-url http://127.0.0.1:9090 --opencost-url http://127.0.0.1:9003 \
    --duration 3600 --currency USD --cleanup
  python3 opencost-repro/runner.py report --dataset "${output}/dataset.json"
done
```

Placement uses required node affinity and a physical UUID annotation. The rendered manifest does not set `spec.nodeName`; the capture checks the node assigned by scheduling. The node must expose exactly the targeted physical GPU through HAMi capacity metrics, with no other workload occupying it. CUDA readiness follows a successful GPU operation.

`--cleanup` deletes the verified Deployment with an API-server UID precondition and waits for its Pods to disappear. It leaves the namespace and ConfigMap. Inspect `cleanup-failure.json` on failure. Preserve failed outputs and use a new directory for retries. Source or version-lock changes require a newly prepared experiment.

## Results and implementation acceptance

The capture preserves Kubernetes snapshots, raw Prometheus results and source timestamps, hardware/driver evidence, code hashes, pricing inputs, workload logs, and the actual allocation API response for the exact RFC3339 window. Native allocation intervals must cover each confirmed running window. The report retains `gpuHours`, raw `gpuCost`, `gpuCostAdjustment`, and adjusted cost separately. The pinned wire format uses lowercase `gpuAllocation.gpuRequestAverage`.

The CPU suite contains 72 tests for accounting, identity, missing observations, duplicates, physical pricing, aligned query windows, API shape, and mocked capture failures. It validates the reference and collector without a GPU or OpenCost server. The T4 table above records the maintainer's native baseline. This revised collector has not been rerun on that GPU, and a corrected native OpenCost integration has not been demonstrated.

Return both capture directories and sanitized pricing/connection evidence. Investigate missing samples, invalid native windows, failed GPU workloads, or incomplete API results before drawing billing conclusions. The next steps are:

1. Obtain both raw T4 capture datasets and the operator's patch, and run the revised collector when fresh complete captures are needed.
2. Agree the opt-in allocation-source hook, physical inventory, and UID/lifetime semantics with OpenCost maintainers.
3. Implement and test binding/running windows, failed binds, restarts, missing data, duplicate scrapes, recreation, physical prices, replica normalization, and native asset/idle reconciliation.
4. Run the same profiles with the source disabled and enabled. Only those runs can establish a measured before/after integration result.

Use `--require-corrected` on the report after an integration exists and is validated. It checks native hours, raw cost, and adjusted cost against the reference. A baseline discrepancy is evidence to investigate, not proof of an implemented correction.
