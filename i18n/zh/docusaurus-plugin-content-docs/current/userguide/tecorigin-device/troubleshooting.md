---
title: 排查太初元碁调度问题
translated: true
---

## 节点有资源，但始终不出现在调度器中

只有当注册注解能够解析、且至少有一张显卡健康时，太初元碁节点才会被注册。请先检查注解：

```bash
kubectl get node <node-name> -o jsonpath='{.metadata.annotations.hami\.io/node-tecorigin-register}'
```

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 注解不存在 | device plugin 未运行，或使用了不同的资源名 | 部署厂商插件，并确认节点可分配资源中包含 `tecorigin.com/gpucore` |
| `want 9 fields, got 7` | 插件漏写了 `index` 与 `mode` | 每张卡发布九个字段；7 字段格式会把所有卡的 index 置为 `0`，会被拒绝 |
| `invalid core count N for card "..."` | `count` 为 `0` 或大于 `4` | 按 1–4 核卡的真实核心数上报 |
| `invalid memory ... Devmem is MiB, not bytes` | 插件写成了字节数 | 改为 MiB |
| `no healthy tecorigin card found on node` | 所有卡都是 `health=false` | 修复硬件后更新注解，使健康检查重新读取 |

注解存在但未能注册时，Pod 也会一直 Pending，调度器日志中会出现 `node unregistered`。注册注解与 `hami.io/node-tecorigin-cores` 都会在每次健康检查时参与指纹比对，修正任一注解即可重新读取显卡列表，无需重启调度器。

## Pod 一直 Pending

HAMi 会在 Pod 的分配原因中以 `<失败数>/<总数> <Reason>` 的形式给出原因。太初元碁后端会输出四种：

| 原因 | 含义 |
| --- | --- |
| `CardNotHealth` | 该卡在注册注解中标记为不健康 |
| `CardTimeSlicingExhausted` | 该卡承载的容器数已达核心数上限，即使仍有空闲核心 |
| `CardUUIDMismatch` | `tecorigin.com/use-gpuuuid` 或 `tecorigin.com/nouse-gpuuuid` 排除了该卡 |
| `CardInsufficientCore` | 空闲核心不足，或满足该请求需要的卡数超过其自身的最小卡数 |

出现 `CardInsufficientCore` 时，可查看调度器日志中的空闲核心数：

```bash
kubectl logs -n kube-system -l app=hami-scheduler --tail=200 | grep "tecorigin fit failed"
```

日志会输出 `want`、节点总 `freeCores`、候选卡数 `candidates` 以及 `maxCards`——即该请求最多可用的卡数。`maxCards` 由节点上最大的单卡核心数推导，因此 `want` 超过它时必须跨卡拆分；需要更多卡的节点会被拒绝。

## 确认运行中的容器实际获得了什么

```bash
kubectl get pod <pod-name> -o jsonpath='{.metadata.annotations.hami\.io/tecorigin-devices-allocated}'
```

每个条目为 `<显卡序列号>,<类型>,<显存 MiB>,<核心掩码>`。掩码表示该卡上被分配的核心：

| 掩码 | 4 核卡上的核心 |
| --- | --- |
| `1` | 核心 0 |
| `5` | 核心 0 和 2 |
| `15` | 全部四个核心 |

掩码中出现空缺是正常的：运行时接受任意核心集合，HAMi 直接分配最低的空闲核心，而不会等待连续的一段。

## 反查某个核心编号属于哪张卡

容器内的 `TECO_VISIBLE_DEVICES` 保存的是全局核心编号。要把编号映射回显卡，可读取插件可选发布的核心编号映射：

```bash
kubectl get node <node-name> -o jsonpath='{.metadata.annotations.hami\.io/node-tecorigin-cores}'
```

```text
{"3CP100241200184":[0,1,2,3],"3CP100241200185":[4,5,6,7]}
```

编号 `5` 属于显卡 `3CP100241200185` 的本地核心 `1`。该映射从不影响调度，仅用于此类反查。若没有该映射，在核心数相同且按序列号排序的情况下，也可通过编号区间判断所属显卡。

## 实际拆分与预期不一致

放置过程是确定性的：先取最少卡数，再取最不浪费容量的组合（先填满空闲核心较少的卡），最后取索引最小的卡。因此 6 核请求会优先落在两张各有 3 个空闲核心的卡上，而不是动用一张有 4 个空闲核心的卡，因为 3 + 3 没有浪费。

若期望独占整卡，请确认请求与卡型核心数一致：4 核卡写 `4`，3 核卡写 `3`。在 3 核卡节点上写 `4` 会被拆分，无法独占。