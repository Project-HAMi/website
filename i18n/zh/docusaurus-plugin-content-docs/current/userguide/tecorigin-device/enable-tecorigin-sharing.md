---
title: 启用太初元碁 GPU 共享
description: 按计算核心在容器间共享太初元碁显卡，将工作负载绑定到指定显卡，并了解 HAMi 在该硬件上提供与不提供哪些隔离。
translated: true
---

## 简介

太初元碁显卡按**计算核心**调度。容器通过 `tecorigin.com/gpucore` 申请核心数量，由 HAMi 决定每个容器使用哪张卡、以及卡上的哪些核心。

HAMi 对太初元碁设备提供以下能力：

- **核心共享**：`tecorigin.com/gpucore: N` 占用一张卡的 N 个核心，因此多个容器可以共享同一张物理卡。
- **核心级放置**：分配给容器的核心不必连续，因此中间核心已被占用的卡仍可接收请求。
- **多卡放置**：当单个请求超过一张卡的核心数时，会拆分到多张卡上；但只要能由一张卡容纳，就一定不会被拆分。
- **指定显卡**：通过 `tecorigin.com/use-gpuuuid` 和 `tecorigin.com/nouse-gpuuuid` 按显卡序列号绑定或排除特定显卡。

显存不参与请求。太初加速卡在硬件上把核心与显存切分开，每个核心自带一份显存，也不存在可申请的显存资源，HAMi 只按核心放置容器。详见[注意事项与限制](#notes-and-limitations)。

## 前置条件

- 每个 GPU 节点已安装太初元碁加速卡驱动与 SDAA 运行时。
- 已部署发布[节点设备注解](#node-device-annotation)中所述注解、并对外通告 `tecorigin.com/gpucore` 资源的太初元碁 device plugin。该插件由厂商提供和运维，HAMi chart 不会安装它。
- 使用包含太初元碁后端的 HAMi 构建。该后端尚未进入 HAMi 正式发布版本，需要通过包含 `pkg/device/tecorigin` 的构建安装。

## 启用太初元碁支持

参考[在线安装](../../installation/online-installation.md)部署 HAMi，并在 chart 中保持太初元碁配置启用：

```yaml
devices:
  tecorigin:
    enabled: true
    resourceCountName: "tecorigin.com/gpucore"
```

`enabled` 会把该资源名加入内置 kube-scheduler 的 extender 配置。`resourceCountName` 是调度器关注的资源名，必须与 device plugin 通告的资源名、以及工作负载申请的资源名一致。若要修改，请同时更新 `devices.tecorigin.customresources`，确保 extender 管理所有太初元碁资源名。全部 `devices.tecorigin.*` 字段见 [Chart values 参考](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values)。

如果集群中没有 NVIDIA GPU，可关闭 NVIDIA 插件，避免它等待节点：

```yaml
devicePlugin:
  enabled: false
```

### 验证节点

device plugin 会通告节点核心总数并发布显卡列表，调度前请确认两者：

```bash
kubectl get node <node-name> -o jsonpath='{.status.allocatable.tecorigin\.com/gpucore}'
kubectl get node <node-name> -o yaml | grep hami.io/node-tecorigin-register
```

第一条命令输出节点上的核心数——8 张 4 核卡会输出 `32`；第二条输出每张卡的设备列表。只有资源、没有注解的节点不会被调度器注册，申请核心的 Pod 会一直处于 Pending。

## 节点设备注解 {#node-device-annotation}

注册注解采用 HAMi 的节点设备 CSV 格式，与海光、天数智芯发布的格式相同，因此插件无需自定义私有格式：

```text
3CP100241200184,4,15296,15,Tecorigin,0,true,0,hami-core:
```

每张卡一个片段，每个片段以 `:` 结尾。每个片段必须包含全部九个字段：

| 字段 | 含义 | 插件侧要求 |
| --- | --- | --- |
| `id` | 显卡序列号 | 即 `teco-smi` 输出的字符串。`tecorigin.com/use-gpuuuid` 匹配该值，HAMi 也会在分配注解中原样返回。 |
| `count` | 该卡核心数 | 必须为 `1`–`4`。HAMi 依据该值推导核心掩码，越界会拒绝该卡。 |
| `memory` | 显存，单位 **MiB** | 不参与调度。超过 1 TiB 视为误写成字节数并拒绝。 |
| `devcore` | 核心掩码 | HAMi 会用 `count` 推导的掩码覆盖该值。 |
| `type` | 设备类型 | HAMi 统一记录为 `Tecorigin`；注解中的值不参与匹配。 |
| `numa` | NUMA 节点 | 显卡不感知 NUMA 时填 `0`。 |
| `health` | 显卡是否可用 | 为 `false` 时该卡被剔除；所有卡都不健康的节点会退出调度器缓存。 |
| `index` | 显卡物理位置 | 必填。HAMi 用它打破评分并列，因此把所有卡 index 都写成 `0` 的 7 字段格式会被拒绝。 |
| `mode` | 运行模式 | 为空时记为 `hami-core`。 |

插件还可以发布 `hami.io/node-tecorigin-cores`，即显卡序列号到该卡全局核心编号的映射：

```text
{"3CP100241200184":[0,1,2,3],"3CP100241200185":[4,5,6,7]}
```

## 分配注解

Pod 调度完成后，HAMi 把选中的设备写入 `hami.io/tecorigin-devices-to-allocate`（待分配列表，供 device plugin 消费）和 `hami.io/tecorigin-devices-allocated`（HAMi 自身记录）。每个容器的条目格式为：

```text
<显卡序列号>,<类型>,<显存 MiB>,<核心掩码>
```

`核心掩码` 表示分配给该容器的核心，以十进制输出：4 核卡上的 4 个核心是 `15`（`0b1111`），单个核心是 `1`。device plugin 把掩码展开为全局核心编号并据此设置 `TECO_VISIBLE_DEVICES`。由于掩码是卡内编号，可选的核心编号映射是手工反查某个编号属于哪张卡的唯一手段。

## 运行太初元碁任务

通过 `tecorigin.com/gpucore` 申请核心：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: teco-pod
spec:
  restartPolicy: OnFailure
  containers:
    - name: teco-pod
      image: ubuntu:22.04
      command: ["sleep"]
      args: ["infinity"]
      resources:
        limits:
          # 核心数：1 表示占用太初元碁卡的一个核心。
          tecorigin.com/gpucore: 1
```

下一步：

- [为容器分配核心](examples/allocate-core.md)——多种请求方式及调度行为。
- [独占整卡](examples/allocate-exclusive.md)——占用一张卡的全部核心。
- [分配到特定设备](examples/specify-certain-cards.md)——按序列号绑定显卡。
- [排查太初元碁调度问题](troubleshooting.md)——Pod 挂起、节点未注册、分配原因。

## 注意事项与限制 {#notes-and-limitations}

1. **显存隔离是物理隔离。** 核心与显存在卡上就被切分开，容器能访问的显存就是所分配核心对应的那一份。HAMi 只负责分配核心，硬件保证容器停在自己的那一份里：没有分配到的核心，其显存容器也访问不到。

2. **算力隔离是物理隔离。** 分配给容器的每个核心都由该容器独占，不与其他容器分时复用，因此不存在需要限流的执行速率。同卡上的两个容器运行在互不重叠的核心上，不会争抢同一个核心，但仍会共享整卡的显存带宽。

3. **核心数超过 4 的显卡会被拒绝。** 后端按 4 位宽度推导核心掩码。上报更多核心的显卡会在解析节点注解时被丢弃，其核心不被通告。

4. **一张卡最多承载与核心数相同数量的容器。** 在 4 核卡上，即便仍有空闲核心，第 5 个想使用该卡的容器也会被拒绝；单个容器申请更多或更少核心不受此限制。

5. **只要一张卡能容纳，请求就不会被拆分。** 仅当请求超过最大单卡核心数时才会跨卡拆分。若某节点上必须超出物理最少卡数才能满足请求，该节点会被跳过，并在分配原因中记为 `CardInsufficientCore`。

6. **核心数必须是整数。** 小数或负数的 `tecorigin.com/gpucore` 会被判定为非法设备请求；显式写 `0` 表示不申请设备。同时设置 limits 与 requests 时以 limits 为准。

7. **显存不是独立资源。** 太初加速卡在硬件上对核心与显存做了物理切分，每个核心独占一份显存，申请 N 个核心即同时获得这 N 个核心对应的显存。因此不存在 `tecorigin.com/gpumem` 或按百分比的显存资源，设置它们会导致 Pod 处于 Pending 状态。HAMi 只分配核心，不单独切分显存。
