---
title: 为 HAMi 启用 NVIDIA CDI 支持
sidebar_label: NVIDIA CDI 支持
translated: true
---

本文介绍 CDI 的作用，以及为 HAMi 配置 NVIDIA CDI 支持所需的 Helm Chart 参数。

## CDI 是什么

[CDI（Container Device Interface）](https://github.com/cncf-tags/container-device-interface)是一项容器设备接口规范。它使用 JSON 或 YAML 文件描述容器使用某个设备时需要应用的 OCI 配置，包括设备节点、文件挂载、环境变量和 OCI hook。

CDI 是与设备厂商无关的通用规范。HAMi 当前仅支持通过 CDI 注入 NVIDIA GPU；本文中的 HAMi 配置和排错方法不适用于其他厂商设备。

CDI 使用完全限定的设备名称标识设备：

```text
vendor.com/class=device-name
```

容器运行时收到设备名称后，会从 `/etc/cdi`、`/var/run/cdi` 等目录查找对应的 CDI spec，并将其中的配置写入容器的 OCI runtime spec。

CDI 本身不负责设备调度、资源分配或配额管理。在 HAMi 的 NVIDIA CDI 集成中，调度器和 NVIDIA Device Plugin 仍然负责选择、分配 GPU；CDI 负责把已经分配的 GPU 及其运行环境注入容器。

## CDI 解决什么问题

复杂设备通常不能只靠挂载一个 `/dev` 设备节点完成注入。GPU 容器还可能需要驱动库、多个设备节点、环境变量和容器生命周期 hook。没有统一接口时，设备厂商需要分别适配不同的容器运行时，运行时中也容易出现厂商专用逻辑。

CDI 将这些设备相关的 OCI 配置集中写入 spec，主要解决以下问题：

- 使用统一格式描述设备节点、挂载、环境变量和 hook。
- 使用稳定的设备名称在 Device Plugin 与容器运行时之间传递分配结果。
- 减少设备注入逻辑对特定容器运行时实现的依赖。
- 便于检查容器最终使用了哪些设备配置。

## HAMi 如何为 NVIDIA GPU 使用 CDI

为 NVIDIA Device Plugin 启用 `cdi-annotations` 后，HAMi 的设备注入流程如下：

1. HAMi 调度器和 NVIDIA Device Plugin 完成 GPU 选择与分配。
2. NVIDIA Device Plugin 生成 HAMi 使用的 CDI spec，并写入节点的 `/var/run/cdi` 目录。
3. Device Plugin 通过 CDI annotation 返回分配到的设备名称。
4. 支持 CDI 的容器运行时读取 annotation，查找对应的 CDI spec，并将设备配置加入容器的 OCI runtime spec。

HAMi 生成的 NVIDIA GPU CDI kind 为：

```text
k8s.device-plugin.nvidia.com/gpu
```

## 前置条件

启用 HAMi 的 NVIDIA CDI 支持前，需要确认以下条件：

- 节点已经安装 NVIDIA 驱动和 NVIDIA Container Toolkit。
- 容器运行时支持并已启用 CDI。
- 容器运行时能够读取 `/var/run/cdi` 中的 CDI spec。
- 已确认 NVIDIA 驱动和 `nvidia-ctk` 在节点上的实际路径。

不同容器运行时的 CDI 配置方式，参阅 [CDI 上游配置说明](https://github.com/cncf-tags/container-device-interface#how-to-configure-cdi)。

## 配置 Helm Chart

将以下内容保存为 `values-cdi.yaml`：

```yaml
devicePlugin:
  deviceListStrategy: "cdi-annotations"
  nvidiaDriverRoot: "<driver-root>"
  nvidiaHookPath: "<nvidia-ctk-path>"
```

- `devicePlugin.deviceListStrategy`：固定设置为 `cdi-annotations`，让 HAMi Device Plugin 通过 CDI annotation 传递设备名称。
- `devicePlugin.nvidiaDriverRoot`：指定节点上的 NVIDIA 驱动根目录，HAMi 使用该目录发现驱动文件和设备节点。
- `devicePlugin.nvidiaHookPath`：指定节点上实际执行的 `nvidia-ctk`，HAMi 将该路径写入生成的 CDI spec。

根据部署方式替换两个路径占位符：

- NVIDIA 驱动和 NVIDIA Container Toolkit 直接安装在宿主机：`<driver-root>` 使用 `/`，`<nvidia-ctk-path>` 使用 `/usr/bin/nvidia-ctk`。
- GPU Operator 管理驱动和 NVIDIA Container Toolkit：`<driver-root>` 使用 `/run/nvidia/driver`，`<nvidia-ctk-path>` 使用 `/usr/local/nvidia/toolkit/nvidia-ctk`。

:::warning

两个路径参数必须按节点上的实际文件布局设置，不能直接套用另一种部署方式的值。`nvidiaHookPath` 必须是容器运行时所在节点能够执行的路径。

:::

安装或升级 HAMi：

```bash
helm upgrade --install hami hami-charts/hami \
  --version 2.8.0 \
  --namespace kube-system \
  --create-namespace \
  --values values-cdi.yaml
```

## 验证配置

先确认 Helm 使用了预期配置：

```bash
helm get values hami -n kube-system
```

然后在 GPU 节点上检查所选 `nvidia-ctk` 路径和 HAMi 生成的 CDI spec。下面以宿主机安装路径为例；GPU Operator 环境需要替换 `NVIDIA_CTK_PATH`：

```bash
NVIDIA_CTK_PATH=/usr/bin/nvidia-ctk
sudo test -x "$NVIDIA_CTK_PATH"
"$NVIDIA_CTK_PATH" --version
sudo ls -l /var/run/cdi
sudo jq . /var/run/cdi/k8s.device-plugin.nvidia.com-gpu.json
```

重点确认以下内容：

- CDI kind 为 `k8s.device-plugin.nvidia.com/gpu`。
- 分配使用的 GPU UUID 出现在设备列表中。
- spec 中记录的设备节点和 hook 路径在节点上真实存在。

最后检查 Device Plugin 日志：

```bash
kubectl logs -n kube-system \
  -l app.kubernetes.io/component=hami-device-plugin \
  --tail=200 | grep -i cdi
```

日志中不应出现 CDI spec 生成失败、设备无法解析或 hook 路径不存在等错误。

## 常见问题

### `failed to stat CDI host device "/dev/nvidia-modeset": no such file or directory`

`devicePlugin.nvidiaDriverRoot` 与节点的驱动布局不一致。按前文的路径规则修正该参数，升级 HAMi，然后重新检查生成的 CDI spec。

### `stderr: No help topic for 'disable-device-node-modification'`

该错误表示实际执行的 NVIDIA Container Toolkit 不支持 CDI spec 中使用的 `disable-device-node-modification` 命令。该命令需要 NVIDIA Container Toolkit 1.18.0 或更高版本。

将 NVIDIA Container Toolkit 升级到 1.18.0 或更高版本，并检查 CDI spec 中记录的 hook 路径及其实际版本。如果同时存在宿主机安装和 GPU Operator 容器化安装，需要分别检查；升级其中一套不会更新另一套。

[GPU Operator v25.10.1](https://github.com/NVIDIA/gpu-operator/blob/v25.10.1/deployments/gpu-operator/values.yaml#L220-L224) 使用 NVIDIA Container Toolkit v1.18.1。相关问题参阅 [Toolkit version parser broken for casual kind demo user](https://github.com/kubernetes-sigs/dra-driver-nvidia-gpu/issues/568)。

### `error running createContainer hook #0: fork/exec /usr/bin/nvidia-ctk: no such file or directory`

CDI spec 中记录的 hook 路径在节点上不存在。确认 `nvidia-ctk` 的实际位置，修正 `devicePlugin.nvidiaHookPath`，升级 HAMi 以重新生成 CDI spec。
