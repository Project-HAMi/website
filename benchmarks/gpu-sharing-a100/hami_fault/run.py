"""Native HAMi scheduler/device-plugin fault supplement with hook provenance."""
import argparse
import csv
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import case_run as base

NS="hamifault-20261104"
LIB_SHA="e98badc7ab64065af728fcca833ed372f16702d1e1c18eec01b1d8f6cbf7a9fb"


def no_mps():
    rows=base.command("ps","-eo","pid,comm:32").stdout.splitlines()
    assert not [r for r in rows if "nvidia-cuda-mps" in r], "MPS must be absent in the HAMi arm"


def check_proof(proof, gpu):
    p=proof["hami_proof"] if "hami_proof" in proof else proof
    assert p["libraries"] and set(p["libraries"].values())=={LIB_SHA},p
    for name in ["cuInit","cuMemAlloc_v2","cuLaunchKernel","cuGraphLaunch"]:
        assert "libvgpu" in (p["symbols"][name]["library"] or ""),(name,p)
    assert p["gpu_uuid"]==gpu,(p["gpu_uuid"],gpu)
    env=proof.get("env",{})
    assert env.get("CUDA_DEVICE_SM_LIMIT")=="0",env
    assert env.get("CUDA_DEVICE_MEMORY_LIMIT_0")=="20480m",env
    assert not env.get("CUDA_MPS_SM_PARTITION")
    assert proof.get("gpu_memory_total",proof.get("reported_memory_total"))==20*1024**3,proof


def verify_clients(task,pods,ready,stage):
    no_mps()
    current=json.loads(base.command("kubectl","get","pods","-n",NS,"-o","json").stdout)
    base.save(task/("pods-"+stage+".json"),current)
    assert {p["metadata"]["uid"] for p in current["items"]}=={p["metadata"]["uid"] for p in pods.values()}
    assert all(p["spec"]["schedulerName"]=="hami-scheduler" for p in current["items"])
    assert all(s["restartCount"]==0 for p in current["items"] for s in p["status"]["containerStatuses"])
    apps=base.gpu_apps()
    records={}
    for role,pod in pods.items():
        gpu=json.loads((task/"case.json").read_text())["gpu_uuids"][role=="canary"]
        check_proof(ready[role],gpu)
        matched=[]
        for row in csv.reader(apps.splitlines()):
            if not row:continue
            pid=int(row[0].strip())
            try:
                cgroup=Path(f"/proc/{pid}/cgroup").read_text()
                status=Path(f"/proc/{pid}/status").read_text()
            except FileNotFoundError:continue
            uid=pod["metadata"]["uid"]
            if uid not in cgroup and uid.replace("-","_") not in cgroup:continue
            nspid=[int(v) for v in next(l for l in status.splitlines() if l.startswith("NSpid:")).split()[1:]]
            if nspid[-1]!=ready[role]["pid"]:continue
            assert row[1].strip()==gpu
            matched.append({"host_pid":pid,"namespace_pids":nspid,"gpu_uuid":gpu,"pod_uid":uid})
        if stage=="before":assert len(matched)==1,(role,matched,apps)
        records[role]={"pod":pod["metadata"]["name"],"pod_uid":pod["metadata"]["uid"],"process_matches":matched,"library_and_hooks_verified":True}
    base.save(task/("hami-proof-"+stage+".json"),{"workers":records,"gpu_processes":apps,"mps_present":False,"expected_library_sha256":LIB_SHA})


base.verify_hami_clients=verify_clients


def init(root):
    no_mps();assert not base.gpu_apps()
    data=json.loads(base.command("kubectl","get","nodes","-o","json").stdout)
    assert len(data["items"])==1
    node=data["items"][0]
    base.save(root/"node-before.json",{"name":node["metadata"]["name"],"nodeInfo":node["status"]["nodeInfo"],
        "gpu_register":node["metadata"]["annotations"].get("hami.io/node-nvidia-register"),"capacity":node["status"]["capacity"],"allocatable":node["status"]["allocatable"]})
    objs={"apiVersion":"v1","kind":"List","items":[{"apiVersion":"v1","kind":"Namespace","metadata":{"name":NS,"labels":{"benchmark":"hami-fault-isolation"}}},
         {"apiVersion":"v1","kind":"ConfigMap","metadata":{"name":"fault-code","namespace":NS},"data":{"agent.py":(root/"agent.py").read_text(),"hami_probe.py":(root/"hami_probe.py").read_text()}}]}
    base.save(root/"namespace.json",objs)
    base.command("kubectl","apply","-f",str(root/"namespace.json"))
    images=json.loads(base.command("kubectl","get","pods","-n","hami-system","-o","json").stdout)
    base.save(root/"hami-platform.json",[{"pod":p["metadata"]["name"],"images":[c["image"] for c in p["spec"]["containers"]],"statuses":p["status"]["containerStatuses"]} for p in images["items"]])
    return node["metadata"]["name"]


def deploy(root,node,gpus,label):
    items=[]
    for role in base.ROLES:
        gpu=gpus[role=="canary"]
        items.append({"apiVersion":"v1","kind":"Pod","metadata":{"name":role,"namespace":NS,"labels":{"benchmark":"hami-fault-isolation","role":role,"case":label},
              "annotations":{"nvidia.com/use-gpuuuid":gpu}},"spec":{"schedulerName":"hami-scheduler","runtimeClassName":"nvidia","restartPolicy":"Never","hostIPC":True,"terminationGracePeriodSeconds":10,
              "nodeSelector":{"kubernetes.io/hostname":node},"securityContext":{"runAsUser":1000,"runAsGroup":1000},
              "containers":[{"name":"probe","image":base.IMAGE,"imagePullPolicy":"IfNotPresent","command":["/bin/bash","-lc","sleep infinity"],
                  "resources":{"requests":{"cpu":"250m","memory":"128Mi","nvidia.com/gpu":1,"nvidia.com/gpumem":20480},"limits":{"memory":"2Gi","nvidia.com/gpu":1,"nvidia.com/gpumem":20480}},
                  "volumeMounts":[{"name":"code","mountPath":"/fault-code","readOnly":True},{"name":"work","mountPath":str(root)}]}],
              "volumes":[{"name":"code","configMap":{"name":"fault-code"}},{"name":"work","hostPath":{"path":str(root),"type":"Directory"}}]}})
    path=root/("pods-"+label+".json");base.save(path,{"apiVersion":"v1","kind":"List","items":items})
    base.command("kubectl","apply","-f",str(path))
    try:
        base.command("kubectl","wait","-n",NS,"--for=condition=Ready","pods","--all","--timeout=120s",timeout=130)
    except Exception:
        (root/(label+"-startup-events.txt")).write_text(base.command("kubectl","describe","pods","-n",NS,check=False).stdout)
        raise
    result=json.loads(base.command("kubectl","get","pods","-n",NS,"-o","json").stdout)
    base.save(root/("pods-resolved-"+label+".json"),result)
    return {p["metadata"]["name"]:p for p in result["items"]}


def delete_pods():
    base.command("kubectl","delete","pods","-n",NS,"--all","--wait=true","--timeout=60s",check=False,timeout=70)
    for _ in range(40):
        if not base.gpu_apps():return
        time.sleep(.2)
    raise RuntimeError("Own GPU contexts remain after deleting test pods")


def main():
    p=argparse.ArgumentParser();p.add_argument("--root",required=True);p.add_argument("--preflight-only",action="store_true");a=p.parse_args()
    root=Path(a.root);assert root.name=="hami-fault-isolation-20261104"
    plan=json.loads((root/"plan.json").read_text());gpus=plan["gpu_uuids"]
    (root/"cases").mkdir(exist_ok=True);os.chmod(root/"cases",0o2775)
    base.command("sudo","-n","chown",f"{os.getuid()}:1000",str(root/"cases"))
    node=init(root);completed=[]
    try:
        if a.preflight_only:
            pods=deploy(root,node,gpus,"preflight")
            proofs={}
            for role in base.ROLES:
                r=base.command("kubectl","exec","-n",NS,role,"--","python3","-B","/fault-code/hami_probe.py",check=False)
                (root/("preflight-"+role+".stdout")).write_text(r.stdout)
                (root/("preflight-"+role+".stderr")).write_text(r.stderr)
                assert r.returncode==0,r.stderr
                proof=json.loads(r.stdout.strip().splitlines()[-1]);check_proof(proof,gpus[role=="canary"])
                assert proof["quota_probe"]["cuda_result"]==2,proof
                proofs[role]=proof
            base.save(root/"preflight.json",{"status":"passed","workers":proofs})
            print("HAMi release library, hook pointers, 20 GiB reporting, 21 GiB rejection, scheduler and placement verified",flush=True)
            return
        assert json.loads((root/"preflight.json").read_text())["status"]=="passed"
        all_uids=set()
        for mode,fault,repeat in plan["cases"]:
            name=f"hami-{fault}-r{repeat:02d}"
            previous=root/"cases"/name/"result.json"
            if previous.exists():completed.append(json.loads(previous.read_text()));continue
            assert not previous.parent.exists(),"Preserve failed attempt: "+name
            base.save(root/"status.json",{"state":"running","case":name,"completed":len(completed),"planned":8,"utc":base.utc()})
            pods=deploy(root,node,gpus,name)
            uids={p["metadata"]["uid"] for p in pods.values()};assert not (uids & all_uids);all_uids.update(uids)
            try:completed.append(base.do_case(root,NS,pods,gpus,mode,fault,repeat))
            finally:delete_pods()
        base.save(root/"results.json",completed)
        base.save(root/"status.json",{"state":"complete","completed":len(completed),"planned":8,"utc":base.utc()})
    except Exception as exc:
        base.save(root/"status.json",{"state":"failed","error":str(exc),"completed":len(completed),"utc":base.utc()});raise
    finally:
        base.command("kubectl","delete","namespace",NS,"--wait=true","--timeout=90s",check=False,timeout=100)
        no_mps()
        base.save(root/"cleanup.json",{"utc":base.utc(),"gpu_compute_processes":base.gpu_apps(),"namespace":NS,"namespace_deleted":True,"mps_present":False})


if __name__=="__main__":main()
