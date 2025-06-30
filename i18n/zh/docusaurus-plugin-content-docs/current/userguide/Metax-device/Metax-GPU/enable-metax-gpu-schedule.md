---
title: 启用 Metax GPU 拓扑感知调度
translated: true
---

**我们现在通过在 metax GPU 之间实现拓扑感知来支持 metax.com/gpu**：

当在单个服务器上配置多个 GPU 时，GPU 卡根据它们是否连接到同一个 PCIe 交换机或 MetaXLink 而存在近远关系。这在服务器上的所有卡之间形成了一个拓扑，如下图所示：

![img](../../../resources/metax_topo.jpg)

用户作业请求一定数量的 metax-tech.com/gpu 资源，Kubernetes 将 pod 调度到适当的节点。gpu-device 进一步处理在资源节点上分配剩余资源的逻辑，遵循以下标准：
1. MetaXLink 在两种情况下优先于 PCIe 交换机：
– 当两个卡之间存在 MetaXLink 连接和 PCIe 交换机连接时，连接被视为 MetaXLink 连接。
– 当 MetaXLink 和 PCIe 交换机都能满足作业请求时，优先使用 MetaXLink 互连资源。

2. 使用 `node-scheduler-policy=spread` 时，尽可能将 Metax 资源分配在同一个 Metaxlink 或 Paiswich 下，如下图所示：

![img](../../../resources/metax_spread.jpg)

3. 使用 `node-scheduler-policy=binpack` 时，分配 GPU 资源，以尽量减少对 MetaxXLink 拓扑的破坏，如下图所示：

![img](../../../resources/metax_binpack.jpg)

## 重要说明

1. 目前不支持设备共享。

2. 这些功能已在 MXC500 上测试。

## 前提条件

* Metax GPU 扩展版本 >= 0.8.0
* Kubernetes 版本 >= 1.23

## 启用拓扑感知调度

* 在 metax 节点上部署 Metax GPU 扩展（请咨询您的设备提供商以获取其软件包和文档）

* 根据 README.md 部署 HAMi

## 运行 Metax 作业

现在可以通过容器使用 `metax-tech.com/gpu` 资源类型请求 Metax GPU：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
  annotations: hami.io/node-scheduler-policy: "spread" # 当此参数设置为 spread 时，调度器将尝试为此任务找到最佳拓扑。
spec:
  containers:
    - name: ubuntu-container
      image: cr.metax-tech.com/public-ai-release/c500/colossalai:2.24.0.5-py38-ubuntu20.04-amd64 
      imagePullPolicy: IfNotPresent
      command: ["sleep","infinity"]
      resources:
        limits:
          metax-tech.com/gpu: 1 # 请求 1 个 GPU
```

> **注意：** 您可以在 examples 文件夹中找到更多示例。