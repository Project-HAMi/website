#!/usr/bin/env python3
"""Run only this diagnosis's resources; preserve raw exports and actual runtime proof."""
import argparse
from collections import Counter
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.request


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def save(p, value):
    p.write_text(json.dumps(value, indent=2) + "\n")


def command(*args, **kwargs):
    return subprocess.run(args, check=True, text=True, **kwargs)


def kube(*args):
    return json.loads(subprocess.check_output(["kubectl", *args, "-o", "json"], text=True))


WORKER_PROOF = r'''
import hashlib,importlib.metadata as m,json,os
from pathlib import Path
import torch
engines=[]
for p in Path('/proc').iterdir():
 if not p.name.isdigit():continue
 try:
  if 'EngineCor' not in (p/'comm').read_text():continue
  libs=sorted({s.split()[-1] for s in (p/'maps').read_text().splitlines() if 'libvgpu' in s or 'libhami' in s})
  engines.append({'pid':int(p.name),'hami_libraries':{s:hashlib.sha256(Path(s).read_bytes()).hexdigest() for s in libs}})
 except FileNotFoundError:continue
assert engines
props=torch.cuda.get_device_properties(0)
print(json.dumps({'engines':engines,'device_count':torch.cuda.device_count(),'gpu_uuid':'GPU-'+str(props.uuid),'cuda_free_total':torch.cuda.mem_get_info(),'sm_count':props.multi_processor_count,'environment':{k:v for k,v in os.environ.items() if k.startswith(('CUDA_MPS','CUDA_DEVICE','NVIDIA_VISIBLE')) or k=='LD_PRELOAD'},'versions':{n:m.version(n) for n in ['vllm','torch','ai-dynamo']},'cpu_stat':Path('/sys/fs/cgroup/cpu.stat').read_text(),'cpu_max':Path('/sys/fs/cgroup/cpu.max').read_text()}))
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--only", nargs="*")
    args = parser.parse_args()
    root = args.root.resolve()
    plan = json.loads((root / "plan.json").read_text())
    assert hashlib.sha256((root / "run-sweep.sh").read_bytes()).hexdigest() == plan["client_script_sha256"]
    # KUBECONFIG and the current kubectl context are inherited.
    cases = [c for c in plan["cases"] if args.only is None or c["name"] in args.only]
    assert cases
    lock_path = root / "controller.lock"
    import fcntl
    lock = lock_path.open("a")
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    save(root / "controller.json", {"pid": os.getpid(), "started_utc": now(), "cases": [c["name"] for c in cases]})

    def idle():
        rows = subprocess.check_output(["nvidia-smi", "--query-compute-apps=pid,process_name", "--format=csv,noheader"], text=True).strip()
        assert not rows, "GPU is occupied: " + rows
        pods = kube("get", "pods", "-A", "-l", "experiment.nvidia.com/dgd")["items"]
        assert not pods, "Another model deployment is active"

    def state(stage, case=None, **more):
        save(root / "state.json", {"utc": now(), "stage": stage, "case": case, **more})
        print(now(), stage, case or "", more, flush=True)

    try:
        idle()
        hardware = subprocess.check_output(["nvidia-smi", "--query-gpu=uuid,name,driver_version,memory.total", "--format=csv"], text=True)
        assert set(re.findall(r"GPU-[a-f0-9-]+", hardware)) == set(plan["gpu_uuids"])
        (root / "hardware.txt").write_text(hardware)
        save(root / "platform-pods.json", kube("get", "pods", "-A")["items"])
        for case in cases:
            task = root / case["name"]
            if (task / "complete.json").exists():
                state("already complete", case["name"])
                continue
            assert not (task / "started.json").exists(), "Previous attempt exists; preserve it and inspect"
            idle()
            save(task / "started.json", {"utc": now()})
            ns = case["namespace"]
            hami = case["backend"] == "hami-pair"
            labels = {"benchmark.graphdiag/id": plan["id"], "benchmark.hami.io/managed": "true" if hami else "false", "hami.io/webhook": "allow" if hami else "ignore", "kai-resource-isolator.io/webhook": "ignore"}
            command("kubectl", "create", "-f", "-", input=json.dumps({"apiVersion": "v1", "kind": "Namespace", "metadata": {"name": ns, "labels": labels}}))
            monitor = vmstat = None
            try:
                command("kubectl", "apply", "-f", str(task / "manifest.json"))
                state("waiting for engines", case["name"])
                deadline = time.monotonic() + 1500
                last = None
                while time.monotonic() < deadline:
                    pods = kube("get", "pods", "-n", ns)["items"]
                    ready = [p for p in pods if any(c["type"] == "Ready" and c["status"] == "True" for c in p.get("status", {}).get("conditions", []))]
                    counts = (len(ready), len(pods))
                    if counts != last:
                        state("engine startup", case["name"], ready=counts[0], total=counts[1])
                        last = counts
                    bad = [p["metadata"]["name"] for p in pods if p["status"].get("phase") == "Failed" or any(c.get("restartCount", 0) > 0 for c in p["status"].get("containerStatuses", []))]
                    assert not bad, "Engine startup failed: " + str(bad)
                    if len(ready) == len(pods) == case["models"] * 2:
                        break
                    time.sleep(5)
                else:
                    raise RuntimeError("Timed out waiting for engines")
                endpoints = []
                for i in range(1, case["models"] + 1):
                    svc = kube("get", "svc", f"qwen3-4b-{i:02d}-frontend", "-n", ns)
                    url = "http://" + svc["spec"]["clusterIP"] + ":8000"
                    for attempt in range(90):
                        try:
                            with urllib.request.urlopen(url + "/v1/models", timeout=8) as response:
                                models = json.load(response)
                            assert any(m["id"] == "Qwen/Qwen3-4B" for m in models["data"])
                            break
                        except Exception:
                            time.sleep(3)
                    else:
                        raise RuntimeError("Model registration failed: " + url)
                    endpoints.append(url)
                save(task / "endpoints.json", endpoints)

                def snapshot(label):
                    pods = kube("get", "pods", "-n", ns)["items"]
                    save(task / f"pods-{label}.json", pods)
                    workers = [p for p in pods if p["metadata"].get("labels", {}).get("experiment.nvidia.com/role") == "worker"]
                    assert len(workers) == case["models"]
                    proof = []
                    for pod in workers:
                        name = pod["metadata"]["name"]
                        output = subprocess.check_output(["kubectl", "exec", "-n", ns, name, "--", "python3", "-c", WORKER_PROOF], text=True)
                        d = json.loads([s for s in output.splitlines() if s.startswith("{")][-1])
                        d.update({"pod": name, "uid": pod["metadata"]["uid"], "scheduler": pod["spec"]["schedulerName"]})
                        assert d["device_count"] == 1
                        assert d["sm_count"] == 108 or (case.get("compute_limit") == 50 and 0 < d["sm_count"] <= 108)
                        assert d["versions"]["vllm"] == plan["vllm"]
                        assert d["scheduler"] == ("hami-scheduler" if hami else "default-scheduler")
                        hashes = [v for e in d["engines"] for v in e["hami_libraries"].values()]
                        if hami:
                            assert hashes and set(hashes) == {plan["library_sha256"]}
                            assert d["cuda_free_total"][1] == 20 * 1024**3
                            assert d["environment"].get("CUDA_DEVICE_SM_LIMIT") == str(case.get("compute_limit", 0))
                        else:
                            assert not hashes
                            assert d["cuda_free_total"][1] > 38 * 1024**3
                        assert not any(k.startswith("CUDA_MPS") for k in d["environment"])
                        log = subprocess.check_output(["kubectl", "logs", "-n", ns, name], text=True)
                        (task / f"{name}-{label}.log").write_text(log)
                        cfg = next(s for s in log.splitlines() if "Initializing a V1 LLM engine" in s)
                        assert "enable_prefix_caching=False" in cfg
                        assert f"enforce_eager={case['mode'] == 'eager'}" in cfg
                        assert ("CompilationMode.NONE" in cfg) == (case["mode"] == "eager")
                        assert ("CUDAGraphMode.NONE" in cfg) == (case["mode"] != "graph")
                        assert bool(log.count("Graph capturing finished")) == (case["mode"] == "graph")
                        kv = re.findall(r"GPU KV cache size: ([\d,]+) tokens", log)
                        assert kv
                        d["kv_cache_tokens"] = int(kv[-1].replace(",", ""))
                        d["engine_config"] = cfg
                        d["graph_capture_count"] = log.count("Graph capturing finished")
                        assert "preempt" not in log.lower()
                        proof.append(d)
                    placement = Counter(p["gpu_uuid"] for p in proof)
                    assert set(placement) == set(plan["gpu_uuids"])
                    assert set(placement.values()) == {1 if case["backend"] == "native-single" else 2}
                    assert len({p["kv_cache_tokens"] for p in proof}) == 1
                    save(task / f"proof-{label}.json", proof)
                    return {p["metadata"]["uid"]: [c.get("restartCount", 0) for c in p["status"].get("containerStatuses", [])] for p in pods}

                before = snapshot("before")
                with (task / "gpu-telemetry.csv").open("w") as gpu_out, (task / "host-vmstat.txt").open("w") as cpu_out:
                    monitor = subprocess.Popen(["nvidia-smi", "--query-gpu=timestamp,index,uuid,utilization.gpu,utilization.memory,memory.used,power.draw,temperature.gpu,clocks.sm", "--format=csv", "-l", "1"], stdout=gpu_out, stderr=subprocess.STDOUT)
                    vmstat = subprocess.Popen(["vmstat", "-t", "1"], stdout=cpu_out, stderr=subprocess.STDOUT)
                    for trial in range(1, case["repeats"] + 1):
                        state("measuring", case["name"], trial=trial, trials=case["repeats"])
                        env = dict(os.environ, AIPERF=os.environ.get("AIPERF", "aiperf"), HF_HOME=os.environ.get("HF_HOME", "/opt/hf-cache"), HF_HUB_OFFLINE="1", ENDPOINT_MODE="clusterip", NAMESPACE=ns, NUM_MODELS=str(case["models"]), CONCURRENCIES=" ".join(map(str, case["concurrencies"])), RESULTS_DIR=str(task / "results"))
                        with (task / f"trial-{trial:02d}.log").open("w") as out:
                            command("bash", str(root / "run-sweep.sh"), f"r{trial:02d}", env=env, stdout=out, stderr=subprocess.STDOUT)
                        exports = list((task / "results" / f"r{trial:02d}").glob("c*/worker-*/profile_export_aiperf.json"))
                        assert len(exports) == case["models"] * len(case["concurrencies"])
                        for f in exports:
                            d = json.loads(f.read_text())
                            c = int(f.parent.parent.name[1:])
                            assert d["is_complete"] and not d["was_cancelled"]
                            assert d["request_count"]["avg"] == max(40, 10 * c)
                            assert d.get("request_error_rate", {}).get("avg", 0) == 0
                            assert d["input_sequence_length"]["avg"] == 2048
                            assert 250 <= d["output_sequence_length"]["avg"] <= 257
                            assert d["overall_usage_prompt_cache_read_pct"]["avg"] == 0
                    after = snapshot("after")
                    assert before == after
                save(task / "complete.json", {"utc": now(), "trials": case["repeats"], "concurrencies": case["concurrencies"], "prefix_cache_read_pct": 0, "zero_restarts": True})
                state("case complete", case["name"])
            finally:
                for process in [monitor, vmstat]:
                    if process is not None and process.poll() is None:
                        process.terminate()
                        process.wait(timeout=15)
                try:
                    save(task / "events.json", kube("get", "events", "-n", ns)["items"])
                    for pod in kube("get", "pods", "-n", ns)["items"]:
                        name = pod["metadata"]["name"]
                        result = subprocess.run(["kubectl", "logs", "-n", ns, name, "--all-containers=true"], text=True, capture_output=True)
                        (task / f"{name}-final.log").write_text(result.stdout + result.stderr)
                finally:
                    command("kubectl", "delete", "namespace", ns, "--wait=true", "--timeout=240s")
                for _ in range(45):
                    try:
                        idle()
                        break
                    except AssertionError:
                        time.sleep(2)
                else:
                    raise RuntimeError("A process remains after diagnosis namespace cleanup")
        all_done = all((root / c["name"] / "complete.json").exists() for c in plan["cases"])
        state("complete" if all_done else "selected cases complete")
        command("python3", str(root / "analyze.py"), "--root", str(root))
    except Exception as e:
        state("failed", error=repr(e))
        raise


if __name__ == "__main__":
    main()
