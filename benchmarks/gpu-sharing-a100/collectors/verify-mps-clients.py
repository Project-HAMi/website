#!/usr/bin/env python3
"""Match release MPS shared-server clients to every benchmark worker Pod UID."""
import argparse
import csv
import json
import os
from pathlib import Path
import subprocess


def kube(*args):
    return json.loads(subprocess.check_output(["kubectl", *args, "-o", "json"], text=True))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--label", choices=["before", "after"], default="before")
    parser.add_argument("--task-dir", type=Path, default=Path.cwd())
    args = parser.parse_args()
    # KUBECONFIG and the current kubectl context are inherited.
    task = args.task_dir
    plan = json.loads((task / "experiment/benchmark-plan.json").read_text())
    expected = plan["models"]["fractions"]
    workers = kube("get", "pods", "-n", plan["namespace"], "-l", "experiment.nvidia.com/role=worker")["items"]
    daemons = [p for p in kube("get", "pods", "-n", "gpu-fractioning")["items"] if any(c["name"] == "mpsd" for c in p["spec"]["containers"])]
    if len(daemons) != 1:
        raise RuntimeError(f"Expected one MPS daemon on this single-node benchmark, found {len(daemons)}")
    daemon = daemons[0]["metadata"]["name"]

    def execute(*command):
        return subprocess.check_output(["kubectl", "exec", "-n", "gpu-fractioning", daemon, "-c", "mpsd", "--", *command], text=True)

    evidence = {"mpsd_pod": daemon, "workers": [{"pod": p["metadata"]["name"], "uid": p["metadata"]["uid"]} for p in workers]}
    for key, command in {
        "features": ["feature", "describe", "--format=csv"],
        "servers": ["server", "list", "--format=csv"],
        "namespaces": ["namespace", "list", "--server=shared", "--format=csv"],
        "devices": ["device", "list", "--server=shared", "--format=csv"],
        "clients": ["client", "list", "--all", "--format=csv"],
    }.items():
        evidence[key + "_csv"] = execute("nvidia-cuda-mps-control", "-p", "3", *command)
    evidence["shared_clients"] = []
    matched = set()
    for row in csv.reader(evidence["clients_csv"].splitlines(), skipinitialspace=True):
        if len(row) < 5 or not row[0].strip().isdigit() or row[1].strip() != "shared":
            continue
        pid = row[0].strip()
        cgroup = execute("cat", f"/proc/{pid}/cgroup")
        pods = [p["metadata"]["name"] for p in workers if p["metadata"]["uid"] in cgroup or p["metadata"]["uid"].replace("-", "_") in cgroup]
        matched.update(pods)
        evidence["shared_clients"].append({"pid": int(pid), "csv_row": row, "cgroup": cgroup, "matched_pods": pods})
    evidence["all_workers_connected_to_shared_server"] = matched == {p["metadata"]["name"] for p in workers} and len(workers) == expected
    output = task / "checks/fractions" / f"mps-{args.label}.json"
    output.write_text(json.dumps(evidence, indent=2) + "\n")
    if not evidence["all_workers_connected_to_shared_server"]:
        raise RuntimeError(f"MPS clients did not match all {expected} workers: {output}")
    print(f"MPS shared-server clients verified for all {len(workers)} workers", flush=True)


if __name__ == "__main__":
    main()
