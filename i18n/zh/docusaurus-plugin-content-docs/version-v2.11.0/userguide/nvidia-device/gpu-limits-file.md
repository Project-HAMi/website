---
title: 在 SSH 和登录会话中保留 GPU 限额
sidebar_label: GPU 限额文件
description: 使用只读的限额文件在 SSH、su、sudo 和 cron 会话中保留 GPU 限额，验证其是否生效，并在需要时切换为环境变量。
translated: true
---

HAMi 通过环境变量把每个容器的 GPU 限额传给 HAMi-core。通过 SSH、`su -`、`sudo` 或 cron 启动的进程会得到一个全新的空环境，所以以前这类进程运行时没有任何 GPU 限额。

为了解决这个问题，HAMi device plugin 还会把限额写入一个文件，并以只读方式挂载到容器的 `/overrideEnv`。HAMi-core 会先读取这个文件，所以容器内的所有进程，无论以什么方式启动，都会得到相同的限额。

该功能默认开启，无需任何修改。需要 HAMi v2.11.0 或更新版本。

## 工作原理

- 容器启动时，device plugin 把该容器的限额写入节点上的一个文件。
- 该文件以只读方式挂载到 `/overrideEnv`。容器内的进程可以读取，但不能修改。
- HAMi-core 在进程启动时读取 `/overrideEnv`。如果同一个值同时出现在文件和环境变量中，以文件为准。
- 环境变量仍会照常设置，所以原本就能拿到限额的进程，行为不变。

共有两种模式：

- `file`（默认）：设置环境变量，并挂载该文件。
- `env`：只设置环境变量，与 HAMi v2.10.0 及更早版本相同。

## 检查是否生效

创建一个测试 Pod：

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 3000
          nvidia.com/gpucores: 30
EOF
```

查看该文件：

```bash
kubectl exec gpu-pod -- cat /overrideEnv
```

你会看到类似下面的内容。根据配置不同，文件中可能还有其他行。

```
CUDA_DEVICE_MEMORY_LIMIT_0=3000m
CUDA_DEVICE_MEMORY_SHARED_CACHE=/usr/local/vgpu/usage.cache
CUDA_DEVICE_SM_LIMIT=30
HAMI_LIMITS_FORMAT=1
```

然后用空环境运行 `nvidia-smi`，与 SSH 登录启动进程的方式相同：

```bash
kubectl exec gpu-pod -- env -i /usr/bin/nvidia-smi --query-gpu=memory.total --format=csv,noheader
```

预期输出：`3000 MiB`，即 Pod 的限额，而不是 GPU 的全部显存。你也可能看到以 `[HAMI-core Msg ...]` 开头的行，这是正常的。

## 切换为环境变量

除非某个工作负载无法使用该文件（例如它的镜像已经占用了 `/overrideEnv` 路径），否则请保留 `file`。

:::note

在 `env` 模式下，通过 SSH、`su -`、`sudo` 或 cron 启动的进程会再次没有 GPU 限额。

:::

可以为整个集群、单个节点或单个 Pod 设置模式。HAMi 按以下顺序使用第一个已设置的值：Pod 注解、节点设置、集群设置。如果都没有设置，则使用 `file`。无法识别的 Pod 注解会被忽略，改用节点设置或集群设置。无法识别的节点值会覆盖集群设置，因此即使集群设置为 `env`，该节点也会使用 `file`。device plugin 跳过无法识别的值时，会记录一条警告日志。

### 整个集群

在 Helm values 中设置以下内容，然后执行 `helm upgrade`。如果 `devicePlugin.updateStrategy.type` 为 `RollingUpdate`（默认值），device plugin 会自动重启；如果为 `OnDelete`，请先手动删除旧的 device plugin Pod，再重新创建业务 Pod。

```yaml
devices:
  nvidia:
    limitDelivery: env
```

如果你用 `device-config.content` 或 `files/device-config.yaml` 替换了整个设备配置，Chart 不会使用这个值。请改为在该配置中设置 `nvidia.limitDelivery: env`。详见[设备 ConfigMap 的生成与生效](../configure.md#device-config-overrides)。

### 单个节点

在 device plugin 配置中，为该节点的条目添加 `limitdelivery`。如果该节点已有条目，直接在其中添加这个键。

```yaml
devicePlugin:
  nodeConfiguration:
    config: |
      {
        "nodeconfig": [
          {
            "name": "<你的 GPU 节点>",
            "limitdelivery": "env"
          }
        ]
      }
```

执行 `helm upgrade` 后，重启 device plugin，让它读取新配置：

```bash
kubectl -n <namespace> rollout restart daemonset/hami-device-plugin
```

使用 `OnDelete` 时，这条命令不会替换 Pod，请改为手动删除该节点上旧的 device plugin Pod。详见[外部 ConfigMap 与重新加载](../configure.md#configuration-reload)。

### 单个 Pod

为 Pod 添加以下注解。对于 Deployment，请添加到 Pod 模板中。

```yaml
metadata:
  annotations:
    hami.io/limit-delivery: "env"
```

当节点或集群使用 `env` 时，可以用 `"file"` 为单个 Pod 重新开启该文件。

:::note

新模式只对修改之后创建的 Pod 生效。如需让运行中的 Pod 使用新模式，请重新创建它们。

:::

## 说明

- 在 `mig` 运行模式下，HAMi 不使用 HAMi-core，所以不会写入该文件。
- HAMi-core 在读取文件之前读取 `LIBCUDA_LOG_LEVEL`。没有继承环境变量的进程会使用 HAMi-core 的默认日志级别，所以可能多打印几行 `[HAMI-core ...]` 消息。这些消息不影响使用。
- 已在 containerd 上测试。gVisor、Kata 等沙箱运行时以及 CRI-O 尚未测试。
- 如需了解该功能的实现方式，见 [GPU 限额文件设计](/developers/gpu-limit-delivery-design.md)。
