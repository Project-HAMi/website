"""Recompute HAMi continuation outcomes and join the immutable native/MPS data."""
import argparse
import ast
import csv
import hashlib
import json
from pathlib import Path


def read(path):return json.loads(path.read_text())


def analyze(root):
    plan=read(root/"plan.json")
    reference=root/"reference/aggregate.json"
    assert hashlib.sha256(reference.read_bytes()).hexdigest()==plan["base_aggregate_sha256"]
    baseline=read(reference)
    assert len(baseline["cases"])==28
    def ptx(path):
        return next(ast.literal_eval(n.value) for n in ast.parse(path.read_text()).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=="PTX" for t in n.targets))
    assert ptx(root/"agent.py")==ptx(root/"reference/agent.py")
    assert hashlib.sha256(ptx(root/"agent.py").encode()).hexdigest()==plan["probe_ptx_sha256"]
    rows=[];all_uids=set();hook_checks=0
    for mode,fault,repeat in plan["cases"]:
        task=root/"cases"/f"hami-{fault}-r{repeat:02d}"
        result=read(task/"result.json");assert result["status"]=="complete"
        ready=read(task/"ready-all.json")
        before=read(task/"hami-proof-before.json");after=read(task/"hami-proof-after.json")
        uids={w["pod_uid"] for w in before["workers"].values()}
        assert len(uids)==3 and not (uids & all_uids);all_uids.update(uids)
        assert uids=={w["pod_uid"] for w in after["workers"].values()}
        assert not before["mps_present"] and not after["mps_present"]
        for role,r in ready.items():
            assert r["uid"]==1000 and r["gpu_sm_count"]==108
            assert r["gpu_memory_total"]==20*1024**3
            assert r["env"]["CUDA_DEVICE_SM_LIMIT"]=="0"
            assert r["env"]["CUDA_DEVICE_MEMORY_LIMIT_0"]=="20480m"
            assert r["hami_proof"]["libraries"] and set(r["hami_proof"]["libraries"].values())=={plan["library_sha256"]}
            for name in ["cuInit","cuMemAlloc_v2","cuLaunchKernel","cuGraphLaunch"]:
                assert "libvgpu" in r["hami_proof"]["symbols"][name]["library"]
            assert r["hami_proof"]["gpu_uuid"]==plan["gpu_uuids"][role=="canary"]
            assert len(before["workers"][role]["process_matches"])==1
            hook_checks+=1
        trigger=read(task/"trigger.json")["wall_ns"]
        record={"name":result["name"],"mode":"hami","fault":fault,"repeat":repeat,"clients":{}}
        for role in ["victim","canary"]:
            ev=[json.loads(x) for x in (task/(role+".jsonl")).read_text().splitlines()]
            samples=[e for e in ev if e["event"]=="sample"]
            pre=[e for e in samples if e["wall_ns"]<trigger];post=[e for e in samples if e["wall_ns"]>=trigger]
            assert len(pre)>=25 and all(e["ok"] for e in pre)
            healthy=bool(post) and all(e["ok"] for e in post) and result[role]["exec_exit"]==0 and not result[role]["agent_errors"]
            assert healthy==result[role]["healthy_through_fault"]
            record["clients"][role]={"healthy":healthy,"before_samples":len(pre),"after_samples":len(post),"post_errors":sum(not e["ok"] for e in post),
                                      "error_names":sorted({e.get("error_name","data_mismatch") for e in post if not e["ok"]}),"max_sample_gap_ms":result[role]["max_sample_gap_ms"]}
        attack=[json.loads(x) for x in (task/"attacker.jsonl").read_text().splitlines()]
        if fault!="kill_busy":
            injected=[e for e in attack if e["event"]=="injected"]
            assert len(injected)==1
            assert injected[0]["result"]=={"oom":2,"illegal_address":700,"trap":719}[fault]
        else:
            inj=read(task/"host-injection.json")
            assert inj["returncode"]==0 and 0<inj["milliseconds_from_launch"]<2000
            assert result["attacker"]["exec_exit"]!=0
        rows.append(record)
    joined=baseline["cases"]+rows
    groups=[]
    for mode,fault in sorted({(r["mode"],r["fault"]) for r in joined}):
        trials=[r for r in joined if (r["mode"],r["fault"])==(mode,fault)]
        assert len(trials)==2
        groups.append({"mode":mode,"fault":fault,"trials":2,"same_gpu_healthy":sum(r["clients"]["victim"]["healthy"] for r in trials),
                       "other_gpu_healthy":sum(r["clients"]["canary"]["healthy"] for r in trials),
                       "same_gpu_errors":sorted({e for r in trials for e in r["clients"]["victim"]["error_names"]}),
                       "max_same_gpu_sample_gap_ms":max(r["clients"]["victim"]["max_sample_gap_ms"] for r in trials)})
    output={"status":"complete","validation":{"status":"passed","hami_formal_cases":len(rows),"actual_hami_processes_verified":hook_checks,"unique_hami_pods":len(all_uids),"identical_ptx":True},
            "plan":plan,"hami_cases":rows,"reference_cases":len(baseline["cases"]),"total_cases":len(joined),"conditions":groups,
            "reference_note":"Native and MPS frozen earlier same-day runs on identical GPUs/driver and same CUDA probe, not freshly remeasured in the HAMi supplement"}
    (root/"aggregate.json").write_text(json.dumps(output,indent=2)+"\n")
    with (root/"conditions.csv").open("w",newline="") as f:
        w=csv.DictWriter(f,fieldnames=list(groups[0]));w.writeheader();w.writerows(groups)
    lookup={(r["mode"],r["fault"]):r for r in groups}
    faults={"oom":"显存申请失败","illegal_address":"GPU 非法访存","trap":"GPU trap","kill_busy":"GPU 工作中 SIGKILL","terminate_busy":"MPS client terminate"}
    lines=["# HAMi 2.10 故障隔离实测对比", "", "同卡两实例 + 异卡健康对照，2×A100-SXM4-40GB，驱动 615.71.10。HAMi 使用原生 scheduler/device-plugin，每实例 20 GiB、算力限速关闭，不使用 MPS。", "",
           "下面直接写明同卡健康进程结果：每场景重复两次，正常表示继续完成 CUDA Graph 计算与首尾输出校验，失败表示健康进程受到了另一进程故障影响。", "",
           "| 场景 | Native 多进程 | HAMi 2.10 | MPS v3 共享 SM | MPS v3 静态分区配置 |", "|---|---|---|---|---|"]
    for fault,label in faults.items():
        cells=[]
        for mode in ["native","hami","shared","static"]:
            row=lookup.get((mode,fault))
            if row is None:cells.append("不适用")
            elif row["same_gpu_healthy"]==2:cells.append("两次均正常")
            elif row["same_gpu_healthy"]==0:cells.append("两次均失败")
            else:cells.append("正常 1 次、失败 1 次")
        lines.append("| "+label+" | "+" | ".join(cells)+" |")
    lines += ["", "HAMi 健康进程观察数据（汇总两次；最大采样间隔包含探针固定 50 ms 周期，不是 vLLM TTFT/TPOT）：", "",
              "| 场景 | 故障后正确采样数 | 故障后错误数 | 最大采样间隔 ms |", "|---|---:|---:|---:|"]
    for fault,label in faults.items():
        trials=[r for r in rows if r["fault"]==fault]
        if not trials:continue
        good=sum(r["clients"]["victim"]["after_samples"]-r["clients"]["victim"]["post_errors"] for r in trials)
        bad=sum(r["clients"]["victim"]["post_errors"] for r in trials)
        gap=max(r["clients"]["victim"]["max_sample_gap_ms"] for r in trials)
        lines.append(f"| {label} | {good} | {bad} | {gap:.2f} |")
    other=sum(r["clients"]["canary"]["healthy"] for r in joined)
    lines += ["",f"另一张卡的健康进程在 {other}/{len(joined)} 个用例中继续正常。HAMi 新增 {len(rows)} 个正式用例，原生/MPS 引用已冻结的 28 个用例，未改写或重跑基线。", "",
              "HAMi 启动前验证：实际加载官方 release 库 SHA-256；cuInit、cuMemAlloc_v2、cuLaunchKernel、cuGraphLaunch 的 dladdr 均指向 libvgpu；每实例显存报告 20 GiB，并确认 21 GiB 申请被拒绝。每个正式用例另核验实际探针 PID/Pod UID、GPU UUID、调度器、库哈希、函数地址来源和零 Pod 重启。", "",
              "协议：与前一轮使用相同 PTX 和 CUDA Graph 健康负载；故障前至少 3 秒、故障后至少 6 秒，每场景两次。HAMi 每次新建三个 Pod；上一轮原生/MPS 每次重建 CUDA 客户端，MPS 服务亦重建。OOM 请求为可见显存两倍；HAMi 可见 20 GiB，原生/MPS 可见 40 GiB。", "",
              "范围：这是 CUDA 驱动级故障探针，不是 vLLM 服务可用性测试，不包括 GPU reset、驱动崩溃或硬件故障。没有观察到本轮错误传播不等于所有故障都可以隔离。MPS 静态组 API 返回不同分区 ID、各 54 SM；其结论限于此前实测配置，不推广至所有静态分区实现。", ""]
    (root/"COMPARISON.md").write_text("\n".join(lines))
    print(json.dumps({"validation":output["validation"],"conditions":[r for r in groups if r["mode"]=="hami"]},ensure_ascii=False,indent=2))


if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--root",type=Path,required=True);analyze(p.parse_args().root)
