---
title: AMD Instinct vGPU 支持
sidebar_label: AMD Instinct vGPU
---

## 1. 背景

本提案为 AMD ROCm GPU 增加 Pod 级别的**显存限制**和**计算单元（Compute Unit，CU）划分**，让多个 Pod 可以共享同一块 Instinct GPU。

## 2. 目标

- 支持按显存（`amd.com/gpumem`，单位 MiB）和算力（`amd.com/gpucores`，百分比）进行细粒度分配。
- 在多个 Pod 之间按 CU 做独占、互不重叠的划分。
- 支持所有 AMD ROCm GPU 类型：CU 掩码先在非 WGP 设备（CDNA）上落地，再扩展到支持 WGP 的设备（RDNA），后者的掩码需要按 CU 对对齐。
- 沿用 HAMi 现有的架构设计来实现上述功能。

## 3. 实现思路

**为什么用 LD_AUDIT 而不是 LD_PRELOAD？** 我们在 ROCm 7.x 上做原型时发现，LD_PRELOAD 会破坏 HIP：拦截 HIP 符号后，HIP 内部调用会递归地重新进入拦截层。换成只拦截跨库符号绑定的 LD_AUDIT（`la_symbind64`）后，问题就解决了。现有 NVIDIA 的 LD_PRELOAD 路径保持不变。

**CU 掩码相比硬件分区（CPX/NPS）的优势。** 掩码方式（`HSA_CU_MASK`）在容器启动时就能为每个 Pod 分配细粒度且硬件合法的 CU 分区（[AMD 文档](https://rocm.docs.amd.com/en/latest/reference/system-optimization/gpu-isolation.html)）。而硬件分区（CPX/NPS）只能按固定的 XCD 粒度切分，并且是按物理 GPU 整卡设置的。

**WGP 成对约束与落地范围。** ROCm 文档说明，并不是所有 CU 掩码在所有设备上都合法：如果 GPU 上两个 CU 组成一个 Work Group Processor（WGP），并且 kernel 以 WGP 模式运行，那么只禁用一对 CU 中的一个是非法的（[设置 CU](https://rocm.docs.amd.com/en/latest/reference/system-optimization/gpu-isolation.html)）。WGP 是 **RDNA**（GFX10+）架构中的概念，HIP 在 RDNA 硬件模型下对它做了说明（[HIP 硬件实现](https://rocm.docs.amd.com/projects/HIP/en/latest/understand/hardware_implementation.html)）。**CDNA** 设备（例如 Instinct MI300X，`gfx942`）的 CU 彼此独立，不受这条成对规则约束。

本设计的目标是支持**所有 AMD ROCm GPU 类型**。第一阶段先在**非 WGP** 设备（CDNA / Instinct）上实现，这类设备选择 CU 范围时不需要考虑成对对齐。支持 WGP 的设备（RDNA）后续再跟进，届时必须按相邻的 CU 对来选择掩码，保证 `HSA_CU_MASK` 在硬件上合法。

## 4. 协议（调度器 `<->` device plugin）

对于 AMD 设备，调度器写入 AMD 专用的 Pod 注解；device plugin 在每个容器的分配响应中注入 `ROCR_VISIBLE_DEVICES`、`HSA_CU_MASK` 和 `HIP_DEVICE_MEMORY_LIMIT`。

### 4.1 节点注册（device plugin -> 节点注解）

注册信息写在 `hami.io/node-amd-register` 注解中，格式为 JSON，内容是一个 `DeviceInfo` 数组，例如：

```json
[
  {
    "id": "<device-id>",
    "index": 0,
    "count": 1,
    "devmem": 196608,
    "devcore": 304,
    "type": "AMD Instinct MI300X VF",
    "numa": 0,
    "mode": "hami-core",
    "health": true
  }
]
```

- `devmem`：设备总显存，单位 MiB（例如 MI300X 为 196608）。
- `devcore`：CU 总数（例如 MI300X 为 304）。
- `id`：设备标识。

### 4.2 Pod 分配（调度器 -> Pod 注解 -> Allocate）

调度器的分配结果写入 **AMD 专用**的键：

```text
hami.io/amd-devices-to-allocate: <UUID>,<type>,<memMiB>,<cuCount>:;
hami.io/amd-devices-allocated:   <UUID>,<type>,<memMiB>,<cuCount>:;
```

type 字段使用设备的产品名称。

在 `Allocate` 阶段，device plugin 从 Pod 注解中读取 `hami.io/amd-devices-allocated`，把每个设备的 `cuCount` 转换成一段互不重叠的 CU 范围，并通过容器的 `ContainerAllocateResponse.Envs` 返回（而不是写回 Pod 注解）：

- `ROCR_VISIBLE_DEVICES` 限制容器可见的 GPU；UUID 的顺序决定了容器内的 GPU 索引。
- `HSA_CU_MASK` 限制每块可见 GPU 上可用的 CU，格式为 `GPU_list:CU_list`，其中 GPU 索引是**经过** `ROCR_VISIBLE_DEVICES` 重新排序**之后**的索引（`0` 表示第一块可见 GPU，`1` 表示第二块，以此类推）。

对于多 GPU 的 Pod，device plugin 在构造 `HSA_CU_MASK` 时会把每个已分配的 UUID 和它在容器内的索引对应起来，例如：

```text
# 两块 GPU：UUID-A（索引 0）分到 CU 0-75，UUID-B（索引 1）分到 CU 0-75
HSA_CU_MASK=0:0-75;1:0-75
```

每个 `CU_list` 都遵循 HSA 的 CU ID 列表语法，例如 `0-3,8,10-12`。

同一设备上不同 Pod 的 CU 范围互斥，由 AMD 节点锁 `AMDDevices.LockNode` 和 `ReleaseNodeLock` 保证，二者会获取节点上的 `hami.io/mutex.lock`。

## 5. 资源模型与 core_limit -> CU 掩码

Pod 请求示例：

```yaml
resources:
  limits:
    amd.com/gpu: 1 # 物理 AMD GPU 数量
    amd.com/gpumem: 16384 # MiB
    amd.com/gpucores: 25 # 物理 CU 的百分比
```

### 5.1 显存限制

`amd.com/gpumem`（MiB）通过共享注解传递，由 device plugin 以 `HIP_DEVICE_MEMORY_LIMIT=<MiB>m` 的形式注入。HAMi 的 AMD LD_AUDIT 层在 HIP API 边界上强制执行这一限制，取值必须使用 `<MiB>m` 格式。限制作用于整个容器，对容器内挂载的所有 GPU 生效。每个容器都会拿到独立的分配响应和环境变量。

### 5.2 算力限制 -> CU 掩码

`amd.com/gpucores` 是一个**百分比**，取值范围为 `1`–`100`（含边界，超出范围的值会在准入阶段被拒绝），而不是 CU 数量。调度器按下面的公式把请求的百分比换算成物理 CU 数：

```text
cuCount = floor(percentage × devcore / 100)
```

其中 `devcore` 是节点注册信息中该设备的 CU 总数。结果会被限制在 `[1, devcore]` 区间内。例如，在 304 个 CU 的 MI300X 上，`25` 对应 `76` 个 CU；`33` 对应 `100` 个 CU（`floor(100.32)`）；`67` 对应 `203` 个 CU（`floor(203.68)`）。

调度器把这个 `cuCount` 记录到 `hami.io/amd-devices-allocated` 中。device plugin 选出一段同样大小且互不重叠的 CU 范围，以 `HSA_CU_MASK` 的形式注入。在支持 WGP 的设备上，选出的范围还必须在每个 WGP 内按相邻 CU 对对齐。

**无法保证完全零干扰。** 即使掩码互不重叠，仍然会存在一定的相互干扰（见 [HAMi#1707](https://github.com/Project-HAMi/HAMi/issues/1707) 中的反馈）。

## 6. 已知限制

- **不虚拟化 `amd-smi` / `rocm-smi`。** 这两个工具读取的是 sysfs/drm，而不是 HIP，LD_AUDIT 拦截不到，因此容器内的工具可能显示物理资源。
- **CU 掩码依赖工作负载配合，不是安全边界。** `HSA_CU_MASK` 是 ROCr 在初始化时读取的环境变量，进程如果在 ROCr 启动前清掉它，就能重新使用整块设备。显存限制由 LD_AUDIT 层在 HIP API 边界上强制执行，CU 划分则不同，只对不改动注入环境变量的工作负载有效。
- **不支持同一节点混用多种 GPU 型号。** device plugin 从 `amd.com/gpu.product-name` 获取 GPU 型号，而这个标签无法描述多种型号。
- **感知 WGP 的 CU 分配分阶段实现。** 先在非 WGP 设备（CDNA / Instinct）上提供 CU 划分。RDNA（GFX10+）设备在构造 `HSA_CU_MASK` 时需要按 WGP 成对对齐（[设置 CU](https://rocm.docs.amd.com/en/latest/reference/system-optimization/gpu-isolation.html)），会在后续版本中支持。

## 7. 需要补充多 GPU 验证

目前的 MI300X VF 测试节点只有一块 GPU。它能验证单设备场景，但无法确认在多块 GPU 时，重新排序后的可见设备列表与 `HSA_CU_MASK` 各项之间的对应关系。

在这个节点上，ROCr 接受容器内的设备索引：

- `ROCR_VISIBLE_DEVICES=0` 能看到这块 GPU；
- `ROCR_VISIBLE_DEVICES=1` 看不到任何 GPU；
- 分配注解中记录的 AMD SMI UUID 无法被 ROCr 识别为 GPU。因此 `ROCR_VISIBLE_DEVICES` 需要使用 ROCr 能识别的 GPU 标识，而不是 AMD SMI UUID。

在开放多 GPU 工作负载之前，需要在至少有两块 AMD GPU 的节点上验证以下几点：

1. device plugin 只挂载分配到的 DRM 设备，并按分配顺序提供 `ROCR_VISIBLE_DEVICES`。
2. ROCr/HIP 严格按这个顺序枚举 GPU，即第一块 GPU 索引为 `0`，第二块为 `1`，以此类推。
3. `HSA_CU_MASK=0:<range>;1:<range>` 中的每段范围都作用到对应的容器内 GPU 上。必须用 HIP 工作负载来验证实际生效的 CU 掩码，仅看设备发现输出可能只会显示物理 CU 数。
4. 共享同一块物理 GPU 的两个 Pod 分到的 CU 范围不相交，包括一个 Pod 申请单卡、另一个 Pod 申请多卡的情况。
5. 把分配顺序反过来后，每一项 `HSA_CU_MASK` 仍然绑定到预期的物理 GPU 上；多容器 Pod 中的每个容器都拿到独立的响应。

## 8. 待讨论问题

- **device plugin 的分层方式。** [HAMi#1707](https://github.com/Project-HAMi/HAMi/issues/1707) 中提议基于 ROCm/k8s-device-plugin 构建 AMD vGPU device plugin，而后者已经在上报整卡资源 `amd.com/gpu`。由于 kubelet 不允许两个插件注册同一种资源，比较自然的做法是**扩展 ROCm 插件**：由同一个插件管理 `amd.com/gpu`，同时上报细粒度的 `amd.com/gpumem` / `amd.com/gpucores`（这一项是可选的，对 HAMi 来说不是必需的，但可能对其他调度器有用）。
