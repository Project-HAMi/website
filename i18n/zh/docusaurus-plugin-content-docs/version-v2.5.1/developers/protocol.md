---
title: 协议设计
translated: true
---

## 协议实现

### 设备注册

为了进行更准确的调度，HAMi 调度器需要在设备注册时感知设备的规格，包括 UUID、显存、计算能力、型号、numa 数量等。

然而，device-plugin 设备注册 API 并未提供相应的参数获取，因此 HAMi-device-plugin 在注册时将这些补充信息存储在节点的注释中，以供调度器读取，如下图所示：

<img src="https://github.com/Project-HAMi/website/blob/master/versioned_docs/version-v1.3.0/resources/device_registration.png?raw=true" width="600px"/>

这里需要使用两个注释，其中一个是时间戳，如果超过指定的阈值，则认为对应节点上的设备无效。另一个是设备注册信息。一个具有 2 个 32G-V100 GPU 的节点可以注册如下所示：

```yaml
hami.io/node-handshake: Requesting_2024.05.14 07:07:33
hami.io/node-nvidia-register: 'GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec,10,32768,100,NVIDIA-Tesla V100-PCIE-32GB,0,true:GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448,10,32768,100,NVIDIA-Tesla V100-PCIE-32GB,0,true:'
```

### 调度决策

kube-scheduler 在 `bind` 过程中调用 device-plugin 挂载设备，但仅向 device-plugin 提供设备的 `UUID`。因此，在设备共享的场景中，device-plugin 无法获取任务请求的相应设备规格，如 `设备显存` 和 `计算核心`。

因此，有必要开发一个协议，使调度器层与 device-plugin 进行通信以传递任务调度信息。调度器通过将调度结果补丁到 Pod 的注释中并在 device-plugin 中读取它来传递此信息，如下图所示：

<img src="https://github.com/Project-HAMi/website/blob/master/versioned_docs/version-v1.3.0/resources/task_dispatch.png?raw=true" width="600px"/>

在此过程中，需要设置 3 个注释，分别是 `时间戳`、`待分配设备` 和 `已分配设备`。调度器创建时，`待分配设备` 和 `已分配设备` 的内容相同，但 device-plugin 将根据 `待分配设备` 的内容确定当前设备分配情况，当分配成功时，相应设备将从注释中移除，因此当任务成功运行时，`待分配设备` 的内容将为空。

一个请求 3000M 设备显存的 GPU 任务的示例将生成如下的相应注释：

```yaml
hami.io/bind-time: 1716199325
hami.io/vgpu-devices-allocated: GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448,NVIDIA,3000,0:;
hami.io/vgpu-devices-to-allocate: ;
```
