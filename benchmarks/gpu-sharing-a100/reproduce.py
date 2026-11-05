#!/usr/bin/env python3
"""Execute one prepared profile on the dedicated two-GPU node."""
import argparse
import csv
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


def run(*args):
    subprocess.run([str(x) for x in args], check=True)


def namespace_absent(name):
    result = subprocess.run(["kubectl", "get", "namespace", name, "--ignore-not-found", "-o", "name"],
                            check=True, text=True, capture_output=True)
    if result.stdout.strip():
        raise RuntimeError(f"Namespace {name} already exists; preserve and inspect the previous run")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--profile", required=True, choices=["fullstack", "controlled", "mps-controlled", "native-pair-fullstack", "fault", "hami-fault"])
    parser.add_argument("--case", action="append", help="A prepared performance case; repeat for multiple cases")
    args = parser.parse_args()
    root = args.root.resolve()
    suite = json.loads((root / "suite.json").read_text())
    if suite["suite"] != "hami-a100-sharing":
        raise ValueError("Not a prepared benchmark directory")
    config = suite["config"]
    actual = subprocess.check_output(["nvidia-smi", "--query-gpu=uuid", "--format=csv,noheader"], text=True).splitlines()
    if set(actual) != set(config["gpu_uuids"]):
        raise RuntimeError("The node GPUs differ from config.json")
    hardware = subprocess.check_output(["nvidia-smi", "--query-gpu=name,driver_version", "--format=csv,noheader"], text=True)
    for name, driver in csv.reader(hardware.splitlines()):
        if name.strip() != "NVIDIA A100-SXM4-40GB" or driver.strip() != "615.71.10":
            raise RuntimeError("This frozen study requires A100-SXM4-40GB and driver 615.71.10; adapt and label a different environment as a new study")
    nodes = json.loads(subprocess.check_output(["kubectl", "get", "nodes", "-o", "json"], text=True))["items"]
    if len(nodes) != 1 or nodes[0]["metadata"]["name"] != config["node_name"]:
        raise RuntimeError("This suite requires the configured single-node Kubernetes cluster")
    os.environ.update(AIPERF=config["aiperf_executable"], HF_HOME=config["hf_cache"])
    if args.profile == "fullstack":
        folder = root / "fullstack"
        choices = json.loads((folder / "manifest.json").read_text())["cases"]
        if not args.case:
            raise ValueError("Select --case for the sharing stack currently installed on the node")
        for case in args.case:
            if case not in choices:
                raise ValueError(f"Unknown case {case}; choose from {choices}")
            plan = json.loads((folder / case / "experiment/benchmark-plan.json").read_text())
            namespace_absent(plan["namespace"])
            run(sys.executable, folder / "run-case.py", "--root", folder, "--case", case)
    elif args.profile in ["controlled", "mps-controlled", "native-pair-fullstack"]:
        folder = root / args.profile
        plan = json.loads((folder / "plan.json").read_text())
        selected = [c for c in plan["cases"] if args.case is None or c["name"] in args.case]
        if not selected or (args.case and set(args.case) != {c["name"] for c in selected}):
            raise ValueError("Unknown case selection")
        for case in selected:
            if not (folder / case["name"] / "complete.json").exists():
                namespace_absent(case["namespace"])
        command = [sys.executable, folder / "run.py", "--root", folder]
        if args.case:
            command += ["--only", *args.case]
        run(*command)
    elif args.profile == "fault":
        if args.case:
            raise ValueError("--case applies to performance profiles")
        folder = root / "mps-fault-isolation-20261104"
        namespace_absent("mpsfault-20261104")
        run(sys.executable, folder / "run.py", "--root", folder, "--gpu0", config["gpu_uuids"][0], "--gpu1", config["gpu_uuids"][1])
        run(sys.executable, folder / "analyze.py", "--root", folder)
    else:
        if args.case:
            raise ValueError("--case applies to performance profiles")
        if suite["hami_core_limit"] != 0:
            raise ValueError("The recorded HAMi fault protocol uses compute limiting disabled; use a separate default preparation")
        folder = root / "hami-fault-isolation-20261104"
        previous = root / "mps-fault-isolation-20261104"
        if not (previous / "aggregate.json").exists():
            raise ValueError("Run and analyze the native/MPS fault profile first")
        reference = folder / "reference"
        reference.mkdir(exist_ok=True)
        for name in ["aggregate.json", "agent.py"]:
            shutil.copy2(previous / name, reference / name)
        plan_path = folder / "plan.json"
        plan = json.loads(plan_path.read_text())
        plan["base_aggregate_sha256"] = hashlib.sha256((reference / "aggregate.json").read_bytes()).hexdigest()
        plan_path.write_text(json.dumps(plan, indent=2) + "\n")
        namespace_absent("hamifault-20261104")
        run(sys.executable, folder / "run.py", "--root", folder, "--preflight-only")
        run(sys.executable, folder / "run.py", "--root", folder)
        run(sys.executable, folder / "analyze.py", "--root", folder)


if __name__ == "__main__":
    main()
