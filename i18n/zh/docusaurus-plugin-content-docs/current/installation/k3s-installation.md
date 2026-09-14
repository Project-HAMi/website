---
title: 在 K3s 上安装 HAMi
sidebar_label: K3s 上的 HAMi
translated: true
---

本文说明如何为 HAMi 配置 K3s 内置 containerd。[通用前置条件](./prerequisites.md)中的运行时配置和 containerd 重启步骤使用本文步骤替代。

## 前置条件

- 已有使用内置 containerd 的 K3s 集群，GPU 节点处于 `Ready` 状态。尚未安装 K3s 时，先按 [K3s 安装说明](https://docs.k3s.io/installation)创建集群。
- 可以通过 `kubectl` 和 Helm 访问集群，并具有安装 HAMi、标记节点的权限；可以在 GPU 节点上使用 `sudo` 检查配置和管理 systemd 服务。
- 已确定 NVIDIA Driver 和 Container Toolkit 由宿主机还是 GPU Operator 管理。软件包安装见[通用前置条件](./prerequisites.md)，CDI 参数见 [NVIDIA CDI 配置](./configure-cdi.md)。
- 在交给 HAMi 管理的 GPU 节点上，只保留 HAMi 的 NVIDIA Device Plugin 注册 GPU。使用 GPU Operator 时，在其 values 中设置 `devicePlugin.enabled=false`；其他已有 Device Plugin 应通过原有部署方式停用，避免重复注册。

以下命令使用 systemd 和 [K3s 默认数据目录](https://docs.k3s.io/cli/agent#data) `/var/lib/rancher/k3s`。使用自定义数据目录、containerd 模板或外部容器运行时时，先核对实际路径和配置。

## 配置 K3s 容器运行时

在每个 GPU 节点执行以下步骤。按部署方式选择对应的 Toolkit 分支，再持久保存配置并重启 K3s 服务。

### 检查 containerd 路径

K3s 会为每个节点[生成 containerd 配置](https://docs.k3s.io/advanced#configuring-containerd)。配置工具必须接入该 containerd 实例，默认路径如下：

| 用途 | 路径 |
| --- | --- |
| containerd 主配置 | `/var/lib/rancher/k3s/agent/etc/containerd/config.toml` |
| containerd socket | `/run/k3s/containerd/containerd.sock` |
| v3 配置导入目录（以实际 `imports` 为准） | `/var/lib/rancher/k3s/agent/etc/containerd/config-v3.toml.d/` |

在 GPU 节点上检查：

```bash
k3s --version
sudo test -S /run/k3s/containerd/containerd.sock
sudo grep -E 'version|imports' \
  /var/lib/rancher/k3s/agent/etc/containerd/config.toml
```

`test -S` 应返回成功。检查 `grep` 输出中的配置版本和导入路径。导入该目录的 v3 主配置包含：

```toml
version = 3
imports = ["/var/lib/rancher/k3s/agent/etc/containerd/config-v3.toml.d/*.toml"]
```

**补充配置文件（drop-in）**是由主配置通过 `imports` 加载的独立 TOML 文件。上例会加载 `config-v3.toml.d` 目录下的所有 `.toml` 文件。添加补充配置文件时，应确认实际 `imports` 包含其路径。

### 宿主机管理 Toolkit

K3s 启动时通过服务进程的 `PATH` 查找运行时可执行文件。宿主机安装运行时后，需要让已运行的 K3s 重新启动并检测。参见 [K3s 运行时支持说明](https://docs.k3s.io/advanced#alternative-container-runtime-support)。

先在 GPU 节点上定位可执行文件：

```bash
command -v nvidia-container-runtime
```

通过宿主机软件包安装时，预期路径为 `/usr/bin/nvidia-container-runtime`。同时确认 K3s 服务的 `PATH` 能找到该文件，尤其是在使用自定义安装目录时。

按[重启 K3s 并检查配置](#重启-k3s-并检查配置)中的步骤重启对应服务，再查看 K3s 生成的配置：

```bash
sudo grep -n -A 8 -B 2 'nvidia' \
  /var/lib/rancher/k3s/agent/etc/containerd/config.toml
```

确认 `nvidia` 运行时的 `BinaryName` 指向已安装的可执行文件，例如 `/usr/bin/nvidia-container-runtime`。自动检测方式无需手写 containerd 模板。

### GPU Operator 管理 Toolkit

由 GPU Operator 的 Toolkit 组件配置 containerd 时，在已有的 Operator values 中补充或调整以下路径项：

```yaml
toolkit:
  env:
    - name: CONTAINERD_CONFIG
      value: /var/lib/rancher/k3s/agent/etc/containerd/config.toml
    - name: CONTAINERD_SOCKET
      value: /run/k3s/containerd/containerd.sock
    - name: RUNTIME_CONFIG_SOURCE
      value: file=/var/lib/rancher/k3s/agent/etc/containerd/config.toml
    - name: RUNTIME_DROP_IN_CONFIG
      value: /var/lib/rancher/k3s/agent/etc/containerd/config-v3.toml.d/99-nvidia.toml
```

这份片段让 Toolkit 从 K3s 主配置读取信息、连接 K3s socket，并将运行时配置写入 K3s 已导入的目录。参数含义见 [GPU Operator 的 containerd 配置说明](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/25.10/getting-started.html#specifying-configuration-options-for-containerd)。

将该片段合并到完整的 Operator values 文件中。更新 `toolkit.env` 列表时，保留其他仍需使用的项。

部署后检查主配置的 `imports` 和生成的文件：

```bash
sudo grep -n '^imports' \
  /var/lib/rancher/k3s/agent/etc/containerd/config.toml
sudo cat \
  /var/lib/rancher/k3s/agent/etc/containerd/config-v3.toml.d/99-nvidia.toml
```

确认导入规则覆盖 `99-nvidia.toml`，文件中的运行时可执行路径也确实存在。这里的补充配置文件路径针对本文的 v3 配置；其他版本或自定义模板应先检查实际导入规则。

### 持久保存配置

K3s 会生成 `config.toml`。直接修改这个文件，不能作为重启后仍然有效的配置方案。

优先使用 K3s 配置项、自动检测结果或已导入的补充配置文件。确需扩展模板时，v3 使用同目录下的 `config-v3.toml.tmpl`，v2 使用 `config.toml.tmpl`；应扩展 [K3s 基础模板](https://docs.k3s.io/advanced#base-template)，不要把已生成的完整配置复制成模板。

如果部署方案已经选择将 `nvidia` 设为节点默认运行时，可在该节点的 [K3s 配置文件](https://docs.k3s.io/installation/configuration#configuration-file) `/etc/rancher/k3s/config.yaml` 中合并：

```yaml
default-runtime: nvidia
```

保留文件中的其他配置，并重启对应 K3s 服务。这个选项不是 K3s 上部署 HAMi 的必选项；需要显式选择运行时的工作负载，继续使用通用部署方案中的 RuntimeClass 配置。参见 [K3s NVIDIA 运行时说明](https://docs.k3s.io/advanced#nvidia-container-runtime)。

### 重启 K3s 并检查配置

运行时配置应在每个承载 GPU 工作负载的节点上检查。以下重启会影响节点服务；单节点 server 重启期间，Kubernetes API 会短暂不可用。

参照 [K3s 服务重启说明](https://docs.k3s.io/upgrades/manual#upgrade-k3s-using-the-binary)，在 GPU 节点上根据节点安装角色执行其中一条：

```bash
# Server 节点
sudo systemctl restart k3s
```

```bash
# Agent 节点
sudo systemctl restart k3s-agent
```

然后从具有集群访问权限的终端检查节点恢复情况：

```bash
kubectl get nodes
kubectl get runtimeclass nvidia -o yaml
```

K3s [预置受支持运行时的 RuntimeClass 定义](https://docs.k3s.io/advanced#nvidia-container-runtime)。因此，存在 `RuntimeClass/nvidia` 不能单独证明该节点已配置 NVIDIA 运行时。还需重新检查前文的主配置及所导入的文件，确认运行时注册和可执行路径仍然存在。

节点恢复 `Ready` 且运行时配置存在后，继续安装 HAMi。

## 安装 HAMi

按[前置条件中的节点标记步骤](./prerequisites.md)为 GPU 节点添加 `gpu=on`，再按[在线安装](./online-installation.md)部署 HAMi。保留所选 NVIDIA 部署方案的 Helm values。K3s 的 Kubernetes 版本带有发行版后缀，例如 `v1.35.8+k3s1`；对应的上游 kube-scheduler 镜像标签为 `v1.35.8`，不要将 `+k3s1` 后缀用于镜像标签。

如果沿用通用 Helm 指南中的默认 NVIDIA 运行时方案，先按前文设置 `default-runtime: nvidia` 并验证其生效。使用显式 RuntimeClass 的方案时，在 HAMi values 中设置 `devicePlugin.runtimeClassName=nvidia`，GPU 工作负载使用 `runtimeClassName: nvidia`。K3s 已有 `RuntimeClass/nvidia` 时，保留 `devicePlugin.createRuntimeClass=false` 以复用该资源。

## 验证安装

确认 `hami-scheduler` 和 GPU 节点上的 `hami-device-plugin` 均为 `Running`、`Ready` 后，将以下共享 vGPU 测试保存为 `hami-k3s-smoke.yaml`。示例显式使用 `nvidia` 运行时，并申请 1024 MiB 显存：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hami-k3s-smoke
spec:
  runtimeClassName: nvidia
  restartPolicy: Never
  containers:
    - name: cuda
      image: nvcr.io/nvidia/cuda:12.2.0-base-ubuntu22.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          nvidia.com/gpu: 1
          nvidia.com/gpumem: 1024
```

在有集群访问权限的终端执行：

```bash
kubectl apply -f hami-k3s-smoke.yaml
kubectl wait --for=condition=Ready pod/hami-k3s-smoke --timeout=180s
kubectl exec hami-k3s-smoke -- nvidia-smi
```

应看到 HAMi-core 初始化信息，容器内 GPU 总显存应为请求的 1024 MiB。该检查验证 GPU 可见性和显存限额的展示；计算与分配限制需要继续执行 GPU 工作负载验收。更多检查见 [HAMi 验证指南](../get-started/verify-hami.md)，其中的容器运行时配置仍使用本文步骤。

在维护窗口[重启 K3s](#重启-k3s-并检查配置)，确认节点恢复后，删除并重新创建测试 Pod，验证新容器使用的运行时配置已持久保存：

```bash
kubectl delete pod hami-k3s-smoke --wait=true
kubectl apply -f hami-k3s-smoke.yaml
kubectl wait --for=condition=Ready pod/hami-k3s-smoke --timeout=180s
kubectl exec hami-k3s-smoke -- nvidia-smi
kubectl delete pod hami-k3s-smoke --wait=true
```

## 故障排查

| 现象 | 检查方向 |
| --- | --- |
| RuntimeClass 存在，但新 Pod 提示运行时未配置 | 检查 Pod 所在节点的 K3s 主配置和补充配置文件；宿主机安装方式还需检查服务 `PATH` 及安装后是否重启 |
| 配置当时有效，重启后消失 | 检查是否只修改了生成的 `config.toml`，以及重启后 `imports` 是否仍覆盖补充配置文件 |
| Toolkit 更新运行时配置时，K3s API 短暂不可用 | 对齐 Toolkit 日志与 K3s 服务日志的时间，检查 containerd 是否退出、K3s 是否重启及随后是否恢复 |

查看 server 节点的 [K3s systemd 日志](https://docs.k3s.io/faq#where-are-the-k3s-logs)和服务状态：

```bash
sudo journalctl -u k3s -n 100 --no-pager
sudo systemctl show k3s -p ActiveState -p NRestarts
```

Agent 节点将服务名替换为 `k3s-agent`。

如果 Toolkit 更新后出现 containerd 退出或 K3s 重启，先检查日志并确认服务恢复，再创建 GPU Pod。持续重启或未恢复时，应先处理服务错误，再继续部署。
