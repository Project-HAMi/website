---
title: 排障手册
translated: true
---

## GPU 显存限制未生效 {#gpu-memory-limit-not-enforced}

如果容器超过了 `nvidia.com/gpumem` 限制，请检查以下原因：

- **设置了 `CUDA_DISABLE_CONTROL=true`**：完全禁用 HAMi-core 的限制功能。请从生产工作负载中移除该设置。
- **Docker-in-Docker (DinD)**：内层容器不会继承 `/etc/ld.so.preload` hostPath 挂载。HAMi 的限制在 DinD 内部不生效。
- **直接调用驱动 API**：直接调用 NVML 或 CUDA Driver API 的工作负载会绕过 `libvgpu.so`。
- **`nvidia-container-runtime` 未设为默认运行时**：使用以下命令验证：

  ```bash
  containerd config dump | grep default_runtime_name
  ```

  输出必须显示 `nvidia`。如未显示，请按照[前置条件](./installation/online-installation)指南操作。

- 如果在使用 NVIDIA 镜像的设备插件时不请求 vGPU，机器上的所有 GPU 可能会在容器内暴露。
- 目前，A100 MIG 仅支持 "none" 和 "mixed" 模式。
- 目前无法调度带有 "nodeName" 字段的任务；请改用 "nodeSelector"。
- 目前仅支持计算任务；不支持视频编解码处理。
- 从 v2.3.10 起，HAMi 将 `device-plugin` 环境变量名称从 `NodeName` 更改为 `NODE_NAME`。如果你使用早于 v2.3.10 的镜像版本，`device-plugin` 可能无法启动，有两种方法可以解决：
  - 手动执行 `kubectl edit daemonset` 修改 `device-plugin` 环境变量从 `NodeName` 为 `NODE_NAME`。
  - 使用 Helm 升级到最新版本：执行 `helm upgrade hami hami/hami -n kube-system`，它将自动修复。

## 使用 GPU Operator 25.10+ 时 NVIDIA 容器启动失败 {#nvidia-toolkit-gpu-operator-25-10}

安装或升级 GPU Operator 后，如果 HAMi Device Plugin 或由 HAMi 调度的 NVIDIA 工作负载无法启动，请按照本节排查。

### 问题一：HAMi Device Plugin 无法启动

#### 定位原因

查看 Device Plugin 日志：

```bash
kubectl logs -n kube-system \
  -l app.kubernetes.io/component=hami-device-plugin \
  --all-containers --tail=200
```

根据错误日志定位原因：

| 错误日志 | 原因 |
| --- | --- |
| `Incompatible strategy detected auto` | Device Plugin 容器没有获得 NVIDIA 驱动和设备，因而无法通过 NVML 发现 GPU。 |
| `invalid device discovery strategy` | Device Plugin 无法初始化 NVIDIA 设备发现，通常也是 runtime 未正确注入设备所致。 |
| `failed to locate libcuda.so` 或 `failed to locate libnvidia-ml.so` | HAMi 生成 CDI spec 时，无法从配置的驱动根目录找到驱动库。 |

确认 runtime 和 CDI 配置：

```bash
kubectl get clusterpolicy -o yaml | grep -A 5 'cdi:'
kubectl get runtimeclass nvidia

kubectl get pods -n kube-system \
  -l app.kubernetes.io/component=hami-device-plugin \
  -o custom-columns=NAME:.metadata.name,RUNTIMECLASS:.spec.runtimeClassName
```

使用 GPU Operator 25.10+ 时，CDI 通常处于开启状态，集群中必须存在 `nvidia` RuntimeClass，HAMi Device Plugin 的 `RUNTIMECLASS` 列应显示 `nvidia`。

#### 解决方案

为 HAMi 配置 `nvidia` RuntimeClass，然后重启 Device Plugin：

```bash
helm upgrade hami hami-charts/hami \
  --namespace kube-system \
  --reuse-values \
  --set devicePlugin.runtimeClassName=nvidia

kubectl rollout restart daemonset/hami-device-plugin -n kube-system
kubectl rollout status daemonset/hami-device-plugin -n kube-system
```

如果 HAMi 已开启 CDI，且日志显示驱动库缺失，请使用 GPU Operator 对应的路径：

```yaml
devicePlugin:
  runtimeClassName: nvidia
  deviceListStrategy: cdi-annotations
  nvidiaDriverRoot: /run/nvidia/driver
  nvidiaHookPath: /usr/local/nvidia/toolkit/nvidia-ctk
```

等待 NVIDIA 驱动和 Toolkit DaemonSet 就绪后，再重启 HAMi Device Plugin。如果驱动直接安装在宿主机，请将 `devicePlugin.nvidiaDriverRoot` 设为 `/`。

### 问题二：HAMi 调度的 Pod 无法启动

#### 定位原因

检查 Pod 事件和分配到的 RuntimeClass：

```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl get pod <pod-name> -n <namespace> \
  -o custom-columns=NAME:.metadata.name,RUNTIMECLASS:.spec.runtimeClassName
```

根据错误内容选择对应的排障路径：

| Pod 事件中的错误 | 原因 |
| --- | --- |
| `libcuda.so.1: cannot open shared object file` | 容器启动时没有注入 NVIDIA 驱动库。 |
| `unresolvable CDI devices management.nvidia.com/gpu=GPU-...` | NVIDIA runtime 选择了 GPU 管理 CDI 设备，但无法生成或解析对应设备。 |
| `unresolvable CDI devices k8s.device-plugin.nvidia.com/gpu=GPU-...` | HAMi 返回了 CDI 设备，但容器运行时找不到匹配的 HAMi CDI spec。 |

#### 解决方案

先确认 HAMi 使用的设备注入模式：

```bash
helm get values hami -n kube-system | grep -A 5 'devicePlugin:'
```

- 默认的 `devicePlugin.deviceListStrategy=envvar` 模式：使用问题一中的 Helm 命令设置 `devicePlugin.runtimeClassName=nvidia`，让 NVIDIA runtime 处理通过 `NVIDIA_VISIBLE_DEVICES` 返回的 UUID。
- `devicePlugin.deviceListStrategy=cdi-annotations` 模式：同时应用问题一列出的四个 CDI 参数，然后在节点上检查 `/var/run/cdi/k8s.device-plugin.nvidia.com-gpu.json`，确认其中包含分配到的 GPU UUID。
- Container Toolkit 直接安装在宿主机：确认当前容器运行时配置中存在 `nvidia` runtime；修正配置后重启容器运行时。

不要混用 HAMi CDI annotation 与缺失或过期的 HAMi CDI spec。完整配置和验证步骤参见 [NVIDIA CDI 支持](../installation/configure-cdi.md)。

### 为什么会出现这个问题

从 [GPU Operator 25.10.0](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/25.10/cdi.html) 开始，CDI 默认开启，Operator 不再将 `nvidia` 设为默认 runtime。

在 25.10.0 之前，GPU Operator 通常会把 NVIDIA runtime 配置为默认 runtime。因此，每个 Pod 都会经过 NVIDIA runtime hook，并根据 `NVIDIA_VISIBLE_DEVICES` 注入指定的设备和驱动库。

从 25.10.0 开始，`runc` 保持为默认 runtime，普通 Device Plugin 工作负载由容器运行时通过原生 CDI 注入设备。通过 `NVIDIA_VISIBLE_DEVICES` 访问 GPU 的管理容器必须显式使用 `runtimeClassName: nvidia`，HAMi Device Plugin 就属于此类管理容器。

HAMi 支持两条设备注入路径：

| HAMi 模式 | 分配结果 | runtime 要求 |
| --- | --- | --- |
| `envvar`（默认） | HAMi 将分配到的 GPU UUID 写入 `NVIDIA_VISIBLE_DEVICES`。 | 使用 GPU Operator 25.10+ 时，Pod 必须使用 `nvidia` RuntimeClass。 |
| `cdi-annotations` | HAMi 返回名为 `k8s.device-plugin.nvidia.com/gpu=GPU-...` 的 CDI 设备，并在节点上生成对应 CDI spec。 | 容器运行时必须开启 CDI，并能够读取当前的 HAMi CDI spec。 |

HAMi Chart 会把 `devicePlugin.runtimeClassName` 同时应用到 Device Plugin，以及由 HAMi scheduler 修改的 NVIDIA 工作负载。因此，将其设为 `nvidia` 既能修复管理容器，也能保持工作负载的 runtime 路径一致。

对于新集群，推荐使用 GPU Operator，因为它提供统一的驱动、Container Toolkit 和监控组件配置与升级入口。如果这些组件已经安装在宿主机，并由你自行维护容器运行时配置，也可以不使用 GPU Operator；这种情况请参考[前置条件](../installation/prerequisites.md)。

:::warning

使用 HAMi 时必须关闭 GPU Operator 自带的 Device Plugin。两者都会注册 `nvidia.com/gpu`，不能在同一节点同时运行。

```yaml
devicePlugin:
  enabled: false
```

:::
