---
title: 迁移到 HAMi 动态 MIG
sidebar_label: 动态 MIG 迁移
---

本指南面向两类用户：

- 使用 HAMi `master` 分支上 MIG Geometry/Template 实现的用户；
- 使用 NVIDIA GPU Operator MIG Manager 管理固定 MIG 几何配置的用户。

这次迁移并不是承诺以后再也不需要 drain 节点，而是让日常切换 profile 不再需要 drain。调度器为每个 Pod 预留具体的 MIG profile 和物理 placement，device plugin 按需创建对应的 GI/CI，Pod 结束后再回收实例。

> 当前实现不支持在保留旧 MIG Pod 的前提下无缝滚动迁移。首次交接时，需要逐个节点执行 cordon、drain、升级和验证。迁移完成后，日常的混合 profile 调度通常不再需要仅仅为了切换整卡几何配置而 drain 节点。

## 为什么要迁移

使用固定几何配置时，通常要先为整块 GPU 选定一种布局，例如 `all-1g`、`all-3g` 或某种混合配置。当工作负载组合发生变化、当前布局满足不了请求时，运维人员就得清空 GPU、销毁现有的 GI/CI 实例，再应用另一种布局。

NVIDIA MIG Manager 可以通过修改 `nvidia.com/mig.config` 触发重新配置，但 NVIDIA 仍然要求被重新配置的 GPU 上不能有用户工作负载在运行。在某些环境中，开启或关闭 MIG 模式还可能需要重置 GPU 或重启节点。因此生产环境的操作流程通常会先 cordon 或 drain 节点。详见 [NVIDIA GPU Operator MIG 文档](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-mig.html)。

HAMi `master` 分支上的实现同样以预定义的几何配置为核心。当请求无法放进当前几何配置时，必须把整块 GPU 切换到另一个模板。这种模式适合稳定、长期运行的资源池，但面对混合推理负载、突发的 profile 需求以及频繁创建的短时任务时，会暴露出一些问题：

- 运维人员需要为每种 GPU 型号维护显存、算力、实例数量以及几何组合；
- 调整布局会影响整块 GPU，而不仅仅是新请求所需的那个实例；
- 有实例在运行时无法重新配置几何；
- 固定布局中闲置的实例仍然占着切片；
- drain 节点和重建工作负载成了容量管理的日常操作。

当前的动态 MIG 实现采用“先预留”的模型：

```text
device plugin 发布通过 NVML 发现的 profile 和合法 placement
                                  ↓
调度器为 Pod 选定 GPU + profile + placement
                                  ↓
Pod 注解持久化逻辑预留
                                  ↓
device plugin 在该 placement 上创建 GI/CI
                                  ↓
device plugin 记录 MIG UUID、GI ID 和 CI ID
                                  ↓
Pod 结束时精确销毁对应的 CI/GI
```

主要区别如下：

| 方面             | 固定几何配置 / MIG Manager | HAMi 动态 MIG                               |
| ---------------- | -------------------------- | ------------------------------------------- |
| 布局范围         | 节点或整块 GPU             | 按 Pod 的 profile 和 placement              |
| profile 能力     | 手动配置几何               | 允许列表定义策略，NVML 提供实际能力         |
| 实例创建         | 预先创建固定的实例池       | 在 `Allocate` 阶段根据预留创建              |
| 实例回收         | 通常保留到重新配置         | Pod 结束后精确回收对应的 GI/CI              |
| 工作负载组合变化 | 可能需要切换整卡布局       | 只要存在合法的空闲 placement 就可以直接调度 |
| 重启恢复         | 依赖现有布局               | 根据 NVML 校验 Pod 注解后接管               |

动态 MIG 并不能消除 MIG 的硬件约束。被 GI 占用的切片无法原地转换成有重叠的布局。碎片化可能会暂时导致大 profile 放不下。开启或关闭 MIG 模式、驱动维护以及回滚，仍然可能需要 drain 或重启节点。

## 迁移前需要了解的协议变化

### 配置从几何配置改为 profile 允许列表

HAMi `master` 配置的是完整的几何组合：

```yaml
nvidia:
  knownMigGeometries:
    - models: ["A100-SXM4-40GB"]
      allowedGeometries:
        - - name: 1g.5gb
            core: 14
            memory: 5120
            count: 7
        - - name: 2g.10gb
            core: 28
            memory: 10240
            count: 3
          - name: 1g.5gb
            core: 14
            memory: 5120
            count: 1
```

当前实现只需要配置集群允许使用的 profile：

```yaml
nvidia:
  migProfileAllowlist:
    - models: ["A100-SXM4-40GB"]
      profiles: ["1g.5gb", "2g.10gb", "3g.20gb", "7g.40gb"]
```

运维人员不再需要重复填写 `core`、`memory`、`count` 或合法 placement 信息，这些值由 GPU 所在节点通过 NVML 发现。允许列表依然重要：它决定了调度器可以使用哪些 profile，而不是自动开放驱动上报的所有能力。

如果旧配置中包含多种几何组合，迁移时一般取它们 profile 名称的并集。例如：

```text
7 × 1g
3 × 2g + 1 × 1g
2 × 3g
1 × 7g
```

会变成：

```yaml
profiles: ["1g.5gb", "2g.10gb", "3g.20gb", "7g.40gb"]
```

请针对每种实际的 GPU 型号确认 profile 名称，不要仅凭标称显存推断。可以先参考当前 Chart 中的型号映射和 device plugin 的发现日志，再在目标驱动和硬件上验证。

### 分配身份从 UUID 后缀改为 Pod 注解

旧实现把模板和 slot 编码在设备标识里，例如：

```text
GPU-xxxxxxxx[1-2]
```

当前实现把完整的分配身份保存在 `hami.io/vgpu-mig-allocations` 中：

```json
[
  {
    "containerIndex": 0,
    "deviceIndex": 0,
    "gpuUUID": "GPU-xxxxxxxx",
    "profile": "2g.10gb",
    "placement": { "start": 2, "size": 2 },
    "migUUID": "MIG-xxxxxxxx",
    "gpuInstanceID": 4,
    "computeInstanceID": 0
  }
]
```

调度器记录父 GPU、profile 和 placement。实例创建完成后，device plugin 再补充 MIG UUID、GI ID 和 CI ID。这个注解是持久化的契约，用于重建调度器的占用情况、在 device plugin 重启后恢复状态，以及回收实例。用户不能手动创建或修改它。

旧 Pod 中没有这份完整的身份信息。仅靠旧的模板/slot 索引，无法在所有 GPU 型号和现有硬件布局下可靠地确定物理 placement。当前实现因此选择安全失败，而不是去猜测，避免出现切片重叠分配的风险。这也是首次升级时必须 drain 旧 MIG Pod 的主要原因。

## 支持边界

### 迁移后通常不再需要 drain 的操作

- 创建使用不同允许列表 profile 的新 Pod；
- 删除 Pod 并回收其 MIG 实例；
- 复用合法的空闲 placement；
- device plugin 重启后，接管那些完整运行时注解能够通过 NVML 校验的活动实例。

### 仍可能需要 drain 或重启的操作

- 从旧版几何模型进行首次迁移；
- 从 NVIDIA MIG Manager 接管硬件变更权；
- 在物理 GPU 上开启或关闭 MIG 模式；
- 驱动升级、GPU 重置或平台要求的节点重启；
- 回滚到只支持旧版几何配置和 UUID 编码的版本；
- 满足需要移动正在运行的 GI/CI 才能实现的新布局；
- 修复 HAMi Pod 注解与 NVML 硬件状态无法对应的情况。

## 从 HAMi master 迁移

### 迁移原则

不要让旧版调度器和当前版本的 device plugin 同时服务 MIG 请求：

- 旧版调度器生成的是模板/slot 编码，不会创建新的 MIG 预留注解；
- 当前版本的 device plugin 要求预留中明确给出 profile 和 placement；
- 当前版本的调度器读取的是 `migProfiles` 能力，而旧节点发布的是 `migtemplate`。

新旧版本混合部署时，可能会保守地上报零容量，或者在 `Allocate` 阶段失败。应先停止新的 MIG 调度，升级控制面，再逐个节点升级 device plugin。

### 推荐步骤

1. **盘点并备份当前状态。** 保存调度器的设备 ConfigMap、MIG 节点注册注解、活动 MIG Pod 列表以及 `nvidia-smi -L` 的输出，并确认应用 Pod 可以重建。
2. **停止新的调度。** 对要迁移的 MIG 节点执行 cordon，避免迁移窗口内旧版调度器创建新的旧格式分配。
3. **drain 旧 MIG Pod。** 等待工作负载结束或把它们迁到其他地方，确认没有需要保留的用户 GPU 进程。不要只重启 device plugin 就认为旧 Pod 会被自动接管。
4. **迁移配置。** 把 `knownMigGeometries` 转换为 `migProfileAllowlist`。保留管理员希望开放的 profile，删掉手动维护的 `core`、`memory`、`count` 和几何组合。
5. **升级调度器。** 先升级调度器及其配置，再升级 device plugin，防止旧版调度器向新节点发送不兼容的分配。
6. **逐个节点升级 device plugin。** 先拿少量节点做金丝雀。启动时，空闲 GPU 会被整理成干净的 MIG 就绪状态，这些空闲 GPU 上已有的 GI/CI 实例可能会被销毁。
7. **验证节点能力。** 确认 device plugin 日志显示发现了 profile 和 placement，并且 Node 注册注解中的 `migProfiles` 不为空。
8. **验证完整生命周期。** 创建一个 MIG Pod，检查它的预留注解、NVML 中可见的实例以及容器内可见的 MIG UUID。删除该 Pod，等待协调完成，确认实例已释放。
9. **恢复调度。** 金丝雀验证通过后，逐步 uncordon 节点，再恢复生产工作负载。

项目的 Helm Chart 默认配置中已经提供了 `migProfileAllowlist`。如果通过 `device-config.content` 或外部 ConfigMap 覆盖了默认配置，也需要同步更新这些自定义内容。旧字段不会被自动转换成新的允许列表。

## 从 NVIDIA MIG Manager 迁移

### 首先确定唯一的管理方

NVIDIA MIG Manager 和 HAMi 动态 MIG 都会修改 GI/CI 状态，不能同时管理同一块物理 GPU。MIG Manager 可能会根据 Node 标签重新应用整卡几何配置，而 HAMi 会根据 Pod 预留按需创建和销毁实例。

GPU Operator 可以继续提供驱动、Container Toolkit、DCGM 等组件，但 MIG Manager 不能再对目标节点应用几何配置。具体如何关闭这部分协调，取决于 GPU Operator 的版本和部署策略。迁移之前，请确认目标节点上的 MIG Manager 不会再响应 `nvidia.com/mig.config` 的变化。

### 推荐步骤

1. **记录当前状态。** 保存 `nvidia.com/mig.config`、`nvidia.com/mig.config.state`、MIG Manager 的 ConfigMap、自定义几何配置以及 `nvidia-smi -L` 的输出。
2. **cordon 目标节点并迁走 GPU 工作负载。** NVIDIA 要求重新配置期间不能有用户 GPU 工作负载在运行。HAMi 的首次交接也需要一个明确为空、可验证的初始状态。
3. **停止目标节点上的 MIG Manager 协调。** 确保 HAMi 创建 GI/CI 实例之后，它不会重新应用之前的几何配置。如果控制器配置会立刻重建 MIG Manager Pod，那么只删除一次 Pod 是不够的。
4. **保留必需的 GPU Operator 基础设施。** 驱动和容器运行时仍然是 HAMi 访问 GPU 的前提。停止 MIG Manager 不代表要卸载 GPU Operator。
5. **将 HAMi 节点配置为 `mig` 运行模式，并设置 `migProfileAllowlist`。** 允许列表可以根据之前 MIG Manager 配置中实际用到的 profile 来整理。
6. **启动 HAMi 调度器和 device plugin。** device plugin 会通过 NVML 校验 profile 和 placement，并清理空闲 GPU 上的旧实例，建立一个可预期的硬件初始状态。
7. **进行金丝雀验证。** 先从一个 profile、一个 Pod 开始，然后验证混合 profile、容量打满、Pod 删除后的回收以及 device plugin 重启后的恢复。
8. **逐个节点扩大范围。** 在动态池通过生产验证之前，保留一个未迁移的静态 MIG 池作为短期兜底容量。

## 验证检查清单

### 节点能力

- 注册的 GPU `mode` 为 `mig`。
- 每块目标 GPU 的 `migProfiles` 都不为空。
- profile 的显存、切片数量和 placement 与 NVML 能力一致。
- 不支持的或不在允许列表中的 GPU 型号没有被意外开放。

### 调度与实例创建

- Pod 使用了 `nvidia.com/vgpu-mode: "mig"`。
- 调度器写入了 `hami.io/vgpu-mig-allocations`。
- 选中的 profile 满足显存请求，并且其 placement 与活动预留没有重叠。
- `Allocate` 成功后，注解中包含 MIG UUID、GI ID 和 CI ID。
- 容器内可见的 MIG UUID 与注解和 NVML 一致。

工作负载示例：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mig-canary
  annotations:
    nvidia.com/vgpu-mode: "mig"
spec:
  restartPolicy: Never
  containers:
    - name: workload
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 3600"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 8000
```

这个示例只验证资源分配和设备注入。生产环境的金丝雀应使用带有 CUDA 或 NVML 工具的可信镜像，并运行真实的 GPU 工作负载。

### 优先选择某个 MIG profile {#preferring-a-mig-profile}

profile 选择只看显存：调度器会从允许列表中挑选能满足显存请求的最小 profile。由于 MIG 的显存和算力是绑定的，两个 profile 可能都能满足同一个请求，但算力份额不同。例如在 A100-40GB 上，即使允许使用 `4g.20gb`，20 GB 的请求默认也会落到 `3g.20gb`。需要更多算力的 Pod 可以设置 `nvidia.com/mig-profile-preference` 注解，值为按优先级排序、以逗号分隔的 profile 列表：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mig-prefer-4g
  annotations:
    nvidia.com/vgpu-mode: "mig"
    nvidia.com/mig-profile-preference: "4g"
spec:
  containers:
    - name: workload
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 3600"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 20000
```

每一项既可以写完整的 profile 名称（`4g.20gb`），也可以只写切片规格（`4g`）；后者会匹配所有 GPU 型号上的同规格 profile，因此一个值就能同时覆盖 A100 和 H100 节点。调度器会先按列出的顺序尝试偏好的 profile，再回到默认的从小到大顺序。偏好只是倾向，而不是强制要求：

- 永远不会选择小于显存请求的 profile；
- 只对 GPU 的 `migProfileAllowlist` 中的 profile 生效；某一项在某块 GPU 上匹配不到任何 profile 时，在这块 GPU 上会被忽略；
- 如果偏好的 profile 没有空闲 placement，或者偏好的布局在该 GPU 上放不下容器所需的切片，调度器会回退到默认顺序，而不是直接排除这块 GPU。

如果某个值在所有 `migProfileAllowlist` 条目中都匹配不到 profile，准入 webhook 会拒绝它，这样拼写错误在创建 Pod 时就能发现。

### 回收与恢复

- 删除金丝雀 Pod 会释放它的 CI/GI，不影响其他 Pod 持有的实例。
- 后续的 Pod 可以复用同一块切片。
- device plugin 重启时，启动清理不会重置正在使用的 GPU。
- 重启后，带有完整注解的活动实例会先通过 NVML 校验，再被接管到管理器中。
- 读取 Kubernetes API 或注解失败时，会跳过破坏性协调，而不是猜测后删除实例。

### 建议覆盖的测试场景

至少测试以下场景：

1. 创建和删除一个 `1g` Pod；
2. 同一块 GPU 上多个互不重叠的 `1g` 实例；
3. `1g`、`2g`、`3g` 实例混合放置；
4. 容量耗尽时 Pod 保持 Pending；
5. 删除小实例后复用其 placement；
6. CUDA 工作负载仍在运行时重启 device plugin；
7. 注解缺失或只包含部分运行时身份时安全失败；
8. Kubernetes API 暂时不可用时不执行破坏性回收。

## 回滚

### 生产工作负载恢复之前

如果金丝雀验证失败：

1. 保持节点处于 cordon 状态；
2. 停止当前版本的调度器和 device plugin 在目标节点上提供 MIG 服务；
3. 恢复旧的 `knownMigGeometries` 或 MIG Manager 配置；
4. 重新应用之前验证过的固定几何配置；
5. 确认设备资源注册正常后再 uncordon 节点。

### 已经运行过新的动态 MIG Pod 之后

不要直接把组件二进制回滚到旧版本。旧实现不理解新的预留和 placement 协议，无法安全地继承当前管理器的状态。应先再次 drain 动态 MIG Pod，停止 HAMi 修改 GI/CI 状态，然后再恢复旧的控制器和固定几何配置。

## 常见问题

### 迁移之后就完全不需要 drain 了吗？

不是。在空闲切片上日常创建和删除允许列表中的 profile，通常不需要 drain。但首次交接、MIG 模式变更、驱动维护、需要移动活动实例的重新布局以及回滚，仍然可能需要。

### NVIDIA MIG Manager 和 HAMi 能否管理同一节点上的不同 GPU？

只有当两套系统都能提供明确、稳定且经过验证的设备级所有权隔离时，才可以考虑。本迁移指南并不依赖这种部署方式。默认情况下，目标节点上的 MIG 硬件变更只交给一个控制器负责，避免整卡几何重新应用与 Pod 级的创建、删除发生冲突。

### 为什么不能根据 `GPU-UUID[template-slot]` 自动迁移旧 Pod？

旧索引描述的是调度器模板中的逻辑位置。在不同的 GPU 型号、驱动版本和实际硬件状态下，它无法唯一确定 GI placement、MIG UUID、GI ID 和 CI ID。未经 NVML 校验的转换可能会把两个预留映射到重叠的切片上。当前实现优先保证安全，因此只在旧工作负载 drain 完之后才启用新协议。

### 用户需要修改工作负载 YAML 吗？

通常不需要。用户继续申请 `nvidia.com/gpu` 和 `nvidia.com/gpumem`，并设置 `nvidia.com/vgpu-mode: "mig"` 即可。如果希望在满足请求的多个 profile 中指定某一个，可以加上 `nvidia.com/mig-profile-preference`，参见[优先选择某个 MIG profile](#preferring-a-mig-profile)。`hami.io/vgpu-mig-allocations` 由调度器和 device plugin 管理，不是面向用户的 API。

## 总结

如果集群的 MIG 需求长期稳定，预先切分好的节点池仍然是简单可靠的选择。当 profile 组合随 Pod 生命周期变化、静态实例池利用率偏低，或者切换几何配置已经成为日常运维负担时，动态 MIG 的价值最大。

迁移本身需要一次受控的 drain，因为旧协议中的信息不足以证明现有实例的物理身份。迁移完成后，HAMi 会把 profile 选择、placement 预留、GI/CI 创建和生命周期回收串成一个收敛的工作流。它减少了日常重新配置的频率，也缩小了整卡布局变更的影响范围，但并不能绕开 NVIDIA MIG 的硬件和驱动约束。
