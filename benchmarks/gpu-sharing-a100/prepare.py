#!/usr/bin/env python3
"""Materialize the measured benchmark profiles without accessing a cluster."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import re
import shutil

HERE = Path(__file__).resolve().parent
CLIENT_SHA = "d8fde51c9841b7898eb12a27489e5601b7fab535736db74da8fd3d6713450d19"
LIB_SHA = "e98badc7ab64065af728fcca833ed372f16702d1e1c18eec01b1d8f6cbf7a9fb"
LOADS = [2, 4, 8, 16, 32]


def save(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2) + "\n")


def render(value, replacements):
    if isinstance(value, str):
        for old, new in replacements.items():
            value = value.replace(old, str(new))
        return value
    if isinstance(value, list):
        return [render(v, replacements) for v in value]
    if isinstance(value, dict):
        return {k: render(v, replacements) for k, v in value.items()}
    return value


def materialize(config, output, hami_core_limit=0):
    output = Path(output).resolve()
    if output.exists():
        raise ValueError("Use a fresh output directory; preserve prior attempts")
    if len(config["gpu_uuids"]) != 2 or len(set(config["gpu_uuids"])) != 2:
        raise ValueError("Provide two distinct GPU UUIDs")
    if not all(re.fullmatch(r"GPU-[0-9a-fA-F-]{36}", g) for g in config["gpu_uuids"]):
        raise ValueError("Use physical GPU UUIDs from nvidia-smi")
    prefix = config.get("namespace_prefix", "sharing-bench")
    if not re.fullmatch(r"[a-z][a-z0-9-]{0,18}", prefix):
        raise ValueError("namespace_prefix must be 1-19 lowercase DNS-label characters")
    if not Path(config["hf_cache"]).is_absolute():
        raise ValueError("hf_cache must be an absolute path on the GPU node")
    if hami_core_limit not in [0, 50]:
        raise ValueError("Supported HAMi compute-limit profiles: 0 or 50")
    output.mkdir(parents=True)
    save(output / "suite.json", {"suite": "hami-a100-sharing", "config": config, "total_concurrency_per_gpu": LOADS, "hami_core_limit": hami_core_limit})
    client = HERE / "vendor/dynamo/run-sweep.sh"
    assert hashlib.sha256(client.read_bytes()).hexdigest() == CLIENT_SHA
    base_plan = json.loads((HERE / "templates/fullstack-plan.json").read_text())
    replacements = {"@NODE@": config["node_name"], "@GPU0@": config["gpu_uuids"][0], "@GPU1@": config["gpu_uuids"][1],
                    "@HF_CACHE@": config["hf_cache"], "@AIPERF@": config["aiperf_executable"]}

    def manifests(template, namespace, count, backend, mode, controlled=False, native_pair=False):
        original = json.loads((HERE / f"templates/{template}.json").read_text())
        items = []
        for i in range(count):
            model = f"qwen3-4b-{i+1:02d}"
            obj = render(original, {**replacements, "@NAMESPACE@": namespace, "@MODEL_NAME@": model})
            obj["metadata"]["annotations"]["benchmark.execution-mode"] = mode
            for component in obj["spec"]["components"]:
                pod = component["podTemplate"]
                spec = pod["spec"]
                if component["type"] != "worker":
                    continue
                container = spec["containers"][0]
                container["args"] = container["args"][:4]
                if controlled:
                    container["args"] += ["--gpu-memory-utilization", "0.45", "--kv-cache-memory-bytes", str(6*1024**3),
                                          "--max-model-len", "4096", "--max-num-seqs", "32", "--no-enable-prefix-caching"]
                elif native_pair:
                    container["args"] += ["--gpu-memory-utilization", "0.45"]
                if mode == "eager":
                    container["args"].append("--enforce-eager")
                if backend in ["hami", "hami-pair"] and hami_core_limit:
                    for category in ["requests", "limits"]:
                        container["resources"][category]["nvidia.com/gpucores"] = hami_core_limit
                if controlled or native_pair:
                    spec["terminationGracePeriodSeconds"] = 30
                    spec["schedulerName"] = "hami-scheduler" if backend == "hami-pair" else "default-scheduler"
                    pod["metadata"]["labels"].update({"benchmark.graphdiag/backend": backend, "benchmark.graphdiag/mode": mode})
                    gpu = config["gpu_uuids"][i % 2]
                    if backend != "hami-pair":
                        for category in ["requests", "limits"]:
                            container["resources"][category] = {k: v for k, v in container["resources"][category].items() if not k.startswith("nvidia.com/")}
                        container["env"].append({"name": "NVIDIA_VISIBLE_DEVICES", "value": "nvidia.com/gpu=" + gpu})
                    else:
                        obj["metadata"]["annotations"]["nvidia.com/use-gpuuuid"] = gpu
                        pod["metadata"].setdefault("annotations", {})["nvidia.com/use-gpuuuid"] = gpu
            items.append(obj)
        return {"apiVersion": "v1", "kind": "List", "items": items}

    # Original automatic-KV native/HAMi/GPU Fractioning collectors.
    full = output / "fullstack"
    cases = []
    for backend in ["native", "hami", "fractions"]:
        for mode in ["default", "eager"]:
            name = f"{backend}-{mode}"
            cases.append(name)
            task = full / name
            arm = "baseline" if backend == "native" else backend
            folder = "kai-gpu-fractions" if backend == "fractions" else arm
            ns = f"{prefix}-{name}"
            for directory in ["bootstrap", "checks", "results", "experiment/common", "experiment/" + folder]:
                (task / directory).mkdir(parents=True, exist_ok=True)
            save(task / f"experiment/{folder}/template.json", manifests(backend, ns, 2 if backend == "native" else 4, backend, mode))
            (task / f"experiment/{folder}/gen-dgds.sh").write_text('#!/usr/bin/env bash\nset -euo pipefail\ncat "$(dirname -- "$0")/template.json"\n')
            plan = render(copy.deepcopy(base_plan), replacements)
            plan.update({"case": name, "namespace": ns, "gpu_node": config["node_name"], "execution_mode": mode,
                         "aiperf_executable": config["aiperf_executable"], "repeats": 1, "hami_release_artifact": plan["hami_release_artifact"] if backend == "hami" else None})
            plan["workload"]["concurrencies_per_model"] = LOADS if backend == "native" else [n//2 for n in LOADS]
            plan["hami_compute_limit"] = hami_core_limit
            plan["gpu_memory_utilization"] = {arm: "engine default"}
            plan.pop("native_unhooked", None)
            if backend == "native":
                plan["native_unhooked"] = True
            for path in [task / "experiment/benchmark-plan.json", task / "experiment/common/benchmark-plan.json"]:
                save(path, plan)
            shutil.copy2(client, task / "experiment/common/run-sweep.sh")
            shutil.copy2(HERE / "vendor/run-repeated.sh", task / "experiment/common/run-repeated.sh")
            for file in ["run-benchmark-arm.py", "verify-stack.py", "verify-mps-clients.py", "summarize.py"]:
                shutil.copy2(HERE / "collectors" / file, task / file)
    save(full / "manifest.json", {"id": "fullstack", "cases": cases, "gpu_uuids": config["gpu_uuids"], "repeats": 1})
    (full / "bootstrap").mkdir(exist_ok=True)
    shutil.copy2(HERE / "collectors/fullstack.py", full / "run-case.py")
    shutil.copy2(HERE / "collectors/summarize-resources.py", full / "summarize-resources.py")

    profiles = [("controlled", "controlled.py", ["native-pair", "hami-pair", "native-single"]),
                ("mps-controlled", "mps.py", ["mps-pair"]),
                ("native-pair-fullstack", "native_pair.py", ["native-pair"])]
    for profile, driver, backends in profiles:
        root = output / profile
        root.mkdir()
        auto = profile == "native-pair-fullstack"
        plan = {"id": profile, "gpu_uuids": config["gpu_uuids"], "runtime_image": base_plan["versions"]["runtime_image"],
                "vllm": "0.31.0", "client_script_sha256": CLIENT_SHA, "library_sha256": LIB_SHA,
                "hami_release": "v2.10.0", "repeats": 1 if auto else 3, "cases": []}
        for mode in ["graph", "eager"]:
            for backend in backends:
                name = backend + "-" + mode
                ns = f"{prefix}-{'np' if auto else 'mps' if backend == 'mps-pair' else 'ctl'}-{name}"
                task = root / name
                task.mkdir()
                single = backend == "native-single"
                objects = manifests("native" if single else "hami", ns, 2 if single else 4, backend, mode, controlled=not auto, native_pair=auto)
                case = {"name": name, "backend": backend, "mode": mode, "namespace": ns, "models": 2 if single else 4,
                        "concurrencies": [n//2 for n in LOADS] if auto else [8 if single else 4], "repeats": 1 if auto else 3,
                        "compute_limit": hami_core_limit if backend == "hami-pair" else 0}
                if backend == "mps-pair":
                    pipe = "/tmp/mpsdiag-20261103-" + mode
                    case.update({"mps_pipe": pipe, "mps_logs": pipe + "-logs", "gpu_uuids": config["gpu_uuids"]})
                    for i, obj in enumerate(objects["items"]):
                        for component in obj["spec"]["components"]:
                            if component["type"] != "worker":
                                continue
                            spec = component["podTemplate"]["spec"]
                            spec["hostIPC"] = True
                            c = spec["containers"][0]
                            c["env"] += [{"name": "CUDA_VISIBLE_DEVICES", "value": config["gpu_uuids"][i%2]}, {"name": "CUDA_MPS_PIPE_DIRECTORY", "value": pipe}]
                            c["volumeMounts"].append({"name": "mps-pipe", "mountPath": pipe})
                            spec["volumes"].append({"name": "mps-pipe", "hostPath": {"path": pipe, "type": "Directory"}})
                save(task / "manifest.json", objects)
                save(task / "case.json", case)
                plan["cases"].append(case)
        if auto:
            plan.update({"expected_points": 10, "expected_raw_exports": 40, "expected_measured_requests": 2880})
        save(root / "plan.json", plan)
        shutil.copy2(client, root / "run-sweep.sh")
        shutil.copy2(HERE / "collectors" / driver, root / "run.py")
        shutil.copy2(HERE / "collectors" / ("analyze-native-pair.py" if auto else "analyze-controlled.py"), root / "analyze.py")
        if profile == "mps-controlled":
            shutil.copy2(HERE / "collectors/mps_control.py", root / "mps_control.py")

    for name, source in [("mps-fault-isolation-20261104", "fault"), ("hami-fault-isolation-20261104", "hami_fault")]:
        root = output / name
        shutil.copytree(HERE / source, root)
        plan = render(json.loads((HERE / "templates/hami-fault-plan.json").read_text()), replacements)
        plan.update({"id": name, "gpu_uuids": config["gpu_uuids"]})
        save(root / "plan.json", plan)
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--hami-core-limit", type=int, choices=[0, 50], default=0)
    args = parser.parse_args()
    print(materialize(json.loads(args.config.read_text()), args.out, args.hami_core_limit))
