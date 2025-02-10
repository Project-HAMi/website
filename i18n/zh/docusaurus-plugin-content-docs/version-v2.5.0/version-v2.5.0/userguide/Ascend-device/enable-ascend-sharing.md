---
title: Enable Ascend sharing
---

## Introduction

Memory slicing is supported based on virtualization template, lease available template is automatically used. For detailed information, check [device-template]

## Prerequisites

* Ascend device type: 910B,910A,310P
* driver version >= 24.1.rc1
* Ascend docker runtime

## Enabling Ascend-sharing Support

* Due to dependencies with HAMi, you need to set 

```
devices.ascend.enabled=true
``` 

during HAMi installation. For more details, see 'devices' section in values.yaml.

```yaml
devices:
  ascend:
    enabled: true
    image: "ascend-device-plugin:master"
    imagePullPolicy: IfNotPresent
    extraArgs: []
    nodeSelector:
      ascend: "on"
    tolerations: []
    resources:
      - huawei.com/Ascend910A
      - huawei.com/Ascend910A-memory
      - huawei.com/Ascend910B
      - huawei.com/Ascend910B-memory
      - huawei.com/Ascend310P
      - huawei.com/Ascend310P-memory
```

* Tag Ascend node with the following command
```
kubectl label node {ascend-node} ascend=on
```

* Install [Ascend docker runtime](https://gitee.com/ascend/ascend-docker-runtime)

* Download yaml for Ascend-vgpu-device-plugin from HAMi Project [here](https://github.com/Project-HAMi/ascend-device-plugin/blob/master/build/ascendplugin-hami.yaml), and deploy

```
wge https://raw.githubusercontent.com/Project-HAMi/ascend-device-plugin/refs/heads/main/ascend-device-plugin.yaml
kubectl apply -f ascend-device-plugin.yaml
```

## Running Ascend jobs

### Ascend 910B

Ascend 910Bs can now be requested by a container
using the `huawei.com/ascend910B` and `huawei.com/ascend910B-memory` resource type:

```
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ascendhub.huawei.com/public-ascendhub/ascend-mindspore:23.0.RC3-centos7
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend910B: 1 # requesting 1 Ascend
          huawei.com/Ascend910B-memory: 2000 # requesting 2000m device memory
```

### Ascend 310P

Ascend 310Ps can now be requested by a container
using the `huawei.com/ascend310P` and `huawei.com/ascend310P-memory` resource type:

```
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: ubuntu-container
      image: ascendhub.huawei.com/public-ascendhub/ascend-mindspore:23.0.RC3-centos7
      command: ["bash", "-c", "sleep 86400"]
      resources:
        limits:
          huawei.com/Ascend310P: 1 # requesting 1 Ascend
          huawei.com/Ascend310P-memory: 1024 # requesting 1024m device memory
```

### Notes

1. Currently, the Ascend 910b supports only two sharding strategies, which are 1/4 and 1/2. Ascend 310p supports 3 sharding strategies, 1/7,2/7,4/7. The memory request of the job will automatically align with the most close sharding strategy. In this example, the task will allocate 16384M device memory.

1. Ascend-sharing in init container is not supported.

2. `huawei.com/Ascend910B-memory` only work when `huawei.com/Ascend91B0=1`, `huawe.com/Ascend310P-memory` only work when `huawei.com/Ascend310P=1`,etc..