---
title: 在阿里云容器服务 ACK 上安装 HAMi
sidebar_label: ACK 上的 HAMi
translated: true
---

本文介绍在[阿里云容器服务 Kubernetes 版（ACK）](https://www.aliyun.com/product/kubernetes)的 NVIDIA GPU 节点上安装 HAMi 所需的 ACK 配置。其他通用步骤见[安装前提条件](./prerequisites.md)和[通过 Helm 在线安装](./online-installation.md)。

以下步骤已在如下环境中验证：

| 组件        | 版本                                   |
| ----------- | -------------------------------------- |
| 集群        | ACK 托管集群，华东1（杭州）地域        |
| 节点类型    | `ecs.gn6i-c4g1.xlarge`，1 × Tesla T4   |
| 操作系统    | Ubuntu 24.04.3 LTS                     |
| Kubernetes  | `v1.36.2-aliyun.1`                     |
| 容器运行时  | containerd `2.3.4`                     |
| NVIDIA 驱动 | `535.161.07`，CUDA `12.2`，由 ACK 安装 |
| HAMi        | `2.10.0`                               |

## 准备 GPU 节点池

创建节点池时，选择 GPU 实例规格。ACK 会在节点上安装 NVIDIA 驱动和 NVIDIA Container Toolkit，因此无需部署 GPU Operator。本文在未安装 ACK 共享 GPU 调度组件的情况下验证。

ACK 还会将 containerd 默认 `runc` 运行时的可执行文件设置为 `nvidia-container-runtime`。所有容器都会使用 NVIDIA 运行时，HAMi 无需配置 RuntimeClass。可在 GPU 节点上运行以下命令确认：

```bash
grep -A1 'runtimes.runc.options' /etc/containerd/config.toml
```

输出应包含：

```text
          [plugins."io.containerd.cri.v1.runtime".containerd.runtimes.runc.options]
            BinaryName = "nvidia-container-runtime"
```

由于 ACK 已将驱动直接安装在宿主机上（`nvidia-smi` 位于 `/usr/bin`，驱动库位于 `/lib/x86_64-linux-gnu`），因此需要将 HAMi 的 `devicePlugin.nvidiaDriverRoot` 设置为 `/`。配置方法见[准备 HAMi values 文件](#prepare-the-hami-values)。

## 禁用 ACK 自带的 NVIDIA Device Plugin {#disable-ack-device-plugin}

ACK 默认会安装 `ack-nvidia-device-plugin` 组件，即 DaemonSet `kube-system/ack-nvidia-device-plugin`。它运行在带有 `ack.node.gpu.schedule=default` 标签的节点上，ACK 会为 GPU 节点自动添加该标签。它与 HAMi 通过同一个 kubelet socket 注册 `nvidia.com/gpu`，因此同一节点上只能有一个生效。两者同时运行的后果见 [Pod 能看到整张 GPU](#pods-see-the-whole-gpu)。

可以使用以下任一方法。

### 方法一：为 GPU 节点添加标签

该方法只在带有标签的节点上禁用 ACK 自带的 Device Plugin。在 ACK 控制台编辑 GPU 节点池，添加以下**节点标签**：

| 键                      | 值         | 作用                                |
| ----------------------- | ---------- | ----------------------------------- |
| `ack.node.gpu.schedule` | `disabled` | 停止节点上 ACK 自带的 Device Plugin |
| `gpu`                   | `on`       | 让 HAMi 的 Device Plugin 选中该节点 |

`disabled` 这个取值的说明见 ACK 文档[使用 DRA 调度 GPU](https://help.aliyun.com/zh/ack/ack-managed-and-ack-dedicated/user-guide/schedule-gpus-using-dra)。

也可以使用 `kubectl` 为单个节点设置标签：

```bash
kubectl label node <node-name> ack.node.gpu.schedule=disabled gpu=on --overwrite
```

检查节点标签，并确认 ACK 的 DaemonSet 不再调度到该节点：

```bash
kubectl get nodes -L gpu,ack.node.gpu.schedule
kubectl -n kube-system get ds ack-nvidia-device-plugin
```

```text
NAME                      STATUS   ROLES    AGE   VERSION            GPU   ACK.NODE.GPU.SCHEDULE
cn-hangzhou.10.207.93.6   Ready    <none>   51m   v1.36.2-aliyun.1   on    disabled

NAME                       DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR                   AGE
ack-nvidia-device-plugin   0         0         0       0            0           ack.node.gpu.schedule=default   57m
```

### 方法二：卸载组件

该方法在整个集群中禁用 ACK 自带的 Device Plugin。在 ACK 控制台进入集群的**组件管理**页面，卸载 `ack-nvidia-device-plugin` 组件，然后为 GPU 节点添加 HAMi Device Plugin 使用的标签：

```bash
kubectl label node <node-name> gpu=on
```

## 将 HAMi 镜像复制到容器镜像服务 {#copy-the-hami-images}

中国内地地域的节点无法访问 Docker Hub。HAMi Chart 会拉取 `docker.io/projecthami/hami` 和 `docker.io/liangjw/kube-webhook-certgen`，因此 `hami-admission-create` Job 会报类似以下错误：

```text
Failed to pull image "docker.io/liangjw/kube-webhook-certgen:v1.1.1": ... dial tcp 157.240.17.35:443: i/o timeout
```

Chart 默认的 `kube-scheduler` 镜像来自 `registry.cn-hangzhou.aliyuncs.com`，可以正常拉取。

将这两个 Docker Hub 镜像复制到与集群同地域的阿里云容器镜像服务（ACR）实例中。可以使用以下任一版本：

- ACR 企业版可以从 Docker Hub 同步镜像。见[创建企业版实例](https://help.aliyun.com/zh/acr/user-guide/create-a-container-registry-enterprise-edition-instance)和[通过制品订阅获取海外源镜像](https://help.aliyun.com/zh/acr/user-guide/subscribe-to-image-tags)。
- ACR 个人版需要自行推送镜像。见[使用个人版实例推送拉取镜像](https://help.aliyun.com/zh/acr/user-guide/use-a-container-registry-personal-edition-instance-to-push-and-pull-images)。

将 `hami` 和 `kube-webhook-certgen` 仓库设置为公开，使节点无需凭证即可拉取。

自行推送镜像时，在一台能访问 Docker Hub 的机器上登录实例的公网地址：

```bash
docker login --username=<username> registry.cn-<个人版实例所在的地域>.aliyuncs.com
```

使用 `docker buildx imagetools create` 复制镜像。该命令会复制包含所有平台的镜像索引，因此即使在 arm64 机器上运行，也会包含 `linux/amd64` 镜像：

```bash
docker buildx imagetools create \
  --tag registry.cn-<个人版实例所在的地域>.aliyuncs.com/<namespace>/hami:v2.10.0 \
  docker.io/projecthami/hami:v2.10.0
docker buildx imagetools create \
  --tag registry.cn-<个人版实例所在的地域>.aliyuncs.com/<namespace>/kube-webhook-certgen:v1.1.1 \
  docker.io/liangjw/kube-webhook-certgen:v1.1.1
```

## 为 HAMi 调度器授予 DRA 资源访问权限 {#grant-dra-access}

`hami-scheduler` Pod 中的 `kube-scheduler` 容器绑定了内置的 `system:kube-scheduler` ClusterRole。在 ACK 上，该 ClusterRole 没有 `resource.k8s.io` API 组的规则。`kube-scheduler` v1.36 会监听该组中的 DRA 资源，因此会输出以下错误，并且一直不会开始选主：

```text
E1010 16:36:37.676013       1 reflector.go:227] "Failed to watch" err="failed to list *v1.ResourceClaim: resourceclaims.resource.k8s.io is forbidden: User \"system:serviceaccount:kube-system:hami-scheduler\" cannot list resource \"resourceclaims\" in API group \"resource.k8s.io\" at the cluster scope"
```

此时 `hami-scheduler` Pod 处于 `Running` 状态，但其中的 `vgpu-scheduler-extender` 容器会反复输出 `Scheduler extender has not become leader yet`，申请 vGPU 资源的 Pod 会一直处于 `Pending` 状态。

在安装 HAMi 之前，将以下内容保存为 `hami-scheduler-dra-rbac.yaml`：

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: hami-scheduler-dra
rules:
  - apiGroups: ["resource.k8s.io"]
    resources: ["resourceclaims", "resourceslices", "deviceclasses"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: hami-scheduler-dra
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: hami-scheduler-dra
subjects:
  - kind: ServiceAccount
    name: hami-scheduler
    namespace: kube-system
```

应用该文件：

```bash
kubectl apply -f hami-scheduler-dra-rbac.yaml
```

该绑定对应名为 `hami` 的 release 的 ServiceAccount。如果使用其他 release 名称，ServiceAccount 名称为 `<release-name>-hami-scheduler`。

## 准备 HAMi values 文件 {#prepare-the-hami-values}

将 HAMi 的镜像指向 ACR 中的仓库。使用实例的专有网络（VPC）地址，节点无需 NAT 网关即可访问。需要逐个设置镜像，因为 `global.imageRegistry` 也会修改 `kube-scheduler` 镜像的仓库地址。

将以下内容保存为 `hami-ack-values.yaml`，并替换 `<个人版实例所在的地域>` 和 `<namespace>`。使用企业版时，将 `registry` 替换为企业版实例的专有网络地址：

```yaml
scheduler:
  extender:
    image:
      registry: registry-vpc.cn-<个人版实例所在的地域>.aliyuncs.com
      repository: <namespace>/hami
  patch:
    imageNew:
      registry: registry-vpc.cn-<个人版实例所在的地域>.aliyuncs.com
      repository: <namespace>/kube-webhook-certgen
devicePlugin:
  nvidiaDriverRoot: /
  image:
    registry: registry-vpc.cn-<个人版实例所在的地域>.aliyuncs.com
    repository: <namespace>/hami
  monitor:
    image:
      registry: registry-vpc.cn-<个人版实例所在的地域>.aliyuncs.com
      repository: <namespace>/hami
```

## 安装 HAMi

按[通过 Helm 在线安装](./online-installation.md)部署，并在安装命令中传入 values 文件：

```bash
helm install hami hami-charts/hami -n kube-system -f hami-ack-values.yaml
```

`hami-device-plugin` 和 `hami-scheduler` 运行后，确认 HAMi 调度器已持有选主租约：

```bash
kubectl -n kube-system get lease hami-scheduler
```

```text
NAME             HOLDER                                                                 AGE
hami-scheduler   hami-scheduler-566cc89c9d-68f6n_8ed04e0d-8e3d-457a-a866-76fc43de07f5   38s
```

然后确认 HAMi 已注册 GPU。`devicePlugin.deviceSplitCount` 默认为 10，因此一张 T4 会上报 10 个 `nvidia.com/gpu`：

```bash
kubectl get node <node-name> -o jsonpath='{.status.allocatable.nvidia\.com/gpu}{"\n"}'
```

```text
10
```

## 故障排查

### Pod 能看到整张 GPU {#pods-see-the-whole-gpu}

如果节点上 ACK 自带的 Device Plugin 与 HAMi 同时运行，最后注册的插件会接管 `nvidia.com/gpu`。当 ACK 的插件接管后，节点的 `nvidia.com/gpu` allocatable 会从 HAMi 上报的值（例如 `10`）降为物理 GPU 数量。新建的 Pod 可以正常启动，不会报错，但 HAMi 的限制不再生效。

恢复步骤：

1. 按[禁用 ACK 自带的 NVIDIA Device Plugin](#disable-ack-device-plugin)在该节点上禁用 ACK 的 Device Plugin，等待该节点上的 `ack-nvidia-device-plugin` Pod 被删除。
2. 重启 HAMi 的 Device Plugin，使其重新注册：

   ```bash
   kubectl -n kube-system rollout restart ds/hami-device-plugin
   kubectl -n kube-system rollout status ds/hami-device-plugin
   ```

3. 确认节点的 `nvidia.com/gpu` allocatable 恢复为 HAMi 上报的值。
4. 重建在 ACK 插件生效期间启动的 Pod。

### Device Plugin 日志中出现 NUMA 错误

在验证用的 T4 实例上，`hami-device-plugin` 每次注册设备时都会输出以下错误：

```text
E1010 16:47:54.742604   36382 register.go:168] "failed to get numa information from sysfs" idx=0
I1010 16:47:54.742629   36382 register.go:204] Registered device id=0, memory=15360MB, type=NVIDIA-Tesla T4, numa=0, health=true
```

HAMi 从 `/sys/bus/pci/devices/<bus-id>/numa_node` 读取 GPU 所属的 NUMA 节点。在这台单 NUMA 节点的虚拟机上，内核为包括 GPU 在内的所有 PCI 设备上报 `-1`。HAMi 无法确定节点，于是输出这条错误并回退为 `numa=0`，与实际拓扑一致。设备仍以 `health=true` 注册成功，GPU 负载运行正常。在单 NUMA 节点的实例上可以忽略这条错误。
