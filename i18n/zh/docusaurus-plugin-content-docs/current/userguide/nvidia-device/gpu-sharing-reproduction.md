---
title: GPU 共享测试复现指南
sidebar_label: 测试复现指南
translated: true
---

本页集中维护[测试报告](./gpu-sharing-benchmarks.md)的环境准备和执行步骤。所有命令均在 benchmark 仓库根目录运行。主机路径、GPU UUID 和用例选择可配置，采集器来源哈希记录在 `provenance.json`。

## 获取测试代码

```bash
git clone https://github.com/Project-HAMi/gpu-sharing-benchmarks.git
cd gpu-sharing-benchmarks
git checkout e9b205bb121c50649bb97d7ed5dc4f796a9e523f
```

## 环境准备

在专用 Linux GPU 节点运行。这些脚本会创建和清理测试命名空间、管理独立的 MPS 服务，并注入 GPU 执行故障。测试环境为：

- 2× A100-SXM4-40GB，每卡 108 SM；驱动 615.71.10，CUDA 13.4 MPS 工具。
- Ubuntu 24.04.5、单节点 K3s 1.37.1+k3s1、NVIDIA Container Toolkit 1.20.1；使用 `nvidia` RuntimeClass 和 CDI 设备选择。
- Dynamo 1.6.1、etcd、NATS；工作负载镜像摘要已固定在模板中。
- HAMi 2.10.0，或 KAI 0.18.6 + GPU Fractioning 0.1.8，按测试组切换。
- Python 3.11 或更新版本、AIPerf 0.13.0、`kubectl`、`helm`、`jq`、`curl`、`vmstat`；故障与 MPS 用例需要免密 `sudo`。
- GPU 客户端使用非 root UID/GID 1000。Legacy MPS 服务使用相同 UID；v3 故障测试服务以 root、多用户模式运行，与原测试配置一致。

参照 [Dynamo GPU 共享部署指南](https://github.com/ai-dynamo/dynamo/tree/v1.6.1/examples/gpu-sharing)准备平台与模型缓存，版本选择 Dynamo 1.6.1 和 AIPerf 0.13.0。将 `Qwen/Qwen3-4B` 的 `1cfa9a7208912126459214e8b04321603b3df60c` 版本缓存到 `/opt/hf-cache/hub`；worker 使用固定快照和离线模式。压测客户端在 GPU 节点上通过 ClusterIP 访问服务。

```bash
python3 -m venv /var/tmp/aiperf-013
/var/tmp/aiperf-013/bin/python -m pip install aiperf==0.13.0
```

将本地配置中的 `aiperf_executable` 设为 `/var/tmp/aiperf-013/bin/aiperf`。分别使用官方 [HAMi 2.10.0 chart](https://github.com/Project-HAMi/HAMi/tree/v2.10.0/charts/hami) 和 [GPU Fractioning 0.1.8](https://github.com/kai-scheduler/gpu-fractioning/tree/v0.1.8)；后者配合 KAI 0.18.6。

## 生成测试配置

复制 `config.example.json` 为本地配置，填写实际节点名、两个 GPU UUID、AIPerf 路径和模型缓存路径。GPU UUID 可通过 `nvidia-smi --query-gpu=uuid --format=csv,noheader` 查询。脚本继承当前 `KUBECONFIG` 与 kubectl context。

```bash
python3 prepare.py --config config.json --out /var/tmp/hami-sharing-run
```

生成阶段不访问 Kubernetes 或 GPU，也不会覆盖已有输出目录。全栈每卡总并发为 2、4、8、16、32，双实例各承担一半；同参数对照仅测每卡总并发 8。

## 按测试组选择平台

先安装对应共享栈再运行用例。原生 NVIDIA 设备插件与 HAMi 设备插件不能同时上报同一批物理 GPU。

| 用例 | 平台要求 |
| --- | --- |
| 全栈 `native-*` | 原生 NVIDIA 设备插件；无 HAMi 注入或 MPS |
| 全栈 `hami-*`、同参数对照 | HAMi 2.10.0 调度器与设备插件；无 MPS |
| 原生双实例全栈 | 通过 CDI 显式绑定 GPU；无 HAMi 注入或 MPS |
| 全栈 `fractions-*` | 原生 NVIDIA 插件、KAI 0.18.6、GPU Fractioning 0.1.8；共享服务 `sm-sharing` |
| Legacy MPS 同参数对照 | 停止 GPU Fractioning；无 HAMi 注入；采集器自行管理 legacy MPS 服务 |
| 原生 / MPS 故障矩阵 | 停止 GPU Fractioning；采集器自行管理 v3 MPS 服务 |
| HAMi 故障测试 | HAMi 2.10.0 调度器与设备插件；无 MPS |

50% 算力、每实例 20 GiB 配置使用 `platform/hami-50pct-values.yaml`；未启用算力限制的配置使用 `platform/hami-fullstack-values.yaml` 或 `platform/hami-controlled-values.yaml`，显存配额同为每实例 20 GiB。通过官方 HAMi 2.10.0 chart 应用相应 values，节点添加 `gpu=on` 标签；webhook 仅匹配测试命名空间。GPU Fractioning 按发布版指南配置 KAI `default-queue` 和 `gpu-compute.mode: sm-sharing`。

## 运行性能测试

切换到对应平台后，分别运行全栈用例：

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fullstack --case native-default --case native-eager
# 先切换至 HAMi 设备插件。
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fullstack --case hami-default --case hami-eager
# 先切换至 KAI + GPU Fractioning。
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fullstack --case fractions-default --case fractions-eager
```

全栈使用自动 KV 和默认前缀缓存，Eager 仅增加 `--enforce-eager`。原生双实例部署先在每卡初始化一个实例，再启动第二个，避免并发显存 profiling 竞争：

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile native-pair-fullstack
```

同参数对照固定每实例 6 GiB KV、最大模型长度 4096、最大序列数 32，关闭前缀缓存。每次新部署采集三轮客户端压测；原生单实例并发 8，双实例各并发 4：

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile controlled
# Legacy MPS 测试前，先停止已安装的共享服务。
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile mps-controlled
```

可用 `--case` 选择已生成的用例，例如 `hami-pair-graph`。采集器检查实际 GPU 放置、已加载库、引擎参数、重启次数和 MPS 客户端归属，保留日志、AIPerf 导出及运行前后检查结果。失败记录会保留，便于排查。

## 50% 算力配置

生成独立配置目录：

```bash
python3 prepare.py --config config.json --out /var/tmp/hami-sharing-50pct --hami-core-limit 50
```

先通过 `platform/hami-50pct-values.yaml` 安装 HAMi，启用算力限制；生成的 worker 请求 `nvidia.com/gpucores: 50`。不同配置使用独立输出目录，采集器核验实际配额后才接受结果。HAMi 故障测试使用未启用算力限制的配置。

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-50pct --profile controlled --case hami-pair-graph --case hami-pair-eager
python3 reproduce.py --root /var/tmp/hami-sharing-50pct --profile fullstack --case hami-default --case hami-eager
python3 summarize_metrics.py --root /var/tmp/hami-sharing-50pct/controlled --out /var/tmp/hami-50pct-controlled.csv --allow-partial
python3 summarize_metrics.py --root /var/tmp/hami-sharing-50pct/fullstack --out /var/tmp/hami-50pct-fullstack.csv --allow-partial
```

## 运行故障矩阵

先停止其他模型负载和共享服务。原生 / MPS 矩阵在 GPU 0 上放置故障进程与健康进程，在 GPU 1 上放置健康对照。每事件两轮，健康进程重放 CUDA Graph 并检查输出；观察注入前 3 秒、注入后至少 6 秒。事件包括超额显存申请、非法 GPU 写入、trap、GPU 工作中未同步 SIGKILL，以及安全终止 MPS 客户端。

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fault
# HAMi 故障测试前，先安装未限算力的 HAMi 配置。
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile hami-fault
```

第二条命令先检查发布版 HAMi 库哈希、hook、20 GiB 显存上报及 21 GiB 申请被拒绝，再运行八组新 Pod 试验，并与原生 / MPS 对照合并。机器可读结果位于各故障目录的 `aggregate.json`、`conditions.csv`。

## 重新汇总指标

```bash
python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/fullstack --out /var/tmp/fullstack-points.csv
python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/controlled --total-concurrency 8 --out /var/tmp/controlled-points.csv
python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/mps-controlled --total-concurrency 8 --out /var/tmp/mps-points.csv
python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/native-pair-fullstack --out /var/tmp/native-pair-points.csv
```

部分用例尚未完成时可用 `--allow-partial`。汇总器拒绝未完成、请求失败、worker 缺失或实际 HAMi 配额与声明不符的结果，并分别输出实例吞吐求和与统一墙钟吞吐。TTFT、TPOT、E2E 的 p50/p99 是实例分位数的算术均值，不是集群请求合并后的分位数。三轮均值与样本标准差可从逐轮结果计算；同参数采集器也会写入 `aggregate.json`。

## 测试结果文件

CSV 汇总数据统一存放于 benchmark 仓库的 [results/2026-11-a100-sharing/](https://github.com/Project-HAMi/gpu-sharing-benchmarks/tree/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing)，测试报告引用同一快照。

## 来源与验证

`vendor/dynamo/run-sweep.sh` 为未修改的 Dynamo v1.6.1 负载客户端，SHA-256 为 `d8fde51c9841b7898eb12a27489e5601b7fab535736db74da8fd3d6713450d19`。Apache-2.0 许可见 `vendor/dynamo/LICENSE`，模板来源见 `NOTICE.md`，其余文件遵循 benchmark 仓库许可。

验证包括配置生成、源码编译、Shell 检查，以及对已归档 AIPerf 数据和 CUDA 故障结果的重新计算。
