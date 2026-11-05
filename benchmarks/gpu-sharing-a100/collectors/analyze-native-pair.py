"""Summarize native-pair automatic-KV sweeps without pooling older protocols."""
import argparse,csv,datetime,hashlib,json,statistics
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument("--root",type=Path,required=True);root=p.parse_args().root
plan=json.loads((root/"plan.json").read_text());points=[];count=0
assert hashlib.sha256((root/"run-sweep.sh").read_bytes()).hexdigest()==plan["client_script_sha256"]
for case in plan["cases"]:
 task=root/case["name"]
 if not (task/"complete.json").exists():continue
 before=json.loads((task/"proof-before.json").read_text());after=json.loads((task/"proof-after.json").read_text())
 assert len(before)==len(after)==4
 assert {r["uid"] for r in before}=={r["uid"] for r in after}
 assert all(not e["hami_libraries"] for r in before+after for e in r["engines"])
 for c in case["concurrencies"]:
  files=sorted((task/"results/r01"/f"c{c}").glob("*/profile_export_aiperf.json"));assert len(files)==4;count+=4
  data=[json.loads(f.read_text()) for f in files]
  for d in data:
   assert d["is_complete"] and not d["was_cancelled"] and d.get("request_error_rate",{}).get("avg",0)==0
   assert d["request_count"]["avg"]==max(40,10*c)
   assert d["input_sequence_length"]["avg"]==2048 and 250<=d["output_sequence_length"]["avg"]<=257
  row={"study":"native-pair-fullstack","case":case["name"],"backend":"native-pair","mode":"default" if case["mode"]=="graph" else "eager","c":c,"total_c_per_gpu":2*c,"workers":4,"successful_requests":sum(int(d["request_count"]["avg"]) for d in data),"tps_per_gpu":sum(d["output_token_throughput"]["avg"] for d in data)/2,"prefix_cache_pct":statistics.mean(d["overall_usage_prompt_cache_read_pct"]["avg"] for d in data),"kv_cache_tokens_by_worker":[r["kv_cache_tokens"] for r in before]}
  for field,source in [("ttft","time_to_first_token"),("tpot","inter_token_latency"),("e2e","request_latency"),("chunk","inter_chunk_latency")]:
   for q in [50,99]:row[f"{field}_p{q}_ms"]=statistics.mean(d[source][f"p{q}"] for d in data)
  starts=[datetime.datetime.fromisoformat(d["start_time"]) for d in data];ends=[datetime.datetime.fromisoformat(d["end_time"]) for d in data]
  window=(max(ends)-min(starts)).total_seconds()
  row["common_wall_tps_per_gpu"]=sum(d["total_output_tokens"]["avg"] for d in data)/window/2
  row["all_workers_overlap_fraction"]=max(0,(min(ends)-max(starts)).total_seconds())/window
  points.append(row)
complete=len(points)==plan["expected_points"]
if complete:
 assert count==plan["expected_raw_exports"] and sum(r["successful_requests"] for r in points)==plan["expected_measured_requests"]
out={"status":"complete" if complete else "partial","plan":plan,"points":points,"raw_exports":count,"successful_requests":sum(r["successful_requests"] for r in points)}
(root/"aggregate.json").write_text(json.dumps(out,indent=2)+"\n")
if points:
 with (root/"points.csv").open("w",newline="") as f:
  w=csv.DictWriter(f,fieldnames=list(points[0]));w.writeheader();w.writerows(points)
lines=["# Native pair fullstack supplement","","Automatic KV, default prefix caching, utilization=0.45 per instance; no HAMi or MPS; four models on two A100s. Same official AIPerf script; one sweep per fresh mode deployment.","","|Mode|c/model|c/GPU|tok/s/GPU|TTFT p50|TTFT p99|TPOT p50|TPOT p99|Prefix cache %|","|---|---:|---:|---:|---:|---:|---:|---:|---:|"]
for r in points:lines.append("|"+"|".join([r["mode"],str(r["c"]),str(r["total_c_per_gpu"])]+[f"{r[k]:.2f}" for k in ["tps_per_gpu","ttft_p50_ms","ttft_p99_ms","tpot_p50_ms","tpot_p99_ms","prefix_cache_pct"]])+"|")
lines += ["","Native utilization=0.45 is needed to co-locate two native processes seeing a 40 GiB device. This matches nominal 18 GiB engine budgets, not a security memory cap. KV capacity remains automatic and is recorded per worker. Older fullstack runs have different physical GPU UUIDs after reboot; compare as a later same-model/driver supplement."]
(root/"README.md").write_text("\n".join(lines)+"\n")
print(json.dumps({"status":out["status"],"points":len(points),"exports":count,"requests":out["successful_requests"]}))
