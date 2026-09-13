---
title: Protocol design
---

## Device Registration

<img src="/img/docs/common/developers/protocol/protocol-register.png" width="600px" alt="HAMi device registration protocol diagram showing node annotation process" />

HAMi needs to know the spec of each AI device in the cluster to schedule properly. During device registration, device-plugin needs to keep patching the spec of each device into node annotations every 30 seconds, in the format of the following:

```text
hami.io/node-handshake-{device-type}: Reported_{device_node_current_timestamp}
hami.io/node-{device-type}-register: {Device 1}:{Device2}:...:{Device N}
```

The device registration format depends on the device plugin. For NVIDIA devices, the registration annotation uses JSON with fields such as:

```text
{"id":"GPU-...","count":10,"devmem":32768,"devcore":100,"type":"NVIDIA-Tesla V100-PCIE-32GB","numa":1,"mode":"hami-core","health":true}
```

An example is shown below:

```text
hami.io/node-handshake: Requesting_2024-01-23 04:30:04.434037031 +0000 UTC m=+1104711.777756895
hami.io/node-handshake-mlu: Requesting_2024.01.10 04:06:57
hami.io/node-mlu-register: MLU-45013011-2257-0000-0000-000000000000,10,23308,0,MLU-MLU370-X4,0,false:MLU-54043011-2257-0000-0000-000000000000,10,23308,0,
hami.io/node-nvidia-register: [{"id":"GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec","count":10,"devmem":32768,"devcore":100,"type":"NVIDIA-Tesla V100-PCIE-32GB","numa":1,"mode":"hami-core","health":true},{"id":"GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448","index":1,"count":10,"devmem":32768,"devcore":100,"type":"NVIDIA-Tesla V100-PCIE-32GB","numa":1,"mode":"hami-core","health":true}]

```

In this example, this node has two different AI devices, 2 NVIDIA-V100 GPUs, and 2 Cambricon 370-X4 MLUs

A device node may become unavailable due to hardware or network failure. If a node hasn't registered in the last 60 seconds, the scheduler marks it as 'unavailable'.

Since system clock on scheduler node and 'device' node may not align properly, scheduler node will patch the following device node annotations every 15s

```text
hami.io/node-handshake-{device-type}: Requesting_{scheduler_node_current_timestamp}
```

## Task Dispatch & Scheduling Decisions

During the `bind` process, `kube-scheduler` binds the Pod to the target node. During container creation, `kubelet` invokes the device plugin's `Allocate` method to mount the device, but only provides the device `UUID`. In GPU sharing scenarios, the device plugin cannot natively obtain the workload's requested device specifications, such as GPU memory and compute core limits.

Therefore, HAMi uses a protocol for the scheduler to communicate task allocation metadata to the device plugin. The scheduler passes this information by patching allocation annotations onto the Pod, which the device plugin reads during container setup, as shown below:

<img src="/img/docs/common/developers/protocol/task-dispatch.png" width="600px" alt="HAMi task dispatch protocol diagram showing scheduler and device-plugin interaction" />

During this process, the following annotations are managed on the Pod:

- `hami.io/bind-phase`: Tracks allocation progress. The scheduler sets this to `allocating` during bind, and the device plugin updates it to `success` (or `failed`) once allocation finishes. This serves as the completion signal.
- `hami.io/bind-time`: Timestamp when the scheduler initiated the binding process.
- `hami.io/vgpu-node`: The target node assigned by the scheduler, used by the device plugin to identify the pending Pod on the node.
- `hami.io/vgpu-devices-allocated`: The devices and specifications allocated by the scheduler.
- `hami.io/vgpu-devices-to-allocate`: The devices pending allocation. When the scheduler prepares the Pod for binding, this annotation contains the target devices. During container setup, the device plugin allocates devices and incrementally removes them. Once all devices are allocated, this annotation becomes empty.

For example, when a GPU task requesting 3000 MiB of device memory is dispatched, the scheduler sets the annotations to:

```yaml
hami.io/bind-phase: "allocating"
hami.io/bind-time: "1716199325"
hami.io/vgpu-node: "node-1"
hami.io/vgpu-devices-allocated: GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448,NVIDIA,3000,0:;
hami.io/vgpu-devices-to-allocate: GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448,NVIDIA,3000,0:;
```

Once the device plugin completes allocation, `hami.io/bind-phase` transitions to `success` and `hami.io/vgpu-devices-to-allocate` is cleared:

```yaml
hami.io/bind-phase: "success"
hami.io/vgpu-devices-to-allocate: ;
```
