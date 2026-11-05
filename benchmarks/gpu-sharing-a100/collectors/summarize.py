#!/usr/bin/env python3
"""Validate AIPerf exports and compare equal per-GPU or per-model load."""

import argparse
import json
import math
from pathlib import Path
import statistics


def metric(data, name, stat="avg", *, missing=None):
    if name not in data and missing is not None:
        return missing
    block = data.get(name, {})
    value = block.get(stat)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"Missing or non-finite metric: {name}.{stat}")
    if value < 0:
        raise ValueError(f"Negative metric: {name}.{stat}")
    return float(value)


def latency_ms(data, name, stat):
    value = metric(data, name, stat)
    unit = data[name].get("unit")
    scales = {"ms": 1, "s": 1000, "seconds": 1000, "us": 0.001, "µs": 0.001, "ns": 0.000001}
    if unit not in scales:
        raise ValueError(f"Unsupported latency unit {unit!r} for {name}")
    return value * scales[unit]


def summarize(directory, plan, experiment, concurrencies):
    exit_file = directory / "sweep.exit"
    if exit_file.exists() and exit_file.read_text().strip() != "0":
        raise ValueError(f"{directory}: sweep did not exit successfully")
    expected_models = plan["models"][experiment]
    expected_workers = {f"worker-{i:02d}" for i in range(1, expected_models + 1)}
    actual_points = {p.name for p in directory.glob("c*") if p.is_dir()}
    if actual_points != {f"c{c}" for c in concurrencies}:
        raise ValueError(f"Incomplete/unexpected concurrency points: {sorted(actual_points)}")
    points = []
    for c in concurrencies:
        point = directory / f"c{c}"
        actual_workers = {p.name for p in point.glob("worker-*") if p.is_dir()}
        if actual_workers != expected_workers:
            raise ValueError(f"{point}: expected {expected_models} workers, found {len(actual_workers)}")
        exports = []
        expected_requests = max(40, 10 * c)
        for worker in sorted(expected_workers):
            path = point / worker / "profile_export_aiperf.json"
            data = json.loads(path.read_text())
            if data.get("was_cancelled") or data.get("error_summary"):
                raise ValueError(f"{path}: cancelled or contains errors")
            if metric(data, "error_request_count", missing=0) != 0:
                raise ValueError(f"{path}: failed requests")
            if metric(data, "request_count") != expected_requests:
                raise ValueError(f"{path}: expected {expected_requests} successful measured requests")
            version = data.get("aiperf_version")
            if version is not None and version.lstrip("v") != plan["versions"]["aiperf_version"]:
                raise ValueError(f"{path}: wrong AIPerf version {version}")
            if data.get("output_token_throughput", {}).get("unit") not in ["tokens/sec", "tokens/s"]:
                raise ValueError(f"{path}: unsupported output throughput unit")
            if metric(data, "output_token_throughput") <= 0:
                raise ValueError(f"{path}: zero throughput")
            metric(data, "input_sequence_length")
            metric(data, "output_sequence_length")
            if plan["versions"]["force_output_length"]:
                for stat in ["min", "max"]:
                    if metric(data, "output_sequence_length", stat) != plan["workload"]["output_tokens_target"]:
                        raise ValueError(f"{path}: measured output length differs from the fixed target")
            exports.append(data)

        row = {
            "concurrency_per_model": c,
            "requests_resident_per_gpu": c * (1 if experiment == "baseline" else 2),
            "models": expected_models,
            "successful_requests": expected_requests * expected_models,
            "node_output_tokens_per_second": sum(metric(d, "output_token_throughput") for d in exports),
            "input_tokens_mean": statistics.mean(metric(d, "input_sequence_length") for d in exports),
            "output_tokens_mean": statistics.mean(metric(d, "output_sequence_length") for d in exports),
        }
        row["output_tokens_per_second_per_gpu"] = row["node_output_tokens_per_second"] / plan["gpu_count"]
        for name, short in [("time_to_first_token", "ttft"), ("inter_token_latency", "itl")]:
            for percentile in ["p50", "p95", "p99"]:
                # This matches NVIDIA's mean-of-model-percentiles convention.
                row[f"{short}_{percentile}_mean_across_models_ms"] = statistics.mean(latency_ms(d, name, percentile) for d in exports)
        points.append(row)
    return {
        "experiment": experiment,
        "profile": plan["profile"],
        "gpu_count": plan["gpu_count"],
        "versions": plan["versions"],
        "fractions_forks": plan["fractions_forks"],
        "workload": plan["workload"],
        "gpu_memory_utilization": plan.get("gpu_memory_utilization"),
        "runtime_adaptations": plan.get("runtime_adaptations", []),
        "source_directory": str(directory.resolve()),
        "latency_aggregation": "Arithmetic mean of per-model percentiles; not pooled request percentiles",
        "throughput_aggregation": "Sum of independently measured per-model output throughput, as in NVIDIA's report",
        "points": points,
    }


def compare(baseline, shared):
    if baseline["experiment"] != "baseline":
        raise ValueError("A dedicated baseline is required")
    matched_load, matched_models = [], []
    base_points = {p["concurrency_per_model"]: p for p in baseline["points"]}
    for result in shared:
        if result["experiment"] not in ["hami", "fractions"]:
            raise ValueError("Comparison inputs must be hami or fractions")
        for key in ["profile", "gpu_count", "workload", "versions", "fractions_forks"]:
            if baseline[key] != result[key]:
                raise ValueError(f"Incompatible experiments: {key} differs")
        for point in result["points"]:
            c = point["concurrency_per_model"]
            same_load = base_points.get(2 * c)
            if same_load is not None:
                matched_load.append({
                    "experiment": result["experiment"],
                    "requests_resident_per_gpu": 2 * c,
                    "baseline_concurrency_per_model": 2 * c,
                    "shared_concurrency_per_model": c,
                    "baseline_output_tokens_per_second_per_gpu": same_load["output_tokens_per_second_per_gpu"],
                    "shared_output_tokens_per_second_per_gpu": point["output_tokens_per_second_per_gpu"],
                    "throughput_percent_of_baseline": 100 * point["output_tokens_per_second_per_gpu"] / same_load["output_tokens_per_second_per_gpu"],
                    "ttft_p50_mean_across_models_ms": point["ttft_p50_mean_across_models_ms"],
                    "itl_p50_mean_across_models_ms": point["itl_p50_mean_across_models_ms"],
                })
            same_model = base_points.get(c)
            if same_model is not None:
                ratio = same_model["node_output_tokens_per_second"] / point["node_output_tokens_per_second"]
                matched_models.append({
                    "experiment": result["experiment"],
                    "concurrency_per_model": c,
                    "dedicated_output_tokens_per_second_two_nodes_extrapolated": 2 * same_model["node_output_tokens_per_second"],
                    "shared_output_tokens_per_second_one_node": point["node_output_tokens_per_second"],
                    "shared_cost_per_output_token_percent_change": 100 * (ratio - 1),
                })
    return {
        "matched_requests_per_gpu": matched_load,
        "matched_concurrency_per_model": matched_models,
        "cost_assumption": "Same hourly node price; dedicated throughput for twice as many models is extrapolated linearly, not measured on two nodes",
        "interpretation": "Relative throughput/cost require a separate latency SLO check; hardware and driver inventory must also match",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    summary = sub.add_parser("summarize")
    summary.add_argument("directory", type=Path)
    summary.add_argument("--plan", required=True, type=Path)
    summary.add_argument("--experiment", choices=["baseline", "hami", "fractions"], required=True)
    summary.add_argument("--concurrencies", type=int, nargs="+")
    summary.add_argument("--output", required=True, type=Path)
    comparison = sub.add_parser("compare")
    comparison.add_argument("--baseline", required=True, type=Path)
    comparison.add_argument("--shared", nargs="+", required=True, type=Path)
    comparison.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    try:
        if args.command == "summarize":
            plan = json.loads(args.plan.read_text())
            concurrencies = args.concurrencies or plan["workload"]["concurrencies_per_model"]
            if len(set(concurrencies)) != len(concurrencies) or any(c <= 0 for c in concurrencies):
                raise ValueError("Concurrencies must be distinct positive integers")
            result = summarize(args.directory, plan, args.experiment, concurrencies)
        else:
            result = compare(json.loads(args.baseline.read_text()), [json.loads(p.read_text()) for p in args.shared])
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + "\n")
        print(f"Saved {args.output}")
    except (OSError, ValueError, KeyError) as exc:
        parser.exit(1, str(exc) + "\n")


if __name__ == "__main__":
    main()
