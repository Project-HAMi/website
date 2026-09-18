---
title: 协议设计
translated: true
---

## 设备注册

<img src="/img/docs/common/developers/protocol/protocol-register.png" width="600px" alt="HAMi 设备注册协议图，显示节点注解过程" />

HAMi 需要了解集群中每个 AI 设备的规格信息以进行调度。设备发现方式因后端而异：NVIDIA 使用节点注解，Cambricon 则从节点的 `Capacity` 资源读取设备信息。

### NVIDIA 设备清单

NVIDIA device-plugin 通常每 30 秒检查一次设备信息。它将序列化后的设备清单与本地缓存比较，只有清单发生变化时才更新 `hami.io/node-nvidia-register`。它不会每 30 秒刷新 `Reported_...` 握手时间戳。

该注解包含一个 JSON 数组，每个设备对应一个对象。下面的示例表示两张 NVIDIA V100 GPU：

```text
hami.io/node-nvidia-register: [{"id":"GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec","count":10,"devmem":32768,"devcore":100,"type":"NVIDIA-Tesla V100-PCIE-32GB","numa":1,"mode":"hami-core","health":true},{"id":"GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448","index":1,"count":10,"devmem":32768,"devcore":100,"type":"NVIDIA-Tesla V100-PCIE-32GB","numa":1,"mode":"hami-core","health":true}]
```

字段为零值时会被省略，因此第一个设备没有 `index` 字段，位于 NUMA 节点 0 的设备也不会出现 `numa` 字段。

使用旧版注解编码的后端以冒号分隔设备条目，每个条目采用以下格式：

```text
{Device UUID},{device split count},{device memory limit},{device core limit},{device type},{device numa},{healthy}
```

### 健康检查

调度器通常每 15 秒检查一次节点设备。对于使用共享握手检查的后端，如果注解中没有待处理的 `Requesting` 值，调度器会写入带有自身当前时间的请求。NVIDIA 使用不带设备类型后缀的 `hami.io/node-handshake`：

```text
hami.io/node-handshake: Requesting_2024-01-23 04:30:04
```

时间戳格式为 `YYYY-MM-DD HH:MM:SS`。共享检查会等待 60 秒，但不会仅因请求过期就判定设备不可用。如果节点的 `Allocatable` 中对应设备计数仍大于零，过期的握手不会触发清理。NVIDIA 后端还会检查设备计数和清单变化。这些握手规则不适用于所有后端。

## 任务分发与调度决策

在 `bind` 过程中，`kube-scheduler` 将 Pod 绑定到节点。在容器创建期间，`kubelet` 调用 device-plugin 的 Allocate 方法并将其响应传递给容器运行时。在 GPU 共享场景下，device-plugin 无法原生获取工作负载请求的设备规格（例如 GPU 显存和计算核心限制）。

因此，HAMi 使用一种协议让调度器将任务分配元数据传递给 device-plugin。调度器通过向 Pod 写入分配注解（Annotation）来传递这些信息，device-plugin 在容器启动时读取这些注解，如下图所示：

<img src="/img/docs/common/developers/protocol/task-dispatch.png" width="600px" alt="HAMi 任务分发协议图，显示调度器与 device-plugin 的交互过程" />

在此过程中，主要涉及以下注解：

- `hami.io/bind-time`：调度决策的时间戳。
- `hami.io/vgpu-devices-allocated`：调度器分配的设备及其规格。
- `hami.io/vgpu-devices-to-allocate`：待分配的设备。调度器创建 Pod 注解时，`hami.io/vgpu-devices-to-allocate` 包含目标设备。device-plugin 根据此注解确定分配方案，分配完成后移除已分配的设备。任务成功运行后，`hami.io/vgpu-devices-to-allocate` 序列化为 `;`（表示空列表），而不是空字符串或省略该注解。

`hami.io/vgpu-devices-to-allocate` 是 NVIDIA 使用的键。每种设备后端会注册自己的键，名称并不统一遵循 `{device-type}` 的格式：

| 后端       | 待分配注解键                                |
| ---------- | ------------------------------------------- |
| NVIDIA     | `hami.io/vgpu-devices-to-allocate`          |
| 寒武纪 MLU | `hami.io/cambricon-mlu-devices-to-allocate` |
| 摩尔线程   | `hami.io/mthreads-vgpu-devices-to-allocate` |
| 海光 HCU   | `hami.io/hcu-devices-to-allocate`           |

以下是一个请求 3000 MiB 设备显存的 GPU 任务在 Pod 上生成的注解示例：

```yaml
hami.io/bind-time: "1716199325"
hami.io/vgpu-devices-allocated: GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448,NVIDIA,3000,0:;
hami.io/vgpu-devices-to-allocate: ;
```
