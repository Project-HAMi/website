#!/usr/bin/env python3
"""Recompute report metrics from complete AIPerf exports without running a GPU."""
import argparse
import csv
import datetime
import hashlib
import json
from pathlib import Path
import statistics


def points(root, total_concurrency=None, allow_partial=False):
    root = Path(root)
    fullstack = (root / "manifest.json").exists()
    plan = json.loads((root / ("manifest.json" if fullstack else "plan.json")).read_text())
    result = []
    for entry in plan["cases"]:
        if fullstack:
            name = entry
            backend, mode = name.split("-")
            if mode not in ["default", "eager"]:
                continue
            case_plan = json.loads((root / name / "experiment/benchmark-plan.json").read_text())
            arm = "baseline" if backend == "native" else backend
            case = {"name": name, "backend": backend, "mode": mode, "models": 2 if backend == "native" else 4,
                    "repeats": 1, "concurrencies": case_plan["workload"]["concurrencies_per_model"]}
            marker = root / name / "bootstrap/controller.exit"
            complete = marker.exists() and marker.read_text().strip() == "0"
            expected_limit = case_plan.get("hami_compute_limit", 0)
        else:
            case = entry
            name = case["name"]
            if case["mode"] not in ["graph", "default", "eager"]:
                continue
            complete = (root / name / "complete.json").exists()
            expected_limit = case.get("compute_limit", 0)
        if not complete:
            if allow_partial:
                continue
            raise ValueError(f"Case is not complete: {name}")
        if case["backend"] in ["hami", "hami-pair"]:
            proof = root / name / ("checks/hami/stack-before.json" if fullstack else "proof-before.json")
            data = json.loads(proof.read_text())
            workers = data["workers"] if fullstack else data
            if any(w["environment"].get("CUDA_DEVICE_SM_LIMIT") != str(expected_limit) for w in workers):
                raise ValueError(f"{name}: recorded compute limit does not match the declared profile")
        for c in case["concurrencies"]:
            resident = c * case["models"] // 2
            if resident not in [2, 4, 8, 16, 32] or (total_concurrency is not None and resident != total_concurrency):
                continue
            for repeat in range(1, case["repeats"] + 1):
                raw = root / name / "results"
                folder = raw / (f"release-{arm}-r{repeat:02d}" if fullstack else f"r{repeat:02d}") / f"c{c}"
                files = sorted(folder.glob("worker-*/profile_export_aiperf.json"))
                if len(files) != case["models"]:
                    raise ValueError(f"{folder}: expected {case['models']} metric exports, found {len(files)}")
                workers = [json.loads(p.read_text()) for p in files]
                for worker in workers:
                    if not worker["is_complete"] or worker["was_cancelled"] or worker["request_error_rate"]["avg"] != 0:
                        raise ValueError(f"Incomplete or failed AIPerf run in {folder}")
                    if worker["aiperf_version"] != "0.13.0":
                        raise ValueError("The recorded study used AIPerf 0.13.0")
                row = {"profile": "fullstack" if fullstack else plan.get("id", root.name), "case": name, "backend": case["backend"], "mode": case["mode"], "repeat": repeat,
                       "hami_compute_limit": expected_limit if case["backend"] in ["hami", "hami-pair"] else None,
                       "concurrency_per_instance": c, "total_concurrency_per_gpu": resident, "workers": len(workers),
                       "successful_requests": sum(int((w.get("completed_request_count") or w["request_count"])["avg"]) for w in workers),
                       "tps_per_gpu": sum(w["output_token_throughput"]["avg"] for w in workers) / 2,
                       "prefix_cache_read_pct": statistics.mean(w["overall_usage_prompt_cache_read_pct"]["avg"] for w in workers)}
                for short, field in [("ttft", "time_to_first_token"), ("tpot", "inter_token_latency"), ("e2e", "request_latency")]:
                    for q in [50, 99]:
                        row[f"{short}_p{q}_ms"] = statistics.mean(w[field][f"p{q}"] for w in workers)
                starts = [datetime.datetime.fromisoformat(w["start_time"]) for w in workers]
                ends = [datetime.datetime.fromisoformat(w["end_time"]) for w in workers]
                window = (max(ends) - min(starts)).total_seconds()
                row["common_wall_tps_per_gpu"] = sum(w["total_output_tokens"]["avg"] for w in workers) / window / 2
                row["all_workers_overlap_fraction"] = max(0, (min(ends) - max(starts)).total_seconds()) / window
                row["source_exports_sha256"] = ";".join(hashlib.sha256(p.read_bytes()).hexdigest() for p in files)
                result.append(row)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--total-concurrency", type=int, choices=[2, 4, 8, 16, 32])
    parser.add_argument("--allow-partial", action="store_true")
    args = parser.parse_args()
    rows = points(args.root, args.total_concurrency, args.allow_partial)
    if not rows:
        raise ValueError("No complete measurements found")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print(json.dumps({"points": len(rows), "successful_requests": sum(r["successful_requests"] for r in rows), "output": str(args.out)}))


if __name__ == "__main__":
    main()
