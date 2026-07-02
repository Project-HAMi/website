---
title: Enable Enflame GCU Sharing
---

## Introduction

HAMi now supports Enflame **DRS** hard partition scheduling, aligned with Enflame native scheduler behavior.

DRS is a hard-slice mode similar to NVIDIA MIG and Ascend VNPU templates.

## Prerequisites

- Enflame gcushare-device-plugin >= 2.2.14 (please consult your device provider; only `gcushare-device-plugin` is needed — do not install `gcushare-scheduler-plugin`)
- driver version >= 1.8.7
- kubernetes >= 1.24
- enflame-container-toolkit >= 2.0.50

## Enable Enflame DRS Scheduling

- Deploy `gcushare-device-plugin` on Enflame nodes (please consult your device provider to acquire its package and documentation)

:::caution

Install only `gcushare-device-plugin`. Do not install the `gcushare-scheduler-plugin` package.

:::

- Set `devices.enflame.enabled=true` when deploying HAMi

```bash
helm install hami hami-charts/hami --set devices.enflame.enabled=true -n kube-system
```

:::note

The default resource names are:

- `enflame.com/drs-gcu` for direct DRS slice requests
- `enflame.com/gcu-memory` for memory requests (in MiB)
- `enflame.com/gcu-core` for core requests (as a percentage)

You can customize these names by modifying the `hami-scheduler-device` ConfigMap.

:::

## Running DRS Workloads

HAMi supports two request styles:

1. Direct DRS slice request (`enflame.com/drs-gcu`)
2. Unified memory/core request (`enflame.com/gcu-memory` + `enflame.com/gcu-core`); HAMi converts it to a DRS profile internally.

### Direct DRS slice request

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gcushare-pod-drs
  namespace: kube-system
spec:
  terminationGracePeriodSeconds: 0
  containers:
    - name: pod-gcu-example1
      image: ubuntu:22.04
      imagePullPolicy: IfNotPresent
      command: ["sleep"]
      args: ["100000"]
      resources:
        limits:
          enflame.com/drs-gcu: 3
        requests:
          enflame.com/drs-gcu: 3
```

### Request by memory/core (recommended unified API)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gcushare-pod-by-spec
  namespace: kube-system
spec:
  terminationGracePeriodSeconds: 0
  containers:
    - name: pod-gcu-example1
      image: ubuntu:22.04
      imagePullPolicy: IfNotPresent
      command: ["sleep"]
      args: ["100000"]
      resources:
        limits:
          enflame.com/gcu-memory: 20480 # MiB
          enflame.com/gcu-core: 40 # percent
        requests:
          enflame.com/gcu-memory: 20480
          enflame.com/gcu-core: 40
```

:::tip

More examples are available in the [examples/enflame folder](https://github.com/Project-HAMi/HAMi/tree/master/examples/enflame/).

:::

## Scheduling Annotations

During scheduling, HAMi writes DRS-compatible annotations such as:

- `assigned-containers`
- `enflame.com/gcu-assigned`
- `enflame.com/gcu-assigned-index`
- `enflame.com/gcu-assigned-minor`
- `enflame.com/gcu-request-size`

These annotations are consumed by the Enflame device plugin during the Allocate phase.
