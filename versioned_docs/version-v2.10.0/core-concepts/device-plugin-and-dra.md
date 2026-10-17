---
title: Device Plugin and DRA
description: The two ways Kubernetes hands devices to Pods, and how classic HAMi and HAMi-DRA use them.
sidebar_label: Device plugin and DRA
---

Kubernetes has two ways to hand a device to a Pod: the device plugin API and Dynamic Resource Allocation (DRA). Classic HAMi uses a device plugin. [HAMi-DRA](https://github.com/Project-HAMi/HAMi-DRA) uses DRA.

![Device information flow with a device plugin and with DRA](/img/docs/en/core-concepts/device-plugin-vs-dra.svg)

## Device plugin

A device plugin runs as a DaemonSet on each GPU node. It does three things:

1. **Register** with kubelet under a resource name such as `nvidia.com/gpu`.
2. **Report** how many devices the node has. kubelet publishes that number in the node's capacity.
3. **Allocate** a device when a Pod starts on the node. kubelet calls the plugin, and the plugin returns the device files, mounts, and environment variables for the container.

The report in step 2 is a whole number. The scheduler learns that a node has 4 GPUs, and nothing about their memory or model. For a whole-card request that is enough. To place a 3000 MiB slice, the scheduler needs more.

HAMi fills the gap in two ways:

- The HAMi device plugin reports each card `deviceSplitCount` times (10 by default), so up to 10 Pods can hold a share of one card. A node with one GPU shows `nvidia.com/gpu: 10`.
- It writes each card's details to the node annotation `hami.io/node-nvidia-register`: UUID, memory, compute, model, NUMA node, and health. The HAMi scheduler reads this annotation to pick a card.

See [Protocol design](../developers/protocol.md) for how the scheduler and device plugin pass decisions through annotations.

## Dynamic Resource Allocation

DRA reached general availability in Kubernetes v1.34. It describes devices with three API objects:

| Object          | Role                                                                |
| --------------- | ------------------------------------------------------------------- |
| `ResourceSlice` | Published by the DRA driver. Lists each device with its attributes. |
| `DeviceClass`   | A named set of devices, selected by attributes.                     |
| `ResourceClaim` | A Pod's request for devices, similar to a PersistentVolumeClaim.    |

The scheduler reads device attributes from `ResourceSlice` objects directly, so no annotation is needed.

HAMi-DRA keeps the HAMi Pod spec. Its webhook converts `nvidia.com/gpu`, `nvidia.com/gpumem`, and `nvidia.com/gpucores` into a `ResourceClaim`. HAMi-Core still enforces the limits inside the container, so isolation works the same way in both modes.

## Which one to use

HAMi-DRA needs Kubernetes v1.34 or later with the DRA Consumable Capacity feature gate, plus CDI in the container runtime. On any other cluster, use classic HAMi. [Choose your setup](../get-started/choose-your-setup.md) has the full comparison.

## Learn more

- [Kubernetes device plugins](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/)
- [Kubernetes Dynamic Resource Allocation](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)
- [HAMi DRA for Kubernetes](../installation/how-to-use-hami-dra.md)
