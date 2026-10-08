---
title: 在腾讯云容器服务 TKE 上安装 HAMi
sidebar_label: TKE 上的 HAMi
translated: true
---

本文介绍在[腾讯云容器服务（TKE）](https://cloud.tencent.com/product/tke)的 NVIDIA GPU 节点上安装 HAMi 所需的 TKE 配置。其他通用步骤见[安装前提条件](./prerequisites.md)和[通过 Helm 在线安装](./online-installation.md)。

以下步骤已在如下环境中验证：

| 组件        | 版本                                          |
| ----------- | --------------------------------------------- |
| 节点类型    | TKE 原生节点（`GN7.2XLARGE32`，1 × Tesla T4） |
| 操作系统    | TencentOS Server 3.1                          |
| Kubernetes  | `v1.34.1-tke.8`                               |
| 容器运行时  | containerd `1.6.9-tke.9`                      |
| NVIDIA 驱动 | `580.126.20`，CUDA `13.0.2`，由 TKE 安装      |
| HAMi        | `2.10.0`                                      |

## 准备 GPU 节点池

创建节点池时，选择 GPU 机型和 GPU 驱动版本。TKE 会在节点上安装 NVIDIA 驱动和 NVIDIA Container Toolkit，因此无需部署 GPU Operator。保持 **qGPU 共享**处于关闭状态，本文在关闭该选项的情况下验证。

TKE 还会将 containerd 默认 `runc` 运行时的可执行文件设置为 `nvidia-container-runtime`。所有容器都会使用 NVIDIA 运行时，HAMi 无需配置 RuntimeClass。可在 GPU 节点上运行以下命令确认：

```bash
grep -A1 'runtimes.runc.options' /etc/containerd/config.toml
```

输出应包含：

```text
          [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
            BinaryName = "nvidia-container-runtime"
```

由于 TKE 已将驱动直接安装在宿主机上（`nvidia-smi` 位于 `/usr/bin`，驱动库位于 `/usr/lib64`），因此需要将 HAMi 的 `devicePlugin.nvidiaDriverRoot` 设置为 `/`。配置方法见[准备 HAMi values 文件](#prepare-the-hami-values)。

## 禁用 TKE 自带的 NVIDIA Device Plugin {#disable-tke-device-plugin}

TKE 会部署自带的 NVIDIA Device Plugin，即 DaemonSet `kube-system/nvidia-device-plugin-daemonset`。它运行在带有 `nvidia-device-enable=enable` 标签的节点上，TKE 会为 GPU 节点自动添加该标签。它与 HAMi 通过同一个 kubelet socket 注册 `nvidia.com/gpu`，因此同一节点上只能有一个生效。两者同时运行的后果见 [Pod 能看到整张 GPU](#pods-see-the-whole-gpu)。

在 TKE 控制台编辑 GPU 节点池，设置以下 **Labels**：

| 键                     | 值        | 作用                                |
| ---------------------- | --------- | ----------------------------------- |
| `nvidia-device-enable` | `disable` | 停止节点上 TKE 自带的 Device Plugin |
| `gpu`                  | `on`      | 让 HAMi 的 Device Plugin 选中该节点 |

勾选 **对存量节点应用本次Label/Annotation/Taint更新**，使节点池中已有的节点也生效。

也可以使用 `kubectl` 为单个节点设置标签：

```bash
kubectl label node <node-name> nvidia-device-enable=disable gpu=on --overwrite
```

检查节点标签，并确认 TKE 的 DaemonSet 不再调度到该节点：

```bash
kubectl get nodes -L gpu,nvidia-device-enable
kubectl -n kube-system get ds nvidia-device-plugin-daemonset
```

```text
NAME          STATUS   ROLES    AGE   VERSION         GPU   NVIDIA-DEVICE-ENABLE
10.100.0.13   Ready    <none>   59m   v1.34.1-tke.8   on    disable

NAME                             DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR                 AGE
nvidia-device-plugin-daemonset   0         0         0       0            0           nvidia-device-enable=enable   66m
```

## 准备 HAMi values 文件 {#prepare-the-hami-values}

TKE 节点默认没有公网 IP，除非 VPC 配置了 NAT 网关，否则只能从腾讯云内网拉取镜像。`docker.io/projecthami/hami` 不受影响，因为 TKE 已将 `mirror.ccs.tencentyun.com` 配置为 containerd 的 `docker.io` 镜像源；但 Chart 默认的 `kube-scheduler` 镜像来自 `registry.cn-hangzhou.aliyuncs.com`，这类节点无法访问该地址，`hami-scheduler` Pod 会报类似以下错误：

```text
Failed to pull image "registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler:v1.34.1": ... dial tcp 120.55.105.209:443: i/o timeout
```

改用 TKE 的 `ccr.ccs.tencentyun.com/tkeimages/hyperkube` 镜像。该镜像包含 `kube-scheduler` 可执行文件，镜像 tag 与 TKE 的 Kubernetes 版本一致。在以下命令输出的 `VERSION` 列中查看集群版本：

```bash
kubectl get nodes
```

将以下内容保存为 `hami-tke-values.yaml`，并将 tag 替换为集群版本：

```yaml
scheduler:
  kubeScheduler:
    image:
      registry: ccr.ccs.tencentyun.com
      repository: tkeimages/hyperkube
      tag: v1.34.1-tke.8
devicePlugin:
  nvidiaDriverRoot: /
```

## 安装 HAMi

按[通过 Helm 在线安装](./online-installation.md)部署，并在安装命令中传入 values 文件：

```bash
helm install hami hami-charts/hami -n kube-system -f hami-tke-values.yaml
```

`hami-device-plugin` 和 `hami-scheduler` 运行后，确认 HAMi 已注册 GPU。`devicePlugin.deviceSplitCount` 默认为 10，因此一张 T4 会上报 10 个 `nvidia.com/gpu`：

```bash
kubectl get node <node-name> -o jsonpath='{.status.allocatable.nvidia\.com/gpu}{"\n"}'
```

```text
10
```

## 故障排查

### Pod 能看到整张 GPU {#pods-see-the-whole-gpu}

如果节点上 TKE 自带的 Device Plugin 与 HAMi 同时运行，最后注册的插件会接管 `nvidia.com/gpu`。当 TKE 的插件接管后，节点的 `nvidia.com/gpu` allocatable 会从 HAMi 上报的值（例如 `10`）降为物理 GPU 数量。新建的 Pod 可以正常启动，不会报错，但 HAMi 的限制不再生效。

恢复步骤：

1. 按[禁用 TKE 自带的 NVIDIA Device Plugin](#disable-tke-device-plugin)为节点设置 `nvidia-device-enable=disable`，等待该节点上的 `nvidia-device-plugin-daemonset` Pod 被删除。
2. 重启 HAMi 的 Device Plugin，使其重新注册：

   ```bash
   kubectl -n kube-system rollout restart ds/hami-device-plugin
   kubectl -n kube-system rollout status ds/hami-device-plugin
   ```

3. 确认节点的 `nvidia.com/gpu` allocatable 恢复为 HAMi 上报的值。
4. 重建在 TKE 插件生效期间启动的 Pod。

### Device Plugin 日志中出现 NUMA 错误

在验证用的 T4 实例上，`hami-device-plugin` 每次注册设备时都会输出以下错误：

```text
E0916 16:14:55.021458   83601 register.go:168] "failed to get numa information from sysfs" idx=0
I0916 16:14:55.021480   83601 register.go:204] Registered device id=0, memory=15360MB, type=NVIDIA-Tesla T4, numa=0, health=true
```

HAMi 从 `/sys/bus/pci/devices/<bus-id>/numa_node` 读取 GPU 所属的 NUMA 节点。当固件没有为该设备提供邻近域信息（ACPI `_PXM`）时，内核会把这个文件写成 `-1`，本文使用的这类单 NUMA 节点虚拟机实例正属于这种情况。HAMi 无法确定节点，于是输出这条错误并回退为 `numa=0`。可在 GPU 节点上运行以下命令查看：

```bash
nvidia-smi --query-gpu=pci.bus_id --format=csv,noheader |
  tr 'A-F' 'a-f' | sed 's/^0000//' |
  while read -r id; do echo "$id $(cat /sys/bus/pci/devices/$id/numa_node)"; done
```

```text
0000:00:08.0 -1
```

该实例只有一个 NUMA 节点 `node0`，回退值与实际拓扑一致。设备仍以 `health=true` 注册成功，GPU 负载运行正常。在单 NUMA 节点的实例上可以忽略这条错误。
