---
title: Enable Cambricon MLU Sharing
---

**HAMi now supports `cambricon.com/mlu` by implementing most device-sharing features similar to NVIDIA GPUs**, including:

* **MLU Sharing**: Tasks can request a fraction of an MLU instead of an entire MLU card.
  This enables multiple tasks to share the same MLU device.

* **Device Memory Control**: You can allocate MLUs with a specified memory size, with
  guaranteed enforcement to ensure usage does not exceed the requested limit.

* **Device Core Control**: MLUs can be assigned a specific number of compute cores,
  and enforcement ensures core usage remains within bounds.

* **MLU Type Selection**: You can use annotations to specify which MLU types a task *must use* or
  *must avoid* by setting `cambricon.com/use-mlutype` or `cambricon.com/nouse-mlutype`.

## Prerequisites

* neuware-mlu370-driver > 5.10
* cntoolkit > 2.5.3

## Enabling MLU Sharing

1. **Install HAMi via Helm**

   Follow the instructions under the *Enabling vGPU Support in Kubernetes* section
   in the [HAMi README](https://github.com/Project-HAMi/HAMi#enabling-vgpu-support-in-kubernetes).

2. **Enable SMLU mode on each MLU device**

   ```sh
   cnmon set -c 0 -smlu on
   cnmon set -c 1 -smlu on
   # Repeat for all devices...
   ```

3. **Deploy the Cambricon device plugin**

   Get the `cambricon-device-plugin` from your device provider, and configure it with the following parameters:

   * `mode=dynamic-smlu`: Enables dynamic SMLU support.
   * `min-dsmlu-unit=256`: Sets the minimum allocatable memory unit to 256 MB.

   Refer to your provider’s documentation for additional details.

4. **Apply the configured plugin**

   ```sh
   kubectl apply -f cambricon-device-plugin-daemonset.yaml
   ```

## Running MLU Jobs

To request shared MLU resources in a container, use the following resource types:

* `cambricon.com/vmlu`
* `cambricon.com/mlu.smlu.vmemory`
* `cambricon.com/mlu.smlu.vcore`

Here is an YAML example:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: binpack-1
  labels:
    app: binpack-1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: binpack-1
  template:
    metadata:
      labels:
        app: binpack-1
    spec:
      containers:
        - name: c-1
          image: ubuntu:18.04
          command: ["sleep"]
          args: ["100000"]
          resources:
            limits:
              cambricon.com/vmlu: "1"
              cambricon.com/mlu.smlu.vmemory: "20"
              cambricon.com/mlu.smlu.vcore: "10"
```

:::note

1. **Init containers are not supported for MLU sharing.**

   Pods with the `cambricon.com/mlumem` resource specified in an init container will not be scheduled.

2. **Resource constraints only apply to shared mode (`vmlu=1`).**
  
   The `cambricon.com/mlu.smlu.vmemory` and `cambricon.com/mlu.smlu.vcore` resources are only effective
   when `cambricon.com/vmlu` is set to `1`. If `vmlu > 1`, a full MLU device will be allocated
   regardless of `vmemory` and `vcore` values.

:::
