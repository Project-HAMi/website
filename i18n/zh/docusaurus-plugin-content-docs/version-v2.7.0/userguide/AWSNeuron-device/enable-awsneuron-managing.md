---
title: 启用AWS-Neuron设备共享
---

## 概述

AWS Neuron设备是AWS专为机器学习工作负载设计的硬件加速器，特别针对深度学习推理和训练场景进行了优化。这些设备属于AWS Inferentia和Trainium产品家族，可在AWS云上为AI应用提供高性能、高性价比且可扩展的解决方案。

HAMi现已集成[my-scheduler](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/containers/kubernetes-getting-started.html#deploy-neuron-scheduler-extension)，提供以下核心功能：

* **Neuron共享机制**：HAMi支持通过分配设备核心(aws.amazon.com/neuroncore)实现AWS Neuron设备共享，每个Neuron核心对应1/2个物理设备。

* **拓扑感知调度**：当容器需要分配多个aws-neuron设备时，HAMi将确保这些设备之间具有物理连接，从而最小化设备间通信开销。具体连接方式请参阅[不同实例类型的设备分配策略](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/containers/kubernetes-getting-started.html#container-device-allocation-on-different-instance-types)。

## 前提条件

* 已部署Neuron-device-plugin
* 使用`Inf`或`Trn`类型的EC2实例

## 启用GCU共享支持

* 按照AWS官方文档在Neuron节点部署neuron-device-plugin：[Neuron设备插件部署指南](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/containers/kubernetes-getting-started.html#neuron-device-plugin)

* 部署HAMi核心组件

```
helm install hami hami-charts/hami -n kube-system
```

## 设备分配粒度

HAMi将每个AWS Neuron设备划分为2个可分配单元，支持分配半个物理设备。

### Neuron资源分配规范

- 每个`aws.amazon.com/neuroncore`单元对应1/2个物理设备
- 无需像其他设备那样显式分配`aws.amazon.com/neuron`，仅需分配`aws.amazon.com/neuroncore`
- 当`aws.amazon.com/neuroncore`≥2时，等效于设置`awa.amazon.com/neuron=1/2 * neuronCoreNumber`
- 当任务需要多个neuron设备时，拓扑感知调度将自动生效

## 运行Neuron任务

容器现在可以通过以下两种资源类型申请AWS Neuron设备：
`aws.amazon.com/neuron` 或 `aws.amazon.com/neuroncore`

更多示例可参考examples目录

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
      command: ["sleep","infinity"]
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

分配半个Neuron设备示例：
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nuropod
spec:
  restartPolicy: Never
  containers:
    - name: nuropod
      command: ["sleep","infinity"]
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

## 按设备UUID选择

可通过注解指定使用或排除特定GPU设备：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: poddemo
  annotations:
    # 指定使用的GPU设备(逗号分隔列表)
    aws.amazon.com/use-gpuuuid: "node1-AWSNeuron-0,node1-AWSNeuron-1"
    # 或排除特定GPU设备(逗号分隔列表)
    aws.amazon.com/nouse-gpuuuid: "node1-AWSNeuron-2,node1-AWSNeuron-3"
spec:
  # ... 其他pod配置
```

> **注意：** 设备ID格式为`{节点名称}-AWSNeuron-{索引号}`。可通过节点注解查询可用设备ID。

### 查询设备UUID

通过以下命令查询节点上的AWS Neuron设备UUID：

```bash
kubectl get pod <pod名称> -o yaml | grep -A 10 "hami.io/<卡类型>-devices-allocated"
```

或通过节点注解查询：

```bash
kubectl get node <节点名称> -o yaml | grep -A 10 "hami.io/node-register-<卡类型>"
```

在节点状态中查找包含设备信息的注解字段。

## 注意事项

1. AWS Neuron共享仅对申请单个设备(即`aws.amazon.com/neuroncore`=1)的容器生效。

2. 容器内执行`neuron-ls`显示的是设备总内存，这属于正常现象。实际运行任务时会对设备内存进行正确限制。
