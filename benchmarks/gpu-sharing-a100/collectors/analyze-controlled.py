#!/usr/bin/env python3
"""Aggregate repeated trials without treating workers as independent deployments."""
import argparse
import hashlib
import json
from pathlib import Path
import statistics

p = argparse.ArgumentParser(description=__doc__)
p.add_argument("--root", type=Path, required=True)
a = p.parse_args()
root = a.root
plan = json.loads((root / "plan.json").read_text())
points = []
case_stats = []
for case in plan["cases"]:
    task = root / case["name"]
    if not (task / "complete.json").exists():
        continue
    proof = json.loads((task / "proof-before.json").read_text())
    for c in case["concurrencies"]:
        trials = []
        for repeat in range(1, case["repeats"] + 1):
            exports = list((task / "results" / f"r{repeat:02d}" / f"c{c}").glob("*/profile_export_aiperf.json"))
            assert len(exports) == case["models"]
            data = [json.loads(f.read_text()) for f in exports]
            point = {"case": case["name"], "backend": case["backend"], "mode": case["mode"], "repeat": repeat, "concurrency_per_model": c, "requests_resident_per_gpu": c * case["models"] // 2, "successful_requests": sum(int(d["request_count"]["avg"]) for d in data), "tps_per_gpu": sum(d["output_token_throughput"]["avg"] for d in data) / 2, "tps_per_model": statistics.mean(d["output_token_throughput"]["avg"] for d in data), "itl_p50_ms": statistics.mean(d["inter_token_latency"]["p50"] for d in data), "ttft_p50_ms": statistics.mean(d["time_to_first_token"]["p50"] for d in data), "prompt_cache_read_pct": statistics.mean(d["overall_usage_prompt_cache_read_pct"]["avg"] for d in data), "input_tokens_mean": statistics.mean(d["input_sequence_length"]["avg"] for d in data), "output_tokens_mean": statistics.mean(d["output_sequence_length"]["avg"] for d in data), "kv_cache_tokens": proof[0]["kv_cache_tokens"]}
            points.append(point)
            trials.append(point)
        summary = {"case": case["name"], "backend": case["backend"], "mode": case["mode"], "concurrency_per_model": c, "requests_resident_per_gpu": trials[0]["requests_resident_per_gpu"], "trials": len(trials), "successful_requests": sum(t["successful_requests"] for t in trials), "kv_cache_tokens": proof[0]["kv_cache_tokens"]}
        for k in ["tps_per_gpu", "tps_per_model", "itl_p50_ms", "ttft_p50_ms"]:
            values = [t[k] for t in trials]
            summary[k] = {"mean": statistics.mean(values), "sample_std": statistics.stdev(values), "min": min(values), "max": max(values), "values": values}
        case_stats.append(summary)
assert len({p["kv_cache_tokens"] for p in points}) <= 1, "KV pool capacities differ"
result = {"status": "complete" if len(case_stats) == sum(len(c["concurrencies"]) for c in plan["cases"]) else "partial", "plan": plan, "points": points, "summaries": case_stats, "successful_requests": sum(p["successful_requests"] for p in points), "raw_exports": sum(c["models"] * len(c["concurrencies"]) * c["repeats"] for c in plan["cases"] if (root/c["name"]/"complete.json").exists()), "statistics": "Sample std over three client trials. Cases each use one fresh deployment; not deployment-level confidence intervals."}
(root / "aggregate.json").write_text(json.dumps(result, indent=2) + "\n")
lines = ["# HAMi 2.10 / CUDA Graph controlled diagnosis", "", "Same runtime/model/GPU; prefix caching disabled; fixed 6 GiB KV per instance; max model length 4096; max sequences 32. No MPS. Three client trials per fresh deployment.", "", "| Case | c/model | Requests/GPU | tok/s/GPU mean ± sample SD | ITL p50 ms | TTFT p50 ms |", "|---|---:|---:|---:|---:|---:|"]
for s in case_stats:
    lines.append(f"| {s['case']} | {s['concurrency_per_model']} | {s['requests_resident_per_gpu']} | {s['tps_per_gpu']['mean']:.2f} ± {s['tps_per_gpu']['sample_std']:.2f} | {s['itl_p50_ms']['mean']:.2f} | {s['ttft_p50_ms']['mean']:.2f} |")
lines += ["", "Native pair: explicit CDI GPU selection, no GPU plugin allocation, no HAMi library. HAMi pair: native HAMi 2.10 scheduler/device-plugin, 20 GiB memory quota per instance, compute limiting disabled. Native single: one full GPU per instance. Actual library maps, GPU UUIDs, resolved compilation/Graph/prefix settings, restarts, and cache counters verified before/after.", "", f"Status: {result['status']}; {result['raw_exports']} raw exports; {result['successful_requests']} measured requests."]
(root / "README.md").write_text("\n".join(lines) + "\n")
checksums = []
for path in sorted(root.rglob("*")):
    if path.is_file() and path.name not in ["SHA256SUMS", "controller.lock"]:
        checksums.append(hashlib.sha256(path.read_bytes()).hexdigest() + "  " + str(path.relative_to(root)))
(root / "SHA256SUMS").write_text("\n".join(checksums) + "\n")
print(json.dumps({"status": result["status"], "points": len(points), "summaries": len(case_stats), "requests": result["successful_requests"]}))
