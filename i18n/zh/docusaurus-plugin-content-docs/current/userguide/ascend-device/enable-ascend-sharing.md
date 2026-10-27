---
title: 启用 Huawei Ascend 共享
sidebar_label: Huawei Ascend 共享
translated: true
---

Huawei Ascend 设备插件为 HAMi 提供三种 NPU 切片模式：`template`（模板硬切片）、`hami-core`（运行时软切片）和 `enpu`。本页说明各模式的前置条件、Chart 配置、插件部署和作业示例。

## 前置条件 {#先决条件}

- 安装 Ascend 驱动和 [ascend-docker-runtime](https://gitcode.com/Ascend/mind-cluster/tree/master/component/ascend-docker-runtime)，并在节点的容器运行时中注册 `ascend` handler。后文创建的 RuntimeClass 会引用此 handler。
- 使用支持所选模式的 HAMi 调度器和 Ascend 设备插件版本。本页描述 Next 开发版本，所列字段可能尚未包含在已发布的 Chart 或镜像中。
- 确认节点上能执行 `npu-smi`。插件默认可访问 `/usr/local/Ascend/driver/tools/npu-smi` 和 `/usr/local/sbin/npu-smi`；使用其他路径时，需补充对应的主机路径挂载。

### template 模式

驱动需支持目标卡型的虚拟化模板。HAMi 按显存请求选择满足条件的最小模板，模板名和容量必须与驱动一致，见[设备模板](./device-template.md)。

### hami-core 模式

该模式通过 `libvnpu.so` 拦截运行时调用，控制显存和算力。目前仅支持 ARM 平台和 HAMi 调度器，要求 Ascend 驱动 25.5 及以上，插件镜像包含与业务 CANN 环境兼容的 hami-vnpu-core 库。

在目标节点启用设备共享。将 `<device-id>` 替换为 `npu-smi info -l` 查询到的设备 ID：

```bash
npu-smi set -t device-share -i <device-id> -d 1
npu-smi info -t device-share -i <device-id>
```

### enpu 模式 {#enpu}

ENPU 使用 vCANN-RT 控制算力和显存配额，当前 HAMi 集成支持 A2/910B 和 A3/910C。按 [vCANN-RT 官方环境要求](https://docs.openeuler.org/zh/docs/24.03_LTS_SP3/unifiedbus/unifiedbus/ubs-virt/ubs-virt-enpu/vcann-rt/README.html)准备软件组合：

| 硬件    | 业务镜像中的 CANN | 节点 HDK      |
| ------- | ----------------- | ------------- |
| A2/910B | 8.5.0 或 9.1.0    | 25.5.0 及以上 |
| A3/910C | 8.5.0 或 9.1.0    | 26.0.0 及以上 |

- 插件镜像必须包含与业务 CANN 版本匹配的 `libvruntime.so`、`enpu-monitor` 和 `ld.so.preload`。当前上游镜像构建流程打包的是 ARM64、CANN 9.1.0 的 ENPU 运行时；镜像有 AMD64 标签不代表其中的 ENPU 运行时支持 AMD64。
- 与 hami-vnpu-core 一样，目标设备必须启用 `device-share`。A3/910C 还要求独立 DIE 模式；在确认节点上的已有作业允许切换后，执行以下命令。A2/910B 不需要修改 DIE 模式。

```bash
npu-smi set -t multi-die-policy -d 1
npu-smi info -t multi-die-policy
```

查询结果应为 `INDEP_POLICY`。插件会检查该条件，不会自动修改节点策略。

业务镜像需包含 CANN，以及可执行的 `/usr/bin/systemd-detect-virt` 和依赖库。插件会将 ENPU 运行时安装到节点的 `/usr/local/enpu/vcann-rt`；已有文件内容与镜像不一致时会拒绝启动，不能通过反复重启绕过。

本页部署普通 ENPU 切片，不需要 enpu-manager。NPU 显存换出（`npu-mem-swap`）将 NPU 显存（HBM）中的数据换出到宿主机内存，用于显存超分。该功能还需要配套支持它的运行时和 enpu-manager，不能仅靠 Pod 注解启用。

## 配置 Ascend 调度支持

以下配置属于 **HAMi Chart**。按目标模式选择一份，保存为 `hami-ascend-values.yaml`，并合并部署需要的其他 values。三种模式都需要 `devices.ascend.enabled: true`；该开关不部署 Ascend 插件。

### template 配置

```yaml
devices:
  ascend:
    enabled: true
    runtimeClassName: ascend
    hamiVnpuMode: template
```

设备型号和模板使用 `devices.ascend.configs` 的默认定义。需要调整时，参考 [values 源码](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/values.yaml)保留集群所需的完整型号列表；列表覆盖会整体替换。模板模式不使用 `deviceSplitCount` 计算切片数量。

### hami-core 配置

```yaml
devices:
  ascend:
    enabled: true
    runtimeClassName: ascend
    hamiVnpuMode: hami-core
    deviceSplitCount: 10
```

`deviceSplitCount` 是每个物理 NPU 的虚拟设备数量上限，默认 `10`；显存和算力配额仍由业务 Pod 申请。该字段需要插件镜像包含对应支持，设置 values 不会使旧镜像获得新能力。

### enpu 配置 {#enpu-policy}

```yaml
devices:
  ascend:
    enabled: true
    runtimeClassName: ascend
    hamiVnpuMode: enpu
    deviceSplitCount: 10
    enpuPolicy: elastic
```

ENPU 同样使用 `deviceSplitCount`，有效数量不超过 `100`。每个容器只能申请一个物理 DIE 的份额。节点级 `hamiVnpuMode` 和正值 `vDeviceCount` 可分别覆盖全局模式和数量，配置方法见[节点配置](#node-configuration)。

`enpuPolicy` 默认 `elastic`，可选 `fixed-share`、`elastic`、`best-effort`，也分别接受字符串别名 `"1"`、`"2"`、`"3"`。Pod 注解 `huawei.com/enpu-policy` 可覆盖默认值。准入时，HAMi 将实际策略写入 Pod 注解；之后修改全局默认值不会改变已有 Pod。同一物理 DIE 上的 ENPU Pod 必须使用相同策略，无效策略会被拒绝。

### 安装 HAMi

按[在线安装指南](../../installation/online-installation.md)安装 HAMi，并传入 `--values hami-ascend-values.yaml`。下文以 release `hami` 为例，将命令中的 `<namespace>` 替换为 HAMi 实际所在命名空间。纯 Ascend 集群可额外设置 `devicePlugin.enabled: false` 关闭 NVIDIA 插件；混合 GPU 集群按需保留。

自定义资源名时，需同步修改 `devices.ascend.customresources` 和业务 Pod。完整字段见 [HAMi Chart values 参数表](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md#values)。已有部署的配置变更见[升级指南](../../installation/upgrade.md)。

## 部署 Ascend 设备插件

以下步骤用于首次安装独立插件，与 HAMi 部署在同一命名空间。如果已有插件由其他 Helm release 或清单管理，应修改已有部署，避免创建重复 DaemonSet。

### 标记设备节点

```bash
kubectl label node <ascend-node> ascend=on --overwrite
```

对每个要部署插件的节点执行一次。`ascend=on` 只决定插件部署位置，节点的切片模式由全局配置或下文的节点配置决定。

### 准备插件 Chart 和 values

获取包含所需模式支持的插件源码版本，将 `<plugin-ref>` 替换为对应 tag 或 commit：

```bash
git clone https://github.com/Project-HAMi/ascend-device-plugin.git
git -C ascend-device-plugin checkout <plugin-ref>
```

保存以下内容为 `ascend-plugin-values.yaml`。这是 **Ascend 插件 Chart** 的 values，不能放入前面的 HAMi values 文件。将 `<plugin-image-tag>` 替换为与所选源码和模式匹配的镜像 tag；自建镜像还需修改 `image.repository`。

```yaml
image:
  repository: projecthami/ascend-device-plugin
  tag: "<plugin-image-tag>"
config:
  create: false
  existingDeviceConfigMapName: hami-scheduler-device
runtimeClass:
  create: true
  name: ascend
  handler: ascend
nodeSelector:
  ascend: "on"
nodeConfig: |
  nodes: []
```

插件 Chart 创建 RBAC、ServiceAccount、DaemonSet、RuntimeClass 和节点 ConfigMap。若已有 `ascend` RuntimeClass，将 `runtimeClass.create` 改为 `false`。`nodes: []` 表示所有节点继承 HAMi 的全局模式。

:::warning 复用 HAMi 的全局设备配置

`config.create: false` 和 `config.existingDeviceConfigMapName` 让插件复用 HAMi 生成的 `hami-scheduler-device` ConfigMap。不要再次应用 `ascend-device-configmap.yaml`，也不要手动修改全局 `device-config.yaml`；设备参数统一通过 HAMi 的 `devices.ascend.*` 管理。

自定义 HAMi release 名称时，将 `existingDeviceConfigMapName` 改为实际生成的 ConfigMap 名称。ConfigMap 必须与插件位于同一命名空间。在此复用方式下，插件 Chart 的 `hamiVnpuMode`、`deviceSplitCount` 等用于生成设备 ConfigMap 的字段不会覆盖 HAMi 的配置。

:::

通过 HAMi Helm release 更新共享设备 ConfigMap 后，需重启 Ascend 设备插件以加载新配置。仅更新 HAMi 不会重启这个独立部署的插件。切换切片模式前，先停止或重新调度受影响的工作负载。使用默认 DaemonSet 名称时执行：

```bash
kubectl -n <namespace> rollout restart daemonset/hami-ascend-device-plugin
kubectl -n <namespace> rollout status daemonset/hami-ascend-device-plugin --timeout=5m
```

命名空间和 DaemonSet 名称按实际部署替换。重启后检查插件日志和节点资源，再启动新的工作负载。

### 按节点配置模式和设备数量 {#node-configuration}

同一集群使用多种模式时，将插件 values 中的 `nodeConfig` 替换为实际节点列表。例如：

```yaml
nodeConfig: |
  nodes:
    - name: ascend-node-1
      hamiVnpuMode: template
    - name: ascend-node-2
      hamiVnpuMode: hami-core
      vDeviceCount: 8
    - name: ascend-node-3
      hamiVnpuMode: enpu
      vDeviceCount: 8
```

`vDeviceCount` 是节点上每个物理 NPU 的虚拟设备数量上限，适用于 `hami-core` 和 `enpu` 模式。正值会覆盖全局 `deviceSplitCount`，因此上例中两个节点的上限均为 `8`；未设置或非正值时使用全局值。ENPU 的有效上限仍不超过 `100`，`template` 模式按模板计算。

插件将此内容写入 `hami-device-node-config` 的 `node-config.yaml`。节点名必须与 Kubernetes 一致；该字段是字符串，会整体替换，需保留其他节点条目。节点未配置模式时继承全局值。每个 ENPU 节点都必须先满足 ENPU 前置条件；不要在同一物理 DIE 上混用 hami-vnpu-core 和 ENPU。

### 安装并检查插件

```bash
helm install hami-ascend ./ascend-device-plugin/charts/ascend-device-plugin \
  --namespace <namespace> \
  --values ascend-plugin-values.yaml
kubectl -n <namespace> rollout status daemonset/hami-ascend-device-plugin
kubectl -n <namespace> get pods -l app.kubernetes.io/component=hami-ascend-device-plugin
kubectl get runtimeclass ascend
kubectl describe node <ascend-node>
```

确认 DaemonSet 已就绪，节点 `Allocatable` 中出现实际卡型的 Ascend 资源。随后运行对应模式的示例，验证设备分配和计算。仅 Pod 就绪不能证明工作负载已正常使用 NPU。

## 运行 Huawei Ascend 作业

示例默认使用调度器 `hami-scheduler` 和 RuntimeClass `ascend`，按实际部署修改。PyTorch 示例使用 AscendHub 的 910B、310P 镜像，内置 CANN 9.0.0；vLLM 示例使用官方 `v0.23.0` 镜像，内置 CANN 9.1.0。使用前确认镜像中的 CANN 与节点驱动、切片运行时兼容。vLLM 示例还需准备包含模型文件的 PVC。

### template 模式

以下示例在模板模式的节点上运行。只申请设备数量时使用整卡；申请显存时，HAMi 选择满足请求的硬件模板。

#### Ascend 910B3

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  schedulerName: hami-scheduler
  runtimeClassName: ascend
  containers:
    - name: ubuntu-container
      image: swr.cn-south-1.myhuaweicloud.com/ascendhub/pytorch:torch_npu-2.10.0-910b-ubuntu-py3.11
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend910B3: "1"
          # 如果不指定 Ascend910B3-memory，将使用整张 NPU
          huawei.com/Ascend910B3-memory: "4096"
```

#### Ascend 310P

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  schedulerName: hami-scheduler
  runtimeClassName: ascend
  containers:
    - name: ubuntu-container
      image: swr.cn-south-1.myhuaweicloud.com/ascendhub/pytorch:torch_npu-2.10.0-310p-ubuntu-py3.11
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend310P: "1"
          huawei.com/Ascend310P-memory: "1024"
```

### hami-core 模式

#### 单卡显存和算力配额

为 Pod 添加注解 `huawei.com/vnpu-mode: 'hami-core'` 即可启用软切片。还可以通过 `-core` 资源申请一定比例的算力核心：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ascend-soft-slice-pod
  annotations:
    huawei.com/vnpu-mode: "hami-core"
spec:
  schedulerName: hami-scheduler
  runtimeClassName: ascend
  containers:
    - name: npu_pod
      image: swr.cn-south-1.myhuaweicloud.com/ascendhub/pytorch:torch_npu-2.10.0-910b-ubuntu-py3.11
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend910B3: "1"
          huawei.com/Ascend910B3-memory: "28672"
          huawei.com/Ascend910B3-core: "40" # 申请 40% 的算力核心
```

#### 双卡 vLLM 推理（TP=2）

显存和算力请求分别应用于每张卡。将 `model-pvc` 替换为包含 `Qwen3-0.6B` 模型目录的 PVC，并使用兼容的 vLLM-Ascend 镜像。

假设每张物理卡有 64Gi 显存，计划在 2 张卡上各使用 32Gi（共 64Gi）：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: vllm-npu-2card
  annotations:
    huawei.com/vnpu-mode: "hami-core"
spec:
  schedulerName: hami-scheduler
  runtimeClassName: ascend
  containers:
    - name: vllm-container
      image: quay.io/ascend/vllm-ascend:v0.23.0
      command: ["/bin/sh", "-c"]
      args:
        - |
          vllm serve /model/Qwen3-0.6B \
          --host 0.0.0.0 \
          --port 8002 \
          --enforce-eager \
          --tensor-parallel-size 2 \
          --gpu-memory-utilization 0.5
      resources:
        limits:
          huawei.com/Ascend910B3: "2"
          huawei.com/Ascend910B3-memory: "32768"
          huawei.com/Ascend910B3-core: "50"
      volumeMounts:
        - name: model
          mountPath: /model
          readOnly: true
  volumes:
    - name: model
      persistentVolumeClaim:
        claimName: model-pvc
```

:::note

每卡申请 `32768` MiB（32 GiB），两卡合计 64 GiB。`--gpu-memory-utilization 0.5` 按每卡 32/64 计算，并需为运行时额外开销预留显存。

:::

### enpu 模式

#### 单卡算力与显存配额

以下示例使用 Ascend 910B3，申请 16 GiB 显存和 20% 算力配额，并执行矩阵乘法。`elastic` 可借用空闲算力，因此 20% 不是严格的算力使用上限。

将下方 `image` 替换为满足 [ENPU 示例前置条件](https://github.com/Project-HAMi/ascend-device-plugin/blob/ab41bec367ca95ac52ed1bcb8667c33e689f8f37/examples/enpu/README.md#prerequisites-and-deployment)的业务镜像：镜像中的 CANN 需与所用驱动和 ENPU 运行时兼容，包含可执行的 `/usr/bin/systemd-detect-virt` 及其依赖；本例还需要 PyTorch 和 `torch_npu`。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: enpu-soft-slicing
  annotations:
    huawei.com/vnpu-mode: enpu
    huawei.com/enpu-policy: elastic
spec:
  schedulerName: hami-scheduler
  runtimeClassName: ascend
  restartPolicy: Never
  containers:
    - name: pytorch
      image: registry.example.com/your-project/pytorch-ascend:replace-me
      command: ["python3", "-u", "-c"]
      args:
        - |
          import torch
          import torch_npu
          torch.npu.set_device(0)
          a = torch.ones((1024, 1024), device="npu:0")
          for _ in range(100):
              result = torch.mm(a, a)
          torch.npu.synchronize()
          print("ENPU result:", result[0, 0].item())
      resources:
        limits:
          huawei.com/Ascend910B3: "1"
          huawei.com/Ascend910B3-memory: "16384"
          huawei.com/Ascend910B3-core: "20"
```

将清单保存为 `enpu-soft-slicing.yaml`，将 `<workload-namespace>` 替换为业务命名空间后运行：

```bash
kubectl -n <workload-namespace> apply -f enpu-soft-slicing.yaml
kubectl -n <workload-namespace> logs -f enpu-soft-slicing
```

正常计算应输出 `ENPU result: 1024.0`。使用 910C 时，将三个资源名一起改为 `Ascend910C`、`Ascend910C-memory` 和 `Ascend910C-core`，并先确认独立 DIE 模式。容器内使用逻辑设备 `npu:0`，不要手动覆盖插件设置的设备可见性。

## 注意事项

- 模板模式下，默认 910B3 配置提供 16、32 GiB 两种模板；示例的 4096 MiB 请求会选择 16 GiB 模板。支持的模板取决于卡型和驱动。
- 不支持在初始化容器中使用 Huawei Ascend-sharing。
- 模板切片示例每个容器申请一个设备。hami-vnpu-core 支持多卡，显存和算力配额按每卡计算；ENPU 每个容器仅支持一个物理 DIE。
