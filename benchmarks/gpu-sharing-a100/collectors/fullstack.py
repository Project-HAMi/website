#!/usr/bin/env python3
"""Run one fresh configuration; install/switch stacks only between cases."""
import argparse
import datetime
import json
import os
from pathlib import Path
import subprocess
import time

p = argparse.ArgumentParser(description=__doc__)
p.add_argument("--root", type=Path, required=True)
p.add_argument("--case", required=True)
a = p.parse_args()
root = a.root
manifest = json.loads((root / "manifest.json").read_text())
assert a.case in manifest["cases"]
task = root / a.case
backend, mode = a.case.split("-")
arm = "baseline" if backend == "native" else backend
plan = json.loads((task / "experiment/benchmark-plan.json").read_text())
# KUBECONFIG and the current kubectl context are inherited.
os.environ["CONCURRENCIES"] = " ".join(map(str, plan["workload"]["concurrencies_per_model"]))
marker = task / "bootstrap/controller.exit"
assert not marker.exists(), "Preserve the previous attempt"
# Profiles can run independently on an already configured, idle node.


def run(*cmd, **options):
    return subprocess.run(cmd, check=True, text=True, **options)


def state(stage):
    done = [c for c in manifest["cases"] if (f := root/c/"bootstrap/controller.exit").exists() and f.read_text().strip() == "0"]
    (root / "state.json").write_text(json.dumps({"utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "stage": stage, "active_case": a.case, "completed_cases": done}, indent=2) + "\n")
    print(stage, a.case, flush=True)


def idle():
    text = subprocess.check_output(["nvidia-smi", "--query-compute-apps=pid,process_name", "--format=csv,noheader"], text=True)
    rows = [s for s in text.splitlines() if s.strip() and not (backend == "fractions" and "nvidia-cuda-mps" in s)]
    assert not rows, rows
    pods = json.loads(subprocess.check_output(["kubectl", "get", "pods", "-A", "-l", "experiment.nvidia.com/dgd", "-o", "json"], text=True))["items"]
    assert not pods, "Another model deployment exists"


sampler = None
try:
    idle()
    state("checking configuration")
    hw = subprocess.check_output(["nvidia-smi", "--query-gpu=name,uuid,memory.total,driver_version", "--format=csv"], text=True)
    assert {s.split(",")[1].strip() for s in hw.splitlines()[1:]} == set(manifest["gpu_uuids"])
    (task / "checks/hardware-before.txt").write_text(hw)
    labels = {"kai-resource-isolator.io/webhook": "ignore", "hami.io/webhook": "ignore" if backend != "hami" else "allow", "benchmark.hami.io/managed": "true" if backend == "hami" else "false"}
    run("kubectl", "apply", "-f", "-", input=json.dumps({"apiVersion": "v1", "kind": "Namespace", "metadata": {"name": plan["namespace"], "labels": labels}}))
    with (task / "bootstrap/host-cpu-memory.log").open("w") as output:
        sampler = subprocess.Popen(["vmstat", "-t", "1"], stdout=output, stderr=subprocess.STDOUT)
    state("running")
    try:
        with (task / "bootstrap/run.log").open("w") as output:
            run("python3", str(task / "run-benchmark-arm.py"), arm, "--task-dir", str(task), "--repeats", "1", stdout=output, stderr=subprocess.STDOUT)
    finally:
        arm_dir = {"baseline": "baseline", "hami": "hami", "fractions": "kai-gpu-fractions"}[arm]
        path = task / "experiment" / arm_dir / "active-manifest.yaml"
        if path.exists():
            run("kubectl", "delete", "-f", str(path), "--ignore-not-found=true", "--wait=true", "--timeout=180s")
        for _ in range(90):
            pods = json.loads(subprocess.check_output(["kubectl", "get", "pods", "-n", plan["namespace"], "-l", "experiment.nvidia.com/dgd", "-o", "json"], text=True))["items"]
            if not pods:
                break
            time.sleep(2)
        else:
            raise RuntimeError("Model cleanup timed out")
    sampler.terminate()
    sampler.wait(timeout=10)
    sampler = None
    for _ in range(30):
        try:
            idle()
            break
        except AssertionError:
            time.sleep(1)
    else:
        raise RuntimeError("GPU model process remains")
    run("python3", str(root / "summarize-resources.py"), str(task), "--arms", arm)
    marker.write_text("0\n")
    state("configuration complete")
except Exception:
    marker.write_text("1\n")
    state("failed; inspect saved logs")
    raise
finally:
    if sampler is not None and sampler.poll() is None:
        sampler.terminate()
        sampler.wait(timeout=10)
