#!/usr/bin/env python3
"""Verify the actual scheduler, runtime library, GPU visibility and MPS mode."""
import argparse
import json
import os
from pathlib import Path
import subprocess

p = argparse.ArgumentParser(description=__doc__)
p.add_argument("--task-dir", type=Path, required=True)
p.add_argument("--label", choices=["before", "after"], required=True)
a = p.parse_args()
plan = json.loads((a.task_dir / "experiment/benchmark-plan.json").read_text())
backend, mode = plan["case"].split("-")
arm = "baseline" if backend == "native" else backend
ns = plan["namespace"]
# KUBECONFIG and the current kubectl context are inherited.
host = subprocess.check_output(["nvidia-smi", "--query-compute-apps=pid,process_name", "--format=csv"], text=True)
assert ("nvidia-cuda-mps" in host) == (backend == "fractions"), host
pods = json.loads(subprocess.check_output(["kubectl", "get", "pods", "-n", ns, "-l", "experiment.nvidia.com/role=worker", "-o", "json"], text=True))["items"]
assert len(pods) == (2 if backend == "native" else 4)
program = r'''
import hashlib,importlib.metadata as m,json,os
from pathlib import Path
import torch
engines=[]
for path in Path('/proc').iterdir():
 if not path.name.isdigit():continue
 try:
  if 'EngineCor' not in (path/'comm').read_text():continue
  libraries=sorted({line.split()[-1] for line in (path/'maps').read_text().splitlines() if 'libvgpu' in line or 'libhami' in line})
  engines.append({'pid':int(path.name),'hami_libraries':{v:hashlib.sha256(Path(v).read_bytes()).hexdigest() for v in libraries}})
 except FileNotFoundError:continue
assert engines
props=torch.cuda.get_device_properties(0)
free,total=torch.cuda.mem_get_info()
print(json.dumps({'engines':engines,'cuda_free_total':[free,total],'sm_count':props.multi_processor_count,'environment':{k:v for k,v in os.environ.items() if k.startswith(('CUDA_MPS','CUDA_DEVICE','GPU_CORE','NVIDIA_VISIBLE')) or k=='LD_PRELOAD'},'versions':{v:m.version(v) for v in ['vllm','torch','ai-dynamo','ai-dynamo-runtime','transformers']}}))
'''
workers = []
for pod in pods:
    scheduler = {"native": "default-scheduler", "hami": "hami-scheduler", "fractions": "kai-scheduler"}[backend]
    assert pod["spec"]["schedulerName"] == scheduler
    name = pod["metadata"]["name"]
    output = subprocess.check_output(["kubectl", "exec", "-n", ns, name, "--", "python3", "-c", program], text=True)
    d = json.loads([s for s in output.splitlines() if s.startswith("{")][-1])
    hashes = [v for engine in d["engines"] for v in engine["hami_libraries"].values()]
    if backend == "hami":
        assert hashes and set(hashes) == {plan["hami_release_artifact"]["library_sha256"]}, hashes
        assert d["cuda_free_total"][1] == 20*1024**3
        assert d["environment"].get("CUDA_DEVICE_SM_LIMIT") == str(plan.get("hami_compute_limit", 0))
    else:
        assert not hashes, hashes
    if backend == "native":
        assert 38*1024**3 < d["cuda_free_total"][1] <= 40*1024**3
    assert d["sm_count"] == 108 or (backend == "hami" and plan.get("hami_compute_limit") == 50 and 0 < d["sm_count"] <= 108)
    assert d["versions"]["vllm"] == "0.31.0"
    d.update({"pod": name, "uid": pod["metadata"]["uid"], "scheduler": scheduler, "annotations": pod["metadata"].get("annotations", {})})
    workers.append(d)
checks = a.task_dir / "checks" / arm
(checks / f"stack-{a.label}.json").write_text(json.dumps({"backend": backend, "host_processes": host, "workers": workers}, indent=2) + "\n")
(checks / f"events-{a.label}.json").write_text(subprocess.check_output(["kubectl", "get", "events", "-n", ns, "-o", "json"], text=True))
print(f"{backend}: {len(workers)} actual scheduler/library/GPU identities verified ({a.label})", flush=True)
