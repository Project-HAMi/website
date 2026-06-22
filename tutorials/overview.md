---
title: Tutorials
slug: /
---

import LabCardGrid from '@site/src/components/labs/LabCardGrid';

Hands-on tutorials for learning HAMi by doing. Each lab is a step-by-step exercise with real, captured outputs: you build a cluster, install HAMi, and verify GPU partitioning behavior yourself.

## Concepts

Background knowledge that the labs build on.

- [GPU Software Stack Overview](/docs/core-concepts/gpu-stack): the 5 layers from hardware to Kubernetes scheduling
- [Understanding GPU Drivers](/docs/core-concepts/gpu-driver): kernel modules, NVML, and how to troubleshoot from the bottom up
- [HAMi Cluster Architecture](/docs/core-concepts/hami-architecture): every component in a HAMi cluster and what breaks without it

## Labs

<LabCardGrid items={[ { href: '/tutorials/labs/online-install', title: 'Lab 1: Online Installation', description: 'Build a GPU Kubernetes cluster from scratch on a cloud VM and install HAMi.', level: 'Beginner', duration: 'about 60 minutes', }, { href: '/tutorials/labs/local-fake-gpu', title: 'Lab 2: Local Fake GPU Setup', description: 'Learn the HAMi control plane on a laptop, no GPU required.', level: 'Beginner', duration: 'about 30 minutes', }, { href: '/tutorials/labs/gpu-partitioning', title: 'Lab 3: GPU Partitioning', description: 'Run multiple Pods on one GPU with enforced VRAM and compute limits.', level: 'Intermediate', duration: 'about 30 minutes', }, { href: '/tutorials/labs/hami-dra', title: 'Lab 4: GPU Slicing with DRA', description: 'The same outcome through Kubernetes-native Dynamic Resource Allocation (experimental).', level: 'Advanced', duration: 'about 45 minutes', }, ]} />

Each lab lists its own prerequisites. Labs 3 and 4 continue from the cluster Lab 1 builds, so a single session covers all three; Lab 2 runs on any laptop with no GPU required.
