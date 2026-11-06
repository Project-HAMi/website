---
title: GPU 共享测试复现指南
sidebar_label: 测试复现指南
description: 复现 A100 上原生 vLLM、HAMi 与 GPU Fractioning 的共享性能和 GPU 故障测试。
translated: true
---

测试结果见[测试报告](./gpu-sharing-benchmarks.md)。

## 获取测试代码

```bash
git clone https://github.com/Project-HAMi/gpu-sharing-benchmarks.git
cd gpu-sharing-benchmarks
```

## 环境准备

使用专用 Linux GPU 节点：

- 2× A100-SXM4-40GB，每卡 108 SM；驱动 615.71.10，CUDA 13.4 MPS 工具。
- Ubuntu 24.04.5、单节点 K3s 1.37.1+k3s1、NVIDIA Container Toolkit 1.20.1；使用 `nvidia` RuntimeClass 和 CDI 设备选择。
- Dynamo 1.6.1、etcd、NATS。
- HAMi 2.10.0，或 KAI 0.18.6 + GPU Fractioning 0.1.8，按测试组切换。
- Python 3.11 或更新版本、AIPerf 0.13.0、`kubectl`、`helm`、`jq`、`curl`、`vmstat`；故障与 MPS 用例需要免密 `sudo`。
- GPU 客户端使用非 root UID/GID 1000。Legacy MPS 服务使用相同 UID；v3 故障测试服务以 root、多用户模式运行。

参照 [Dynamo GPU 共享部署指南](https://github.com/ai-dynamo/dynamo/tree/v1.6.1/examples/gpu-sharing)准备平台与模型缓存，使用 Dynamo 1.6.1 和 AIPerf 0.13.0。将 `Qwen/Qwen3-4B` 的 `1cfa9a7208912126459214e8b04321603b3df60c` 版本缓存到 `/opt/hf-cache/hub`。压测客户端在 GPU 节点上通过 ClusterIP 访问服务。

```bash
python3 -m venv /var/tmp/aiperf-013
/var/tmp/aiperf-013/bin/python -m pip install aiperf==0.13.0
```

将本地配置中的 `aiperf_executable` 设为 `/var/tmp/aiperf-013/bin/aiperf`。分别使用官方 [HAMi 2.10.0 chart](https://github.com/Project-HAMi/HAMi/tree/v2.10.0/charts/hami) 和 [GPU Fractioning 0.1.8](https://github.com/kai-scheduler/gpu-fractioning/tree/v0.1.8)；后者配合 KAI 0.18.6。

## 生成测试配置

复制 `config.example.json` 为 `config.json`，填写节点名、两个 GPU UUID、AIPerf 路径和模型缓存路径。GPU UUID 可通过 `nvidia-smi --query-gpu=uuid --format=csv,noheader` 查询。

```bash
python3 prepare.py --config config.json --out /var/tmp/hami-sharing-run
```

全栈测试每卡总并发为 2、4、8、16、32，双实例各承担一半；同参数对照为每卡总并发 8。默认关闭 HAMi 算力限制，50% 性能测试配置见下文。

## 按测试组选择平台

原生 NVIDIA 设备插件与 HAMi 设备插件不能同时上报同一批物理 GPU。

| 用例 | 平台要求 |
| --- | --- |
| 全栈 `native-*` | 原生 NVIDIA 设备插件；无 HAMi 注入或 MPS |
| 全栈 `hami-*`、同参数对照 | HAMi 2.10.0 调度器与设备插件；无 MPS |
| 原生双实例全栈 | 通过 CDI 显式绑定 GPU；无 HAMi 注入或 MPS |
| 全栈 `fractions-*` | 原生 NVIDIA 插件、KAI 0.18.6、GPU Fractioning 0.1.8；共享服务 `sm-sharing` |
| Legacy MPS 同参数对照 | 停止 GPU Fractioning；无 HAMi 注入；采集器自行管理 legacy MPS 服务 |
| 原生 / MPS 故障矩阵 | 停止 GPU Fractioning；采集器自行管理 v3 MPS 服务 |
| HAMi 故障测试 | HAMi 2.10.0 调度器与设备插件；无 MPS |

50% 算力、每实例 20 GiB 配置使用 `platform/hami-50pct-values.yaml`；未启用算力限制的配置使用 `platform/hami-fullstack-values.yaml` 或 `platform/hami-controlled-values.yaml`，显存配额同为每实例 20 GiB。通过官方 HAMi 2.10.0 chart 应用相应 values，节点添加 `gpu=on` 标签。GPU Fractioning 按发布版指南配置 KAI `default-queue` 和 `gpu-compute.mode: sm-sharing`。

## 运行性能测试

运行全栈用例：

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fullstack --case native-default --case native-eager
# 先切换至 HAMi 设备插件。
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fullstack --case hami-default --case hami-eager
# 先切换至 KAI + GPU Fractioning。
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile fullstack --case fractions-default --case fractions-eager
```

全栈测试使用自动 KV 和默认前缀缓存，Eager 仅增加 `--enforce-eager`。原生双实例全栈测试命令为：

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile native-pair-fullstack
```

同参数对照固定每实例 6 GiB KV、最大模型长度 4096、最大序列数 32，关闭前缀缓存。每次新部署采集三轮客户端压测；原生单实例并发 8，双实例各并发 4：

```bash
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile controlled
# Legacy MPS 测试前，先停止已安装的共享服务。
python3 reproduce.py --root /var/tmp/hami-sharing-run --profile mps-controlled
```

可用 `--case` 选择同参数对照用例，例如 `hami-pair-graph`。

## 50% 算力配置

生成独立配置，设置新的 `namespace_prefix`（最长 19 个字符，使用小写 DNS 标签格式）。

```bash
jq '.namespace_prefix = "sharing-bench-50pct"' config.json > config.50pct.json
python3 prepare.py --config config.50pct.json --out /var/tmp/hami-sharing-50pct --hami-core-limit 50
```

通过 `platform/hami-50pct-values.yaml` 安装 HAMi，启用 50% 算力配额后运行：

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

HAMi 配额预检在 20 GiB 限额下申请 21 GiB，随后运行八组故障试验，其中超额显存用例申请可见容量的两倍。结果位于各故障目录的 `aggregate.json`、`conditions.csv`。

## 重新汇总指标

```bash
python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/fullstack --out /var/tmp/fullstack-points.csv
python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/controlled --total-concurrency 8 --out /var/tmp/controlled-points.csv
python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/mps-controlled --total-concurrency 8 --out /var/tmp/mps-points.csv
python3 summarize_metrics.py --root /var/tmp/hami-sharing-run/native-pair-fullstack --out /var/tmp/native-pair-points.csv
```

部分用例尚未完成时可用 `--allow-partial`。CSV 分别输出每卡实例吞吐之和与统一墙钟吞吐。TTFT、TPOT、E2E 的 p50/p99 是实例分位数的算术均值，不是集群请求合并后的分位数。同参数对照的三轮均值与样本标准差见 `aggregate.json`。

## 测试结果文件

结果目录：[results/2026-11-a100-sharing/](https://github.com/Project-HAMi/gpu-sharing-benchmarks/tree/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing)。

| 文件 | 内容 |
| --- | --- |
| [fullstack.csv](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fullstack.csv) | 五档并发的全栈吞吐与延迟；HAMi 启用 50% 算力 |
| [controlled.csv](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled.csv) | 总并发 8 的固定 KV 对照；HAMi 启用 50% 算力 |
| [hami-50pct-trials.csv](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/hami-50pct-trials.csv) | HAMi 50% 固定 KV 逐轮客户端结果 |
| [fullstack-unlimited.csv](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fullstack-unlimited.csv) | HAMi 关闭算力限制的全栈对照 |
| [controlled-unlimited.csv](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/controlled-unlimited.csv) | HAMi 关闭算力限制的固定 KV 对照 |
| [fault-isolation.csv](https://raw.githubusercontent.com/Project-HAMi/gpu-sharing-benchmarks/e9b205bb121c50649bb97d7ed5dc4f796a9e523f/results/2026-11-a100-sharing/fault-isolation.csv) | CUDA 故障计数与错误码；HAMi 关闭算力限制 |

## 代码来源

负载脚本 `vendor/dynamo/run-sweep.sh` 来自 Dynamo v1.6.1。Apache-2.0 许可见 `vendor/dynamo/LICENSE`，模板来源见 `NOTICE.md`。
