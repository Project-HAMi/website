---
title: 启用 AMD GPU 共享
sidebar_label: GPU 共享
translated: true
---

## 简介

HAMi 支持共享 AMD Instinct/ROCm GPU。工作负载通过标准 Kubernetes 资源请求显存和算力份额，无需修改应用代码。

**GPU 共享**: 每个任务可以只占用一部分显卡，多个任务可以共享一张显卡。

**可限制分配的显存大小**: 可以用显存值（MiB）分配 GPU，HAMi 会确保任务使用的显存不会超过分配数值。

**可限制计算单元数量**: 可以指定任务使用的算力比例（例如 `amd.com/gpucores: 25` 代表使用约 25% CU）。

:::caution

请使用 [amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin) 镜像和 Helm chart。不要用上游 ROCm `k8s-device-plugin` 镜像来跑 HAMi soft vGPU。

显存隔离依赖 glibc `LD_AUDIT` 加载 `libamvgpu.so`，当前需要 `GLIBC_2.34` 及以上符号。基于更旧 glibc（例如 Ubuntu 20.04、RHEL 8）或 musl/Alpine 的工作负载镜像暂不支持。详见 [HAMi#2265](https://github.com/Project-HAMi/HAMi/issues/2265)。

:::

## 节点需求

需要部署以下组件：

| 组件 | 作用 | 关键要求 |
| --- | --- | --- |
| HAMi | 调度、设备分配和准入 | scheduler 正常运行，并管理三个 AMD 资源 |
| AMD GPU Operator（推荐） | 驱动和 ROCm 环境 | 禁用 Operator 原生 device-plugin |
| [amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin) | 注册 AMD 资源、分配 CU、注入容器运行时限制 | 部署 chart/镜像 `0.0.1` 或更新版本；通过 amd-smi/libdrm 发现显存与 CU |

节点还必须具备可用的 AMD 驱动和 ROCm（已在 ROCm 7.0.2 上验证）。可用以下命令确认：

```bash
amd-smi static --gpu 0
```

输出应包含设备型号、VRAM 和 `NUM_COMPUTE_UNITS`。

## 开启 AMD GPU 共享

### 配置 HAMi

安装 HAMi 后，确认 scheduler 管理所有 AMD vGPU 资源。values 文件中应包含：

```yaml
devices:
  amd:
    customresources:
      - amd.com/gpu
      - amd.com/gpumem
      - amd.com/gpucores
```

安装或升级后确认 scheduler 正常运行：

```bash
kubectl -n kube-system get pods | grep hami-scheduler
```

### 禁用 AMD GPU Operator device-plugin

若使用 [AMD GPU Operator](https://github.com/ROCm/gpu-operator) 管理驱动和 ROCm，请关闭其原生 device-plugin，避免与 HAMi `amd-device-plugin` 竞争 `amd.com/gpu`：

```bash
kubectl -n kube-amd-gpu patch deviceconfig default --type=merge -p \
  '{"spec":{"devicePlugin":{"enableDevicePlugin":false}}}'
```

`amd-device-plugin` 通过 amd-smi/libdrm 读取每张卡的显存、CU、UUID 和产品名称，因此对 HAMi soft vGPU 而言，Operator node-labeller 是可选的。

### 部署 amd-device-plugin

在所有 AMD GPU 节点上部署 [amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin)。Chart `0.0.1` 默认镜像为 `ghcr.io/project-hami/amd-device-plugin:0.0.1`，并通过 `postStart` lifecycle hook 将镜像内的 `libamvgpu.so` 安装到节点：

```bash
helm upgrade --install amd-gpu \
  https://github.com/Project-HAMi/amd-device-plugin/releases/download/amd-gpu-helm-0.0.1/amd-gpu-0.0.1.tgz \
  --namespace kube-system \
  --create-namespace
```

若环境中 GHCR 包为私有，请配置 `imagePullSecrets`。也可以 clone 仓库后从 `./helm/amd-gpu` 安装。

等待 DaemonSet 就绪：

```bash
kubectl -n kube-system rollout status ds/amd-gpu-device-plugin-daemonset
```

确认 device-plugin 已将完整设备信息注册给 HAMi：

```bash
kubectl get node <node-name> -o jsonpath='{.metadata.annotations.hami\.io/node-amd-register}'
```

结果必须包含 `devmem` 和 `devcore`。例如 MI300X VF：

```json
[
  {
    "id": "8eff74b5-0000-1000-801b-b56457addd1b",
    "index": 0,
    "count": 10,
    "devmem": 196288,
    "devcore": 304,
    "type": "AMD Instinct MI300X VF",
    "numa": 0,
    "health": true,
    "devicevendor": "amd",
    "custominfo": {
      "pciBDF": "0000:83:00.0"
    }
  }
]
```

## 运行 AMD vGPU 任务

通过 `amd.com/gpu`、`amd.com/gpumem` 和 `amd.com/gpucores` 请求 AMD GPU：

- `amd.com/gpu`：Pod 需要的 AMD GPU 数量
- `amd.com/gpumem`：每张 GPU 的显存配额，单位为 MiB
- `amd.com/gpucores`：每张 GPU 的 CU 配额百分比，范围为 0-100；例如 `25` 在 304 CU 的设备上约分配 76 CU

请使用满足上述 `GLIBC_2.34` 要求的 glibc 工作负载镜像（例如较新的 `rocm/pytorch` 标签）：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: amd-vgpu-example
spec:
  schedulerName: hami-scheduler
  restartPolicy: Never
  containers:
    - name: pytorch
      image: rocm/pytorch:latest
      command: ["bash", "-c"]
      args:
        - |
          env | grep -E 'LD_AUDIT|HIP_DEVICE_MEMORY_LIMIT'
          python3 -c 'import torch; print(torch.cuda.mem_get_info(0)); print(torch.cuda.get_device_name(0))'
          sleep 300
      resources:
        requests:
          amd.com/gpu: 1
          amd.com/gpumem: 49152
          amd.com/gpucores: 25
        limits:
          amd.com/gpu: 1
          amd.com/gpumem: 49152
          amd.com/gpucores: 25
```

```bash
kubectl apply -f amd-vgpu-example.yaml
kubectl get pod amd-vgpu-example -o wide
kubectl logs amd-vgpu-example
```

成功时，日志应包含类似内容：

```text
LD_AUDIT=/usr/local/vgpu/libamvgpu.so
HIP_DEVICE_MEMORY_LIMIT=49152m
(51539607552, 51539607552)
AMD Instinct MI300X VF
```

`51539607552` 为字节，约等于 48 GiB。可同时提交两个相同的 48 GiB / 25% CU 工作负载，验证共享和并发。

## 常见问题

| 症状 | 处理 |
| --- | --- |
| `node unregistered` | 检查 `amd-device-plugin` 是否运行，以及 `hami.io/node-amd-register` 是否包含 `devmem`、`devcore`。必要时重启 DaemonSet。 |
| `CardInsufficientMemory` | Pod 请求的显存超过设备剩余显存；降低 `amd.com/gpumem` 或等待其他工作负载结束。 |
| `insufficient free CUs` | 删除已完成的 AMD vGPU 测试 Pod，并重启 `amd-device-plugin` 清理过期分配。 |
| 容器内显存仍为物理卡大小 | 检查 Pod 环境是否有 `LD_AUDIT` 和 `HIP_DEVICE_MEMORY_LIMIT`，以及工作负载镜像的 glibc 是否兼容。 |
| 工作负载无法启动 / 加载不了 `libamvgpu.so` | 换用 `GLIBC_2.34` 及以上的 glibc 镜像；musl/Alpine 和旧发行版暂不支持。 |

测试完成后删除工作负载：

```bash
kubectl delete pod amd-vgpu-example
```

## 注意事项

1. 请部署 [amd-device-plugin](https://github.com/Project-HAMi/amd-device-plugin) `0.0.1` 或更新版本（`ghcr.io/project-hami/amd-device-plugin`）。
2. 使用 HAMi AMD soft vGPU 共享时，请保持 AMD GPU Operator 原生 device-plugin 关闭。
3. 未设置 `amd.com/gpucores` 时，容器会获得每张已分配 GPU 的全部 CU。
4. 当前镜像内置的 `libamvgpu.so` 分发方式是临时方案，后续将迁移到 `amd-hami-core` 正式产物。
