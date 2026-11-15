---
title: Assign to certain device type
---

import FeatureSupport from '@site/src/components/FeatureSupport';

<FeatureSupport features="cambType" />

To run a task on a certain MLU model, add the `cambricon.com/use-mlutype` annotation to the Pod. To keep a task off a model, add `cambricon.com/nouse-mlutype`. Both take a comma-separated list.

The HAMi scheduler reads the MLU model from the node label `Model`. A value matches when the label contains it, ignoring case. If a node has no `Model` label, or the label does not contain `MLU`, Pods with either annotation are not scheduled to that node.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mlu-type-pod
  annotations:
    cambricon.com/use-mlutype: "MLU370" # run only on MLU370 cards
spec:
  containers:
    - name: c-1
      image: ubuntu:22.04
      command: ["sleep"]
      args: ["100000"]
      resources:
        limits:
          cambricon.com/vmlu: 1 # requesting 1 MLU
          cambricon.com/mlu.smlu.vmemory: "20" # Allocate 20 x 256 MiB = 5 GiB
          cambricon.com/mlu.smlu.vcore: "10" # Each MLU contains 10% device cores
```

:::note

The `--enable-device-type` parameter of `cambricon-device-plugin` makes the plugin report a resource name per model, such as `cambricon.com/mlu370.smlu.vcore`. The HAMi scheduler reads `cambricon.com/mlu.smlu.vmemory` and `cambricon.com/mlu.smlu.vcore` by default and finds no MLU on a node that reports other names. If you enable this parameter, set `devices.cambricon.resourceMemoryName` and `devices.cambricon.resourceCoreName` in the HAMi chart to the names the plugin reports.

:::
