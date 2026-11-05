#!/usr/bin/env python3
"""Deploy and validate one stable-release arm, then run NVIDIA's concurrency sweep."""

import argparse
from collections import Counter
import datetime
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.request


def run(*args, **kwargs):
    return subprocess.run(args, check=True, text=True, **kwargs)


def kube(*args):
    return json.loads(subprocess.check_output(["kubectl", *args, "-o", "json"], text=True))


def save(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("arm", choices=["baseline", "hami", "fractions"])
    parser.add_argument("--task-dir", type=Path, default=Path.cwd())
    parser.add_argument("--repeats", type=int, default=3)
    args = parser.parse_args()
    task = args.task_dir
    experiment = task / "experiment"
    plan = json.loads((experiment / "benchmark-plan.json").read_text())
    assert plan["profile"] == "release" and plan["fractions_forks"] is None
    namespace = plan["namespace"]
    count = plan["models"][args.arm]
    # KUBECONFIG and the current kubectl context are inherited.
    arm_dir = {"baseline": "baseline", "hami": "hami", "fractions": "kai-gpu-fractions"}[args.arm]
    checks = task / "checks" / args.arm
    checks.mkdir(parents=True, exist_ok=True)
    status = task / "bootstrap" / f"{args.arm}.exit"
    if status.exists():
        raise ValueError(f"Arm was already attempted: {status}; inspect results before retrying")
    monitor = None
    smoke = []
    try:
        manifest = experiment / arm_dir / "active-manifest.yaml"
        with manifest.open("w") as output:
            run("bash", str(experiment / arm_dir / "gen-dgds.sh"), stdout=output)
        run("kubectl", "apply", "-f", str(manifest))
        deadline = time.monotonic() + 1800
        last = None
        while time.monotonic() < deadline:
            pods = kube("get", "pods", "-n", namespace, "-l", "experiment.nvidia.com/dgd")["items"]
            ready = [p for p in pods if any(c["type"] == "Ready" and c["status"] == "True" for c in p.get("status", {}).get("conditions", []))]
            state = (len(ready), len(pods))
            if state != last:
                print(f"{args.arm}: {state[0]}/{count * 2} pods Ready, {state[1]} created", flush=True)
                last = state
            if len(ready) == count * 2 and len(pods) == count * 2:
                break
            time.sleep(10)
        else:
            raise RuntimeError("Timed out waiting for model pods")

        endpoints = []
        for index in range(1, count + 1):
            name = f"qwen3-4b-{index:02d}-frontend"
            service = kube("get", "svc", name, "-n", namespace)
            url = "http://" + service["spec"]["clusterIP"] + ":8000"
            for attempt in range(120):
                try:
                    with urllib.request.urlopen(url + "/v1/models", timeout=10) as response:
                        models = json.load(response)
                    if any(item["id"] == plan["workload"]["model"] for item in models.get("data", [])):
                        save(checks / f"models-{index:02d}.json", models)
                        break
                except Exception:
                    pass
                time.sleep(5)
            else:
                raise RuntimeError(f"Model is not registered: {name}")
            endpoints.append(url)

        def snapshot(label):
            pods = kube("get", "pods", "-n", namespace, "-l", "experiment.nvidia.com/dgd")["items"]
            save(checks / f"pods-{label}.json", pods)
            workers = [p for p in pods if p["metadata"]["labels"].get("experiment.nvidia.com/role") == "worker"]
            placement = []
            for pod in workers:
                name = pod["metadata"]["name"]
                output = subprocess.check_output(["kubectl", "exec", "-n", namespace, name, "--", "nvidia-smi", "--query-gpu=uuid,memory.total", "--format=csv,noheader"], text=True)
                rows = [line.strip().split(",") for line in output.splitlines() if line.startswith("GPU-")]
                if len(rows) != 1:
                    raise RuntimeError(f"Expected one visible GPU for {name}: {output}")
                placement.append({"pod": name, "uuid": rows[0][0].strip(), "memory": rows[0][1].strip()})
            expected = 1 if args.arm == "baseline" else 2
            counts = Counter(p["uuid"] for p in placement)
            if len(counts) != plan["gpu_count"] or any(value != expected for value in counts.values()):
                raise RuntimeError(f"Wrong GPU placement: {dict(counts)}")
            save(checks / f"placement-{label}.json", placement)
            return {p["metadata"]["uid"]: sum(c.get("restartCount", 0) for c in p.get("status", {}).get("containerStatuses", [])) for p in pods}

        platform_pods = kube("get", "pods", "-A")["items"]
        save(checks / "platform-images-before.json", [{"namespace": p["metadata"]["namespace"], "name": p["metadata"]["name"], "requested_images": [c["image"] for c in p["spec"].get("containers", [])], "resolved_images": [{"name": c["name"], "imageID": c.get("imageID"), "restartCount": c.get("restartCount")} for c in p.get("status", {}).get("containerStatuses", [])]} for p in platform_pods])
        save(checks / "helm-releases-before.json", json.loads(subprocess.check_output(["helm", "list", "-A", "-o", "json"], text=True)))
        before = snapshot("before")
        if args.arm == "fractions":
            run("python3", str(task / "verify-mps-clients.py"), "--task-dir", str(task), "--label", "before")
        if plan.get("execution_mode"):
            configurations = []
            for pod in kube("get", "pods", "-n", namespace, "-l", "experiment.nvidia.com/role=worker")["items"]:
                log = subprocess.check_output(["kubectl", "logs", "-n", namespace, pod["metadata"]["name"]], text=True)
                config = next(line for line in log.splitlines() if "Initializing a V1 LLM engine" in line)
                eager = re.search(r"enforce_eager=(True|False)", config).group(1) == "True"
                if eager != (plan["execution_mode"] == "eager"):
                    raise RuntimeError("Resolved eager flag differs from plan")
                configurations.append({"pod": pod["metadata"]["name"], "enforce_eager": eager, "engine_config_log": config, "graph_capturing_finished_count": log.count("Graph capturing finished")})
            save(checks / "resolved-execution-mode.json", configurations)
        run("python3", str(task / "verify-stack.py"), "--task-dir", str(task), "--label", "before")
        print(f"{args.arm}: model registration and {count} workers' GPU placement verified", flush=True)
        env = dict(os.environ, AIPERF=plan.get("aiperf_executable", str(task / "aiperf-venv/bin/aiperf")), HF_HOME=os.environ.get("HF_HOME", "/opt/hf-cache"), HF_HUB_OFFLINE="1", ENDPOINT_MODE="clusterip", NAMESPACE=namespace, NUM_MODELS=str(count), REPEATS=str(args.repeats), RESULTS_DIR=str(task / "results"))
        with (checks / "gpu-telemetry.csv").open("w") as telemetry:
            monitor = subprocess.Popen(["nvidia-smi", "--query-gpu=timestamp,index,uuid,utilization.gpu,utilization.memory,memory.used,power.draw,temperature.gpu,clocks.sm", "--format=csv", "-l", "1"], stdout=telemetry, stderr=subprocess.STDOUT)
            run("bash", str(experiment / "common/run-repeated.sh"), "release-" + args.arm, env=env, cwd=experiment)
        after = snapshot("after")
        if before != after:
            raise RuntimeError("Pod identities or restart counts changed during measurements")
        if args.arm == "fractions":
            run("python3", str(task / "verify-mps-clients.py"), "--task-dir", str(task), "--label", "after")
        for pod in kube("get", "pods", "-n", namespace, "-l", "experiment.nvidia.com/role=worker")["items"]:
            name = pod["metadata"]["name"]
            with (checks / (name + ".log")).open("w") as log:
                run("kubectl", "logs", "-n", namespace, name, stdout=log, stderr=subprocess.STDOUT)
            program = "import os,json,importlib.metadata as m; import torch; names=['vllm','torch','ai-dynamo','ai-dynamo-runtime','transformers']; print(json.dumps({'versions':{n:m.version(n) for n in names},'torch_cuda':torch.version.cuda,'cuda_initialized':torch.cuda.is_initialized(),'gpu_environment':{k:v for k,v in os.environ.items() if k.startswith(('CUDA_MPS','CUDA_DEVICE_','NVIDIA_GPU_MEMORY','NVIDIA_VISIBLE')) or k=='LD_PRELOAD'}}))"
            evidence = subprocess.check_output(["kubectl", "exec", "-n", namespace, name, "--", "python3", "-c", program], text=True)
            save(checks / (name + "-runtime.json"), json.loads([line for line in evidence.splitlines() if line.startswith("{")][-1]))
        run("python3", str(task / "verify-stack.py"), "--task-dir", str(task), "--label", "after")
        for trial in range(1, args.repeats + 1):
            label = f"release-{args.arm}-r{trial:02d}"
            run("python3", str(task / "summarize.py"), "summarize", str(task / "results" / label), "--plan", str(experiment / "benchmark-plan.json"), "--experiment", args.arm, "--output", str(task / "results" / (label + ".json")))
        status.write_text("0\n")
        print(f"{args.arm}: all {args.repeats} sweeps validated", flush=True)
    except Exception:
        status.write_text("1\n")
        raise
    finally:
        for process, log, artifact in smoke:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=20)
            if not log.closed:
                log.close()
        if monitor is not None:
            monitor.terminate()
            monitor.wait(timeout=10)


if __name__ == "__main__":
    main()
