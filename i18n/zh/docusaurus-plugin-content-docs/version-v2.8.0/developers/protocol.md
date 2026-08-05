---
title: 协议设计
translated: true
---

## 设备注册

<img src="/img/docs/common/developers/protocol/protocol-register.png" width="600px" alt="HAMi 设备注册协议图，显示节点注解过程" />

HAMi 需要了解集群中每个 AI 设备的规格信息以进行准确调度。在设备注册期间，device-plugin 需要每隔 30 秒将每个设备的规格持续更新（Patch）到节点注解（Node Annotation）中，格式如下：

```text
hami.io/node-handshake-\{device-type\}: Reported_\{device_node_current_timestamp\}
hami.io/node-\{device-type\}-register: \{Device 1\}:\{Device2\}:...:\{Device N\}
```

每个设备的定义格式如下：

```text
\{Device UUID\},\{device split count\},\{device memory limit\},\{device core limit\},\{device type\},\{device numa\},\{healthy\}
```

示例如下：

```text
hami.io/node-handshake-nvidia: Reported 2024-01-23 04:30:04.434037031 +0000 UTC m=+1104711.777756895
hami.io/node-handshake-mlu: Requesting_2024.01.10 04:06:57
hami.io/node-mlu-register: MLU-45013011-2257-0000-0000-000000000000,10,23308,0,MLU-MLU370-X4,0,false:MLU-54043011-2257-0000-0000-000000000000,10,23308,0,MLU-MLU370-X4,0,false:
hami.io/node-nvidia-register: GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec,10,32768,100,NVIDIA-Tesla V100-PCIE-32GB,0,true:GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448,10,32768,100,NVIDIA-Tesla V100-PCIE-32GB,0,true:

```

在此示例中，该节点包含两种不同的 AI 设备：2 张 Nvidia-V100 GPU 和 2 张寒武纪 (Cambricon) 370-X4 MLU。

设备节点可能因硬件或网络故障而变得不可用。如果节点在过去 5 分钟内未注册，调度器会将其标记为"不可用"（unavailable）。

由于调度器节点与"设备"节点上的系统时钟可能未准确对齐，调度器节点每 30 秒会 Patch 以下设备节点注解：

```text
hami.io/node-handshake-\{device-type\}: Requesting_{scheduler_node_current_timestamp}
```
