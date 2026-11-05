"""Audit fault confirmation, MPS attachment and healthy-client continuation."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import statistics


def events(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def percentile(values, q):
    if not values:
        return None
    values = sorted(values)
    index = (len(values)-1)*q
    low = int(index)
    fraction = index-low
    return values[low]*(1-fraction) + values[min(low+1,len(values)-1)]*fraction


def analyze(root):
    plan = json.loads((root/"plan.json").read_text())
    records, index = [], {}
    for mode,fault,repeat in plan["cases"]:
        case = root/"cases"/f"{mode}-{fault}-r{repeat:02d}"
        result = json.loads((case/"result.json").read_text())
        assert result["status"] == "complete"
        ready = json.loads((case/"ready-all.json").read_text())
        for role in ["victim","attacker","canary"]:
            assert ready[role]["uid"] == 1000
            assert ready[role]["gpu_sm_count"] == (54 if mode=="static" and role!="canary" else 108)
        for role in ["victim","canary"]:
            assert ready[role]["cuda_graph"]
        if mode != "native":
            proof = json.loads((case/"mps-proof-before.json").read_text())
            assert set(proof["matched_roles"]) == {"victim","attacker","canary"}
            assert proof["clients"]["exit"] == 0
            for role in ready:
                assert ready[role]["env"]["CUDA_MPS_ACTIVE_THREAD_PERCENTAGE"] == "100"
                if mode == "static":
                    assert ready[role]["env"].get("CUDA_MPS_SM_PARTITION")
                else:
                    assert not ready[role]["env"].get("CUDA_MPS_SM_PARTITION")
        attack_events = events(case/"attacker.jsonl")
        if fault in ["oom","illegal_address","trap"]:
            injected = [e for e in attack_events if e["event"]=="injected"]
            assert len(injected)==1
            code = injected[0]["result"]
            assert code == 2 if fault=="oom" else code != 0
            injection = {"api_result":code,"error_name":injected[0]["error_name"]}
        else:
            inj = json.loads((case/"host-injection.json").read_text())
            assert inj["returncode"] == 0
            assert 0 < inj["milliseconds_from_launch"] < 2000, "Intervention missed the bounded GPU work window"
            if fault == "kill_busy":
                assert result["attacker"]["exec_exit"] != 0
            injection = inj
        record = {"name":result["name"],"mode":mode,"fault":fault,"repeat":repeat,"injection":injection,
                  "cuda_context_ids":{role:ready[role]["cuda_context_id"] for role in ready},"clients":{}}
        trigger = json.loads((case/"trigger.json").read_text())["wall_ns"]
        for role in ["victim","canary"]:
            samples = [e for e in events(case/(role+".jsonl")) if e["event"]=="sample"]
            before = [e for e in samples if e["wall_ns"] < trigger]
            after = [e for e in samples if e["wall_ns"] >= trigger]
            assert len(before)>=25 and all(e["ok"] for e in before)
            healthy = bool(after) and all(e["ok"] for e in after) and result[role]["exec_exit"]==0 and not result[role]["agent_errors"]
            assert healthy == result[role]["healthy_through_fault"]
            good = [e["latency_ms"] for e in after if e["ok"]]
            error_names = sorted({e.get("error_name","data_mismatch") for e in after if not e["ok"]})
            record["clients"][role] = {"healthy":healthy,"before_samples":len(before),"after_samples":len(after),"post_errors":sum(not e["ok"] for e in after),
                "error_names":error_names,"post_latency_p50_ms":percentile(good,.5),"post_latency_p99_ms":percentile(good,.99),
                "max_sample_gap_ms":result[role]["max_sample_gap_ms"],"exec_exit":result[role]["exec_exit"]}
        records.append(record)
        for path in case.rglob("*"):
            if path.is_file() and path.name != "result.json.tmp":
                index[str(path.relative_to(root))]=hashlib.sha256(path.read_bytes()).hexdigest()
    assert len(records)==len(plan["cases"])
    groups=[]
    for mode,fault in sorted({(r["mode"],r["fault"]) for r in records}):
        trials=[r for r in records if (r["mode"],r["fault"])==(mode,fault)]
        groups.append({"mode":mode,"fault":fault,"trials":len(trials),"same_gpu_healthy":sum(t["clients"]["victim"]["healthy"] for t in trials),
            "other_gpu_healthy":sum(t["clients"]["canary"]["healthy"] for t in trials),
            "same_gpu_errors":sorted({e for t in trials for e in t["clients"]["victim"]["error_names"]}),
            "other_gpu_errors":sorted({e for t in trials for e in t["clients"]["canary"]["error_names"]}),
            "max_same_gpu_sample_gap_ms":max(t["clients"]["victim"]["max_sample_gap_ms"] for t in trials)})
    output={"status":"complete","validation":{"status":"passed","formal_cases_checked":len(records)},"plan":plan,"formal_cases":len(records),"conditions":groups,"cases":records,
            "measurement":"CUDA Graph replay + host readback; first and last output elements must increment correctly; 3-second baseline and 6-second post-event observation per case",
            "scope":"Driver/MPS mechanism probe; not vLLM or full GPU Fractioning deployment; no GPU reset, no persistent driver or cluster configuration edits"}
    (root/"aggregate.json").write_text(json.dumps(output,indent=2)+"\n")
    (root/"evidence-index.json").write_text(json.dumps(index,indent=2)+"\n")
    with (root/"conditions.csv").open("w",newline="") as f:
        writer=csv.DictWriter(f,fieldnames=list(groups[0]))
        writer.writeheader();writer.writerows(groups)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    analyze(parser.parse_args().root)
