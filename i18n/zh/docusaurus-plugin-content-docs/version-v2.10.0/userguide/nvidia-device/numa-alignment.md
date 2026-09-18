---
title: 对齐 GPU 与 CPU 的 NUMA 位置
translated: true
---

在多路服务器上，CPU 与同一 NUMA 节点上的 GPU 通信更快。kubelet 的 Topology Manager 可以对齐容器的 CPU 和 vGPU 副本，但在 NUMA refit 之前，它可能与 HAMi 调度器选择的 GPU 不一致：容器实际运行在一块 GPU 上，而 HAMi 的注解和账目记录的是另一块。

NUMA 对齐分两部分解决这个问题：

- device plugin 向 kubelet 上报每个 vGPU 副本的 NUMA 节点（`enableNumaTopology`），使 Topology Manager 可以将分配限制在 NUMA 本地副本内。
- 当该限制排除了调度器最初选择的 GPU 时，device plugin 请求调度器将分配 **refit**（重新适配）到 kubelet 允许的 GPU 上。调度器重新运行正常的策略适配，同时更新两个分配注解并移动预留，使运行时、注解和账目保持一致。

需要比 v2.10.0 更新的 HAMi 版本（NUMA refit，[Project-HAMi/HAMi#2731](https://github.com/Project-HAMi/HAMi/pull/2731)）。仅支持 hami-core 模式；MIG 模式节点不参与。

## 节点前提条件

只有按如下配置 kubelet，Topology Manager 才会限制分配：

```yaml
# /var/lib/kubelet/config.yaml
cpuManagerPolicy: static
reservedSystemCPUs: <你的保留 CPU 集合>
topologyManagerPolicy: single-numa-node
topologyManagerScope: container
```

在 NUMA 节点数超过 8 的服务器上，还需设置：

```yaml
topologyManagerPolicyOptions:
  max-allowable-numa-nodes: "16"
```

## 启用该功能

所有开关默认关闭。在 Helm values 中：

```yaml
devicePlugin:
  # 向 kubelet 上报每个副本的 NUMA 节点。
  enableNumaTopology: true
  # 允许 device plugin 调用调度器的 refit 端点。
  numaRefit:
    enabled: true
  nodeConfiguration:
    config: |
      {
        "nodeconfig": [
          {
            "name": "<你的 GPU 节点>",
            "operatingmode": "hami-core",
            "enablenumatopology": true,
            "enablegetpreferredallocation": true
          }
        ]
      }
```

refit 客户端默认验证调度器的 TLS 证书。由于调度器默认使用准入 webhook 的自签名证书，Chart 会设置 `numaRefit.tlsInsecure: true`，除非你提供 CA：`numaRefit.caSecret`（包含 `ca.crt` 键的 Secret，自动挂载）或 `numaRefit.caFile`（device-plugin 容器内已存在的路径）。

## 按 Pod 启用

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: numa-aligned
  annotations:
    hami.io/numa-alignment: "best-effort"
spec:
  containers:
    - name: main
      image: ubuntu:22.04
      command: ["sleep", "infinity"]
      resources:
        limits:
          cpu: "8"
          memory: 8Gi
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 20000
```

- `best-effort`：若 refit 无法移动分配，则保留 kubelet 自身的选择，只记录日志。未部署 refit 时行为不变。
- `strict`：若已启用 refit 且无法完成对齐，分配将失败，而不是在未对齐的 GPU 上运行。未启用 refit 时，strict 仅以 error 级别记录日志。

refit 成功后会在 Pod 上产生 `NumaRefitSucceed` 事件：

```
Normal  NumaRefitSucceed  NUMA refit moved container 0 from [GPU-f4c61521...] to [GPU-ba09367f...]
```

`hami.io/numa-alignment` 与 `nvidia.com/numa-bind` 相互独立：numa-bind 要求容器的所有 GPU 位于同一 NUMA 节点，而 numa-alignment 使调度器的 GPU 选择与 kubelet 的 CPU 放置保持一致。两者可以组合使用。

## 说明

- 使用 `nvidia.com/use-gpuuuid` 固定设备的 Pod 不会被 refit 到其他 GPU；若固定的 GPU 不在 kubelet 允许的集合内，refit 会拒绝，由模式决定结果。
- 各设备预留的显存或算力数值不一致的分配不会被 refit。
- 已在 8x NVIDIA RTX PRO 6000 Blackwell Server Edition（驱动 610.43.02、Kubernetes v1.35.6、Topology Manager `single-numa-node`）上完成端到端验证。
