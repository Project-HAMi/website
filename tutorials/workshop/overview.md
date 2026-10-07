---
title: HAMi Workshop
description: "A scenario-driven learning path that follows one team from a single GPU server to a shared, multi-team GPU cluster, with the principle behind each step."
sidebar_label: Overview
slug: /workshop
---

The HAMi Workshop is a learning path with a clear start and end. All chapters follow one story: a small AI team, one GPU cluster, and the problems they run into as they grow. Each chapter starts with a problem you reproduce, explains the principle behind it, and then shows how HAMi solves it.

## Who It Is For

You know basic Linux and Kubernetes (Pods, Deployments, `kubectl`), but you have never run GPUs on Kubernetes, or have run them without looking into how they work. No prior HAMi knowledge is required.

By the end of the workshop you should be able to:

- Explain the full path a GPU takes in Kubernetes, from hardware to scheduling, and where the native approach falls short
- Explain what problem each HAMi component solves and at which step it steps in
- Deploy HAMi on a real GPU environment and verify sharing, isolation, and scheduling policies
- Run real inference workloads on HAMi GPU shares
- Locate a problem layer by layer when something breaks

## The Story

A small AI team starts with a single GPU server. As the team, the models, and the services grow, they run into problems one after another: not enough GPUs, noisy neighbors, fragmentation, teams competing for capacity, and outages. Each chapter is one stage of that story, and every chapter continues on the cluster the previous one left behind.

## Learning Path

| Chapter | Scenario | What you learn |
| --- | --- | --- |
| [1. Setup](./setup.md) | The team checks its first GPU node | The 5-layer GPU stack, and why it is checked bottom up before HAMi enters the picture |
| [2. One GPU, one Pod](./one-gpu-one-pod.md) | The team deploys its first model | The device plugin mechanism, and why native GPU resources are whole cards |
| [3. Let's just share it](./lets-just-share-it.md) | Several Pods share one GPU | What time-slicing, MPS, and MIG can and cannot do, and how scheduling differs from isolation |
| [4. Enter HAMi](./enter-hami.md) | The team needs slicing plus isolation | The Pod path through the webhook, scheduler extender, device plugin, and HAMi-core |
| 5. More cards, where to put them | The cluster grows to more cards and nodes | Scheduling policies, scoring, and why fragmentation happens |
| 6. Running real models | Inference services on shared cards | How inference engines manage GPU memory on a sliced card |
| 7. Seeing it | Who uses how much | Allocation view versus usage view, and where the metrics come from |
| 8. Many teams, quotas | Several teams compete for GPUs | How admission control and scheduling divide the work |
| 9. Something broke | Production incidents | Bottom-up diagnosis along the 5-layer model |
| 10. Where to go next | Going deeper | Branches into the existing [Labs](/tutorials/category/labs) |

Chapters without a link are still being written.

## Environment

The main path runs on real NVIDIA GPUs throughout. It starts with one cloud VM with a single NVIDIA T4 and grows to more cards and nodes in Chapter 5. Each chapter states the versions it was verified with.

## How Each Chapter Works

Every chapter follows the same structure:

1. **Scenario**: what happens to the team in this chapter
2. **What you'll understand**: the concepts the chapter explains
3. **See the problem first**: reproduce the pain point with real output
4. **The principle behind it**: the mechanism, with links to the matching concept pages
5. **Solve it**: the steps, real output, and why each step is needed
6. **Verify**: evidence that the result holds
7. **Common pitfalls**: the most likely mistakes and how to diagnose them
8. **Checkpoint**: a few questions to check your understanding
9. **Hand-off**: the state the next chapter expects
10. **Further reading**: related concept pages and labs

Commands and outputs in every chapter come from a real run in the stated environment.

## Workshop or Labs?

Use the workshop to learn HAMi systematically from zero. Use the [Labs](/tutorials/category/labs) when you want to verify one specific feature or integration. The workshop links to the relevant labs as electives along the way.
