---
title: 启用天数智芯 GPU 共享
---

## 简介

**HAMi 现已支持 iluvatar.ai/gpu（即 MR-V100、BI-V150、BI-V100），并实现了大部分与 NVIDIA GPU 相同的设备共享特性**，包括：

**GPU 共享**：每个任务可以分配部分 GPU，而不是整张 GPU 卡，因此多个任务可以共享同一块 GPU。

**设备显存控制**：GPU 可按指定显存大小进行分配，并通过硬限制防止超出分配额度。

**设备核心控制**：GPU 可按指定计算核心数量进行分配，并通过硬限制防止超出分配额度。

**设备 UUID 选择**：你可以通过 annotations 指定使用或排除哪些 GPU 设备。

**无需修改任务 YAML**：安装完成后，所有 GPU 作业都会自动获得支持。

## 前置条件

* 天数智芯 gpu-manager（请咨询你的设备供应商）
* 驱动版本 > 3.1.0

## 启用 GPU 共享支持

* 在天数智芯节点上部署 gpu-manager（请咨询你的设备供应商以获取安装包和文档）

  > **注意：** 仅安装 gpu-manager，不要安装 gpu-admission 包。

* 安装 HAMi 时设置 `devices.iluvatar.enabled=true`

```bash
helm install hami hami-charts/hami --set scheduler.kubeScheduler.imageTag={your kubernetes version} --set devices.iluvatar.enabled=true -n kube-system
```

**说明：** 当前支持的 GPU 型号及资源名称定义如下（位于 [https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/templates/scheduler/device-configmap.yaml](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/templates/scheduler/device-configmap.yaml)）：

```yaml
    iluvatars:
    - chipName: MR-V100
      commonWord: MR-V100
      resourceCountName: iluvatar.ai/MR-V100-vgpu
      resourceMemoryName: iluvatar.ai/MR-V100.vMem
      resourceCoreName: iluvatar.ai/MR-V100.vCore
    - chipName: MR-V50
      commonWord: MR-V50
      resourceCountName: iluvatar.ai/MR-V50-vgpu
      resourceMemoryName: iluvatar.ai/MR-V50.vMem
      resourceCoreName: iluvatar.ai/MR-V50.vCore
    - chipName: BI-V150
      commonWord: BI-V150
      resourceCountName: iluvatar.ai/BI-V150-vgpu
      resourceMemoryName: iluvatar.ai/BI-V150.vMem
      resourceCoreName: iluvatar.ai/BI-V150.vCore
    - chipName: BI-V100
      commonWord: BI-V100
      resourceCountName: iluvatar.ai/BI-V100-vgpu
      resourceMemoryName: iluvatar.ai/BI-V100.vMem
      resourceCoreName: iluvatar.ai/BI-V100.vCore
```

## 设备粒度

HAMi 将每块天数智芯 GPU 划分为 100 个资源单位进行分配。当你申请部分 GPU 时，实际上是在申请其中的一定数量单位。

### 显存分配

* `iluvatar.ai/<card-type>.vMem` 的每个单位代表 256MB 显存
* 如果未指定显存请求，系统默认使用 100% 可用显存
* 显存分配通过硬限制机制强制执行，以确保任务不会超出其分配的显存

### 核心分配

* `iluvatar.ai/<card-type>.vCore` 的每个单位代表 1% 的可用计算核心
* 核心分配通过硬限制机制强制执行，以确保任务不会超出其分配的核心资源
* 当申请多个 GPU 时，系统会根据申请的 GPU 数量自动设置核心资源

## 运行天数智芯作业

现在，容器可以通过 `iluvatar.ai/BI-V150-vgpu`、`iluvatar.ai/BI-V150.vMem`
和 `iluvatar.ai/BI-V150.vCore` 资源类型来申请天数智芯 GPU：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: BI-V150-poddemo
spec:
  restartPolicy: Never
  containers:
  - name: BI-V150-poddemo
    image: registry.iluvatar.com.cn:10443/saas/mr-bi150-4.3.0-x86-ubuntu22.04-py3.10-base-base:v1.0
    command:
    - bash
    args:
    - -c
    - |
      set -ex
      echo "export LD_LIBRARY_PATH=/usr/local/corex/lib64:$LD_LIBRARY_PATH">> /root/.bashrc
      cp -f /usr/local/iluvatar/lib64/libcuda.* /usr/local/corex/lib64/
      cp -f /usr/local/iluvatar/lib64/libixml.* /usr/local/corex/lib64/
      source /root/.bashrc
      sleep 360000
    resources:
      requests:
        iluvatar.ai/BI-V150-vgpu: 1
        iluvatar.ai/BI-V150.vCore: 50
        iluvatar.ai/BI-V150.vMem: 64
      limits:
        iluvatar.ai/BI-V150-vgpu: 1
        iluvatar.ai/BI-V150.vCore: 50
        iluvatar.ai/BI-V150.vMem: 64
```

:::note

每个 vcuda-memory 单位表示 256MB 显存

:::

## 设备 UUID 选择

你可以通过 annotations 指定使用或排除哪些 GPU 设备：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: poddemo
  annotations:
    # 使用指定 GPU 设备（逗号分隔列表）
    hami.io/use-<card-type>-uuid: "device-uuid-1,device-uuid-2"
    # 或排除指定 GPU 设备（逗号分隔列表）
    hami.io/no-use-<card-type>-uuid: "device-uuid-1,device-uuid-2"
spec:
  # ... 其余 pod 配置
```

### 查找设备 UUID

你可以通过以下命令查看节点上的天数智芯 GPU UUID：

```bash
kubectl get pod <pod-name> -o yaml | grep -A 10 "hami.io/<card-type>-devices-allocated"
```

或者查看节点注解：

```bash
kubectl get node <node-name> -o yaml | grep -A 10 "hami.io/node-<card-type>-register"
```

查找节点状态中包含设备信息的注解。

## 注意事项

* 为了使设备共享正常工作，你需要设置以下 prestart 命令：

  ```sh
      set -ex
      echo "export LD_LIBRARY_PATH=/usr/local/corex/lib64:$LD_LIBRARY_PATH">> /root/.bashrc
      cp -f /usr/local/iluvatar/lib64/libcuda.* /usr/local/corex/lib64/
      cp -f /usr/local/iluvatar/lib64/libixml.* /usr/local/corex/lib64/
      source /root/.bashrc
  ```

* 虚拟化仅对申请单个 GPU 的容器生效（即 `iluvatar.ai/vgpu=1`）。
  当申请多个 GPU 时，系统会根据申请的 GPU 数量自动设置核心资源。

* `iluvatar.ai/<card-type>.vMem` 资源仅在 `iluvatar.ai/<card-type>-vgpu=1` 时生效。

* 多设备申请（`iluvatar.ai/<card-type>-vgpu > 1`）不支持 vGPU 模式。
