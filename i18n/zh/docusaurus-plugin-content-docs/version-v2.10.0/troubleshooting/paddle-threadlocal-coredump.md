---
title: PaddlePaddle thread_local 分配器导致 vGPU 环境 CoreDump
---

## 现象

在 HAMi vGPU 环境运行 PaddlePaddle 推理任务，进程发生 core dump 崩溃，没有输出标准 CUDA OOM 报错。该问题仅在 vGPU 显存配额隔离场景出现，**物理裸机 GPU 无法复现**。

触发条件：业务侧显式设置环境变量 `FLAGS_allocator_strategy=thread_local`。

issue: https://github.com/Project-HAMi/HAMi/issues/2375

## 根因分析

`thread_local` 是 PaddlePaddle 非默认显存分配策略。开启后，**每一个CPU工作线程会创建独立的CUDA显存分配池**。

HAMi 会 hook `cuMemGetInfo`，向应用返回vGPU配额显存。每个线程初始化时，会按照 `FLAGS_fraction_of_gpu_memory_to_use` (在issue 2375中该值为 0.92) 预申请显存：

1. 第一个线程预占用绝大部分 vGPU 配额；
2. 后续线程同样尝试占用92%上报显存，迅速耗尽vGPU配额；
3. Paddle 内部GPU状态校验失败，抛出 `SIGABRT` 生成 core dump，而不是抛出常规OOM异常。

:::note该问题是 PaddlePaddle thread‑local分配器与vGPU显存配额机制的兼容性问题，**并非HAMi本身缺陷**。:::

## 排查命令

检查容器内进程实际生效的环境变量：

```bash
# paddle_infer 为示例名
PID=$(pgrep -x paddle_infer | head -1)
cat /proc/$PID/environ | tr '\0' '\n' | grep FLAGS_allocator_strategy
```

查找镜像或启动脚本中变量注入位置：

```bash
grep -rn "FLAGS_allocator_strategy" /app /workspace 2>/dev/null
```

## 解决方案（生产环境推荐）

从 Dockerfile、启动脚本、推理封装代码中移除手动设置的 `FLAGS_allocator_strategy=thread_local`，使用 PaddlePaddle 默认共享池分配器。

```bash
# 默认推荐
export FLAGS_allocator_strategy=auto_growth

# 稳定备选
export FLAGS_allocator_strategy=naive_best_fit
```

所有线程共用同一个 GPU 显存池，避免针对有限 vGPU 配额做线程独立预分配，防止 thread_local 分配器的 vGPU 配额预分配失败。

## 兼容兜底方案（不推荐生产使用）

如果业务强依赖 `thread_local` 多线程推理性能优化，需要降低单线程预分配比例，并且严格限制推理线程数量。

```bash
export FLAGS_allocator_strategy=thread_local
```

然后从以下两个参数中**二选一**：

```bash
export FLAGS_fraction_of_gpu_memory_to_use=0.25
```

**或**

```bash
export FLAGS_initial_gpu_memory_in_mb=2048
```

> **注意**：`FLAGS_initial_gpu_memory_in_mb` 会覆盖 `FLAGS_fraction_of_gpu_memory_to_use`，只需设置其中一个。
>
> 需要根据实际 vGPU 显存大小调参，线程建议控制 1‑2 个；线程数量较大时依然存在崩溃风险。

## 重要提示

1. 升级 HAMi 版本无法解决该问题，必须修改 Paddle 分配器相关环境变量。
2. `thread_local` 不是 PaddlePaddle 默认配置，一般由遗留业务脚本注入。
3. PaddleOCR 官方示例不会开启该分配策略。
