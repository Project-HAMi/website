---
title: Enable Hygon HCU sharing
---

:::caution

The community [dcu-vgpu-device-plugin](https://github.com/Project-HAMi/dcu-vgpu-device-plugin) repository is archived and will no longer be updated. Future device-plugin releases are provided by **Hygon**. See the official documentation: [4.1 HAMi](https://developer.sourcefind.cn/document/9169ef18-c10d-11f0-b077-0242ac150003?id=9231c60e-c10f-11f0-b077-0242ac150003&title=4.1+HAMi&version=9169ef18-c10d-11f0-b077-0242ac150003).

:::

## Introduction

**HAMi supports sharing Hygon HCU devices with most of the device-sharing features available for NVIDIA GPUs**, including:

**HCU sharing**: Each task can allocate a portion of HCU instead of a whole HCU card, thus HCU can be shared among multiple tasks.

**Device Memory Control**: HCUs can be allocated with a specific device memory size on certain types (e.g., Z100), with hard limits enforced to prevent exceeding the allocation.

**Device compute core limitation**: HCUs can be allocated with certain percentage of device core (i.e., hygon.com/hcucores:60 indicates this container uses 60% compute cores of this device)

**HCU Type Specification**: You can specify which type of HCU to use or to avoid for a certain task, by setting "hygon.com/use-hcutype" or "hygon.com/nouse-hcutype" annotations.

## Prerequisites

- dtk driver >= 24.04
- hy-smi v1.6.0

## Enabling HCU-sharing Support

- Deploy the device-plugin provided by Hygon. Follow the official guide: [4.1 HAMi](https://developer.sourcefind.cn/document/9169ef18-c10d-11f0-b077-0242ac150003?id=9231c60e-c10f-11f0-b077-0242ac150003&title=4.1+HAMi&version=9169ef18-c10d-11f0-b077-0242ac150003)

## Running HCU jobs

Hygon HCUs can now be requested by a container using the `hygon.com/hcunum`, `hygon.com/hcumem` and `hygon.com/hcucores` resource type:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: alexnet-tf-gpu-pod-mem
  labels:
    purpose: demo-tf-amdgpu
spec:
  containers:
    - name: alexnet-tf-gpu-container
      image: pytorch:resnet50
      workingDir: /root
      command: ["sleep", "infinity"]
      resources:
        limits:
          hygon.com/hcunum: 1 # requesting an HCU
          hygon.com/hcumem: 2000 # each hcu require 2000 MiB device memory
          hygon.com/hcucores: 60 # each hcu use 60% of total compute cores
```

## Enable vHCU inside container

You need to enable vHCU inside the container to use it.

```bash
source /opt/hygondriver/env.sh
```

Check if you have successfully enabled vHCU by using the following command:

```bash
hy-smi virtual -show-device-info
```

If you have an output like this, then you have successfully enabled vHCU inside container.

```text
Device 0:
 Actual Device: 0
 Compute units: 60
 Global memory: 2097152000 bytes
```

Launch your HCU tasks like you usually do

## Notes

1. HCU-sharing in init container is not supported, pods with "hygon.com/hcumem" in init container will never be scheduled.

2. Only one vhcu can be acquired per container. If you want to mount multiple hcu devices, then you should not set `hygon.com/hcumem` or `hygon.com/hcucores`
