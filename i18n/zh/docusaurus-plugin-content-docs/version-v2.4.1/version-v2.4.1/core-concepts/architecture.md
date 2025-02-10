---
title: Architecture
---

The overall architecture of HAMi is shown as below:

![Architecture](../resources/architect.jpg)

The HAMi consists of the following components:

- HAMi MutatingWebhook
- HAMi scheduler-extender
- Device-plugin (HAMi-device-plugin)
- In container resource control (HAMi-Core)

HAMi MutatingWebhook checks if this task can be handled by HAMi, it scans the resource field of each pod submitted, if each resource these pod requires is either 'cpu', 'memory' or a HAMi-resource, then it will set the schedulerName field of this pod to 'HAMi-scheduler'

The HAMi scheduler is responsible for assigning tasks to the appropriate nodes and devices. At the same time, the scheduler needs to maintain a global view of heterogeneous computing devices for monitoring.

The device-plugin layer obtains the scheduling result from the annotations field of the task and maps the corresponding device to the container。

The In container resource control is responsible for monitoring the resource usage within the container and providing hard isolation capabilities.



