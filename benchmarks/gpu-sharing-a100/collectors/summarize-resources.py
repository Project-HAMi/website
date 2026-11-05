#!/usr/bin/env python3
"""Summarize telemetry only while all model load generators are measuring."""
import argparse
import csv
import datetime as dt
import json
from pathlib import Path
import re
import statistics


def number(value):
    return float(value.strip().split()[0])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("task_directory", type=Path)
    parser.add_argument("--arms", choices=["baseline", "hami", "fractions"], nargs="+", default=["baseline", "hami", "fractions"])
    parser.add_argument("--completed-only", action="store_true", help="Skip sweeps still running; failed sweeps are always rejected")
    args = parser.parse_args()
    task = args.task_directory
    plan = json.loads((task / "experiment/benchmark-plan.json").read_text())
    cpu = []
    for line in (task / "bootstrap/host-cpu-memory.log").read_text().splitlines():
        values = line.split()
        if len(values) != 20 or not values[0].isdigit():
            continue
        cpu.append((dt.datetime.fromisoformat(values[-2] + "T" + values[-1]), {"cpu_idle_percent": float(values[14]), "cpu_steal_percent": float(values[16]), "runnable_tasks": float(values[0]), "swap_used_kib": float(values[2])}))
    if cpu:
        cpu = cpu[1:]  # vmstat's first row is the since-boot average.
    rows = []
    for arm in args.arms:
        placement = json.loads((task / "checks" / arm / "placement-before.json").read_text())
        gpu_for_worker = {int(re.search(r"-(\d+)-worker-", item["pod"])[1]): item["uuid"] for item in placement}
        gpu = []
        with (task / "checks" / arm / "gpu-telemetry.csv").open() as stream:
            for record in csv.DictReader(stream, skipinitialspace=True):
                try:
                    timestamp = dt.datetime.strptime(record["timestamp"], "%Y/%m/%d %H:%M:%S.%f")
                    gpu.append((timestamp, {"utilization_percent": number(record["utilization.gpu [%]"]), "memory_used_mib": number(record["memory.used [MiB]"]), "power_watts": number(record["power.draw [W]"]), "temperature_c": number(record["temperature.gpu"]), "sm_clock_mhz": number(record["clocks.current.sm [MHz]"])}))
                except (ValueError, KeyError, TypeError):
                    raise ValueError(f"Invalid GPU telemetry in {arm}: {record}")
        for run in sorted((task / "results").glob(f"release-{arm}-r[0-9][0-9]")):
            marker = run / "sweep.exit"
            if not marker.exists() and args.completed_only:
                continue
            if not marker.exists() or marker.read_text().strip() != "0":
                raise ValueError(f"Sweep not successfully completed: {run}")
            for point in sorted(run.glob("c*"), key=lambda p: int(p.name[1:])):
                paths = sorted(point.glob("worker-*/profile_export_aiperf.json"))
                exports = [json.loads(path.read_text()) for path in paths]
                expected = plan["models"][arm]
                if len(exports) != expected:
                    raise ValueError(f"Incomplete exports: {point}")
                starts = [dt.datetime.fromisoformat(data["start_time"]) for data in exports]
                ends = [dt.datetime.fromisoformat(data["end_time"]) for data in exports]
                common_start, common_end = max(starts), min(ends)
                if common_end <= common_start:
                    raise ValueError(f"No concurrent measurement overlap: {point}")
                row = {"experiment": arm, "repeat": int(run.name[-2:]), "concurrency_per_model": int(point.name[1:]), "common_start_utc": common_start.isoformat(), "common_end_utc": common_end.isoformat(), "measurement_start_skew_seconds": (max(starts)-min(starts)).total_seconds(), "all_models_overlap_fraction_of_union": (common_end-common_start).total_seconds()/(max(ends)-min(starts)).total_seconds()}
                by_gpu = {}
                for path, start, end in zip(paths, starts, ends):
                    worker = int(path.parent.name.split("-")[-1])
                    by_gpu.setdefault(gpu_for_worker[worker], []).append((start, end))
                overlaps, skews = [], []
                for intervals in by_gpu.values():
                    gpu_starts, gpu_ends = zip(*intervals)
                    overlaps.append(max(0, (min(gpu_ends)-max(gpu_starts)).total_seconds())/(max(gpu_ends)-min(gpu_starts)).total_seconds())
                    skews.append((max(gpu_starts)-min(gpu_starts)).total_seconds())
                row["same_gpu_min_overlap_fraction_of_union"] = min(overlaps)
                row["same_gpu_max_start_skew_seconds"] = max(skews)
                for label, samples in [("host", cpu), ("gpu", gpu)]:
                    selected = [values for time, values in samples if common_start <= time <= common_end]
                    if not selected:
                        raise ValueError(f"No {label} telemetry during {point}")
                    row[label + "_samples"] = len(selected)
                    for metric in selected[0]:
                        values = [item[metric] for item in selected]
                        row[f"{label}_{metric}_mean"] = statistics.mean(values)
                        row[f"{label}_{metric}_min"] = min(values)
                        row[f"{label}_{metric}_max"] = max(values)
                rows.append(row)
    with (task / "results/resource-summary.csv").open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    (task / "results/resource-summary.json").write_text(json.dumps({"method": "Intersection of all per-model AIPerf measurement intervals; vmstat and GPU timestamps are UTC on this host", "points": rows}, indent=2) + "\n")
    print(f"Saved telemetry for {len(rows)} measured points")


if __name__ == "__main__":
    main()
