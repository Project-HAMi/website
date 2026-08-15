---
title: 协议设计
translated: true
---

## 设备注册

为了进行更准确的调度，HAMi 调度器需要在设备注册时感知设备的规格，包括 UUID、显存、计算能力、型号、numa 数量等。

然而，device-plugin 设备注册 API 并未提供相应的参数获取，因此 HAMi-device-plugin 在注册时将这些补充信息存储在节点的注释中，以供调度器读取，如下图所示：

<img src="/img/docs/common/developers/protocol/device-registration.png" width="600px" alt="HAMi 设备注册协议图，显示节点注解过程" />

这里需要使用两个注释，其中一个是时间戳，如果超过指定的阈值，则认为对应节点上的设备无效。另一个是设备注册信息。一个具有 2 个 32G-V100 GPU 的节点可以注册如下所示：

```yaml
hami.io/node-handshake: Requesting_2024.05.14 07:07:33
hami.io/node-nvidia-register: "GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec,10,32768,100,NVIDIA-Tesla V100-PCIE-32GB,0,true:GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448,10,32768,100,NVIDIA-Tesla V100-PCIE-32GB,0,true:"
```

:::note 编码方式因设备类型而异

上面这种冒号分隔的形式是早期编码，目前仍用于通过 `DecodeNodeDevices` 解码的设备类型（例如 DCU、天数智芯）。NVIDIA 以及其他若干设备类型改为使用 **JSON 数组**编码同样的字段，每个设备一个对象，通过 `UnMarshalNodeDevices` 解码。这些字段使用 `omitempty` 序列化，因此取值为零或 `false` 的字段会被省略而不会写出。JSON 示例参见 [GPU 虚拟化](../core-concepts/gpu-virtualization.md)。

注解键也并非完全统一：NVIDIA 使用 `hami.io/node-nvidia-register` 和 `hami.io/node-handshake`（不带设备类型后缀），而昆仑芯使用 `hami.io/node-register-xpu`。

:::

### 握手与节点存活

时间戳由调度器负责写入：当握手注解不存在，或其值不含 `Requesting` 时，调度器会用自己的时钟写入 `Requesting_<时间戳>`。调度器的注册循环每 15 秒执行一次，节点事件和主节点切换时也会触发，且只有当选为 leader 的副本才会执行注册。

握手时间戳超过 **60 秒**即视为过期。但过期本身不会移除节点：调度器还要求该节点的可分配设备数量降为零，才会执行节点清理，把设备移出调度器缓存并删除握手注解。因此，只要 device-plugin 仍在向 kubelet 上报，节点即使握手过期也依然可用。

:::note NVIDIA device-plugin 不写握手注解

本协议中 `Reported_` 一侧由实现了该协议的 device-plugin 写入。内置的 NVIDIA device-plugin 并未实现，因此在 NVIDIA 节点上该注解通常一直停留在 `Requesting_<时间戳>` 并超过 60 秒。这是预期稳态而非故障：对 NVIDIA 而言，真正的存活信号是可分配设备数量。参见 [GPU 节点未注册](../troubleshooting/node-registration.md)。

:::

### 调度决策

kube-scheduler 在 `bind` 过程中调用 device-plugin 挂载设备，但仅向 device-plugin 提供设备的 `UUID`。因此，在设备共享的场景中，device-plugin 无法获取任务请求的相应设备规格，如 `设备显存` 和 `计算核心`。

因此，有必要开发一个协议，使调度器层与 device-plugin 进行通信以传递任务调度信息。调度器通过将调度结果补丁到 Pod 的注释中并在 device-plugin 中读取它来传递此信息，如下图所示：

<img src="/img/docs/common/developers/protocol/task-dispatch.png" width="600px" alt="HAMi 任务分发流程图" />

在此过程中，需要设置 3 个注释，分别是 `时间戳`、`待分配设备` 和 `已分配设备`。调度器创建时，`待分配设备` 和 `已分配设备` 的内容相同，但 device-plugin 将根据 `待分配设备` 的内容确定当前设备分配情况，当分配成功时，相应设备将从注释中移除，因此当任务成功运行时，`待分配设备` 的内容将为空。

一个请求 3000M 设备显存的 GPU 任务的示例将生成如下的相应注释：

```yaml
hami.io/bind-time: 1716199325
hami.io/vgpu-devices-allocated: GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448,NVIDIA,3000,0:;
hami.io/vgpu-devices-to-allocate: ;
```
