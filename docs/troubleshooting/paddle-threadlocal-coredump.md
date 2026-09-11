
---
title: PaddlePaddle CoreDump Issue with thread_local Allocator on vGPU
---

## Symptoms
PaddlePaddle inference process crashes with core dump on HAMi virtual GPU.
No standard CUDA OOM error is printed.
This issue only occurs under vGPU memory quota limitation and **cannot be reproduced on bare‑metal GPUs**.

Trigger condition: environment variable `FLAGS_allocator_strategy=thread_local` is explicitly set by user workload.

issue: https://github.com/Project-HAMi/HAMi/issues/2375

## Root Cause
`thread_local` is a non‑default memory allocation strategy of PaddlePaddle.
When enabled, **each CPU worker thread creates an independent CUDA memory allocator pool**.

HAMi hooks `cuMemGetInfo` and returns vGPU memory quota to applications.
Each thread will pre‑reserve `0.92` (default value of `FLAGS_fraction_of_gpu_memory_to_use`) of the reported GPU memory.

1. The first thread occupies most of the vGPU memory quota.
2. Subsequent threads also try to reserve 92% of reported memory and quickly run out of vGPU quota.
3. Internal Paddle GPU sanity check fails, raises `SIGABRT` and generates core dump instead of throwing normal CUDA OOM exception.
:::note
This is a compatibility issue between PaddlePaddle thread‑local allocator and vGPU memory quota mechanism, **not a HAMi bug**.
:::
## Troubleshooting Commands
Check real runtime environment variable inside container:
```bash
# paddle_infer is a sample name
PID=$(pgrep -x paddle_infer | head -1)
cat /proc/$PID/environ | tr '\0' '\n' | grep FLAGS_allocator_strategy
```
Locate where this variable is injected in image or startup scripts:
```base
grep -rn "FLAGS_allocator_strategy" /app /workspace 2>/dev/null
```

## Resolution (Recommended for production)

Remove manual `FLAGS_allocator_strategy=thread_local` from Dockerfile, startup scripts or inference wrapper code.
Use PaddlePaddle default shared‑pool allocator.

```base 
# Default recommended
export FLAGS_allocator_strategy=auto_growth

# Stable alternative
export FLAGS_allocator_strategy=naive_best_fit
```

All threads share one unified GPU memory pool, avoid exclusive pre‑allocation against limited vGPU quota, core‑dump will be eliminated.

## Workaround (NOT for production)

If your business strongly depends on `thread_local` multi‑thread performance optimization, reduce per‑thread pre‑allocation fraction and strictly limit inference thread count.

```base
export FLAGS_allocator_strategy=thread_local
export FLAGS_fraction_of_gpu_memory_to_use=0.25
# FLAGS_initial_gpu_memory_in_mb takes precedence over FLAGS_fraction_of_gpu_memory_to_use
# Only set one of them
# export FLAGS_initial_gpu_memory_in_mb=2048
```

>
> Tune values according to your actual vGPU memory size. Keep worker thread count between 1‑2. Coredump risk still exists with large thread numbers.

## Notice

1. Upgrading HAMi cannot resolve this issue. You must adjust Paddle allocator environment variables.
2. `thread_local` is **not PaddlePaddle default value**, usually injected by legacy business scripts.
3. Official PaddleOCR examples do not enable this allocator strategy by default.