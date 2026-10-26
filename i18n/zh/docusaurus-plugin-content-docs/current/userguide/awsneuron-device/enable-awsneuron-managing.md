---
title: 启用 AWS-Neuron 设备共享
sidebar_label: AWS-Neuron 共享
---

AWS Neuron 设备是 AWS 专为机器学习工作负载设计的硬件加速器，特别针对深度学习推理和训练场景进行了优化。这些设备属于 AWS Inferentia 和 Trainium 产品家族，可在 AWS 云上为 AI 应用提供高性能、高性价比且可扩展的解决方案。

HAMi 现已集成[Neuron scheduler extension](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/containers/kubernetes-getting-started.html#deploy-neuron-scheduler-extension)，提供以下核心功能：

- **Neuron 共享**：通过 `aws.amazon.com/neuron` 申请整卡，或通过 `aws.amazon.com/neuroncore` 申请单个 NeuronCore。

- **拓扑感知调度**：当容器需要分配多个 aws-neuron 设备时，HAMi 将确保这些设备之间具有物理连接，从而最小化设备间通信开销。具体连接方式参阅[不同实例类型的设备分配策略](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/containers/kubernetes-getting-started.html#container-device-allocation-on-different-instance-types)。

## 前提条件

- 已部署 Neuron-device-plugin
- 使用`Inf`或`Trn`类型的 EC2 实例

## 启用 Neuron 共享支持

- 按照 AWS 官方文档在 Neuron 节点部署 neuron-device-plugin：[Neuron 设备插件部署指南](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/containers/kubernetes-getting-started.html#neuron-device-plugin)

按[在线安装指南](../../installation/online-installation.md)部署 HAMi，Neuron 设备插件需单独安装。HAMi 侧资源名称通过 `devices.awsneuron.*` 配置；自定义时还需同步修改 `devices.awsneuron.customresources`，并与插件保持一致。完整参数见 [Chart values 表](https://github.com/Project-HAMi/HAMi/blob/master/charts/hami/README.md)。

## 设备分配粒度

`aws.amazon.com/neuron` 申请整卡，`aws.amazon.com/neuroncore` 申请单个 NeuronCore。HAMi 根据节点上报的设备容量和核心容量计算每张卡的核心数量，因此一个核心不一定等于半张卡。同时申请两种资源时，以整卡数量为准。

需要多个设备的任务会使用拓扑感知分配。

## 运行 Neuron 任务

容器现在可以通过以下两种资源类型申请 AWS Neuron 设备： `aws.amazon.com/neuron` 或 `aws.amazon.com/neuroncore`

更多示例可参考 examples 目录

完整设备分配示例：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nuropod
spec:
  restartPolicy: Never
  containers:
    - name: nuropod
      command: ["sleep", "infinity"]
      image: public.ecr.aws/neuron/pytorch-inference-neuron:1.13.1-neuron-py310-sdk2.20.2-ubuntu20.04
      resources:
        limits:
          cpu: "4"
          memory: 4Gi
          aws.amazon.com/neuron: 1
        requests:
          cpu: "1"
          memory: 1Gi
```

申请一个 NeuronCore：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nuropod
spec:
  restartPolicy: Never
  containers:
    - name: nuropod
      command: ["sleep", "infinity"]
      image: public.ecr.aws/neuron/pytorch-inference-neuron:1.13.1-neuron-py310-sdk2.20.2-ubuntu20.04
      resources:
        limits:
          cpu: "4"
          memory: 4Gi
          aws.amazon.com/neuroncore: 1
        requests:
          cpu: "1"
          memory: 1Gi
```

## 按设备 UUID 选择

可通过注解指定使用或排除特定 Neuron 设备：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: poddemo
  annotations:
    # 指定使用的 Neuron 设备 (逗号分隔列表)
    aws.amazon.com/use-neuron-uuid: "node1-AWSNeuron-0,node1-AWSNeuron-1"
    # 或排除特定 Neuron 设备 (逗号分隔列表)
    aws.amazon.com/nouse-neuron-uuid: "node1-AWSNeuron-2,node1-AWSNeuron-3"
spec:
  # ... 其他 pod 配置
```

:::note

设备 ID 格式为`{节点名称}-AWSNeuron-{索引号}`。可通过节点注解查询可用设备 ID。

:::

### 查询设备 UUID

通过以下命令查询节点上的 AWS Neuron 设备 UUID：

```bash
kubectl get pod <pod名称> -o yaml | grep -A 10 "hami.io/<卡类型>-devices-allocated"
```

或通过节点注解查询：

```bash
kubectl get node <节点名称> -o yaml | grep -A 10 "hami.io/node-register-<卡类型>"
```

在节点状态中查找包含设备信息的注解字段。

## 注意事项

1. `aws.amazon.com/neuroncore` 支持正整数核心数量，不限于 `1`。实际分配取决于所选节点的每卡核心数量和可用核心。

2. 容器内执行`neuron-ls`显示的是设备总内存，这属于正常现象。实际运行任务时会对设备显存进行正确限制。
