---
title: Protocol design
---

## Device Registration

<img src="/img/docs/common/developers/protocol/protocol-register.png" width="600px" alt="HAMi device registration protocol diagram showing node annotation process" />

HAMi needs to know the spec of each AI device in the cluster to schedule properly. During device registration, device-plugin needs to keep patching the spec of each device into node annotations every 30 seconds, in the format of the following:

```text
hami.io/node-handshake-\{device-type\}: Reported_\{device_node_current_timestamp\}
hami.io/node-\{device-type\}-register: \{Device 1\}:\{Device2\}:...:\{Device N\}
```

The definition of each device is in the following format:

```text
\{Device UUID\},\{device split count\},\{device memory limit\},\{device core limit\},\{device type\},\{device numa\},\{healthy\}
```

An example is shown below:

```text
hami.io/node-handshake-nvidia: Reported 2024-01-23 04:30:04.434037031 +0000 UTC m=+1104711.777756895
hami.io/node-handshake-mlu: Requesting_2024.01.10 04:06:57
hami.io/node-mlu-register: MLU-45013011-2257-0000-0000-000000000000,10,23308,0,MLU-MLU370-X4,0,false:MLU-54043011-2257-0000-0000-000000000000,10,23308,0,
hami.io/node-nvidia-register: GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec,10,32768,100,NVIDIA-Tesla V100-PCIE-32GB,0,true:GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448,10,32768,100,NVIDIA-Tesla V100-PCIE-32GB,0,true:

```

In this example, this node has two different AI devices, 2 NVIDIA-V100 GPUs, and 2 Cambricon 370-X4 MLUs

A device node may become unavailable due to hardware or network failure. If a node hasn't registered in the last 5 minutes, the scheduler marks it as 'unavailable'.

Since system clock on scheduler node and 'device' node may not align properly, scheduler node will patch the following device node annotations every 30s

```text
hami.io/node-handshake-\{device-type\}: Requesting_{scheduler_node_current_timestamp}
```

## Task Dispatch & Scheduling Decisions

During the `bind` process, `kube-scheduler` invokes the device plugin to mount the device, but only provides the device `UUID`. In GPU sharing scenarios, the device plugin cannot natively obtain the workload's requested device specifications, such as GPU memory and compute core limits.

Therefore, HAMi uses a protocol for the scheduler to communicate task allocation metadata to the device plugin. The scheduler passes this information by patching allocation annotations onto the Pod, which the device plugin reads during container setup, as shown below:

<img src="/img/docs/common/developers/protocol/task-dispatch.png" width="600px" alt="HAMi task dispatch protocol diagram showing scheduler and device-plugin interaction" />

During this process, three annotations are managed:

- `hami.io/bind-time`: Timestamp when the scheduling decision was made.
- `hami.io/vgpu-devices-allocated`: The devices and specifications allocated by the scheduler.
- `hami.io/vgpu-devices-to-allocate`: The devices pending allocation. When the scheduler creates the pod annotations, `hami.io/vgpu-devices-to-allocate` contains the target devices. The device plugin determines the allocation based on this annotation, and once allocation is complete, removes the allocated devices. When the task is successfully running, `hami.io/vgpu-devices-to-allocate` becomes empty.

An example of a GPU task requesting 3000 MiB of device memory generates the following annotations on the Pod:

```yaml
hami.io/bind-time: "1716199325"
hami.io/vgpu-devices-allocated: GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448,NVIDIA,3000,0:;
hami.io/vgpu-devices-to-allocate: ;
```
