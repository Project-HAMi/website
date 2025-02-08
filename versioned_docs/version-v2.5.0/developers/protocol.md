---
title: Protocol design
---

## Protocol Implementation

### Device Registration

In order to perform more accurate scheduling, the HAMI scheduler needs to perceive the specifications of the device during device registration, including UUID, video memory, computing power, model, numa number, etc

However, the device-plugin device registration API does not provide corresponding parameter acquisition, so HAMi-device-plugin stores these supplementary information in the node annotations during registering for the scheduler to read, as the following figure shows:

<img src="https://github.com/Project-HAMi/website/blob/master/versioned_docs/version-v1.3.0/resources/device_registration.png?raw=true" width="600px"/>

Here you need to use two annotations, one of which is the timestamp, if it exceeds the specified threshold, the device on the corresponding node will be considered invalid. The other information for device registration. A node with 2 32G-V100 GPUs can be registered as shown below:

```
hami.io/node-handshake: Requesting_2024.05.14 07:07:33
hami.io/node-nvidia-register: 'GPU-00552014-5c87-89ac-b1a6-7b53aa24b0ec,10,32768,100,NVIDIA-Tesla V100-PCIE-32GB,0,true:GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448,10,32768,100,NVIDIA-Tesla V100-PCIE-32GB,0,true:'
```


### Schedule Decision Making 

The kube-scheduler calls device-plugin to mount devices during the `bind` process, but only the `UUID` of the device is provided to device-plugin. Therefore, in the scenario of device-sharing, device-plugin cannot obtain the specifications of the corresponding device, such as the `device memory` and `computing cores` requested by the task.

Therefore, it is necessary to develop a protocol for the scheduler layer to communicate with device-plugin to pass information about task dispatch. The scheduler passes this information by patching the scheduling result to the pod's annotations and reading it in device-plugin, as the figure below:

<img src="https://github.com/Project-HAMi/website/blob/master/versioned_docs/version-v1.3.0/resources/task_dispatch.png?raw=true" width="600px"/>

In this process, there are 3 annotations that need to be set, which are the `timestamp`, `devices to be assigned`, and the `devices allocated`. The content of `devices to be assigned` and the `devices allocated` are the same when the scheduler creates them, but device-plugin will determine the current device allocation by the content of `devices to be assigned`, and when the assignment is successful, the corresponding device will be removed from the annotation, so the content of `device to be assigned` will be empty when the task is successfully run.

An example of a task requesting a GPU with 3000M device memory will generate the corresponding annotations as follows
```
hami.io/bind-time: 1716199325
hami.io/vgpu-devices-allocated: GPU-0fc3eda5-e98b-a25b-5b0d-cf5c855d1448,NVIDIA,3000,0:;
hami.io/vgpu-devices-to-allocate: ;
```
