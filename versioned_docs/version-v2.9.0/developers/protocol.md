---
title: Protocol design
---

## Device Registration

<img src="/img/docs/common/developers/protocol/protocol-register.png" width="600px" alt="HAMi device registration protocol diagram showing node annotation process" />

HAMi needs to know the spec of each AI device in the cluster to schedule properly. During device registration, device-plugin rescans its devices every 30 seconds and patches the spec of each device into node annotations, in the format of the following:

```text
hami.io/node-handshake-\{device-type\}: Reported_\{device_node_current_timestamp\}
hami.io/node-\{device-type\}-register: \{Device 1\}:\{Device2\}:...:\{Device N\}
```

The definition of each device is in the following format:

```text
\{Device UUID\},\{device split count\},\{device memory limit\},\{device core limit\},\{device type\},\{device numa\},\{healthy\}
```

:::note Encoding differs by vendor

The colon-separated form above is the legacy encoding, still used by device types decoded with `DecodeNodeDevices` (for example DCU and Iluvatar). NVIDIA and several other device types encode the same fields as a **JSON array** instead, one object per device, decoded with `UnMarshalNodeDevices`. Fields are serialized with `omitempty`, so zero and `false` values are absent rather than written out. See [GPU Virtualization](../core-concepts/gpu-virtualization.md) for a JSON example.

The annotation key is also not fully uniform: NVIDIA uses `hami.io/node-nvidia-register` and `hami.io/node-handshake` (no device-type suffix), while Kunlun uses `hami.io/node-register-xpu`.

:::

An example is shown below:

```text
hami.io/node-handshake-nvidia: Reported 2024-01-23 04:30:04.434037031 +0000 UTC m=+1104711.777756895
hami.io/node-handshake-mlu: Requesting_2024.01.10 04:06:57
hami.io/node-mlu-register: MLU-45013011-2257-0000-0000-000000000000,10,23308,0,MLU-MLU370-X4,0,false:MLU-54043011-2257-0000-0000-000000000000,10,23308,0,
hami.io/node-nvidia-register: GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec,10,32768,100,NVIDIA-Tesla V100-PCIE-32GB,0,true:GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448,10,32768,100,NVIDIA-Tesla V100-PCIE-32GB,0,true:

```

In this example, this node has two different AI devices, 2 Nvidia-V100 GPUs, and 2 Cambricon 370-X4 MLUs

A device node may become unavailable due to hardware or network failure. Since the system clock on the scheduler node and on the device node may not align properly, the scheduler owns the timestamp. Whenever the handshake annotation is absent or does not contain `Requesting`, the scheduler stamps it with its own clock.

```text
hami.io/node-handshake-\{device-type\}: Requesting_{scheduler_node_current_timestamp}
```

The scheduler's registration loop runs every 15 seconds, and also on node events and on leader election changes. Only the elected leader performs registration.

A handshake is treated as expired once its timestamp is more than **60 seconds** old. Expiry alone does not remove the node. The scheduler additionally requires the node's allocatable device count to have dropped to zero before it runs node cleanup, which removes the node's devices from the scheduler cache and deletes the handshake annotation. A node whose device-plugin is still reporting to kubelet therefore stays available even with an expired handshake.

:::note The NVIDIA device-plugin does not write the `Reported_` handshake

The `Reported_` side of this protocol is written by device-plugins that implement it. The in-tree NVIDIA device-plugin does not, so on an NVIDIA node the annotation normally stays at `Requesting_<timestamp>` and ages past 60 seconds. That is the expected steady state, not a fault: the effective liveness signal for NVIDIA is the allocatable device count. See [GPU Nodes Not Registering](../troubleshooting/node-registration.md).

:::
