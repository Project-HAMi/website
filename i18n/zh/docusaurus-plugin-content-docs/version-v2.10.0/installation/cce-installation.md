---
title: 在华为云云容器引擎 CCE 上安装 HAMi
sidebar_label: CCE 上的 HAMi
translated: true
---

本文介绍在[华为云云容器引擎（CCE）](https://www.huaweicloud.com/product/cce.html)的 NVIDIA GPU 节点上安装 HAMi 所需的 CCE 配置。其他通用步骤见[安装前提条件](./prerequisites.md)和[通过 Helm 在线安装](./online-installation.md)。

## 准备 GPU 节点池

创建 GPU 节点池之前，先安装 [CCE AI 套件（NVIDIA GPU）](https://support.huaweicloud.com/usermanual-cce/cce_10_0141.html)插件，并保留默认驱动。无需部署 GPU Operator。保持 GPU 虚拟化关闭。

CCE AI 套件会在每个 GPU 节点上将 NVIDIA 驱动安装到 `/usr/local/nvidia`，并安装 NVIDIA Container Toolkit。它还会在 containerd 中添加 `nvidia` 运行时，但默认运行时仍为 `runc`。因此 HAMi 需要一个指向 `nvidia` 运行时的 RuntimeClass。可在 GPU 节点上运行以下命令确认：

```bash
grep default_runtime_name /etc/containerd/config.toml
grep -A1 'runtimes.nvidia.options' /etc/containerd/config.toml
```

输出应包含：

```text
      default_runtime_name = 'runc'
          [plugins.'io.containerd.cri.v1.runtime'.containerd.runtimes.nvidia.options]
            BinaryName = '/usr/bin/nvidia-container-runtime'
```

集群默认没有 RuntimeClass，由 HAMi Chart 创建。配置方法见[准备 HAMi values 文件](#prepare-the-hami-values)。

## 禁用 CCE 自带的 NVIDIA Device Plugin {#disable-cce-device-plugin}

CCE AI 套件会在 GPU 节点上运行 Device Plugin，即 DaemonSet `kube-system/nvidia-gpu-device-plugin`。它与 HAMi 的 Device Plugin 通过同一个 kubelet socket 注册 `nvidia.com/gpu`，因此同一节点上只能有一个生效。两者同时运行的后果见 [Pod 能看到整张 GPU](#pods-see-the-whole-gpu)。

CCE AI 套件会同时部署 Device Plugin（`nvidia-gpu-device-plugin`）和驱动安装组件（`nvidia-driver-installer`），控制台和 YAML 参数中都没有单独关闭 Device Plugin 的选项。这两个组件的 DaemonSet 都通过 `accelerator` 标签选择节点，CCE 会为 GPU 节点自动添加该标签，删除该标签会同时停止驱动安装。为 Device Plugin 的 DaemonSet 添加一条规则，跳过带有 `gpu=on` 标签的节点：

```bash
kubectl -n kube-system patch ds nvidia-gpu-device-plugin --type=json -p='[{"op":"add","path":"/spec/template/spec/affinity/nodeAffinity/requiredDuringSchedulingIgnoredDuringExecution/nodeSelectorTerms/0/matchExpressions/-","value":{"key":"gpu","operator":"NotIn","values":["on"]}}]'
```

然后为 GPU 节点添加标签。HAMi 的 Device Plugin 也通过该标签选择节点：

```bash
kubectl label node <node-name> gpu=on
```

如需为节点池中的所有节点（包括之后新增的节点）添加标签，可在 CCE 控制台的节点池配置中添加 Kubernetes 标签 `gpu=on`。

检查节点标签，并确认 Device Plugin 不再运行在该节点上，而驱动安装仍在运行：

```bash
kubectl get nodes -L accelerator,gpu
kubectl -n kube-system get ds nvidia-gpu-device-plugin ubuntu22-nvidia-driver-installer
```

```text
NAME          STATUS   ROLES    AGE   VERSION                ACCELERATOR   GPU
192.168.0.3   Ready    <none>   60m   v1.36.2-r10-36.0.2.3   nvidia-t4     on

NAME                               DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
nvidia-gpu-device-plugin           0         0         0       0            0           <none>          65m
ubuntu22-nvidia-driver-installer   1         1         1       1            1           <none>          65m
```

驱动安装 DaemonSet 的名称取决于节点的操作系统。

## 将 HAMi 镜像复制到 SWR {#copy-the-hami-images}

HAMi Chart 会从 Docker Hub 和 `registry.cn-hangzhou.aliyuncs.com` 拉取镜像，无法访问公网的节点拉取不到。将这三个镜像复制到与集群同地域的容器镜像服务（SWR）中。

先[创建组织](https://support.huaweicloud.com/usermanual-swr/swr_01_0014.html)，然后在一台能访问 Docker Hub 和 `registry.k8s.io` 的机器上，按[推送镜像到镜像仓库](https://support.huaweicloud.com/usermanual-swr/swr_01_0011.html)在 SWR 控制台生成登录指令，并将其中的 `docker login` 换成 `skopeo login` 运行。

Chart 会将 `kube-scheduler` 镜像的 tag 设置为集群的 Kubernetes 版本。例如 `kubectl version` 显示 Server Version 为 `v1.36.2-r0-36.0.13.6` 时，tag 为 `v1.36.2`。

复制镜像，将 `<地域>` 替换为地域 ID（例如西南-贵阳一为 `cn-southwest-2`），并将 `v1.36.2` 替换为集群对应的 tag。`--all` 会复制镜像的所有平台：

```bash
skopeo copy --all docker://docker.io/projecthami/hami:v2.10.0 \
  docker://swr.<地域>.myhuaweicloud.com/<组织名称>/hami:v2.10.0
skopeo copy --all docker://docker.io/liangjw/kube-webhook-certgen:v1.1.1 \
  docker://swr.<地域>.myhuaweicloud.com/<组织名称>/kube-webhook-certgen:v1.1.1
skopeo copy --all docker://registry.k8s.io/kube-scheduler:v1.36.2 \
  docker://swr.<地域>.myhuaweicloud.com/<组织名称>/kube-scheduler:v1.36.2
```

## 准备 HAMi values 文件 {#prepare-the-hami-values}

将以下内容保存为 `hami-cce-values.yaml`，并替换 `<地域>` 和 `<组织名称>`：

```yaml
global:
  imagePullSecrets:
    - default-secret
scheduler:
  kubeScheduler:
    image:
      registry: swr.<地域>.myhuaweicloud.com
      repository: <组织名称>/kube-scheduler
  extender:
    image:
      registry: swr.<地域>.myhuaweicloud.com
      repository: <组织名称>/hami
  patch:
    imageNew:
      registry: swr.<地域>.myhuaweicloud.com
      repository: <组织名称>/kube-webhook-certgen
devicePlugin:
  runtimeClassName: nvidia
  createRuntimeClass: true
  image:
    registry: swr.<地域>.myhuaweicloud.com
    repository: <组织名称>/hami
  monitor:
    image:
      registry: swr.<地域>.myhuaweicloud.com
      repository: <组织名称>/hami
```

`global.imagePullSecrets` 使用 `default-secret` 拉取镜像。CCE 会在每个命名空间下创建该 Secret，其中包含从 SWR 拉取镜像的凭证，因此镜像仓库可以保持私有。见[集群系统密钥说明](https://support.huaweicloud.com/usermanual-cce/cce_10_0388.html)。`devicePlugin.runtimeClassName` 和 `devicePlugin.createRuntimeClass` 会创建 `nvidia` RuntimeClass，并将其用于 HAMi 的 Device Plugin。HAMi 也会为申请 vGPU 资源的 Pod 设置该 RuntimeClass。

## 安装 HAMi

按[通过 Helm 在线安装](./online-installation.md)部署，并在安装命令中传入 values 文件：

```bash
helm install hami hami-charts/hami -n kube-system -f hami-cce-values.yaml
```

`hami-device-plugin` 和 `hami-scheduler` 运行后，确认 RuntimeClass 已创建，并且 HAMi 调度器已持有选主租约：

```bash
kubectl get runtimeclass
kubectl -n kube-system get lease hami-scheduler
```

```text
NAME     HANDLER   AGE
nvidia   nvidia    29s

NAME             HOLDER                                                                 AGE
hami-scheduler   hami-scheduler-57478c9db5-ttlrj_845424a5-33aa-4881-a744-9baa9090c26c   26s
```

然后确认 HAMi 已注册 GPU。`devicePlugin.deviceSplitCount` 默认为 10，因此一张 GPU 会上报 10 个 `nvidia.com/gpu`：

```bash
kubectl get node <node-name> -o jsonpath='{.status.allocatable.nvidia\.com/gpu}{"\n"}'
```

```text
10
```

## 故障排查

### Pod 能看到整张 GPU {#pods-see-the-whole-gpu}

如果节点上 CCE 自带的 Device Plugin 与 HAMi 同时运行，最后注册的 Device Plugin 会接管 `nvidia.com/gpu`。当 CCE 的 Device Plugin 接管后，节点的 `nvidia.com/gpu` allocatable 会从 HAMi 上报的值（例如 `10`）降为物理 GPU 数量。新建的 Pod 可以正常启动，不会报错，但 HAMi 的限制不再生效。

恢复步骤：

1. 按[禁用 CCE 自带的 NVIDIA Device Plugin](#disable-cce-device-plugin)重新为该 DaemonSet 添加规则，等待该节点上的 `nvidia-gpu-device-plugin` Pod 被删除。
2. 重启 HAMi 的 Device Plugin，使其重新注册：

   ```bash
   kubectl -n kube-system rollout restart ds/hami-device-plugin
   kubectl -n kube-system rollout status ds/hami-device-plugin
   ```

3. 确认节点的 `nvidia.com/gpu` allocatable 恢复为 HAMi 上报的值。
4. 重建在 CCE 的 Device Plugin 生效期间启动的 Pod。

### HAMi 的 Device Plugin 反复重启

如果 `hami-device-plugin` 处于 `CrashLoopBackOff` 状态，并且其 `device-plugin` 容器输出以下错误，说明没有设置 RuntimeClass：

```text
E1011 04:44:38.399747   44144 factory.go:135] Incompatible strategy detected auto
E1011 04:44:38.399767   44144 factory.go:136] If this is a GPU node, did you configure the NVIDIA Container Toolkit?
```

此时容器使用默认的 `runc` 运行时，找不到 NVIDIA 驱动。按[准备 HAMi values 文件](#prepare-the-hami-values)设置 `devicePlugin.runtimeClassName` 和 `devicePlugin.createRuntimeClass`。

### Device Plugin 日志中出现 NUMA 错误

在只有一个 NUMA 节点的 `g6.xlarge.4` 实例上，`hami-device-plugin` 每次注册设备时都会输出以下错误：

```text
E1011 05:13:54.908058   55835 register.go:168] "failed to get numa information from sysfs" idx=0
I1011 05:13:54.908089   55835 register.go:204] Registered device id=0, memory=15360MB, type=NVIDIA-Tesla T4, numa=0, health=true
```

HAMi 从 `/sys/bus/pci/devices/<bus-id>/numa_node` 读取 GPU 所属的 NUMA 节点。在该实例上，内核为 GPU 上报 `-1`。HAMi 无法确定 NUMA 节点，于是输出这条错误并回退为 `numa=0`，与实际拓扑一致。设备仍以 `health=true` 注册成功，GPU 负载运行正常。在单 NUMA 节点的实例上可以忽略这条错误。
