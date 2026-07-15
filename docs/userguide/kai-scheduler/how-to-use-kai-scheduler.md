---
title: How to use KAI Scheduler with HAMi
---

[KAI Scheduler](https://github.com/kai-scheduler/KAI-Scheduler) is NVIDIA's open source, Kubernetes-native scheduler for AI workloads. Starting with its next release, KAI Scheduler ships built-in GPU memory hard isolation powered by HAMi-core. You enable it with a single Helm flag, and a node-side component enforces the limit at the CUDA layer.

For the background on why KAI Scheduler needs HAMi-core and how the two projects divide the work, see [Ecosystem Integrations](../../core-concepts/ecosystem-integrations.md). For the announcement and the open source collaboration behind it, read the blog post: [HAMi-core Adopted by NVIDIA KAI Scheduler](/blog/hami-core-adopted-by-nvidia-kai-scheduler).

> The integration uses HAMi-core directly, not the full HAMi platform. KAI Scheduler keeps its own scheduling capability and brings in HAMi-core only for GPU memory isolation.

## How it works

KAI Scheduler schedules Pods and, through its Admission component, injects a `CUDA_DEVICE_MEMORY_LIMIT` environment variable into every container that requests shared GPU memory. A separate component, `kai-resource-isolator`, ships the HAMi-core library to each GPU node as a DaemonSet and uses a MutatingWebhook to inject the library and an `ld.so.preload` configuration into those Pods. At runtime, `libvgpu.so` intercepts CUDA memory allocation calls and enforces the cap. The result: `nvidia-smi` inside the container shows only the allocated slice, not the whole GPU.

This turns KAI Scheduler's cooperative GPU sharing (the scheduler keeps the sum of requests within a card, but does not physically stop oversubscription) into true hard isolation.

## Prerequisites

- A Kubernetes cluster with NVIDIA GPUs and the NVIDIA GPU operator or device plugin installed.
- KAI Scheduler supported from its next release. Confirm the version exposes `binder.plugins.hamicore.enabled` before you rely on this guide.
- Helm 3.

## 1. Install KAI Scheduler with the hamicore plugin

Install KAI Scheduler with GPU sharing enabled and the `hamicore` plugin activated:

```bash
helm install kai-scheduler oci://ghcr.io/nvidia/kai-scheduler \
  --set global.gpuSharing=true \
  --set binder.plugins.hamicore.enabled=true \
  --namespace kai-scheduler --create-namespace
```

`global.gpuSharing=true` turns on GPU sharing. `binder.plugins.hamicore.enabled=true` activates the `hamicore` plugin, which injects `CUDA_DEVICE_MEMORY_LIMIT` into containers that share a GPU.

## 2. Deploy kai-resource-isolator

Deploy the node-side component that ships HAMi-core and injects it into Pods:

```bash
helm install kai-resource-isolator oci://docker.io/projecthami/kai-resource-isolator \
  --namespace kai-resource-isolator --create-namespace \
  --version 1.0.0-chart
```

Chart versions carry a `-chart` suffix, for example `1.0.0-chart`. See available versions on [Docker Hub](https://hub.docker.com/r/projecthami/kai-resource-isolator/tags). For customization options, see the [kai-resource-isolator repository](https://github.com/Project-HAMi/KAI-resource-isolator).

After this, any Pod scheduled by KAI Scheduler with a `gpu-fraction` or `gpu-memory` annotation automatically gets memory isolation.

## 3. Schedule an isolated GPU Pod

Request 4096 MiB of GPU memory by annotating the Pod and setting the scheduler to `kai-scheduler`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-sharing-with-isolation
  labels:
    kai.scheduler/queue: default-queue
  annotations:
    gpu-memory: "4096" # unit is MiB, no suffix
spec:
  schedulerName: kai-scheduler
  containers:
    - name: gpu-workload
      image: nvidia/cuda:12.9.2-base-ubuntu24.04
      command: ["sleep", "infinity"]
```

## Verify isolation

Exec into the Pod and run `nvidia-smi`. It reports only the allocated memory, not the full GPU memory. The container cannot allocate beyond the cap.

```bash
kubectl exec -it gpu-sharing-with-isolation -- nvidia-smi
```

## Opt out of isolation

To skip isolation when you need it:

- **Single Pod**: add the annotation `kai-resource-isolator.io/inject: "false"`.
- **Entire namespace**: add the label `kai-resource-isolator.io/webhook=ignore`.

## Memory value precision

The `gpu-memory` annotation accepts an integer number of MiB (no unit suffix). KAI Scheduler internally converts it into a two-decimal GPU fraction and multiplies by the total GPU memory to compute the enforced cap. The value `nvidia-smi` reports may differ slightly from the request. For example, requesting `4096` on a 15360 MiB T4 rounds to a `0.27` fraction, and the final enforced cap is `4147m`.

## Related links

- Upstream guide: [HAMi resource isolation in KAI Scheduler](https://github.com/kai-scheduler/KAI-Scheduler/blob/main/docs/gpu-sharing/hami/README.md)
- Isolator component: [kai-resource-isolator](https://github.com/Project-HAMi/KAI-resource-isolator)
- KAI Scheduler: [github.com/kai-scheduler/KAI-Scheduler](https://github.com/kai-scheduler/KAI-Scheduler)
- HAMi project: [github.com/Project-HAMi/HAMi](https://github.com/Project-HAMi/HAMi)
