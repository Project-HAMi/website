---
title: "AI Agent Can Now Manage Kubernetes GPU Resources Directly"
date: "2026-05-28"
description: "A real-world test of kagent and HAMi: one physical GPU virtualized into 10 vGPUs, an AI Agent managing Kubernetes workloads via CRDs, and Agent-to-Agent collaboration - all running on open-source models."
authors: [mesut_oezdil]
tags: ["HAMi", "kagent", "GPU Virtualization", "AI Agent", "Kubernetes", "vGPU", "Cloud Native"]
---

Source: [mesutoezdil.substack.com](https://mesutoezdil.substack.com/p/kagent-hami-on-nebius-2-cncf-projects)  
GitHub Repo: [kagentWithHami](https://github.com/mesutoezdil/kagentWithHami)  
Chinese translation by Jimmy Song, originally published on [WeChat](https://mp.weixin.qq.com/s/WNzZh02_1CbMbVBfi4eRGw)

---

## Before We Start

This is not a documentation summary.

Every command you see below was executed by me personally on a Nebius VM. Every output is from that machine.

When things failed, I debugged them. When things worked, I explain why they worked. The errors in this article are real errors; the fixes are fixes I verified myself.

If you run these commands in the same environment, you will get the same results.

Complete repository (all manifests and setup script):

https://github.com/mesutoezdil/kagentWithHami

Scope note: this article covers the core parts. The full installation flow, all manifests, complete troubleshooting guide, and setup script are in the GitHub repository. If you want to reproduce this, start there.

If you haven't worked with HAMi before:

https://medium.com/@mesutoezdil/hami-in-a-real-kubernetes-environment-e8eaa872f388

If you want to see GPU observability tooling tests:

https://mesutoezdil.substack.com/p/i-tested-every-feature-of-ingero

## What This Article Is Actually About

kagent turns AI Agents into Kubernetes resources.

Your system prompt, tools, and model config all exist as CRDs.

You can:

- Version-control them with Git
- Deploy them with Helm
- Inspect them with kubectl

HAMi implements GPU virtualization at the Kubernetes scheduler layer.

One physical NVIDIA L40S becomes 10 virtual GPUs in Kubernetes, with strict VRAM limits enforced at the CUDA Driver level.

Nebius Token Factory is an OpenAI-compatible inference service.

All tests in this article use Llama 3.3 70B.

The question I wanted to answer:

> "Can an AI Agent, running inside a Kubernetes cluster, using only open-source models, manage GPU-virtualized workloads?"

The answer is yes.

<!-- truncate -->

## Test Machine

```
GPU:  1x NVIDIA L40S (46GB VRAM)
CPU:  8 vCPUs
RAM:  32GB
OS:   Ubuntu 24.04 LTS for NVIDIA GPUs (CUDA 13)
```

```
nvidia-smi
| NVIDIA-SMI 580.126.09    CUDA Version: 13.0      |
|   0  NVIDIA L40S    0MiB / 46068MiB    0%        |
```

46GB VRAM. Completely idle.

By the end of this article, it becomes 10 virtual GPUs.

## 1. Install k3s and Helm

k3s is the right choice for a single-node environment.

```bash
curl -sfL https://get.k3s.io | sh -
```

(Subsequent commands follow as in the repository; full walkthrough in the GitHub repo.)

## 2. Install kagent

kagent ships two Helm charts.

Install the CRDs first, then the main chart.

This lets you upgrade CRDs independently without affecting running Agents.

```bash
helm install kagent-crds \
  oci://ghcr.io/kagent-dev/kagent/helm/kagent-crds \
  --namespace kagent
```

Then install the main chart, wired to the Nebius Token Factory endpoint.

## 3. Install HAMi

Without HAMi, Kubernetes sees no GPU at all:

```json
{"cpu": "8", "memory": "32865164Ki", "pods": "110"}
```

No `nvidia.com/gpu`.

After installing HAMi:

```json
{
  "cpu": "8",
  "memory": "32865164Ki",
  "nvidia.com/gpu": "10",
  "pods": "110"
}
```

One physical GPU, virtualized into 10.

## 4. First Agent Call

The LLM automatically:

- Calls the Kubernetes API
- Fetches resources
- Summarizes the result

Final output:

> "The cluster has 25 running pods across different namespaces, including kagent and kube-system."

## 5. GPU Check

Before HAMi:

> "The node does not have any GPUs available."

After HAMi:

> "The node nebius-tarantula has 10 GPUs available, type NVIDIA L40S."

The Agent reads and understands HAMi's Kubernetes annotations.

## 6. Self-Inspection Test

The Agent describes itself using the Kubernetes API.

It:

- Finds its own CRD
- Reads its own system prompt
- Reads its own tool list
- Explains its own architecture

An Agent reading and explaining its own definition via live API calls.

## 7. Create a Custom Agent

Created an SRE orchestrator that delegates metrics queries to a `promql-agent`.

The key mechanism:

```yaml
type: Agent
```

This enables Agent-to-Agent (A2A) delegation.

## 8. Agent Talks to Agent

Two separate Agents with:

- Independent sessions
- Independent context windows
- Independent PostgreSQL storage

The orchestrator sees only the sub-agent's final result, not its internal reasoning.

## 9. Agent Creates a HAMi GPU Pod

The Agent automatically creates a pod with:

```yaml
annotations:
  nvidia.com/gpumem: "20000"
```

Then:

- First pod allocated 20,000 MiB
- Second pod allocated 15,000 MiB

Both pods co-scheduled to the same physical GPU.

HAMi handles GPU sharing correctly.

## 10. Overcommit Protection

When requesting:

```yaml
nvidia.com/gpu: 11
```

but the cluster only has 10 virtual GPUs:

```
Warning  FailedScheduling  hami-scheduler
```

The pod stays Pending.

HAMi does not schedule requests it cannot satisfy.

## 11. HAMi Metrics

HAMi exposes standard Prometheus metrics:

- `HostCoreUtilization`
- `HostGPUMemoryUsage`
- `hami_build_info`

Plugs directly into existing monitoring stacks.

## 12. kagent CLI

The kagent CLI shows:

- Agents
- Sessions
- A2A sub-sessions
- Delegation latency

All state stored in PostgreSQL.

**A2A Agent Card**

Every Agent exposes:

```
/.well-known/agent-card.json
```

Used for capability discovery in multi-agent systems.

## What Did Not Work

**Memory CRD** - only Pinecone is supported right now.

**kmcp init** - not available in v0.8.6.

**Ubuntu + HAMi + sleep** - if the image is missing CUDA libraries, even a `sleep` container fails to start.

**HAMi WebUI** - requires a separate installation step.

## Why This Combination Makes Sense

Your deployment specs live in Git.

Your network policies live in Git.

Your RBAC rules live in Git.

Why shouldn't your AI Agent's system prompts?

kagent makes that possible.

HAMi solves GPU resource waste without modifying workloads.

Together:

An AI Agent can observe, understand, and manage GPU-virtualized infrastructure from inside a Kubernetes cluster.

And it does this:

- Using open-source models
- Without depending on closed-source AI providers
- Running entirely inside Kubernetes

---

## Summary

One NVIDIA L40S, split into 10 virtual GPUs by HAMi. An AI Agent deployed as a Kubernetes CRD via kagent. A2A delegation across independent sessions. All running on an open-source model with no closed-source dependencies.

The combination works end to end: the Agent reads HAMi annotations, schedules GPU pods, detects overcommit, and queries Prometheus metrics - entirely from inside the cluster.

Full manifests and setup script: [github.com/mesutoezdil/kagentWithHami](https://github.com/mesutoezdil/kagentWithHami)
