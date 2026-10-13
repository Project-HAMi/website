---
title: AMD GPU test status
sidebar_label: Test status
---

This page summarizes what was checked on a real AMD GPU, what was found and what is left. The full record, with one line for every merged pull request, is in [STATUS.md](https://github.com/Project-HAMi/amd-device-plugin/blob/main/STATUS.md), and a short guide to the project is in [ONBOARDING.md](https://github.com/Project-HAMi/amd-device-plugin/blob/main/ONBOARDING.md). Both files cover the [amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin) and [amd-hami-core](https://github.com/Project-HAMi/amd-hami-core) repositories and the AMD pull requests of [HAMi](https://github.com/Project-HAMi/HAMi).

## How it was tested

- A real AMD Instinct MI325X (one GPU, shown to the machine as a virtual function) with k3s, the HAMi scheduler and the plugin built from `main`, on kernel 6.8 and then 7.0. The `dmem` memory cap needs kernel 6.14 or newer.
- Also run on that machine: the real AMD Device Metrics Exporter, the upstream ROCm plugin as a second DaemonSet, the published 0.0.2 and 0.0.3 images, UBI, alpine, fedora and old glibc images, ROCm 6.2 and 7.2, and the example pods (PyTorch, TensorFlow, JAX and vLLM).
- Several GPUs were simulated for the HAMi scheduler only, with extra GPUs written into the node registration.

## What was verified

- **Slices and CU masks:** disjoint across pods, and pinned against `setenv`. In a 25 percent slice a compute kernel ran at 215 kernels per second. Setting `HSA_CU_MASK` from inside the process widened it to 1015 without the library and left it at 215 with the library.
- **Memory limits:** with a 1 GiB limit, `hipMalloc3D`, arrays, pools and `hipMemCreate` all returned out-of-memory and `hipMemGetInfo` reported 1 GiB. Three processes that each asked for 1.5 GiB under a 4 GiB limit: exactly two succeeded, in each of three rounds. A vLLM engine ran inside a 25 percent slice and saw 16384 MiB.
- **The `dmem` cap** on kernel 7.0, and the per-container metrics that are read from it.
- **Queue priority:** two processes on one 25 percent slice got 144.7 and 72.3 kernels per second with `AMD_TASK_PRIORITY` 0 and 3, against about 108.6 each without a priority.
- **Plugin lifecycle:** upgrades and rollbacks of the published 0.0.2 and 0.0.3, restarts of kubelet (allocatable was back in 6 seconds and running pods kept running), CDI, and a second plugin that kubelet refuses.
- **Health:** the real Device Metrics Exporter keeps a healthy GPU at the full share count, and a test exporter moved it to 0 with a node event.
- **HAMi scheduler features:** memory percentage, namespace ResourceQuota, the `mutex` policy (and `binpack,mutex`), NUMA and link binding, `runtimeClassName`, round-up of core requests to whole WGPs, and the end-to-end suite (9 specs passed, 0 failed, 2 skipped).
- **The examples** in this documentation: all eight example manifests were applied on the GPU. The whole-GPU, cores, memory and memory percentage pods ran, and the type and UUID ones ran or stayed `Pending` with `CardTypeMismatch` or `CardUuidMismatch`, as their comments say.
- **The C tests** of the memory library pass under AddressSanitizer, UBSan and ThreadSanitizer, and the glibc 2.34 check passes.

## Problems found and fixed

Re-running every merged pull request found these real problems. All are fixed.

- A pod that HAMi did not schedule failed at start with `no binding pod found`.
- A firmware test failed on kernel 7.0 because a debugfs line has a new field.
- With `muslFailClosed`, the first pod that used a new image failed, and so did every retry.
- Turning `reportNodeCapacity` off left the old values on the node.
- The images were built with a Go release that has known standard library vulnerabilities, and `go.mod` used a development tag of gRPC.
- With `-resource_naming_strategy=mixed` a virtual function was named `amd.com/spx_nps1` and `amd.com/gpu` went to zero.
- The registration said 0 XCC per partition for `dpx`, `qpx` and `cpx`, because AMD SMI lists XCC for the current profile only.
- On HAMi master a GPU registered with an empty type was never picked, so the pod stayed `Pending` with `NodeInsufficientDevice`. This is fixed in HAMi.
- A pod with an init container got no slice limits (no CU mask, no VRAM cap, no hook and no `dmem` cap), because the plugin indexed the app containers without skipping the init container slots that HAMi writes first, so `Allocate` fell back to a whole GPU. This was found on an RX 9070 XT and is fixed.

## What is not verified

- **Several GPUs, XGMI, NUMA and policy order.** Only the scheduler decision was run, with extra GPUs written into the registration. A real multi-GPU Instinct node is needed.
- **Compute partitions (`dpx`, `qpx`, `cpx`).** A virtual function keeps working in both operating modes and a flip is skipped with a log line, but the flip itself, XCP registration and pods on partitions need a bare-metal MI300, MI325 or MI355. Run the plugin with `OPERATING_MODE=partition` and `COMPUTE_PARTITION` set.
- **RDNA cards.**
- **A real hardware fault** reported by the Device Metrics Exporter.
- **XNACK**, a `hipMalloc` larger than VRAM that is served from host memory (XNACK is off on a virtual function).
- **The two-GPU JAX example and the vLLM model download.** The model download needs a node that can reach Hugging Face.
- **Release, arm64 and other Kubernetes versions.**

## Open questions

- **Cores default.** A request without `amd.com/gpucores` gets all CUs, so a pod that sets only `amd.com/gpumem` blocks the GPU's compute. Set `amd.com/gpucores` on every pod that should share a GPU.
- **k3s paths.** The `muslFailClosed` chart defaults are RKE2 paths, so on k3s two values must be set (see [Configuration](./configuration.md#musl-fail-closed)).
