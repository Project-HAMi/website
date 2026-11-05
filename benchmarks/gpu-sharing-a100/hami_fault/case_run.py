"""Fault-isolation matrix on idle GPUs, with an independent other-GPU canary."""
import argparse
import csv
import datetime
import json
import os
from pathlib import Path
import re
import signal
import subprocess as S
import time

IMAGE = "nvcr.io/nvidia/ai-dynamo/vllm-runtime:1.6.1@sha256:5899e7bdd3528ab09a17ec87e2abe1949f8a0386a0a49f3b24dbd52d8211dc5d"
ROLES = ["victim", "attacker", "canary"]
PIPE_BASE = Path("/tmp/mpsfault-20261104")


def pipe_dir(task):
    # Linux Unix-domain socket paths must stay below 108 bytes.
    return PIPE_BASE / task.name


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def save(path, value):
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(value, indent=2) + "\n")
    tmp.replace(path)


def command(*args, check=True, timeout=25, input=None):
    r = S.run(list(args), input=input, capture_output=True, text=True, timeout=timeout)
    if check and r.returncode:
        raise RuntimeError(f"Command {args}: {r.returncode}: {r.stdout[-2000:]} {r.stderr[-2000:]}")
    return r


def gpu_apps():
    return command("nvidia-smi", "--query-compute-apps=pid,gpu_uuid,process_name", "--format=csv,noheader").stdout.strip()


def read_events(path):
    if not path.exists():
        return []
    out = []
    for line in path.read_text().splitlines():
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return out


def wait_json(path, timeout=30):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            return json.loads(path.read_text())
        except (FileNotFoundError, json.JSONDecodeError):
            time.sleep(.05)
    raise TimeoutError(str(path))


def control(task, *args, check=True, timeout=12):
    return command("sudo", "-n", "env", "CUDA_MPS_PIPE_DIRECTORY=" + str(pipe_dir(task)), "CUDA_MPS_LOG_DIRECTORY=" + str(task / "mps-logs"),
                   "/usr/bin/nvidia-cuda-mps-control", "-p", "3", *args, check=check, timeout=timeout)


def start_mps(task, mode, gpus):
    config = task / "mps.toml"
    config.write_text('[features.memacct]\nenabled=true\naudit_log=true\n[features.context-share]\nenabled=true\ndefault_socket="off"\n[servers.shared]\n')
    (task / "mps-logs").mkdir()
    r = command("sudo", "-n", "env", "CUDA_MPS_PIPE_DIRECTORY=" + str(pipe_dir(task)), "CUDA_MPS_LOG_DIRECTORY=" + str(task / "mps-logs"),
                "CUDA_VISIBLE_DEVICES=" + ",".join(gpus), "/usr/bin/nvidia-cuda-mps-control", "-d", "-p", "3", "-m", "-a", str(config))
    save(task / "mps-start.json", {"utc": utc(), "protocol": 3, "multiuser": True, "mode": mode, "stdout": r.stdout, "stderr": r.stderr})
    # Configured servers start asynchronously. Creating a partition while Busy
    # only records it in the database, without a usable partition ID.
    deadline = time.monotonic() + 25
    while time.monotonic() < deadline:
        listed = control(task, "server", "list", "--format=csv").stdout
        rows = list(csv.DictReader(listed.splitlines()))
        if any(any(k.strip().lower() == "status" and v.strip().lower() == "ready" for k,v in row.items()) for row in rows):
            (task / "server-ready.csv").write_text(listed)
            break
        time.sleep(.15)
    else:
        raise RuntimeError("MPS server did not become Ready: " + listed)
    partitions = {}
    if mode == "static":
        for name, gpu, chunks in [("victim", gpus[0], 27), ("attacker", gpus[0], 27), ("canary", gpus[1], 54)]:
            r = control(task, "sm-partition", "create", name, "--server=shared", "--device=" + gpu, "--chunks=" + str(chunks))
            (task / ("partition-" + name + ".txt")).write_text(r.stdout + r.stderr)
            match = re.search(r"CUDA_MPS_SM_PARTITION=([^\s]+)", r.stdout)
            assert match, r.stdout
            partitions[name] = match.group(1)
        save(task / "partitions.json", partitions)
    return partitions


def mps_proof(task, pods, label):
    result = {}
    for name, args in [("features", ["feature", "describe", "--format=csv"]), ("servers", ["server", "list", "--format=csv"]),
                       ("namespaces", ["namespace", "list", "--server=shared", "--format=csv"]),
                       ("partitions", ["sm-partition", "list", "--server=shared", "--all", "--format=csv"]),
                       ("clients", ["client", "list", "--all", "--format=csv"])]:
        r = control(task, *args, check=False)
        result[name] = {"exit": r.returncode, "stdout": r.stdout, "stderr": r.stderr}
    matched = {}
    for line in result["clients"]["stdout"].splitlines():
        values = next(csv.reader([line]))
        if not values or not values[0].strip().isdigit():
            continue
        pid = int(values[0])
        try:
            status = Path(f"/proc/{pid}/status").read_text()
            cgroup = Path(f"/proc/{pid}/cgroup").read_text()
        except FileNotFoundError:
            continue
        for role, pod in pods.items():
            uid = pod["metadata"]["uid"]
            if uid in cgroup or uid.replace("-", "_") in cgroup:
                ns_pid = [int(x) for x in next(l for l in status.splitlines() if l.startswith("NSpid:")).split()[1:]]
                ready = json.loads((task / (role + ".ready.json")).read_text())
                assert ns_pid[-1] == ready["pid"], (role, ns_pid, ready)
                matched[role] = {"host_pid": pid, "pod_uid": uid, "namespace_pids": ns_pid, "client_csv": values}
    result["matched_roles"] = matched
    save(task / ("mps-proof-" + label + ".json"), result)
    return matched


def deploy(root, ns, gpus):
    code = (root / "agent.py").read_text()
    objects = [{"apiVersion": "v1", "kind": "Namespace", "metadata": {"name": ns, "labels": {"benchmark": "mps-fault-isolation"}}},
               {"apiVersion": "v1", "kind": "ConfigMap", "metadata": {"name": "fault-code", "namespace": ns}, "data": {"agent.py": code}}]
    for role in ROLES:
        gpu = gpus[1] if role == "canary" else gpus[0]
        objects.append({"apiVersion": "v1", "kind": "Pod", "metadata": {"name": role, "namespace": ns, "labels": {"benchmark": "mps-fault-isolation", "role": role}}, "spec": {
            "schedulerName": "default-scheduler", "runtimeClassName": "nvidia", "restartPolicy": "Never", "hostIPC": True, "terminationGracePeriodSeconds": 10,
            "securityContext": {"runAsUser": 1000, "runAsGroup": 1000},
            "containers": [{"name": "probe", "image": IMAGE, "imagePullPolicy": "IfNotPresent", "command": ["/bin/bash", "-lc", "sleep infinity"],
                "resources": {"requests": {"cpu": "250m", "memory": "128Mi"}, "limits": {"memory": "2Gi"}},
                "env": [{"name": "NVIDIA_VISIBLE_DEVICES", "value": "nvidia.com/gpu=" + gpu}],
                "volumeMounts": [{"name": "code", "mountPath": "/fault-code", "readOnly": True}, {"name": "work", "mountPath": str(root)}, {"name": "pipes", "mountPath": str(PIPE_BASE)}]}],
            "volumes": [{"name": "code", "configMap": {"name": "fault-code"}}, {"name": "work", "hostPath": {"path": str(root), "type": "Directory"}},
                        {"name": "pipes", "hostPath": {"path": str(PIPE_BASE), "type": "Directory"}}]}})
    manifest = root / "manifest.json"
    save(manifest, {"apiVersion": "v1", "kind": "List", "items": objects})
    command("kubectl", "apply", "-f", str(manifest))
    command("kubectl", "wait", "-n", ns, "--for=condition=Ready", "pods", "--all", "--timeout=180s", timeout=190)
    data = json.loads(command("kubectl", "get", "pods", "-n", ns, "-o", "json").stdout)
    save(root / "pods.json", data)
    return {p["metadata"]["name"]: p for p in data["items"]}


def kill_agent(ns, role, pid):
    return command("kubectl", "exec", "-n", ns, role, "--", "python3", "-c", f"import os,signal; os.kill({int(pid)},signal.SIGKILL)", check=False)


def do_case(root, ns, pods, gpus, mode, fault, repeat, pre=3, post=6):
    name = f"{mode}-{fault}-r{repeat:02d}"
    task = root / "cases" / name
    task.mkdir(mode=0o2775)
    os.chmod(task, 0o2775)
    started = time.time()
    assert not gpu_apps(), "Other GPU work is active; do not interrupt it"
    save(task / "case.json", {"mode": mode, "fault": fault, "repeat": repeat, "gpu_uuids": gpus, "pre_seconds": pre, "post_seconds": post, "utc": utc()})
    processes, outputs, ready, partitions = {}, {}, {}, {}
    result = None
    try:
        if mode in ("shared", "static"):
            partitions = start_mps(task, mode, gpus)
        for role in ROLES:
            gpu = gpus[1] if role == "canary" else gpus[0]
            pipe = str(pipe_dir(task) / "shared") if mode in ("shared", "static") else str(PIPE_BASE / "no-mps-daemon")
            env = ["CUDA_VISIBLE_DEVICES=" + gpu, "CUDA_MPS_PIPE_DIRECTORY=" + pipe, "CUDA_MPS_ACTIVE_THREAD_PERCENTAGE=100"]
            if role in partitions:
                env.append("CUDA_MPS_SM_PARTITION=" + partitions[role])
            args = ["kubectl", "exec", "-n", ns, role, "--", "env", *env, "python3", "-B", "-u", "/fault-code/agent.py", "--role", role, "--case", str(task), "--fault", fault]
            out = (task / (role + ".exec.log")).open("x")
            outputs[role] = out
            processes[role] = S.Popen(args, stdout=out, stderr=S.STDOUT)
        for role in ROLES:
            ready[role] = wait_json(task / (role + ".ready.json"), timeout=35)
            expected_sm = 54 if mode == "static" and role != "canary" else 108
            assert ready[role]["gpu_sm_count"] == expected_sm, (role, ready[role], expected_sm)
            assert ready[role]["uid"] == 1000
        save(task / "ready-all.json", ready)
        if mode == "hami":
            verify_hami_clients(task, pods, ready, "before")
        (task / "gpu-processes-before.txt").write_text(gpu_apps())
        matched = mps_proof(task, pods, "before") if mode in ("shared", "static") else {}
        if mode in ("shared", "static"):
            assert set(matched) == set(ROLES), matched
        time.sleep(pre)
        for role in ["victim", "canary"]:
            baseline = [e for e in read_events(task / (role + ".jsonl")) if e["event"] == "sample"]
            assert len(baseline) >= 25 and all(e["ok"] for e in baseline), (role, baseline[-2:])
        trigger = {"utc": utc(), "wall_ns": time.time_ns(), "mono_ns": time.monotonic_ns(), "fault": fault}
        save(task / "trigger.json", trigger)
        if fault in ("kill_busy", "terminate_busy"):
            busy = wait_json(task / "busy-launched.json", timeout=8)
            if fault == "kill_busy":
                r = kill_agent(ns, "attacker", ready["attacker"]["pid"])
            else:
                r = control(task, "client", "terminate", str(matched["attacker"]["host_pid"]), check=False)
            save(task / "host-injection.json", {"utc": utc(), "wall_ns": time.time_ns(), "returncode": r.returncode, "stdout": r.stdout, "stderr": r.stderr,
                                               "milliseconds_from_launch": (time.time_ns()-busy["wall_ns"])/1e6})
            assert r.returncode == 0, r.stderr
        elif fault == "server_stop":
            r = control(task, "server", "delete", "shared", "--force", check=False)
            save(task / "host-injection.json", {"utc": utc(), "wall_ns": time.time_ns(), "returncode": r.returncode, "stdout": r.stdout, "stderr": r.stderr})
            assert r.returncode == 0
        else:
            deadline = time.monotonic() + 10
            while time.monotonic() < deadline:
                if any(e["event"] == "injected" for e in read_events(task / "attacker.jsonl")):
                    break
                time.sleep(.05)
            else:
                raise RuntimeError("No confirmed fault injection: " + (task / "attacker.exec.log").read_text()[-1000:])
        time.sleep(post)
        if mode == "hami":
            verify_hami_clients(task, pods, ready, "after")
        save(task / "stop.json", {"utc": utc(), "wall_ns": time.time_ns()})
        if mode in ("shared", "static"):
            mps_proof(task, pods, "after")
        for role, proc in processes.items():
            try:
                rc = proc.wait(timeout=12)
            except S.TimeoutExpired:
                kill_agent(ns, role, ready[role]["pid"])
                rc = proc.wait(timeout=8)
            result = result or {}
            result[role] = {"exec_exit": rc}
        injected = [e for e in read_events(task / "attacker.jsonl") if e["event"] == "injected"]
        for role in ["victim", "canary"]:
            events = read_events(task / (role + ".jsonl"))
            samples = [e for e in events if e["event"] == "sample"]
            before = [e for e in samples if e["wall_ns"] < trigger["wall_ns"]]
            after = [e for e in samples if e["wall_ns"] >= trigger["wall_ns"]]
            failures = [e for e in after if not e["ok"]]
            result[role].update({"before_samples": len(before), "before_errors": sum(not e["ok"] for e in before),
                                 "after_samples": len(after), "after_errors": len(failures), "first_error": failures[0] if failures else None,
                                 "post_successful_samples": sum(e["ok"] for e in after),
                                 "max_sample_gap_ms": max((b["wall_ns"]-a["wall_ns"])/1e6 for a,b in zip(samples,samples[1:])) if len(samples)>1 else None,
                                 "agent_errors": [e for e in events if e["event"] == "agent_error"],
                                 "healthy_through_fault": bool(after) and not failures and result[role]["exec_exit"] == 0 and not any(e["event"]=="agent_error" for e in events)})
        result.update({"status": "complete", "name": name, "mode": mode, "fault": fault, "repeat": repeat, "injected_errors": injected, "utc": utc()})
        save(task / "result.json", result)
        print(json.dumps({"case": name, "same_gpu_healthy": result["victim"]["healthy_through_fault"], "other_gpu_healthy": result["canary"]["healthy_through_fault"],
                          "victim_error": result["victim"]["first_error"], "attacker_errors": [{"result": e["result"], "name": e["error_name"]} for e in injected]}, ensure_ascii=False), flush=True)
        return result
    finally:
        if not (task / "stop.json").exists():
            save(task / "stop.json", {"utc": utc(), "cleanup": True})
        for role, proc in processes.items():
            if proc.poll() is None:
                if role in ready:
                    kill_agent(ns, role, ready[role]["pid"])
                try:
                    proc.wait(timeout=8)
                except S.TimeoutExpired:
                    proc.kill()
                    proc.wait(timeout=5)
        for f in outputs.values():
            f.close()
        if mode in ("shared", "static"):
            r = control(task, "-q", check=False)
            save(task / "mps-stop.json", {"utc": utc(), "returncode": r.returncode, "stdout": r.stdout, "stderr": r.stderr})
        for _ in range(40):
            apps = gpu_apps()
            if not apps:
                break
            time.sleep(.2)
        else:
            raise RuntimeError("GPU contexts remain after own case cleanup: " + apps)
        logs = command("sudo", "-n", "journalctl", "-k", "--since", "@"+str(int(started)), "--no-pager", check=False)
        (task / "kernel-gpu-events.txt").write_text("\n".join(line for line in logs.stdout.splitlines() if any(s in line.lower() for s in ["nvrm", "xid", "nvidia"])) + "\n")
        command("sudo", "-n", "chown", "-R", f"{os.getuid()}:1000", str(task))
        scoped_pipe = pipe_dir(task)
        assert scoped_pipe.parent == PIPE_BASE
        if scoped_pipe.exists():
            command("sudo", "-n", "rm", "-r", "--", str(scoped_pipe))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--root", required=True)
    p.add_argument("--gpu0", required=True)
    p.add_argument("--gpu1", required=True)
    p.add_argument("--smoke", action="store_true")
    p.add_argument("--only-mode", choices=["native", "shared", "static"])
    a = p.parse_args()
    root = Path(a.root)
    ns = "mpsfault-20261104"
    gpus = [a.gpu0,a.gpu1]
    assert root.name == "mps-fault-isolation-20261104"
    assert not gpu_apps(), "Server must be idle before starting"
    PIPE_BASE.mkdir(exist_ok=True)
    (root / "cases").mkdir(exist_ok=True)
    os.chmod(root / "cases", 0o2775)
    command("sudo", "-n", "chown", f"{os.getuid()}:1000", str(root / "cases"))
    pods = deploy(root, ns, gpus)
    cases = [("native", "oom", 0)] if a.smoke else [(mode, fault, repeat) for mode in ([a.only_mode] if a.only_mode else ["native","shared","static"]) for fault in ["oom","illegal_address","trap","kill_busy"] for repeat in [1,2]]
    if not a.smoke:
        cases += [(mode, "terminate_busy", repeat) for mode in ([a.only_mode] if a.only_mode in ("shared","static") else ["shared","static"] if a.only_mode is None else []) for repeat in [1,2]]
    save(root / ("smoke-plan.json" if a.smoke else "plan.json"), {"id": root.name, "utc": utc(), "gpu_uuids": gpus, "driver": "615.71.10", "mps_binary": "CUDA 13.4 / protocol 3", "image": IMAGE,
            "client_uid": 1000, "mps_server_uid": 0, "multiuser": True, "mps_config_matches_fractioning_release": "v0.1.8 memacct/context-share/shared server; direct driver MPS without KAI or fractiond",
            "cases": cases, "controls": "GPU0 victim+attacker, GPU1 canary; all healthy probes use CUDA Graph; static partitions GPU0 54+54 SM, GPU1 108 SM",
            "scope": "Mechanism-level CUDA error containment, not vLLM end-to-end availability or complete Run:ai stack verification"})
    completed = []
    try:
        for mode,fault,repeat in cases:
            name=f"{mode}-{fault}-r{repeat:02d}"
            previous=root/"cases"/name/"result.json"
            if previous.exists():
                completed.append(json.loads(previous.read_text()))
                continue
            assert not previous.parent.exists(), "Preserve failed attempt before resuming: "+name
            save(root/"status.json", {"state":"running","case":name,"completed":len(completed),"planned":len(cases),"utc":utc()})
            completed.append(do_case(root,ns,pods,gpus,mode,fault,repeat))
        save(root/("smoke-results.json" if a.smoke else "results.json"),completed)
        save(root/"status.json", {"state":"complete","completed":len(completed),"planned":len(cases),"utc":utc()})
    except Exception as exc:
        save(root/"status.json", {"state":"failed","completed":len(completed),"error":str(exc),"utc":utc()})
        raise
    finally:
        command("kubectl","delete","namespace",ns,"--wait=true","--timeout=90s",check=False,timeout=100)
        save(root/"cleanup.json", {"utc":utc(),"gpu_compute_processes":gpu_apps(),"namespace":ns,"namespace_deleted":True})


if __name__ == "__main__":
    main()
