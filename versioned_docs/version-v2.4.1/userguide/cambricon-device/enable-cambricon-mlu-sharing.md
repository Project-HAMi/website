---
title: Enable cambricon MLU sharing
---

## Introduction

**We now support cambricon.com/mlu by implementing most device-sharing features as nvidia-GPU**, including:

***MLU sharing***: Each task can allocate a portion of MLU instead of a whole MLU card, thus MLU can be shared among multiple tasks.

***Device Memory Control***: MLUs can be allocated with certain device memory size on certain type(i.e 370) and have made it that it does not exceed the boundary.

***MLU Type Specification***: You can specify which type of MLU to use or to avoid for a certain task, by setting "cambricon.com/use-mlutype" or "cambricon.com/nouse-mlutype" annotations. 

***Very Easy to use***: You don't need to modify your task yaml to use our scheduler. All your MLU jobs will be automatically supported after installation. The only thing you need to do is tag the MLU node.

## Prerequisites

* neuware-mlu370-driver > 5.0.0
* cambricon-device-plugin > 2.0.9
* cntoolkit > 2.5.3

## Enabling MLU-sharing Support

* Contact your device provider to acquire cambricon-device-plugin>2.0.9, edit parameter `mode` to 'dynamic-smlu` in containers.args field.

```
        args:
            - --mode=dynamic-smlu # device plugin mode: default, sriov, env-share, topology-aware, dynamic-mim, smlu or dynamic-smlu
	...
```

* Deploy modified cambricon-device-plugin

* Install the chart using helm, See 'enabling vGPU support in kubernetes' section [here](https://github.com/Project-HAMi/HAMi#enabling-vgpu-support-in-kubernetes)

* Activate the smlu mode for each MLUs on that node
```
cnmon set -c 0 -smlu on
cnmon set -c 1 -smlu on
...
```

## Running MLU jobs

Cambricon MMLUs can now be requested by a container
using the `cambricon.com/mlu.smlu.vmemory` and `cambricon.com/mlu.smlu.vcore` resource type:

```
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ubuntu:18.04
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          cambricon.com/vmlu: 1 # requesting 1 MLU
          cambricon.com/mlu.smlu.vmemory: 20 # each MLU requesting 20% MLU device memory
          cambricon.com/mlu.smlu.vcore: 10 # each MLU requesting 10% MLU device core
```

> **NOTICE:** *`vmemory` and `vcore` can only work when `cambricon.com/mlunum=1`* 
