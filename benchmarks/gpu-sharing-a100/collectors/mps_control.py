"""Scoped MPS lifecycle and EngineCore-to-server connection proof."""
import datetime
import json
import os
from pathlib import Path
import subprocess
import time


def save(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


def control(case, text=None, daemon=False):
    cmd = ["sudo", "-n", "-u", "#1000", "env", "CUDA_MPS_PIPE_DIRECTORY=" + case["mps_pipe"], "CUDA_MPS_LOG_DIRECTORY=" + case["mps_logs"], "CUDA_VISIBLE_DEVICES=" + ",".join(case["gpu_uuids"]), "/usr/bin/nvidia-cuda-mps-control"]
    if daemon:
        cmd.append("-d")
    r = subprocess.run(cmd, input=None if text is None else text + "\n", text=True, capture_output=True, timeout=30)
    if r.returncode:
        raise RuntimeError(f"MPS control failed: {r.returncode}: {r.stdout}: {r.stderr}")
    return r.stdout


def start(root, case):
    task = root / case["name"]
    paths = [Path(case["mps_pipe"]), Path(case["mps_logs"])]
    for path in paths:
        assert str(path).startswith("/tmp/mpsdiag-20261103-")
        assert not path.exists(), f"Preserve existing MPS state: {path}"
        path.mkdir(mode=0o755)
        subprocess.run(["sudo", "-n", "chown", "1000:1000", str(path)], check=True)
    save(task / "mps-start.json", {"utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "host_uid": os.getuid(), "server_uid": 1000, "pipe": case["mps_pipe"], "logs": case["mps_logs"], "protocol": "legacy v2 management interface", "thread_percentage": "default 100%; no static SM partition", "command": "nvidia-cuda-mps-control -d"})
    control(case, daemon=True)
    save(task / "mps-control-help.json", {"help": control(case, "help")})


def verify(root, case, workers, label):
    last = None
    for attempt in range(10):
        server_text = control(case, "get_server_list")
        servers = [int(s) for s in server_text.splitlines() if s.strip().isdigit()]
        assert servers, "No MPS server; direct CUDA fallback is not an acceptable result"
        rows = []
        matched = set()
        details = []
        for server in servers:
            status = (Path("/proc") / str(server) / "status").read_text()
            assert next(s for s in status.splitlines() if s.startswith("Uid:")).split()[1] == "1000"
            clients = control(case, f"get_client_list {server}")
            details.append({"server_pid": server, "clients_raw": clients, "thread_percentage_raw": control(case, f"get_active_thread_percentage {server}")})
            for line in clients.splitlines():
                if not line.strip().isdigit():
                    continue
                pid = int(line.strip())
                proc = Path("/proc") / str(pid)
                try:
                    cgroup = (proc / "cgroup").read_text()
                    status = (proc / "status").read_text()
                    comm = (proc / "comm").read_text().strip()
                except FileNotFoundError:
                    continue
                nspid = [int(v) for v in next(s for s in status.splitlines() if s.startswith("NSpid:")).split()[1:]]
                pods = [w for w in workers if w["uid"] in cgroup or w["uid"].replace("-", "_") in cgroup]
                engines = [w["pod"] for w in pods if any(e["pid"] == nspid[-1] for e in w["engines"]) and "EngineCor" in comm]
                matched.update(engines)
                rows.append({"pid": pid, "server_pid": server, "namespace_pids": nspid, "comm": comm, "cgroup": cgroup, "pods": [w["pod"] for w in pods], "matched_engine_pods": engines})
        expected = {w["pod"] for w in workers}
        last = {"server_pids": servers, "server_details": details, "ps": control(case, "ps"), "clients": rows, "expected_workers": sorted(expected), "matched_engine_workers": sorted(matched), "all_engine_workers_connected": matched == expected}
        if matched == expected:
            save(root / case["name"] / f"mps-{label}.json", last)
            print(f"MPS actual EngineCore clients verified: {len(matched)}/{len(expected)} ({label})", flush=True)
            return
        time.sleep(2)
    save(root / case["name"] / f"mps-{label}.json", last)
    raise RuntimeError("Not every EngineCore is connected to the intended MPS server")


def stop(root, case):
    task = root / case["name"]
    if not (task / "mps-start.json").exists():
        return
    output = control(case, "quit")
    for _ in range(40):
        apps = subprocess.check_output(["nvidia-smi", "--query-compute-apps=pid,process_name", "--format=csv,noheader"], text=True).strip()
        if not apps:
            break
        time.sleep(1)
    else:
        raise RuntimeError("GPU processes remain after stopping the scoped MPS server: " + apps)
    logs = Path(case["mps_logs"])
    target = task / "mps-logs"
    assert not target.exists()
    subprocess.run(["sudo", "-n", "cp", "-a", str(logs), str(target)], check=True)
    subprocess.run(["sudo", "-n", "chown", "-R", f"{os.getuid()}:{os.getgid()}", str(target)], check=True)
    for path in [case["mps_pipe"], case["mps_logs"]]:
        assert path.startswith("/tmp/mpsdiag-20261103-") and Path(path).stat().st_uid == 1000
    subprocess.run(["sudo", "-n", "-u", "#1000", "rm", "-r", "--", case["mps_pipe"], case["mps_logs"]], check=True)
    save(task / "mps-stop.json", {"utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "quit_output": output, "gpu_compute_processes": 0, "temporary_pipe_and_logs_removed": True})
